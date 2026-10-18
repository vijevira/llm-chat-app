/**
 * Omni Chat - Root Application Orchestrator
 * Bootstraps modular ES components, registers theme, modals, and Puter Cloud sync.
 */

import { STORAGE_KEY_THEME, STORAGE_KEY_MODEL } from './config/constants.js';
import { CURATED_MODELS, getModelById, getProviderBadgeClass } from './config/models.js';
import { appState, loadTombstones, loadSettingsFromStorage, saveSettingsToStorage } from './state/app-state.js';
import { initMarkdownRenderer } from './utils/markdown.js';
import { showToast, escapeHtml } from './utils/helpers.js';

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
  const modal = document.getElementById('model-modal');
  const listEl = document.getElementById('models-list');
  const searchInput = document.getElementById('model-search-input');
  const selectedName = document.getElementById('selected-model-name');
  const selectedProvider = document.getElementById('selected-model-provider');

  const updateHeaderDisplay = () => {
    const m = getModelById(appState.settings.selectedModel);
    if (selectedName) selectedName.textContent = m.name;
    if (selectedProvider) selectedProvider.textContent = m.provider;
  };

  updateHeaderDisplay();

  const renderList = (query = '') => {
    if (!listEl) return;
    const q = query.toLowerCase();
    const filtered = CURATED_MODELS.filter(m => {
      return !q || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
    });

    listEl.innerHTML = filtered.map(m => `
      <div class="model-item ${m.id === appState.settings.selectedModel ? 'selected' : ''}" data-model-id="${escapeHtml(m.id)}">
        <div class="model-item-top">
          <span class="model-item-name">${escapeHtml(m.name)}</span>
          <span class="model-item-provider ${getProviderBadgeClass(m.provider)}">${escapeHtml(m.provider)}</span>
        </div>
        <p class="model-item-desc">${escapeHtml(m.description || '')}</p>
      </div>
    `).join('');

    listEl.querySelectorAll('.model-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-model-id');
        appState.settings.selectedModel = id;
        saveSettingsToStorage();
        updateHeaderDisplay();
        if (modal) closeModal(modal);
        showToast(`Selected model: ${getModelById(id).name}`);
      });
    });
  };

  if (btnPicker && modal) {
    btnPicker.addEventListener('click', () => {
      openModal(modal);
      renderList(searchInput?.value.trim() || '');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderList(searchInput.value.trim());
    });
  }
}

function initSettingsModal() {
  const btnSettings = document.getElementById('user-profile-bar');
  const modal = document.getElementById('settings-modal');
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

