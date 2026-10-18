/**
 * Omni Chat - Explore Community Apps Catalog Module
 * Displays curated custom apps, category filtering, search, and 1-click launch / save.
 */

import { COMMUNITY_APPS } from '../config/constants.js';
import { appState } from '../state/app-state.js';
import { openModal, closeModal } from './modals.js';
import { selectProject, saveProjectsToStorage, renderProjectsList } from './project-studio.js';
import { escapeHtml, showToast } from '../utils/helpers.js';

export function initExploreAppsModal() {
  const exploreAppsModal = document.getElementById('explore-apps-modal');
  const btnCloseModal = document.getElementById('btn-close-explore-apps-modal');
  const btnCancelModal = document.getElementById('btn-cancel-explore-apps-modal');
  const sidebarBtnExplore = document.getElementById('sidebar-btn-explore-apps');
  const btnExploreApps = document.getElementById('btn-explore-apps');
  const searchInput = document.getElementById('explore-apps-search');
  const categoryPills = document.getElementById('explore-category-pills');

  const openExplore = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
      sidebar.classList.remove('mobile-open');
    }
    openModal(exploreAppsModal);
    renderExploreAppsGrid('all', searchInput?.value.trim() || '');
  };

  if (sidebarBtnExplore) sidebarBtnExplore.addEventListener('click', openExplore);
  if (btnExploreApps) btnExploreApps.addEventListener('click', openExplore);
  if (btnCloseModal) btnCloseModal.addEventListener('click', () => closeModal(exploreAppsModal));
  if (btnCancelModal) btnCancelModal.addEventListener('click', () => closeModal(exploreAppsModal));

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeCat = categoryPills?.querySelector('.explore-cat-pill.active')?.getAttribute('data-cat') || 'all';
      renderExploreAppsGrid(activeCat, searchInput.value.trim());
    });
  }

  if (categoryPills) {
    categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.explore-cat-pill');
      if (!pill) return;
      categoryPills.querySelectorAll('.explore-cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.getAttribute('data-cat') || 'all';
      renderExploreAppsGrid(cat, searchInput?.value.trim() || '');
    });
  }
}

export function renderExploreAppsGrid(category = 'all', searchQuery = '') {
  const grid = document.getElementById('explore-apps-grid');
  const modal = document.getElementById('explore-apps-modal');
  if (!grid) return;

  const q = (searchQuery || '').toLowerCase();
  const filtered = COMMUNITY_APPS.filter(app => {
    const matchesCat = category === 'all' || app.category === category;
    const matchesQuery = !q || app.name.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 2.5rem; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
        No custom apps found matching "${escapeHtml(searchQuery)}".
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(app => `
    <div class="explore-app-card" data-app-id="${escapeHtml(app.id)}">
      <div class="explore-app-top">
        <div class="explore-app-icon">${app.icon}</div>
        <div class="explore-app-details">
          <span class="explore-app-category">${escapeHtml(app.category)}</span>
          <div class="explore-app-name">${escapeHtml(app.name)}</div>
        </div>
      </div>
      <p class="explore-app-desc">${escapeHtml(app.desc)}</p>
      <div class="explore-app-actions">
        <button type="button" class="btn-secondary btn-sm btn-save-app" data-id="${escapeHtml(app.id)}">
          + Save to My Apps
        </button>
        <button type="button" class="btn-primary btn-sm btn-launch-app" data-id="${escapeHtml(app.id)}">
          Launch App
        </button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.btn-launch-app').forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-id');
      const found = COMMUNITY_APPS.find(a => a.id === appId);
      if (found) {
        launchCustomApp(found);
        if (modal) closeModal(modal);
      }
    });
  });

  grid.querySelectorAll('.btn-save-app').forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = btn.getAttribute('data-id');
      const found = COMMUNITY_APPS.find(a => a.id === appId);
      if (found) {
        cloneCommunityAppToUserProjects(found);
        btn.textContent = '✓ Saved';
        btn.disabled = true;
      }
    });
  });
}

export function cloneCommunityAppToUserProjects(app) {
  const existing = appState.projects.find(p => p.id === app.id);
  if (existing) {
    showToast(`"${app.name}" is already in your apps!`);
    return;
  }
  const newProj = {
    id: app.id,
    name: app.name,
    icon: app.icon,
    description: app.desc,
    model: app.model,
    intent: app.intent,
    context: app.context,
    outputGuidelines: app.output,
    formFields: app.formFields || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  appState.projects.push(newProj);
  saveProjectsToStorage();
  renderProjectsList();
  showToast(`Added "${app.name}" to your Custom Apps!`);
}

export function launchCustomApp(app) {
  let proj = appState.projects.find(p => p.id === app.id);
  if (!proj) {
    cloneCommunityAppToUserProjects(app);
    proj = appState.projects.find(p => p.id === app.id);
  }
  if (proj) {
    selectProject(proj.id);
  }
}

