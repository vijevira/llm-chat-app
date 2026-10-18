/**
 * Omni Chat - Plugins Marketplace & Tools Manager
 * Fixes: In-place DOM updates (prevents scroll jumps and toggle glitches),
 * accurate installed count badges, and reliable two-way state synchronization.
 */

import { PLUGINS_CATALOG } from '../config/plugins-catalog.js';
import {
  pluginsState,
  isPluginInstalled,
  isPluginEnabled,
  setPluginInstalled,
  setPluginEnabled,
  loadPluginsState
} from '../state/plugins-state.js';
import { escapeHtml, showToast } from '../utils/helpers.js';
import { openModal, closeModal } from './modals.js';

let activeCategory = 'all';

export function initPluginsManager() {
  loadPluginsState();
  updateComposerToolPills();

  // Elements
  const pluginsModal = document.getElementById('plugins-modal');
  const btnCloseModal = document.getElementById('btn-close-plugins-modal');
  const btnCloseModalFooter = document.getElementById('btn-close-plugins-modal-footer');
  const btnTopbarPlugins = document.getElementById('btn-topbar-plugins');
  const pillManagePlugins = document.getElementById('pill-manage-plugins');
  const pillToolSearch = document.getElementById('pill-tool-search');
  const pillToolCode = document.getElementById('pill-tool-code');
  const toolToggleSearch = document.getElementById('tool-toggle-search');
  const toolToggleCode = document.getElementById('tool-toggle-code');
  const categoriesBar = document.getElementById('plugins-categories-bar');

  // Trigger Open Listeners
  const openPlugins = () => {
    openModal(pluginsModal);
    renderPluginsMarketplace(activeCategory);
  };

  if (btnTopbarPlugins) btnTopbarPlugins.addEventListener('click', openPlugins);
  if (pillManagePlugins) pillManagePlugins.addEventListener('click', openPlugins);

  // Close Listeners
  if (btnCloseModal) btnCloseModal.addEventListener('click', () => closeModal(pluginsModal));
  if (btnCloseModalFooter) btnCloseModalFooter.addEventListener('click', () => closeModal(pluginsModal));

  // Category Filter Pills
  if (categoriesBar) {
    categoriesBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.category-pill');
      if (!pill) return;
      categoriesBar.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category') || 'all';
      renderPluginsMarketplace(activeCategory);
    });
  }

  // Quick Composer Tool Toggles
  if (pillToolSearch) {
    pillToolSearch.addEventListener('click', () => {
      const current = isPluginEnabled('webSearch');
      setPluginEnabled('webSearch', !current);
      updateComposerToolPills();
      showToast(!current ? '🌐 Live Web Search Grounding enabled' : 'Web Search disabled');
      if (pluginsModal && pluginsModal.classList.contains('active')) {
        renderPluginsMarketplace(activeCategory);
      }
    });
  }

  if (pillToolCode) {
    pillToolCode.addEventListener('click', () => {
      const current = isPluginEnabled('codeRunner');
      setPluginEnabled('codeRunner', !current);
      updateComposerToolPills();
      showToast(!current ? '⚡ JS Code Runner enabled' : 'Code Runner disabled');
      if (pluginsModal && pluginsModal.classList.contains('active')) {
        renderPluginsMarketplace(activeCategory);
      }
    });
  }

  if (toolToggleSearch) {
    toolToggleSearch.addEventListener('click', () => {
      const current = isPluginEnabled('webSearch');
      setPluginEnabled('webSearch', !current);
      updateComposerToolPills();
      showToast(!current ? '🌐 Live Web Search Grounding enabled' : 'Web Search disabled');
    });
  }

  if (toolToggleCode) {
    toolToggleCode.addEventListener('click', () => {
      const current = isPluginEnabled('codeRunner');
      setPluginEnabled('codeRunner', !current);
      updateComposerToolPills();
      showToast(!current ? '⚡ JS Code Runner enabled' : 'Code Runner disabled');
    });
  }
}

export function updateComposerToolPills() {
  const isSearchActive = isPluginEnabled('webSearch');
  const isCodeActive = isPluginEnabled('codeRunner');

  // Composer Bottom Bar Pills
  const pillToolSearch = document.getElementById('pill-tool-search');
  if (pillToolSearch) {
    pillToolSearch.classList.toggle('active', isSearchActive);
    const status = pillToolSearch.querySelector('.tool-pill-status');
    if (status) status.textContent = isSearchActive ? 'ON' : 'OFF';
  }

  const pillToolCode = document.getElementById('pill-tool-code');
  if (pillToolCode) {
    pillToolCode.classList.toggle('active', isCodeActive);
    const status = pillToolCode.querySelector('.tool-pill-status');
    if (status) status.textContent = isCodeActive ? 'ON' : 'OFF';
  }

  // Popover Badges
  const toolBadgeSearch = document.getElementById('tool-badge-search');
  if (toolBadgeSearch) {
    toolBadgeSearch.style.display = isSearchActive ? 'inline-flex' : 'none';
  }
  const toolBadgeCode = document.getElementById('tool-badge-code');
  if (toolBadgeCode) {
    toolBadgeCode.style.display = isCodeActive ? 'inline-flex' : 'none';
  }
}

