/**
 * Omni Chat - Dedicated Web App Sandbox Studio Module (v0 / Bolt style)
 * Provides multi-file codebase viewer, synchronized line numbers gutter, live preview,
 * Puter hosting, export zip/html, and conversational iteration history.
 */

import { prepareExecutableHtml, escapeHtml, showToast } from '../utils/helpers.js';
import { formatMarkdown } from '../utils/markdown.js';

const SANDBOX_HISTORY_STORAGE_KEY = 'omni_sandbox_history';

export const currentSandboxApp = {
  id: '',
  title: '',
  prompt: '',
  code: '',
  activeFileTab: 'all',
  turns: [],
  publishedUrl: null
};

let sandboxOriginalAiCode = '';
let sandboxIsDirty = false;
let activeExportApp = null;
const expandedSandboxIds = new Set();

export function initSandboxStudio() {
  const btnTopbarSandbox = document.getElementById('btn-topbar-sandbox');
  const btnSidebarCreateSandbox = document.getElementById('btn-sidebar-create-sandbox');
  const btnSandboxStudioBack = document.getElementById('btn-sandbox-studio-back');
  const btnSandboxNew = document.getElementById('btn-sandbox-new');
  const btnSandboxReload = document.getElementById('btn-sandbox-reload');
  const btnSandboxPublish = document.getElementById('btn-sandbox-publish');
  const btnSandboxGenerate = document.getElementById('btn-sandbox-generate');
  const btnSandboxIterationSubmit = document.getElementById('btn-sandbox-iteration-submit');
  const tabBtnSandboxChat = document.getElementById('tab-btn-sandbox-chat');
  const tabBtnSandboxCode = document.getElementById('tab-btn-sandbox-code');
  const btnSandboxVpDesktop = document.getElementById('btn-sandbox-vp-desktop');
  const btnSandboxVpMobile = document.getElementById('btn-sandbox-vp-mobile');
  const btnSandboxRunCode = document.getElementById('btn-sandbox-run-code');
  const btnSandboxRevertCode = document.getElementById('btn-sandbox-revert-code');
  const btnSandboxCopyCode = document.getElementById('btn-sandbox-copy-code');
  const btnSandboxExportToggle = document.getElementById('btn-sandbox-export-toggle');
  const btnSandboxDownload = document.getElementById('btn-sandbox-download');
  const btnSandboxHistoryToggle = document.getElementById('btn-sandbox-history-toggle');
  const btnCloseSandboxHistory = document.getElementById('btn-close-sandbox-history');
  const btnClearSandboxHistory = document.getElementById('btn-clear-sandbox-history');
  const btnCloseExportModal = document.getElementById('btn-close-export-modal');
  const btnCancelExportModal = document.getElementById('btn-cancel-export-modal');
  const btnExportZip = document.getElementById('btn-export-zip');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnCopySandboxPublishedLink = document.getElementById('btn-copy-sandbox-published-link');

  const openStudio = () => openSandboxStudio();

  if (btnTopbarSandbox) btnTopbarSandbox.addEventListener('click', openStudio);
  if (btnSidebarCreateSandbox) btnSidebarCreateSandbox.addEventListener('click', () => openSandboxStudio());
  if (btnSandboxStudioBack) btnSandboxStudioBack.addEventListener('click', closeSandboxStudio);
  if (btnSandboxNew) btnSandboxNew.addEventListener('click', resetSandboxStudio);

  if (btnSandboxReload) {
    btnSandboxReload.addEventListener('click', () => {
      if (currentSandboxApp.code) {
        updateSandboxIframe(currentSandboxApp.code);
        showToast('Preview refreshed');
      }
    });
  }

  if (btnSandboxPublish) btnSandboxPublish.addEventListener('click', publishSandboxApp);
  if (btnSandboxGenerate) btnSandboxGenerate.addEventListener('click', handleSandboxInitialGenerate);
  if (btnSandboxIterationSubmit) btnSandboxIterationSubmit.addEventListener('click', handleSandboxIterate);

  if (tabBtnSandboxChat) tabBtnSandboxChat.addEventListener('click', () => switchSandboxSubTab('chat'));
  if (tabBtnSandboxCode) tabBtnSandboxCode.addEventListener('click', () => switchSandboxSubTab('code'));

  const iframe = document.getElementById('sandbox-studio-iframe');
  if (btnSandboxVpDesktop && btnSandboxVpMobile && iframe) {
    btnSandboxVpDesktop.addEventListener('click', () => {
      btnSandboxVpDesktop.classList.add('active');
      btnSandboxVpMobile.classList.remove('active');
      iframe.classList.remove('mobile-viewport');
    });
    btnSandboxVpMobile.addEventListener('click', () => {
      btnSandboxVpMobile.classList.add('active');
      btnSandboxVpDesktop.classList.remove('active');
      iframe.classList.add('mobile-viewport');
    });
  }

  // Code editor listeners
  const editor = document.getElementById('sandbox-code-editor');
  if (editor) {
    editor.addEventListener('input', () => {
      updateEditorLineNumbers();
      sandboxIsDirty = true;
      const status = document.getElementById('sandbox-editor-status');
      if (status) status.textContent = 'Modified (unsaved)';
    });
    editor.addEventListener('scroll', syncEditorScroll);
  }

  if (btnSandboxRunCode) {
    btnSandboxRunCode.addEventListener('click', () => {
      if (!editor) return;
      currentSandboxApp.code = editor.value;
      updateSandboxIframe(currentSandboxApp.code);
      saveSandboxAppToHistory(currentSandboxApp);
      const status = document.getElementById('sandbox-editor-status');
      if (status) status.textContent = 'Running saved code';
      showToast('⚡ Running updated code in preview!');
    });
  }

  if (btnSandboxRevertCode) {
    btnSandboxRevertCode.addEventListener('click', () => {
      if (editor && sandboxOriginalAiCode) {
        editor.value = sandboxOriginalAiCode;
        updateEditorLineNumbers();
        currentSandboxApp.code = sandboxOriginalAiCode;
        updateSandboxIframe(sandboxOriginalAiCode);
        const status = document.getElementById('sandbox-editor-status');
        if (status) status.textContent = 'Reverted to AI version';
        showToast('Reverted to AI generated code');
      }
    });
  }

  if (btnSandboxCopyCode) {
    btnSandboxCopyCode.addEventListener('click', () => {
      if (!currentSandboxApp.code) return;
      navigator.clipboard.writeText(currentSandboxApp.code);
      showToast('Codebase copied to clipboard');
    });
  }

  if (btnSandboxExportToggle || btnSandboxDownload) {
    const handler = () => openSandboxExportModal(currentSandboxApp);
    if (btnSandboxExportToggle) btnSandboxExportToggle.addEventListener('click', handler);
    if (btnSandboxDownload) btnSandboxDownload.addEventListener('click', handler);
  }

  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeSandboxExportModal);
  if (btnCancelExportModal) btnCancelExportModal.addEventListener('click', closeSandboxExportModal);
  if (btnExportZip) btnExportZip.addEventListener('click', () => exportSandboxZip(activeExportApp || currentSandboxApp));
  if (btnExportHtml) btnExportHtml.addEventListener('click', () => exportSandboxHtml(activeExportApp || currentSandboxApp));

  // History Drawer
  if (btnSandboxHistoryToggle) {
    btnSandboxHistoryToggle.addEventListener('click', toggleSandboxHistoryDrawer);
  }
  if (btnCloseSandboxHistory) {
    btnCloseSandboxHistory.addEventListener('click', closeSandboxHistoryDrawer);
  }
  if (btnClearSandboxHistory) {
    btnClearSandboxHistory.addEventListener('click', clearSandboxHistory);
  }

  if (btnCopySandboxPublishedLink) {
    btnCopySandboxPublishedLink.addEventListener('click', () => {
      if (currentSandboxApp.publishedUrl) {
        navigator.clipboard.writeText(currentSandboxApp.publishedUrl);
        showToast('Published link copied!');
      }
    });
  }

  renderSidebarSandboxAppsList();
  renderSandboxHistoryBadge();
}

