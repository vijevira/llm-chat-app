/**
 * Omni Chat - Root Application Orchestrator
 * Bootstraps modular ES components, registers theme, modals, and Puter Cloud sync.
 */

import { STORAGE_KEY_THEME, STORAGE_KEY_MODEL } from './config/constants.js';
import { CURATED_MODELS, getModelById, getProviderBadgeClass } from './config/models.js';
import { appState, loadTombstones, loadSettingsFromStorage, saveSettingsToStorage } from './state/app-state.js';
import { initMarkdownRenderer } from './utils/markdown.js';
import { showToast, escapeHtml, initImageLightbox } from './utils/helpers.js';

import { openModal, closeModal, initModalTabs, initModalGlobalDismissal } from './modules/modals.js';
import { initPluginsManager } from './modules/plugins-manager.js';
import { initArtifactsPane, closeArtifact } from './modules/artifacts-pane.js';
import { initProjectStudio } from './modules/project-studio.js';
import { initSandboxStudio, closeSandboxExportModal } from './modules/sandbox-studio.js';
import { initExploreAppsModal } from './modules/explore-apps.js';
import { initSessionManager, renderSessionList, renderActiveSession, createNewSession } from './modules/session-manager.js';
import { initChatController } from './modules/chat-controller.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMarkdownRenderer();
  initImageLightbox();
  loadTombstones();
  loadSettingsFromStorage();

  initModalTabs();
  initModalGlobalDismissal({
    closeSandboxExport: closeSandboxExportModal,
    closeArtifact: closeArtifact
  });

  initSidebar();
  initModelPicker();
  initSettingsModal();

  initPluginsManager();
  initArtifactsPane();
  initProjectStudio();
  initSandboxStudio();
  initExploreAppsModal();
  initSessionManager();
  initChatController();

  initPuter();
});

function initTheme() {
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  setTheme(savedTheme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  const sun = document.getElementById('theme-icon-sun');
  const moon = document.getElementById('theme-icon-moon');
  if (sun && moon) {
    sun.style.display = theme === 'dark' ? 'block' : 'none';
    moon.style.display = theme === 'dark' ? 'none' : 'block';
  }
}

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btnToggle = document.getElementById('btn-toggle-sidebar');
  const btnClose = document.getElementById('btn-close-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const brandLink = document.getElementById('brand-link');

  const closeSidebar = () => {
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('mobile-open');
    } else {
      sidebar.classList.add('closed');
      document.body.classList.add('sidebar-closed');
      try {
        localStorage.setItem('omni_sidebar_closed', 'true');
      } catch (e) {
        // ignore
      }
    }
  };

  const openSidebar = () => {
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      sidebar.classList.add('mobile-open');
    } else {
      sidebar.classList.remove('closed');
      document.body.classList.remove('sidebar-closed');
      try {
        localStorage.setItem('omni_sidebar_closed', 'false');
      } catch (e) {
        // ignore
      }
    }
  };

  const toggleSidebar = () => {
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      const isOpen = sidebar.classList.contains('mobile-open');
      if (isOpen) closeSidebar();
      else openSidebar();
    } else {
      const isClosed = sidebar.classList.contains('closed');
      if (isClosed) openSidebar();
      else closeSidebar();
    }
  };

  if (btnToggle) btnToggle.addEventListener('click', toggleSidebar);
  if (btnClose) btnClose.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', () => sidebar?.classList.remove('mobile-open'));

  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      createNewSession();
    });
  }

  // Restore desktop preference
  try {
    if (window.innerWidth > 768 && localStorage.getItem('omni_sidebar_closed') === 'true') {
      sidebar?.classList.add('closed');
      document.body.classList.add('sidebar-closed');
    }
  } catch (e) {
    // ignore
  }
}

