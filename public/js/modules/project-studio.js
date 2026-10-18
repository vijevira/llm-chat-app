/**
 * Omni Chat - Custom AI Apps & Project Studio Module
 * Handles project creation, dynamic form fields builder, custom prompts compilation,
 * and project workspaces.
 */

import { appState } from '../state/app-state.js';
import { CURATED_MODELS } from '../config/models.js';
import { STORAGE_KEY_PROJECTS } from '../config/constants.js';
import { escapeHtml, showToast } from '../utils/helpers.js';
import { closeSandboxStudio } from './sandbox-studio.js';
import { switchSession, createNewSession } from './session-manager.js';

export function initProjectStudio() {
  const btnCreateProject = document.getElementById('btn-create-project');
  const btnEditActiveProject = document.getElementById('btn-edit-active-project');
  const btnExitProject = document.getElementById('btn-exit-project');
  const btnStudioBack = document.getElementById('btn-studio-back');
  const btnStudioCancel = document.getElementById('btn-studio-cancel');
  const btnStudioSave = document.getElementById('btn-studio-save');
  const btnStudioDelete = document.getElementById('btn-studio-delete');
  const btnAddFormField = document.getElementById('btn-add-form-field');
  const btnSendPreview = document.getElementById('btn-send-preview');

  if (btnCreateProject) btnCreateProject.addEventListener('click', () => openProjectStudio(null));
  if (btnEditActiveProject) btnEditActiveProject.addEventListener('click', () => openProjectStudio(appState.activeProjectId));
  if (btnExitProject) btnExitProject.addEventListener('click', exitProject);
  if (btnStudioBack) btnStudioBack.addEventListener('click', closeProjectStudio);
  if (btnStudioCancel) btnStudioCancel.addEventListener('click', closeProjectStudio);
  if (btnStudioSave) btnStudioSave.addEventListener('click', saveProject);
  if (btnStudioDelete) {
    btnStudioDelete.addEventListener('click', () => {
      if (appState.editingProjectId) {
        deleteProject(appState.editingProjectId);
      }
    });
  }

  if (btnAddFormField) {
    btnAddFormField.addEventListener('click', () => {
      appState.editingProjectFormFields.push({ label: '', placeholder: '', type: 'text' });
      renderAppFormFieldsBuilder();
    });
  }

  // Emoji picker pills
  const emojiPickerRow = document.getElementById('emoji-picker-row');
  if (emojiPickerRow) {
    emojiPickerRow.addEventListener('click', (e) => {
      const pill = e.target.closest('.emoji-pill');
      if (!pill) return;
      emojiPickerRow.querySelectorAll('.emoji-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const emoji = pill.getAttribute('data-emoji') || '⚡';
      const iconDisplay = document.getElementById('studio-header-icon');
      if (iconDisplay) iconDisplay.textContent = emoji;
    });
  }

  loadProjectsFromStorage();
}

export function loadProjectsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) {
      appState.projects = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load projects from storage:', err);
  }
  renderProjectsList();
}

export function saveProjectsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(appState.projects));
    if (typeof puter !== 'undefined' && puter.kv) {
      puter.kv.set(STORAGE_KEY_PROJECTS, JSON.stringify(appState.projects)).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to save projects to storage:', err);
  }
}

export function openProjectStudio(projectId = null) {
  appState.editingProjectId = projectId;
  const projectStudioView = document.getElementById('project-studio-view');
  const chatTopbar = document.getElementById('chat-topbar');
  const messagesContainer = document.getElementById('messages-container');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');
  const sandboxStudioView = document.getElementById('sandbox-studio-view');

  if (chatTopbar) chatTopbar.style.display = 'none';
  if (messagesContainer) messagesContainer.style.display = 'none';
  if (inputAreaWrapper) inputAreaWrapper.style.display = 'none';
  if (btnScrollBottom) btnScrollBottom.style.display = 'none';
  if (projectStudioView) projectStudioView.style.display = 'flex';
  if (sandboxStudioView) sandboxStudioView.style.display = 'none';

  const nameInput = document.getElementById('project-name-input');
  const descInput = document.getElementById('project-desc-input');
  const intentInput = document.getElementById('project-intent-input');
  const contextInput = document.getElementById('project-context-input');
  const outputInput = document.getElementById('project-output-input');
  const modelSelect = document.getElementById('project-model-select');
  const titleDisplay = document.getElementById('studio-header-title');
  const iconDisplay = document.getElementById('studio-header-icon');
  const btnDelete = document.getElementById('btn-studio-delete');

  populateProjectModelOptions(modelSelect);

  if (projectId) {
    const proj = appState.projects.find(p => p.id === projectId);
    if (!proj) return;
    if (titleDisplay) titleDisplay.textContent = `Edit "${proj.name}"`;
    if (nameInput) nameInput.value = proj.name || '';
    if (descInput) descInput.value = proj.description || '';
    if (intentInput) intentInput.value = proj.intent || '';
    if (contextInput) contextInput.value = proj.context || '';
    if (outputInput) outputInput.value = proj.outputGuidelines || '';
    if (modelSelect) modelSelect.value = proj.model || '';
    if (iconDisplay) iconDisplay.textContent = proj.icon || '⚡';
    appState.editingProjectFormFields = (proj.formFields || []).map(f => ({ ...f }));
    if (btnDelete) btnDelete.style.display = 'inline-flex';
  } else {
    if (titleDisplay) titleDisplay.textContent = 'Create Custom AI App';
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (intentInput) intentInput.value = '';
    if (contextInput) contextInput.value = '';
    if (outputInput) outputInput.value = '';
    if (modelSelect) modelSelect.value = '';
    if (iconDisplay) iconDisplay.textContent = '⚡';
    appState.editingProjectFormFields = [];
    if (btnDelete) btnDelete.style.display = 'none';
  }

  renderAppFormFieldsBuilder();
}