export function openSandboxStudio(initialApp = null) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('mobile-open');
  }

  const chatTopbar = document.getElementById('chat-topbar');
  const messagesContainer = document.getElementById('messages-container');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');
  const artifactsPane = document.getElementById('artifacts-pane');
  const projectStudioView = document.getElementById('project-studio-view');
  const sandboxStudioView = document.getElementById('sandbox-studio-view');

  if (chatTopbar) chatTopbar.style.display = 'none';
  if (messagesContainer) messagesContainer.style.display = 'none';
  if (inputAreaWrapper) inputAreaWrapper.style.display = 'none';
  if (btnScrollBottom) btnScrollBottom.style.display = 'none';
  if (artifactsPane) artifactsPane.style.display = 'none';
  if (projectStudioView) projectStudioView.style.display = 'none';

  if (sandboxStudioView) {
    sandboxStudioView.style.display = 'flex';
    sandboxStudioView.classList.add('mobile-pane-left');
    sandboxStudioView.classList.remove('mobile-pane-right');
  }

  renderSandboxHistoryBadge();

  if (initialApp && initialApp.code) {
    loadSandboxApp(initialApp.title || 'Web Application', initialApp.code, initialApp.prompt || '', initialApp.id || null, initialApp.turns || null);
  } else if (currentSandboxApp && currentSandboxApp.code) {
    renderSandboxStudioState();
  } else {
    resetSandboxStudio();
  }
  renderSidebarSandboxAppsList();
}

