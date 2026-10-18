/**
 * Omni Chat - Chat Controller Module
 * Handles message dispatch, streaming AI completions via Puter, search grounding integration,
 * artifact detection, stop stream, and file attachments.
 */

import { appState } from '../state/app-state.js';
import { isPluginEnabled } from '../state/plugins-state.js';
import { fetchLiveWebSearchResults, createSearchSourcesCard, detectSearchIntent } from '../services/tools-service.js';
import { persistSessions, renderActiveSession, renderSessionList } from './session-manager.js';
import { compileProjectSystemPrompt, attachProjectPreviewImage } from './project-studio.js';
import { openArtifact } from './artifacts-pane.js';
import { formatMarkdown, isRunnableWebCode } from '../utils/markdown.js';
import { escapeHtml, showToast } from '../utils/helpers.js';
import { attachSandboxImage } from './sandbox-studio.js';

export function initChatController() {
  const textarea = document.getElementById('chat-textarea');
  const btnSend = document.getElementById('btn-send');
  const btnStopStream = document.getElementById('btn-stop-generation');
  const fileInput = document.getElementById('file-input');
  const imageInput = document.getElementById('image-file-input');
  const btnAttachFile = document.getElementById('tool-attach-file');
  const btnAttachImage = document.getElementById('tool-attach-image');
  const btnChatPlus = document.getElementById('btn-chat-plus');
  const toolsPopover = document.getElementById('chat-tools-popover');
  const btnRemoveAttachment = document.getElementById('btn-remove-attachment');
  const dropZoneOverlay = document.getElementById('drop-zone-overlay');
  const inputBoxContainer = document.getElementById('input-box-container');

  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
      if (btnSend) {
        btnSend.disabled = textarea.value.trim().length === 0 && !appState.currentAttachment;
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Direct paste on chat textarea
    textarea.addEventListener('paste', (e) => {
      const handled = handleClipboardImagePaste(e, (file) => {
        attachImageFile(file);
      });
      if (handled) {
        textarea.focus();
      }
    });
  }

  // Remove attachment button
  if (btnRemoveAttachment) {
    btnRemoveAttachment.addEventListener('click', (e) => {
      e.stopPropagation();
      removeChatAttachment();
    });
  }

  // Drag and drop image files onto composer
  if (dropZoneOverlay) {
    ['dragenter', 'dragover'].forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
          const sandboxView = document.getElementById('sandbox-studio-view');
          const projectView = document.getElementById('project-studio-view');
          if ((!sandboxView || sandboxView.style.display === 'none') &&
              (!projectView || projectView.style.display === 'none')) {
            e.preventDefault();
            dropZoneOverlay.classList.add('active');
          }
        }
      });
    });

    ['dragleave', 'dragend'].forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        if (e.relatedTarget === null || e.clientX === 0 || e.clientY === 0) {
          dropZoneOverlay.classList.remove('active');
        }
      });
    });

    window.addEventListener('drop', (e) => {
      dropZoneOverlay.classList.remove('active');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          attachImageFile(file);
          if (textarea) textarea.focus();
        }
      }
    });
  }

  // Global window paste listener: pasting anywhere while in chat routes to active view
  window.addEventListener('paste', (e) => {
    const active = document.activeElement;
    // If user is typing in a specific input/textarea with its own paste handler, let it process
    if (active && (active.id === 'chat-textarea' || active.id === 'sandbox-iteration-input' ||
        active.id === 'sandbox-initial-prompt' || active.id === 'studio-preview-textarea' ||
        active.id === 'sandbox-code-editor')) {
      return;
    }

    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const ext = file.type.split('/')[1] || 'png';
          const namedFile = (file.name && file.name !== 'image.png')
            ? file
            : new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type });

          const sandboxView = document.getElementById('sandbox-studio-view');
          const projectView = document.getElementById('project-studio-view');

          if (sandboxView && sandboxView.style.display !== 'none') {
            attachSandboxImage(namedFile);
          } else if (projectView && projectView.style.display !== 'none') {
            attachProjectPreviewImage(namedFile);
          } else {
            attachImageFile(namedFile);
            if (textarea) textarea.focus();
          }
          return;
        }
      }
    }
  });

  if (btnSend) {
    btnSend.addEventListener('click', () => sendMessage());
  }

  if (btnStopStream) {
    btnStopStream.addEventListener('click', () => {
      if (appState.activeAbortController) {
        appState.activeAbortController.abort();
      }
    });
  }

  // Tools Popover toggle
  if (btnChatPlus && toolsPopover) {
    btnChatPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      toolsPopover.style.display = toolsPopover.style.display === 'none' ? 'flex' : 'none';
    });
    document.addEventListener('click', (e) => {
      if (!toolsPopover.contains(e.target) && e.target !== btnChatPlus) {
        toolsPopover.style.display = 'none';
      }
    });
  }

  if (btnAttachFile && fileInput) {
    btnAttachFile.addEventListener('click', () => {
      if (toolsPopover) toolsPopover.style.display = 'none';
      fileInput.click();
    });
  }

  if (btnAttachImage && imageInput) {
    btnAttachImage.addEventListener('click', () => {
      if (toolsPopover) toolsPopover.style.display = 'none';
      imageInput.click();
    });
  }

  if (fileInput) fileInput.addEventListener('change', handleFileInput);
  if (imageInput) imageInput.addEventListener('change', handleImageInput);

  // Starter suggestion cards click listener
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.starter-card');
    if (!card) return;
    const prompt = card.getAttribute('data-prompt') || card.querySelector('.starter-card-desc')?.textContent;
    if (prompt) {
      sendMessage(prompt);
    }
  });
}