export function closeProjectStudio() {
  const projectStudioView = document.getElementById('project-studio-view');
  const chatTopbar = document.getElementById('chat-topbar');
  const messagesContainer = document.getElementById('messages-container');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');

  if (projectStudioView) projectStudioView.style.display = 'none';
  if (chatTopbar) chatTopbar.style.display = '';
  if (messagesContainer) messagesContainer.style.display = '';
  if (inputAreaWrapper) inputAreaWrapper.style.display = '';
  if (btnScrollBottom) btnScrollBottom.style.display = '';

  renderActiveProjectPill();
  renderProjectsList();
}

export function renderProjectsList() {
  const container = document.getElementById('projects-list');
  if (!container) return;
  container.innerHTML = '';

  if (appState.projects.length === 0) {
    container.innerHTML = `
      <div style="padding: 0.5rem 0.75rem; font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
        No custom apps created yet.
      </div>
    `;
    return;
  }

  appState.projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'project-item' + (project.id === appState.activeProjectId ? ' active' : '');
    item.setAttribute('title', project.name);
    item.innerHTML = `
      <div class="project-item-left">
        <span class="project-item-icon">${project.icon || '⚡'}</span>
        <span class="project-item-title" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</span>
      </div>
      <button class="project-item-edit-btn" title="Edit App Settings" type="button" aria-label="Edit app">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    `;

    item.querySelector('.project-item-left').addEventListener('click', () => {
      selectProject(project.id);
    });

    item.querySelector('.project-item-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectStudio(project.id);
    });

    container.appendChild(item);
  });
}

export function selectProject(projectId) {
  closeProjectStudio();
  closeSandboxStudio();
  appState.activeProjectId = projectId;
  renderProjectsList();
  renderActiveProjectPill();
  const proj = appState.projects.find(p => p.id === projectId);
  if (proj) {
    showToast(`Switched to app: ${proj.name}`);
  }

  const existing = appState.sessions.find(s => s.projectId === projectId);
  if (existing) {
    switchSession(existing.id);
  } else {
    createNewSession(projectId);
  }
}

export function exitProject() {
  closeProjectStudio();
  closeSandboxStudio();
  appState.activeProjectId = null;
  renderProjectsList();
  renderActiveProjectPill();

  const general = appState.sessions.find(s => !s.projectId);
  if (general) {
    switchSession(general.id);
  } else {
    createNewSession(null);
  }
  showToast('Exited custom app mode');
}

export function renderActiveProjectPill() {
  const pill = document.getElementById('topbar-project-pill');
  const nameEl = document.getElementById('topbar-project-name');
  const iconEl = document.getElementById('topbar-project-icon');
  if (!pill) return;

  if (appState.activeProjectId) {
    const proj = appState.projects.find(p => p.id === appState.activeProjectId);
    if (proj) {
      if (nameEl) nameEl.textContent = proj.name;
      if (iconEl) iconEl.textContent = proj.icon || '⚡';
      pill.style.display = 'inline-flex';
      return;
    }
  }
  pill.style.display = 'none';
}