export function closeSandboxStudio() {
  const sandboxStudioView = document.getElementById('sandbox-studio-view');
  const chatTopbar = document.getElementById('chat-topbar');
  const messagesContainer = document.getElementById('messages-container');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');

  if (sandboxStudioView) sandboxStudioView.style.display = 'none';
  if (chatTopbar) chatTopbar.style.display = '';
  if (messagesContainer) messagesContainer.style.display = '';
  if (inputAreaWrapper) inputAreaWrapper.style.display = '';
  if (btnScrollBottom) btnScrollBottom.style.display = '';

  renderSidebarSandboxAppsList();
}

export function resetSandboxStudio() {
  currentSandboxApp.id = '';
  currentSandboxApp.title = '';
  currentSandboxApp.prompt = '';
  currentSandboxApp.code = '';
  currentSandboxApp.activeFileTab = 'all';
  currentSandboxApp.turns = [];
  currentSandboxApp.publishedUrl = null;
  sandboxOriginalAiCode = '';
  sandboxIsDirty = false;

  const title = document.getElementById('sandbox-header-title');
  const subtitle = document.getElementById('sandbox-header-subtitle');
  if (title) title.textContent = 'Web App Sandbox Studio';
  if (subtitle) subtitle.textContent = 'AI Codebase & Live Interactive Preview';

  const initialState = document.getElementById('sandbox-initial-state');
  const activeChat = document.getElementById('sandbox-active-chat');
  const standby = document.getElementById('sandbox-preview-standby');
  const frameWrap = document.getElementById('sandbox-preview-frame-wrap');
  const publishedBanner = document.getElementById('sandbox-published-banner');
  const iframe = document.getElementById('sandbox-studio-iframe');

  if (initialState) initialState.style.display = 'flex';
  if (activeChat) activeChat.style.display = 'none';
  if (standby) standby.style.display = 'flex';
  if (frameWrap) frameWrap.style.display = 'none';
  if (publishedBanner) publishedBanner.style.display = 'none';
  if (iframe) iframe.srcdoc = '';

  const initialPrompt = document.getElementById('sandbox-initial-prompt');
  if (initialPrompt) initialPrompt.value = '';

  renderSidebarSandboxAppsList();
  switchSandboxSubTab('chat');
}