export function renderPluginsMarketplace(category = 'all') {
  activeCategory = category;
  const listEl = document.getElementById('plugins-list');
  const categoriesBar = document.getElementById('plugins-categories-bar');
  if (!listEl) return;

  // Update Category Badge Counts
  const installedCount = PLUGINS_CATALOG.filter(p => isPluginInstalled(p.id)).length;
  if (categoriesBar) {
    const installedPill = categoriesBar.querySelector('[data-category="installed"]');
    if (installedPill) {
      installedPill.textContent = `Installed (${installedCount})`;
    }
  }

  const filtered = PLUGINS_CATALOG.filter(plugin => {
    if (category === 'all') return true;
    if (category === 'installed') return isPluginInstalled(plugin.id);
    return plugin.category === category;
  });

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.88rem;">
        No plugins found in this category.
      </div>
    `;
    return;
  }

  filtered.forEach(plugin => {
    const installed = isPluginInstalled(plugin.id);
    const enabled = isPluginEnabled(plugin.id);

    const card = document.createElement('div');
    card.className = 'plugin-card';
    card.setAttribute('data-plugin-id', plugin.id);

    card.innerHTML = `
      <div class="plugin-card-left">
        <span class="plugin-card-icon">${plugin.icon}</span>
        <div class="plugin-card-info">
          <div class="plugin-card-title-row">
            <strong>${escapeHtml(plugin.name)}</strong>
            <span class="plugin-badge-builtin" style="font-size:0.7rem;">${escapeHtml(plugin.category)}</span>
            <span class="plugin-badge-active" style="font-size:0.7rem;display:${installed ? 'inline-flex' : 'none'};background:${enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)'};color:${enabled ? 'var(--success-color, #10b981)' : 'var(--text-muted)'};">${enabled ? 'Active' : 'Installed'}</span>
          </div>
          <p class="plugin-card-desc">${escapeHtml(plugin.desc)}</p>
        </div>
      </div>
      <div class="plugin-card-action">
        ${renderPluginActionControls(plugin.id, installed, enabled)}
      </div>
    `;

    wirePluginCardEvents(card, plugin);
    listEl.appendChild(card);
  });
}

function renderPluginActionControls(pluginId, installed, enabled) {
  if (installed) {
    return `
      <label class="toggle-switch" title="${enabled ? 'Disable' : 'Enable'} plugin">
        <input type="checkbox" class="plugin-toggle-checkbox" data-plugin-id="${pluginId}" ${enabled ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <button type="button" class="icon-btn-xs btn-uninstall-plugin" data-plugin-id="${pluginId}" title="Uninstall Plugin" style="color:var(--text-muted);cursor:pointer;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;
  }
  return `
    <button type="button" class="btn-primary btn-sm btn-install-plugin" data-plugin-id="${pluginId}" style="cursor:pointer;">
      + Install
    </button>
  `;
}

function wirePluginCardEvents(card, plugin) {
  const actionWrapper = card.querySelector('.plugin-card-action');
  const badgeEl = card.querySelector('.plugin-badge-active');

  const updateCardStateInPlace = (isInstalled, isEnabled) => {
    if (badgeEl) {
      badgeEl.style.display = isInstalled ? 'inline-flex' : 'none';
      badgeEl.style.background = isEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)';
      badgeEl.style.color = isEnabled ? 'var(--success-color, #10b981)' : 'var(--text-muted)';
      badgeEl.textContent = isEnabled ? 'Active' : 'Installed';
    }
    if (actionWrapper) {
      actionWrapper.innerHTML = renderPluginActionControls(plugin.id, isInstalled, isEnabled);
      wireControls();
    }
    updateComposerToolPills();
  };

  const wireControls = () => {
    const toggle = card.querySelector('.plugin-toggle-checkbox');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        const nextEnabled = e.target.checked;
        setPluginEnabled(plugin.id, nextEnabled);
        updateCardStateInPlace(true, nextEnabled);
        showToast(`${plugin.icon} ${plugin.name} ${nextEnabled ? 'activated' : 'deactivated'}`);
      });
    }

    const btnInstall = card.querySelector('.btn-install-plugin');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => {
        setPluginInstalled(plugin.id, true);
        setPluginEnabled(plugin.id, true);
        updateCardStateInPlace(true, true);
        showToast(`🎉 ${plugin.icon} ${plugin.name} installed & enabled!`);
      });
    }

    const btnUninstall = card.querySelector('.btn-uninstall-plugin');
    if (btnUninstall) {
      btnUninstall.addEventListener('click', () => {
        setPluginInstalled(plugin.id, false);
        setPluginEnabled(plugin.id, false);
        if (activeCategory === 'installed') {
          card.remove();
        } else {
          updateCardStateInPlace(false, false);
        }
        showToast(`${plugin.icon} ${plugin.name} uninstalled.`);
      });
    }
  };

  wireControls();
}