export async function sendMessage(overrideText = null) {
  const textarea = document.getElementById('chat-textarea');
  const btnSend = document.getElementById('btn-send');
  const btnStopStream = document.getElementById('btn-stop-generation');
  const messagesContainer = document.getElementById('messages-container');
  const welcomeView = document.getElementById('welcome-container');

  const text = (typeof overrideText === 'string' && overrideText.trim())
    ? overrideText.trim()
    : (textarea ? textarea.value.trim() : '');

  const attachment = appState.currentAttachment;

  // Allow sending if text exists OR an image attachment exists
  if ((!text && !attachment) || appState.activeAbortController) return;

  const session = appState.sessions.find(s => s.id === appState.currentSessionId);
  if (!session) return;

  // Add User Message (supporting text + image attachment)
  const userMsg = {
    role: 'user',
    content: text || (attachment ? 'Please analyze this attached image.' : ''),
    timestamp: Date.now()
  };

  if (attachment) {
    userMsg.attachment = {
      name: attachment.name,
      dataUrl: attachment.dataUrl,
      type: attachment.type,
      size: attachment.size || 0
    };
  }

  session.messages.push(userMsg);

  if (textarea) {
    textarea.value = '';
    textarea.style.height = 'auto';
  }

  // Clear composer attachment
  removeChatAttachment();

  if (btnSend) btnSend.disabled = true;
  if (welcomeView) welcomeView.style.display = 'none';

  renderActiveSession();
  await triggerAssistantResponse(session);
}

