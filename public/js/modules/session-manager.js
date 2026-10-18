/**
 * Omni Chat - Session & Conversations Manager Module
 * Handles session switching, hierarchical project chat grouping, inline renames,
 * and persistence.
 */

import { appState, saveTombstones } from '../state/app-state.js';
import { STORAGE_KEY_SESSIONS } from '../config/constants.js';
import { escapeHtml, showToast, formatDate } from '../utils/helpers.js';
import { formatMarkdown } from '../utils/markdown.js';
import { renderActiveProjectPill, closeProjectStudio, renderProjectsList } from './project-studio.js';
import { closeSandboxStudio } from './sandbox-studio.js';

export function initSessionManager() {
  const btnNewChat = document.getElementById('btn-new-chat');
  if (btnNewChat) btnNewChat.addEventListener('click', () => createNewSession());

  initTopbarRename();
  loadSessionsFromStorage();
}

export function loadSessionsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState.sessions = parsed.filter(s => s && s.id && !appState.deletedSessionIds.has(s.id));
    }
  } catch (err) {
    console.warn('Failed to load sessions from storage:', err);
  }

  restoreActiveSession();
}

export function persistSessions() {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(appState.sessions));
    if (typeof puter !== 'undefined' && puter.kv) {
      puter.kv.set(STORAGE_KEY_SESSIONS, JSON.stringify(appState.sessions)).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to persist sessions:', err);
  }
}

export function createNewSession(projectId = null) {
  if (appState.activeAbortController) {
    appState.activeAbortController.abort();
    appState.activeAbortController = null;
  }
  closeSandboxStudio();
  closeProjectStudio();
  appState.activeProjectId = projectId;

  const newSession = {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    title: projectId ? 'New Project Chat' : 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: appState.settings.selectedModel,
    projectId: projectId,
    messages: []
  };

  appState.sessions.unshift(newSession);
  appState.currentSessionId = newSession.id;

  persistSessions();
  renderActiveProjectPill();
  renderProjectsList();
  renderSessionList();
  renderActiveSession();

  const textarea = document.getElementById('chat-textarea');
  if (textarea) textarea.focus();

  closeSidebarIfMobile();
}

export function switchSession(id) {
  if (appState.activeAbortController) {
    appState.activeAbortController.abort();
    appState.activeAbortController = null;
  }
  closeSandboxStudio();
  closeProjectStudio();

  appState.currentSessionId = id;
  const session = appState.sessions.find(s => s.id === id);
  if (session) {
    appState.activeProjectId = session.projectId || null;
  } else {
    appState.activeProjectId = null;
  }

  renderActiveProjectPill();
  renderProjectsList();
  renderSessionList();
  renderActiveSession();
  closeSidebarIfMobile();
}

export function deleteSession(id, e) {
  if (e) e.stopPropagation();
  appState.deletedSessionIds.add(id);
  saveTombstones();

  appState.sessions = appState.sessions.filter(s => s.id !== id);

  if (appState.currentSessionId === id) {
    if (appState.sessions.length > 0) {
      appState.currentSessionId = appState.sessions[0].id;
      appState.activeProjectId = appState.sessions[0].projectId || null;
    } else {
      createNewSession();
      return;
    }
  }

  persistSessions();
  renderActiveProjectPill();
  renderSessionList();
  renderActiveSession();
  showToast('Conversation deleted');
}

export function restoreActiveSession() {
  if (appState.currentSessionId) {
    const cur = appState.sessions.find(s => s.id === appState.currentSessionId);
    if (cur) {
      appState.activeProjectId = cur.projectId || null;
      renderActiveProjectPill();
      renderSessionList();
      renderActiveSession();
      return;
    }
  }

  if (appState.sessions.length > 0) {
    appState.currentSessionId = appState.sessions[0].id;
    appState.activeProjectId = appState.sessions[0].projectId || null;
  } else {
    createNewSession();
    return;
  }

  renderActiveProjectPill();
  renderSessionList();
  renderActiveSession();
}

export function renderSessionList() {
  const container = document.getElementById('chat-history-list');
  if (!container) return;
  container.innerHTML = '';

  if (appState.sessions.length === 0) {
    container.innerHTML = `
      <div style="padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--text-muted); font-style: italic;">
        No conversations yet. Start a new chat!
      </div>
    `;
    return;
  }

  appState.sessions.forEach(session => {
    const item = document.createElement('div');
    const isActive = session.id === appState.currentSessionId;
    item.className = 'chat-item' + (isActive ? ' active' : '');
    item.setAttribute('data-id', session.id);

    const proj = session.projectId ? appState.projects.find(p => p.id === session.projectId) : null;
    const iconHtml = proj
      ? `<span class="chat-item-proj-icon" title="Custom App: ${escapeHtml(proj.name)}">${proj.icon || '⚡'}</span>`
      : `<svg class="chat-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

    item.innerHTML = `
      <div class="chat-item-main">
        ${iconHtml}
        <span class="chat-item-title" title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</span>
      </div>
      <div class="chat-item-actions">
        <button class="icon-btn-xs btn-rename-chat" title="Rename" aria-label="Rename">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn-xs btn-delete-chat" title="Delete" aria-label="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    item.querySelector('.chat-item-main').addEventListener('click', () => {
      if (item.classList.contains('editing')) return;
      switchSession(session.id);
    });

    item.querySelector('.btn-delete-chat').addEventListener('click', (e) => {
      deleteSession(session.id, e);
    });

    item.querySelector('.btn-rename-chat').addEventListener('click', (e) => {
      e.stopPropagation();
      startSidebarInlineRename(item, session);
    });

    container.appendChild(item);
  });
}