export function switchSandboxSubTab(tab) {
  const tabBtnChat = document.getElementById('tab-btn-sandbox-chat');
  const tabBtnCode = document.getElementById('tab-btn-sandbox-code');
  const paneChat = document.getElementById('sandbox-pane-chat');
  const paneCode = document.getElementById('sandbox-pane-code');

  if (tab === 'chat') {
    tabBtnChat?.classList.add('active');
    tabBtnCode?.classList.remove('active');
    if (paneChat) paneChat.style.display = 'flex';
    if (paneCode) paneCode.style.display = 'none';
  } else {
    tabBtnCode?.classList.add('active');
    tabBtnChat?.classList.remove('active');
    if (paneChat) paneChat.style.display = 'none';
    if (paneCode) paneCode.style.display = 'flex';
    renderSandboxCodeView();
  }
}

export function loadSandboxApp(title, code, prompt = '', existingId = null, existingTurns = null) {
  currentSandboxApp.id = existingId || ('sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  expandedSandboxIds.add(currentSandboxApp.id);
  currentSandboxApp.title = title || 'Interactive Web Application';
  currentSandboxApp.prompt = prompt || (existingTurns && existingTurns[0]?.text) || '';
  currentSandboxApp.code = code;
  currentSandboxApp.publishedUrl = null;
  sandboxOriginalAiCode = code;

  if (existingTurns && existingTurns.length > 0) {
    currentSandboxApp.turns = existingTurns;
  } else if (prompt) {
    currentSandboxApp.turns = [
      { sender: 'user', text: prompt },
      { sender: 'ai', text: `Generated **${currentSandboxApp.title}** with full responsive layout and interactivity.` }
    ];
  } else {
    currentSandboxApp.turns = [
      { sender: 'ai', text: `Loaded **${currentSandboxApp.title}** into Sandbox Studio.` }
    ];
  }

  saveSandboxAppToHistory(currentSandboxApp);
  renderSandboxStudioState();
}

export function updateSandboxIframe(code) {
  const iframe = document.getElementById('sandbox-studio-iframe');
  if (!iframe) return;
  iframe.srcdoc = prepareExecutableHtml(code, 'html');
}

export function renderSandboxStudioState() {
  if (!currentSandboxApp.code) {
    resetSandboxStudio();
    return;
  }

  const title = document.getElementById('sandbox-header-title');
  const subtitle = document.getElementById('sandbox-header-subtitle');
  if (title) title.textContent = currentSandboxApp.title;
  if (subtitle) subtitle.textContent = 'Live Interactive Preview Active';

  const initialState = document.getElementById('sandbox-initial-state');
  const activeChat = document.getElementById('sandbox-active-chat');
  const standby = document.getElementById('sandbox-preview-standby');
  const frameWrap = document.getElementById('sandbox-preview-frame-wrap');

  if (initialState) initialState.style.display = 'none';
  if (activeChat) activeChat.style.display = 'flex';
  if (standby) standby.style.display = 'none';
  if (frameWrap) frameWrap.style.display = 'flex';

  updateSandboxIframe(currentSandboxApp.code);
  renderSandboxMessages();
  renderSandboxCodeView();
}

export function renderSandboxMessages() {
  const thread = document.getElementById('sandbox-messages-thread');
  if (!thread) return;
  thread.innerHTML = '';

  currentSandboxApp.turns.forEach(turn => {
    const bubble = document.createElement('div');
    bubble.className = `sandbox-chat-bubble ${turn.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;

    if (turn.sender === 'user') {
      bubble.textContent = turn.text;
    } else {
      const header = document.createElement('div');
      header.className = 'sandbox-building-header';
      header.style.marginBottom = '0.5rem';
      header.innerHTML = `
        <div class="sandbox-building-icon-wrap" style="width:24px;height:24px;font-size:0.75rem;background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.3);animation:none;">✓</div>
        <div class="sandbox-building-title" style="font-size:0.85rem;color:var(--text-primary);">${escapeHtml(currentSandboxApp.title || 'AI Web App Architect')}</div>
      `;
      bubble.appendChild(header);

      const textSpan = document.createElement('div');
      textSpan.innerHTML = formatMarkdown(turn.text);
      bubble.appendChild(textSpan);

      const fileBadge = document.createElement('div');
      fileBadge.className = 'sandbox-card-files';
      fileBadge.style.marginTop = '0.5rem';
      fileBadge.innerHTML = `
        <span class="sandbox-file-generation-badge">📄 index.html</span>
        <span class="sandbox-file-generation-badge">🎨 style.css</span>
        <span class="sandbox-file-generation-badge">⚡ script.js</span>
      `;
      bubble.appendChild(fileBadge);
    }

    thread.appendChild(bubble);
  });

  thread.scrollTop = thread.scrollHeight;
}

export function renderSandboxCodeView() {
  const editor = document.getElementById('sandbox-code-editor');
  const stats = document.getElementById('sandbox-code-stats');
  if (!editor) return;

  editor.value = currentSandboxApp.code || '';
  updateEditorLineNumbers();

  const lines = (editor.value.match(/\n/g) || []).length + 1;
  if (stats) stats.textContent = `${lines} lines`;
}

function updateEditorLineNumbers() {
  const editor = document.getElementById('sandbox-code-editor');
  const gutter = document.getElementById('sandbox-editor-gutter');
  if (!editor || !gutter) return;

  const linesCount = (editor.value.match(/\n/g) || []).length + 1;
  const numbers = [];
  for (let i = 1; i <= linesCount; i++) {
    numbers.push(i);
  }
  gutter.textContent = numbers.join('\n');
}

function syncEditorScroll() {
  const editor = document.getElementById('sandbox-code-editor');
  const gutter = document.getElementById('sandbox-editor-gutter');
  if (editor && gutter) {
    gutter.scrollTop = editor.scrollTop;
  }
}

export async function handleSandboxInitialGenerate() {
  const promptInput = document.getElementById('sandbox-initial-prompt');
  const prompt = promptInput ? promptInput.value.trim() : '';
  if (!prompt) {
    showToast('Please describe the application you want to build.');
    return;
  }

  showToast('Generating application codebase...');
  await executeSandboxAiGeneration(prompt, true);
}

export async function handleSandboxIterate() {
  const input = document.getElementById('sandbox-iteration-input');
  const prompt = input ? input.value.trim() : '';
  if (!prompt) return;

  input.value = '';
  await executeSandboxAiGeneration(prompt, false);
}

async function executeSandboxAiGeneration(prompt, isInitial = false) {
  if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
    showToast('Puter AI not ready. Please check connection.');
    return;
  }

  const indicator = document.getElementById('sandbox-status-indicator');
  const statusText = document.getElementById('sandbox-status-text');
  if (indicator) indicator.style.display = 'flex';
  if (statusText) statusText.textContent = isInitial ? 'Architecting application files...' : 'Applying code modifications...';

  try {
    const systemPrompt = `You are an elite principal web application engineer.
Create a complete, fully functional, standalone single-file HTML web application with embedded <style> and <script>.
Requirements:
1. Deliver ONLY a single contiguous \`\`\`html code block.
2. Full interactivity, responsive layout, and beautiful styling.
3. No external backend dependencies. Include mock data and sound effects if applicable.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: isInitial ? prompt : `Current code:\n\`\`\`html\n${currentSandboxApp.code}\n\`\`\`\n\nModification requested: ${prompt}` }
    ];

    const response = await puter.ai.chat(messages, { model: 'gemini-2.5-flash', temperature: 0.7 });
    let raw = typeof response === 'string' ? response : (response?.message?.content || response?.text || '');
    if (!raw && response?.choices) raw = response.choices[0]?.message?.content || '';

    const match = raw.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
    const generatedCode = match ? match[1].trim() : raw.trim();

    if (generatedCode) {
      const appTitle = prompt.length > 32 ? prompt.slice(0, 32) + '...' : prompt;
      if (isInitial) {
        currentSandboxApp.id = 'sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        expandedSandboxIds.add(currentSandboxApp.id);
        currentSandboxApp.title = appTitle;
        currentSandboxApp.prompt = prompt;
        currentSandboxApp.code = generatedCode;
        currentSandboxApp.turns = [
          { sender: 'user', text: prompt },
          { sender: 'ai', text: `Built **${appTitle}** with responsive design and modern controls.` }
        ];
      } else {
        currentSandboxApp.code = generatedCode;
        currentSandboxApp.turns.push({ sender: 'user', text: prompt });
        currentSandboxApp.turns.push({ sender: 'ai', text: `Updated application based on: "${prompt}".` });
      }

      saveSandboxAppToHistory(currentSandboxApp);
      renderSandboxStudioState();
      showToast('✨ Web application generated successfully!');
    }
  } catch (err) {
    console.error('Sandbox AI generation error:', err);
    showToast('Failed to generate app: ' + (err.message || 'Unknown error'));
  } finally {
    if (indicator) indicator.style.display = 'none';
  }
}