function initModelPicker() {
  const btnPicker = document.getElementById('btn-model-picker');
  const btnChatPicker = document.getElementById('btn-chat-model-picker');
  const modal = document.getElementById('model-modal');
  const btnClose = document.getElementById('btn-close-model-modal');
  const btnCancel = document.getElementById('btn-cancel-model-modal');
  const listEl = document.getElementById('models-list-container');
  const searchInput = document.getElementById('model-search-input');
  const providerPillsBar = document.getElementById('provider-pills-bar');
  const selectedName = document.getElementById('selected-model-name');
  const selectedProvider = document.getElementById('selected-model-provider');
  const chatModelName = document.getElementById('chat-model-name');

  let activeProviderFilter = 'all';

  const updateHeaderDisplay = () => {
    const m = getModelById(appState.settings.selectedModel);
    if (selectedName) selectedName.textContent = m.name;
    if (selectedProvider) selectedProvider.textContent = m.provider;
    if (chatModelName) chatModelName.textContent = m.name;
  };

  updateHeaderDisplay();

  const filterModels = (query = '', provider = 'all') => {
    const q = query.toLowerCase().trim();
    return CURATED_MODELS.filter(m => {
      // Provider filter
      if (provider !== 'all') {
        const pLower = (m.provider || '').toLowerCase();
        const idLower = (m.id || '').toLowerCase();
        if (provider === 'google' && !pLower.includes('google') && !idLower.includes('gemini')) return false;
        if (provider === 'openai' && !pLower.includes('openai') && !idLower.includes('gpt')) return false;
        if (provider === 'anthropic' && !pLower.includes('anthropic') && !idLower.includes('claude')) return false;
        if (provider === 'deepseek' && !pLower.includes('deepseek')) return false;
        if (provider === 'xai' && !pLower.includes('xai') && !idLower.includes('grok')) return false;
        if (provider === 'meta' && !pLower.includes('meta') && !idLower.includes('llama')) return false;
        if (provider === 'mistral' && !pLower.includes('mistral')) return false;
      }

      // Query filter
      if (q) {
        return (m.id && m.id.toLowerCase().includes(q)) ||
               (m.name && m.name.toLowerCase().includes(q)) ||
               (m.provider && m.provider.toLowerCase().includes(q)) ||
               (m.description && m.description.toLowerCase().includes(q));
      }
      return true;
    });
  };

  const renderList = () => {
    if (!listEl) return;
    const query = searchInput ? searchInput.value : '';
    const filtered = filterModels(query, activeProviderFilter);

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
          No matching models found. Try another search or provider.
        </div>
      `;
      return;
    }

    // Group models by Provider
    const groups = {};
    filtered.forEach(m => {
      const prov = m.provider || 'Other';
      if (!groups[prov]) groups[prov] = [];
      groups[prov].push(m);
    });

    const providerOrder = ['Google', 'OpenAI', 'Anthropic', 'DeepSeek', 'xAI', 'Meta', 'Mistral'];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const idxA = providerOrder.indexOf(a);
      const idxB = providerOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    listEl.innerHTML = '';
    sortedKeys.forEach(prov => {
      const header = document.createElement('div');
      header.className = 'model-group-header';
      header.textContent = `${prov} (${groups[prov].length})`;
      listEl.appendChild(header);

      groups[prov].forEach(m => {
        const isSelected = m.id === appState.settings.selectedModel;
        const item = document.createElement('div');
        item.className = 'model-option-item' + (isSelected ? ' selected' : '');
        item.setAttribute('data-model-id', m.id);

        const isReasoning = (m.id.includes('r1') || m.id.includes('reasoning') || m.id.includes('3.7') || m.id.includes('3.8'));

        item.innerHTML = `
          <div class="model-option-info">
            <div class="model-option-name">${escapeHtml(m.name)}</div>
            <div class="model-option-id">${escapeHtml(m.id)}</div>
          </div>
          <div class="model-badges-row">
            ${m.isCurated ? '<span class="badge-featured">Featured</span>' : ''}
            ${isReasoning ? '<span class="badge-reasoning">Reasoning</span>' : ''}
            <span class="model-provider-badge">${escapeHtml(m.provider)}</span>
          </div>
        `;

        item.addEventListener('click', () => {
          appState.settings.selectedModel = m.id;
          const cur = appState.sessions.find(s => s.id === appState.currentSessionId);
          if (cur) {
            cur.model = m.id;
          }
          saveSettingsToStorage();
          updateHeaderDisplay();
          closeModal(modal);
          showToast(`Switched model to ${m.name}`);
        });

        listEl.appendChild(item);
      });
    });
  };

  const openModelPicker = () => {
    if (searchInput) searchInput.value = '';
    activeProviderFilter = 'all';
    if (providerPillsBar) {
      providerPillsBar.querySelectorAll('.provider-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-provider') === 'all');
      });
    }
    openModal(modal);
    renderList();
    setTimeout(() => searchInput?.focus(), 60);
  };

  if (btnPicker && modal) {
    btnPicker.addEventListener('click', openModelPicker);
  }
  if (btnChatPicker && modal) {
    btnChatPicker.addEventListener('click', openModelPicker);
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => closeModal(modal));
  }
  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => closeModal(modal));
  }

  if (providerPillsBar) {
    providerPillsBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.provider-pill');
      if (!pill) return;
      providerPillsBar.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeProviderFilter = pill.getAttribute('data-provider') || 'all';
      renderList();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderList();
    });
  }
}

function initSettingsModal() {
  const btnSettings = document.getElementById('user-profile-bar');
  const modal = document.getElementById('settings-modal');
  const btnClose = document.getElementById('btn-close-settings-modal');
  const btnCancel = document.getElementById('btn-cancel-settings-modal');
  const btnSave = document.getElementById('btn-save-settings');
  const promptInput = document.getElementById('setting-system-prompt');
  const tempInput = document.getElementById('setting-temperature');
  const tempVal = document.getElementById('temp-val-display');

  if (btnSettings && modal) {
    btnSettings.addEventListener('click', () => {
      if (promptInput) promptInput.value = appState.settings.systemPrompt;
      if (tempInput) tempInput.value = appState.settings.temperature;
      if (tempVal) tempVal.textContent = appState.settings.temperature;
      openModal(modal);
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => closeModal(modal));
  }
  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => closeModal(modal));
  }

  if (tempInput && tempVal) {
    tempInput.addEventListener('input', () => {
      tempVal.textContent = tempInput.value;
    });
  }

  if (btnSave && modal) {
    btnSave.addEventListener('click', () => {
      if (promptInput) appState.settings.systemPrompt = promptInput.value;
      if (tempInput) appState.settings.temperature = parseFloat(tempInput.value) || 0.7;
      saveSettingsToStorage();
      closeModal(modal);
      showToast('Settings saved');
    });
  }
}

async function initPuter() {
  if (typeof puter === 'undefined') return;
  try {
    if (puter.auth && puter.auth.isSignedIn()) {
      appState.puterUser = await puter.auth.getUser();
      const userName = document.getElementById('user-name');
      const userTier = document.getElementById('user-tier');
      const userAvatar = document.getElementById('user-avatar');
      if (userName && appState.puterUser) {
        userName.textContent = appState.puterUser.username || 'Puter User';
      }
      if (userTier) userTier.textContent = 'Puter Cloud Connected';
      if (userAvatar && appState.puterUser?.username) {
        userAvatar.textContent = appState.puterUser.username.charAt(0).toUpperCase();
      }
    }
  } catch (err) {
    console.warn('Puter auth check:', err);
  }
}