export function renderAppFormFieldsBuilder() {
  const container = document.getElementById('app-form-fields-builder');
  if (!container) return;
  container.innerHTML = '';

  if (appState.editingProjectFormFields.length === 0) {
    container.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.25rem 0;">
        No input fields added. Click "+ Add Form Input" to let users fill out parameters when launching this app.
      </div>
    `;
    return;
  }

  appState.editingProjectFormFields.forEach((field, index) => {
    const row = document.createElement('div');
    row.className = 'form-field-builder-row';
    row.style = 'display:flex;gap:0.4rem;align-items:center;margin-bottom:0.5rem;';
    row.innerHTML = `
      <input type="text" class="input-modern" placeholder="Field Label (e.g. Topic, Budget)" value="${escapeHtml(field.label || '')}" style="flex:2;padding:0.4rem 0.6rem;font-size:0.82rem;">
      <input type="text" class="input-modern" placeholder="Placeholder hint" value="${escapeHtml(field.placeholder || '')}" style="flex:3;padding:0.4rem 0.6rem;font-size:0.82rem;">
      <select class="select-modern" style="flex:1.5;padding:0.4rem 0.4rem;font-size:0.82rem;">
        <option value="text" ${field.type === 'text' ? 'selected' : ''}>Short Text</option>
        <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Multiline</option>
      </select>
      <button type="button" class="icon-btn-xs btn-remove-field" style="color:var(--danger-color);cursor:pointer;" title="Remove field">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    const inputs = row.querySelectorAll('input');
    const select = row.querySelector('select');
    inputs[0].addEventListener('input', (e) => { field.label = e.target.value; });
    inputs[1].addEventListener('input', (e) => { field.placeholder = e.target.value; });
    select.addEventListener('change', (e) => { field.type = e.target.value; });

    row.querySelector('.btn-remove-field').addEventListener('click', () => {
      appState.editingProjectFormFields.splice(index, 1);
      renderAppFormFieldsBuilder();
    });

    container.appendChild(row);
  });
}

export function compileProjectSystemPrompt(project) {
  if (!project) return appState.settings.systemPrompt;
  const parts = [];
  parts.push(`You are an expert AI assistant operating strictly within the custom project workspace: "${project.name}".`);
  if (project.description) parts.push(`Workspace Mission: ${project.description}`);
  if (project.intent) parts.push(`### 1. PROJECT OBJECTIVE & INTENT\n${project.intent}`);
  if (project.context) parts.push(`### 2. BACKGROUND CONTEXT & ENVIRONMENT\n${project.context}`);
  if (project.outputGuidelines) parts.push(`### 3. OUTPUT SPECIFICATIONS & GUIDELINES\n${project.outputGuidelines}`);
  return parts.join('\n\n');
}

export function saveProject() {
  const nameInput = document.getElementById('project-name-input');
  const descInput = document.getElementById('project-desc-input');
  const intentInput = document.getElementById('project-intent-input');
  const contextInput = document.getElementById('project-context-input');
  const outputInput = document.getElementById('project-output-input');
  const modelSelect = document.getElementById('project-model-select');
  const iconDisplay = document.getElementById('studio-header-icon');

  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('Please enter an app name');
    nameInput?.focus();
    return;
  }

  const projectData = {
    id: appState.editingProjectId || ('proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
    name: name,
    description: descInput ? descInput.value.trim() : '',
    icon: iconDisplay ? iconDisplay.textContent : '⚡',
    model: modelSelect ? modelSelect.value : '',
    intent: intentInput ? intentInput.value.trim() : '',
    context: contextInput ? contextInput.value.trim() : '',
    outputGuidelines: outputInput ? outputInput.value.trim() : '',
    formFields: (appState.editingProjectFormFields || []).filter(f => f && f.label && f.label.trim()),
    updatedAt: Date.now()
  };

  if (appState.editingProjectId) {
    const idx = appState.projects.findIndex(p => p.id === appState.editingProjectId);
    if (idx !== -1) appState.projects[idx] = projectData;
    else appState.projects.unshift(projectData);
  } else {
    appState.projects.unshift(projectData);
  }

  saveProjectsToStorage();
  closeProjectStudio();
  selectProject(projectData.id);
  showToast(`Custom App "${projectData.name}" saved!`);
}

export function deleteProject(projectId) {
  if (!projectId) return;
  const proj = appState.projects.find(p => p.id === projectId);
  const projName = proj ? proj.name : 'App';

  appState.deletedProjectIds.add(projectId);
  appState.projects = appState.projects.filter(p => p.id !== projectId);
  if (appState.activeProjectId === projectId) {
    appState.activeProjectId = null;
  }

  saveProjectsToStorage();
  closeProjectStudio();
  renderProjectsList();
  renderActiveProjectPill();
  showToast(`App "${projName}" deleted`);
}

function populateProjectModelOptions(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="">Default (From Global Settings)</option>';
  CURATED_MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.provider})`;
    selectEl.appendChild(opt);
  });
}