export async function triggerAssistantResponse(session) {
  const btnSend = document.getElementById('btn-send');
  const btnStopStream = document.getElementById('btn-stop-generation');
  const messagesInner = document.getElementById('messages-inner');
  const messagesContainer = document.getElementById('messages-container');

  if (!session || !messagesInner) return;

  const sessionProj = session.projectId
    ? appState.projects.find(p => p.id === session.projectId)
    : (appState.activeProjectId ? appState.projects.find(p => p.id === appState.activeProjectId) : null);

  const effectiveModel = (sessionProj && sessionProj.model) ? sessionProj.model : appState.settings.selectedModel;

  const assistantMsg = {
    role: 'assistant',
    content: '',
    reasoning: '',
    model: effectiveModel,
    timestamp: Date.now()
  };

  const assistantWrapper = document.createElement('div');
  assistantWrapper.className = 'message-wrapper assistant';

  const assistantBubble = document.createElement('div');
  assistantBubble.className = 'message-bubble assistant markdown-body';
  assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Thinking...</span>';

  assistantWrapper.appendChild(assistantBubble);
  messagesInner.appendChild(assistantWrapper);
  if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;

  appState.activeAbortController = new AbortController();
  if (btnSend) btnSend.style.display = 'none';
  if (btnStopStream) btnStopStream.style.display = 'flex';

  try {
    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
      throw new Error('Puter.js AI SDK not available. Check connection.');
    }

    let systemPromptContent = sessionProj
      ? compileProjectSystemPrompt(sessionProj)
      : appState.settings.systemPrompt;

    // Check Live Web Search Grounding
    let searchSources = null;
    let searchQueryUsed = '';
    const lastUserMsg = [...session.messages].reverse().find(m => m.role === 'user');
    const userText = lastUserMsg ? lastUserMsg.content : '';
    const isSearchActive = isPluginEnabled('webSearch') || /^\/search\b/i.test(userText.trim()) || detectSearchIntent(userText);

    if (isSearchActive && userText.trim()) {
      searchQueryUsed = userText.replace(/^\/search\s*/i, '').trim();
      assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Grounding with real-time web sources...</span>';

      searchSources = await fetchLiveWebSearchResults(searchQueryUsed);

      if (searchSources && searchSources.length > 0) {
        systemPromptContent += `\n\n[REAL-TIME VERIFIED WEB SEARCH GROUNDING]\nThe user asked: "${searchQueryUsed}". Verified sources:\n`;
        searchSources.forEach((s, idx) => {
          systemPromptContent += `[Source ${idx + 1}]: "${s.title}" (${s.url})\nSnippet: ${s.snippet}\n\n`;
        });
        systemPromptContent += `Instruction: Ground response in these verified real-time facts.\n`;
        assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Synthesizing answer from grounded sources...</span>';
      } else {
        assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Thinking...</span>';
      }
    }

    const conversationPayload = [
      { role: 'system', content: systemPromptContent }
    ];

    session.messages.forEach(m => {
      // If message contains an attached image, send OpenAI/Gemini vision multimodal content array
      if (m.attachment && m.attachment.dataUrl && (m.attachment.type?.startsWith('image/') || m.attachment.dataUrl.startsWith('data:image'))) {
        conversationPayload.push({
          role: m.role,
          content: [
            { type: 'text', text: m.content || 'Please analyze this attached image in detail.' },
            { type: 'image_url', image_url: { url: m.attachment.dataUrl } }
          ]
        });
      } else {
        conversationPayload.push({
          role: m.role,
          content: m.content || ''
        });
      }
    });

    const isReasoning = (effectiveModel || '').toLowerCase().includes('reason') ||
                        (effectiveModel || '').toLowerCase().includes('r1') ||
                        (effectiveModel || '').toLowerCase().startsWith('o1') ||
                        (effectiveModel || '').toLowerCase().startsWith('o3');

    const chatOptions = {
      model: effectiveModel,
      stream: true,
      signal: appState.activeAbortController.signal
    };

    if (!isReasoning && typeof appState.settings.temperature === 'number') {
      chatOptions.temperature = appState.settings.temperature;
    }

    let responseStream;
    try {
      responseStream = await puter.ai.chat(conversationPayload, chatOptions);
    } catch (modelCallErr) {
      console.warn('Multimodal chat call failed, retrying with text fallback:', modelCallErr);
      const textOnlyPayload = conversationPayload.map(msg => {
        if (Array.isArray(msg.content)) {
          const textPart = msg.content.find(c => c.type === 'text')?.text || 'Analyze image';
          return { role: msg.role, content: `${textPart} [Image attached: ${session.messages.find(m => m.attachment)?.attachment?.name || 'Image'}]` };
        }
        return msg;
      });
      responseStream = await puter.ai.chat(textOnlyPayload, chatOptions);
    }

    let accumulatedText = '';

    for await (const part of responseStream) {
      if (part?.type === 'text' || part?.text) {
        accumulatedText += (part.text || '');
        assistantBubble.innerHTML = formatMarkdown(accumulatedText);
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      if (part?.type === 'error') {
        throw new Error(part.message || 'Streaming error');
      }
    }

    assistantMsg.content = accumulatedText || '*(Empty response)*';
    session.messages.push(assistantMsg);
    session.updatedAt = Date.now();
    await persistSessions();

    if (searchSources && searchSources.length > 0) {
      const searchCard = createSearchSourcesCard(searchSources, searchQueryUsed);
      assistantWrapper.insertBefore(searchCard, assistantBubble);
    }

    // Check for runnable HTML artifact in the generated code
    const htmlCodeMatch = accumulatedText.match(/```(?:html|svg)\s*([\s\S]*?)```/i);
    if (htmlCodeMatch && htmlCodeMatch[1]) {
      const artifactCode = htmlCodeMatch[1].trim();
      if (isRunnableWebCode('html', artifactCode)) {
        openArtifact(session.title || 'Generated Web App', artifactCode, 'html');
      }
    }

    // Auto-generate title if this is the first turn
    if (session.messages.length === 2 && session.title === 'New Conversation') {
      autoGenerateTitle(session, userText);
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      assistantBubble.innerHTML += '<br><em style="color: var(--text-muted); font-size: 0.8rem;">[Generation stopped by user]</em>';
      assistantMsg.content = (assistantBubble.innerText || '') + ' [Stopped]';
      session.messages.push(assistantMsg);
      session.updatedAt = Date.now();
      await persistSessions();
    } else {
      console.error('Chat error:', err);
      assistantBubble.innerHTML = `
        <div class="chat-error-card" style="padding:1rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;">
          <strong style="color:var(--danger-color);">Error:</strong> ${escapeHtml(err.message || 'Failed to complete request.')}
        </div>
      `;
    }
  } finally {
    appState.activeAbortController = null;
    if (btnStopStream) btnStopStream.style.display = 'none';
    if (btnSend) {
      btnSend.style.display = 'flex';
      btnSend.disabled = false;
    }
    const textarea = document.getElementById('chat-textarea');
    if (textarea) textarea.focus();
  }
}