export function saveSandboxAppToHistory(appData) {
  if (!appData || !appData.code) return;
  const history = getSandboxHistory();
  const id = appData.id || ('sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  appData.id = id;

  const existingIdx = history.findIndex(h => h.id === id);
  const entry = {
    id,
    title: appData.title || 'Web Application',
    prompt: appData.prompt || (appData.turns && appData.turns[0]?.text) || 'Application',
    code: appData.code,
    createdAt: existingIdx !== -1 ? (history[existingIdx].createdAt || Date.now()) : Date.now(),
    updatedAt: Date.now(),
    turns: appData.turns || [],
    publishedUrl: appData.publishedUrl || null
  };

  if (existingIdx !== -1) history[existingIdx] = entry;
  else history.unshift(entry);

  if (history.length > 50) history.length = 50;

  try {
    localStorage.setItem(SANDBOX_HISTORY_STORAGE_KEY, JSON.stringify(history));
    if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
      puter.kv.set(SANDBOX_HISTORY_STORAGE_KEY, history).catch(() => {});
    }
  } catch (e) {
    console.warn('Failed to save sandbox history:', e);
  }

  renderSidebarSandboxAppsList();
  renderSandboxHistoryBadge();
}

export function getSandboxHistory() {
  try {
    const raw = localStorage.getItem(SANDBOX_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function renderSidebarSandboxAppsList() {
  const container = document.getElementById('sidebar-sandbox-list');
  const countBadge = document.getElementById('sidebar-sandbox-count-badge');
  if (!container) return;

  const history = getSandboxHistory();
  if (countBadge) countBadge.textContent = history.length;

  container.innerHTML = '';
  if (history.length === 0) {
    container.innerHTML = `
      <div style="padding: 0.5rem 0.75rem; font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
        No apps built yet.
      </div>
    `;
    return;
  }

  history.forEach(app => {
    const isActive = currentSandboxApp.id === app.id;
    const titleText = app.title || 'Web Application';
    const item = document.createElement('div');
    item.className = 'sidebar-sandbox-item' + (isActive ? ' active' : '');
    item.setAttribute('title', titleText);
    item.innerHTML = `
      <div class="sidebar-sandbox-item-row">
        <span class="sandbox-item-icon">⚡</span>
        <span class="sandbox-item-title" title="${escapeHtml(titleText)}">${escapeHtml(titleText)}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      openSandboxStudio(app);
    });

    container.appendChild(item);
  });
}

function renderSandboxHistoryBadge() {
  const badge = document.getElementById('sandbox-history-count-badge');
  if (badge) {
    badge.textContent = getSandboxHistory().length;
  }
}

function toggleSandboxHistoryDrawer() {
  const drawer = document.getElementById('sandbox-history-drawer');
  if (!drawer) return;
  drawer.style.display = (drawer.style.display === 'none' || !drawer.style.display) ? 'block' : 'none';
  renderSandboxHistoryList();
}

function closeSandboxHistoryDrawer() {
  const drawer = document.getElementById('sandbox-history-drawer');
  if (drawer) drawer.style.display = 'none';
}

function renderSandboxHistoryList(filterText = '') {
  const list = document.getElementById('sandbox-history-list');
  if (!list) return;
  list.innerHTML = '';

  const history = getSandboxHistory().filter(h => {
    if (!filterText) return true;
    return (h.title || '').toLowerCase().includes(filterText.toLowerCase());
  });

  if (history.length === 0) {
    list.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:0.82rem;text-align:center;">No build history found.</div>';
    return;
  }

  history.forEach(app => {
    const card = document.createElement('div');
    card.className = 'sandbox-history-card';
    card.innerHTML = `
      <div style="font-weight:600;font-size:0.88rem;color:var(--text-primary);margin-bottom:0.25rem;">${escapeHtml(app.title)}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);">${(app.turns || []).length} conversational iterations</div>
    `;
    card.addEventListener('click', () => {
      openSandboxStudio(app);
      closeSandboxHistoryDrawer();
    });
    list.appendChild(card);
  });
}

function clearSandboxHistory() {
  if (!confirm('Clear all web app build history?')) return;
  localStorage.removeItem(SANDBOX_HISTORY_STORAGE_KEY);
  resetSandboxStudio();
  renderSidebarSandboxAppsList();
  renderSandboxHistoryBadge();
  closeSandboxHistoryDrawer();
  showToast('Build history cleared');
}

export async function publishSandboxApp() {
  if (!currentSandboxApp.code) {
    showToast('No code to publish.');
    return;
  }

  if (typeof puter === 'undefined') {
    showToast('Puter SDK not loaded.');
    return;
  }

  const btnPublish = document.getElementById('btn-sandbox-publish');
  const banner = document.getElementById('sandbox-published-banner');
  const link = document.getElementById('sandbox-published-link');

  try {
    if (!puter.auth.isSignedIn()) {
      showToast('Please sign in with Puter to publish your app.');
      const signedIn = await puter.auth.signIn();
      if (!signedIn || !puter.auth.isSignedIn()) return;
    }

    if (btnPublish) btnPublish.disabled = true;
    showToast('Publishing app live to Puter Cloud...');

    const baseSlug = (currentSandboxApp.title || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 16) || 'app';
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const subdomain = `${baseSlug}-${randomSuffix}`;
    const dirPath = `hosted_apps/${subdomain}`;

    await puter.fs.mkdir(dirPath, { createMissingParents: true });
    const htmlContent = prepareExecutableHtml(currentSandboxApp.code, 'html');
    await puter.fs.write(`${dirPath}/index.html`, htmlContent);

    const site = await puter.hosting.create(subdomain, dirPath);
    const publishedUrl = site && site.subdomain
      ? `https://${site.subdomain}.puter.site`
      : `https://${subdomain}.puter.site`;

    currentSandboxApp.publishedUrl = publishedUrl;
    saveSandboxAppToHistory(currentSandboxApp);

    if (banner && link) {
      link.href = publishedUrl;
      link.textContent = publishedUrl;
      banner.style.display = 'flex';
    }

    showToast(`🎉 Live at ${publishedUrl}!`, 5000);
  } catch (err) {
    console.error('Failed to publish app:', err);
    showToast('Publishing failed: ' + (err.message || 'Unknown error'));
  } finally {
    if (btnPublish) btnPublish.disabled = false;
  }
}

export function openSandboxExportModal(app) {
  activeExportApp = app || currentSandboxApp;
  const modal = document.getElementById('sandbox-export-modal');
  const title = document.getElementById('export-app-title');
  if (modal) {
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('active');
  }
  if (title) title.textContent = activeExportApp.title || 'Web Application';
}

export function closeSandboxExportModal() {
  const modal = document.getElementById('sandbox-export-modal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    if (!modal.classList.contains('active')) modal.style.display = 'none';
  }, 200);
}

export function exportSandboxHtml(app) {
  if (!app || !app.code) return;
  const blob = new Blob([prepareExecutableHtml(app.code, 'html')], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(app.title || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
  closeSandboxExportModal();
  showToast('Downloaded standalone HTML file');
}

export function exportSandboxZip(app) {
  if (!app || !app.code) return;
  if (typeof JSZip === 'undefined') {
    exportSandboxHtml(app);
    return;
  }
  const zip = new JSZip();
  zip.file('index.html', prepareExecutableHtml(app.code, 'html'));
  zip.generateAsync({ type: 'blob' }).then(content => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(app.title || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    closeSandboxExportModal();
    showToast('Downloaded ZIP project bundle');
  });
}