export function startSidebarInlineRename(itemEl, session) {
  if (!itemEl || !session) return;
  itemEl.classList.add('editing');
  itemEl.innerHTML = `
    <div style="width:100%;display:flex;align-items:center;gap:4px;">
      <input type="text" class="chat-item-rename-input" value="${escapeHtml(session.title)}" style="flex:1;padding:0.25rem 0.4rem;font-size:0.8rem;border-radius:4px;border:1px solid var(--accent-color);background:var(--bg-primary);color:var(--text-primary);" />
      <button class="icon-btn-xs btn-save-rename" style="color:var(--success-color);">✓</button>
      <button class="icon-btn-xs btn-cancel-rename" style="color:var(--text-muted);">✕</button>
    </div>
  `;

  const input = itemEl.querySelector('.chat-item-rename-input');
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const val = input.value.trim();
    if (val && val !== session.title) {
      session.title = val;
      session.updatedAt = Date.now();
      persistSessions();
      showToast(`Renamed to "${val}"`);
    }
    renderSessionList();
    renderActiveSession();
  };

  itemEl.querySelector('.btn-save-rename').addEventListener('click', commit);
  itemEl.querySelector('.btn-cancel-rename').addEventListener('click', () => renderSessionList());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    else if (e.key === 'Escape') renderSessionList();
  });
}

export function renderActiveSession() {
  const session = appState.sessions.find(s => s.id === appState.currentSessionId);
  const welcomeView = document.getElementById('welcome-container');
  const messagesInner = document.getElementById('messages-inner');
  const topbarChatTitle = document.getElementById('topbar-chat-title');
  const topbarTitle = document.getElementById('topbar-title-display');

  if (!session) return;

  if (topbarChatTitle) {
    topbarChatTitle.textContent = session.title || 'Omni Chat';
  } else if (topbarTitle) {
    topbarTitle.textContent = session.title || 'Omni Chat';
  }

  if (!messagesInner) return;

  // Clear messages except welcome view
  const msgElements = messagesInner.querySelectorAll('.message-wrapper');
  msgElements.forEach(el => el.remove());

  if (!session.messages || session.messages.length === 0) {
    if (welcomeView) welcomeView.style.display = 'flex';
    return;
  }

  if (welcomeView) welcomeView.style.display = 'none';

  session.messages.forEach((msg, idx) => {
    renderMessageBubble(msg, idx, messagesInner);
  });

  const container = document.getElementById('messages-container');
  if (container) container.scrollTop = container.scrollHeight;
}

function renderMessageBubble(msg, idx, container) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${msg.role}`;

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${msg.role}`;

  if (msg.role === 'user') {
    bubble.textContent = msg.content;
  } else {
    bubble.className += ' markdown-body';
    bubble.innerHTML = formatMarkdown(msg.content);
  }

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
}

function closeSidebarIfMobile() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('mobile-open');
  }
}

function initTopbarRename() {
  const btnRename = document.getElementById('btn-rename-topbar');
  const titleDisplay = document.getElementById('topbar-title-display');
  const renameForm = document.getElementById('topbar-rename-form');
  const renameInput = document.getElementById('topbar-rename-input');
  const btnSave = document.getElementById('btn-save-topbar-rename');
  const btnCancel = document.getElementById('btn-cancel-topbar-rename');

  if (!btnRename || !titleDisplay || !renameForm || !renameInput) return;

  const showForm = () => {
    const curSession = appState.sessions.find(s => s.id === appState.currentSessionId);
    if (!curSession) return;
    renameInput.value = curSession.title || '';
    titleDisplay.style.display = 'none';
    renameForm.style.display = 'flex';
    renameInput.focus();
    renameInput.select();
  };

  const hideForm = () => {
    renameForm.style.display = 'none';
    titleDisplay.style.display = 'flex';
  };

  const saveRename = () => {
    const curSession = appState.sessions.find(s => s.id === appState.currentSessionId);
    if (!curSession) {
      hideForm();
      return;
    }
    const val = renameInput.value.trim();
    if (val && val !== curSession.title) {
      curSession.title = val;
      curSession.updatedAt = Date.now();
      persistSessions();
      showToast(`Renamed to "${val}"`);
    }
    hideForm();
    renderSessionList();
    renderActiveSession();
  };

  btnRename.addEventListener('click', showForm);
  if (btnSave) btnSave.addEventListener('click', saveRename);
  if (btnCancel) btnCancel.addEventListener('click', hideForm);
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveRename();
    else if (e.key === 'Escape') hideForm();
  });
}