async function autoGenerateTitle(session, userPrompt) {
  try {
    if (typeof puter === 'undefined' || !puter.ai) return;
    const res = await puter.ai.chat([
      { role: 'system', content: 'Create a 3 to 5 word title for a conversation starting with this user prompt. Return ONLY the title, no quotes or punctuation.' },
      { role: 'user', content: userPrompt }
    ], { model: 'gemini-2.5-flash', temperature: 0.3 });

    let title = typeof res === 'string' ? res : (res?.message?.content || res?.text || '');
    if (title) {
      title = title.replace(/["\n\r]/g, '').trim().substring(0, 45);
      session.title = title;
      await persistSessions();
      renderSessionList();
      const titleDisplay = document.getElementById('topbar-title-display');
      if (titleDisplay && session.id === appState.currentSessionId) {
        titleDisplay.textContent = title;
      }
    }
  } catch (_) {}
}

/**
 * Extracts pasted image files from clipboard data event.
 */
export function handleClipboardImagePaste(e, callback) {
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData || !clipboardData.items) return false;

  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.type && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        const ext = file.type.split('/')[1] || 'png';
        const namedFile = (file.name && file.name !== 'image.png')
          ? file
          : new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type });
        callback(namedFile);
        return true;
      }
    }
  }
  return false;
}

/**
 * Attaches an image file to the chat composer, reads base64 dataUrl, and renders preview pill.
 */
export function attachImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Only image files (PNG, JPEG, WEBP, GIF) are supported.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    appState.currentAttachment = {
      name: file.name || 'Pasted Image',
      dataUrl: reader.result,
      type: file.type || 'image/png',
      size: file.size || 0
    };
    renderComposerAttachment();
    showToast(`📸 Attached image: ${appState.currentAttachment.name}`);
  };
  reader.readAsDataURL(file);
}

/**
 * Renders or hides the Gemini-style composer attachment preview pill.
 */
export function renderComposerAttachment() {
  const bar = document.getElementById('attachment-preview-bar');
  const thumb = document.getElementById('attachment-img-preview');
  const docIcon = document.getElementById('attachment-doc-icon');
  const filename = document.getElementById('attachment-filename');
  const btnSend = document.getElementById('btn-send');

  if (!appState.currentAttachment) {
    if (bar) bar.style.display = 'none';
    if (thumb) {
      thumb.src = '';
      thumb.style.display = 'none';
    }
    return;
  }

  if (bar) bar.style.display = 'flex';
  if (appState.currentAttachment.dataUrl) {
    if (thumb) {
      thumb.src = appState.currentAttachment.dataUrl;
      thumb.style.display = 'block';
    }
    if (docIcon) docIcon.style.display = 'none';
  } else {
    if (thumb) thumb.style.display = 'none';
    if (docIcon) docIcon.style.display = 'inline-block';
  }

  if (filename) {
    filename.textContent = appState.currentAttachment.name || 'Attached Image';
  }

  // Enable send button immediately when an image is attached
  if (btnSend) {
    btnSend.disabled = false;
  }
}

/**
 * Removes the currently active composer attachment and updates UI state.
 */
export function removeChatAttachment() {
  appState.currentAttachment = null;
  renderComposerAttachment();
  const fileInput = document.getElementById('file-input');
  const imageInput = document.getElementById('image-file-input');
  if (fileInput) fileInput.value = '';
  if (imageInput) imageInput.value = '';

  const textarea = document.getElementById('chat-textarea');
  const btnSend = document.getElementById('btn-send');
  if (btnSend && textarea && textarea.value.trim().length === 0) {
    btnSend.disabled = true;
  }
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type.startsWith('image/')) {
    attachImageFile(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    appState.currentAttachment = {
      name: file.name,
      content: reader.result,
      type: file.type || 'text/plain'
    };
    renderComposerAttachment();
    showToast(`Attached document: ${file.name}`);
  };
  reader.readAsText(file);
}

function handleImageInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  attachImageFile(file);
}


