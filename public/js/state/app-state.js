/**
 * Omni Chat - Core Application State
 */

import {
  DEFAULT_MODEL,
  PERSONA_PRESETS,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_SESSIONS,
  STORAGE_KEY_ACTIVE,
  STORAGE_KEY_PROJECTS,
  STORAGE_KEY_TOMBSTONES
} from '../config/constants.js';
import { CURATED_MODELS } from '../config/models.js';

export const appState = {
  sessions: [],
  currentSessionId: null,
  activeAbortController: null,
  currentAttachment: null, // { name, dataUrl, type }

  projects: [],
  activeProjectId: null,
  editingProjectId: null,
  editingProjectFormFields: [],

  deletedSessionIds: new Set(),
  deletedProjectIds: new Set(),

  settings: {
    personaPreset: 'default',
    systemPrompt: PERSONA_PRESETS.default,
    temperature: 0.7,
    selectedModel: DEFAULT_MODEL,
    storageMode: 'cloud',
    displayName: '',
    customUsername: ''
  },

  puterUser: null,
  allModels: [...CURATED_MODELS],
  activeProviderFilter: 'all'
};

export function loadTombstones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOMBSTONES);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.sessions)) {
        appState.deletedSessionIds = new Set(data.sessions);
      }
      if (Array.isArray(data.projects)) {
        appState.deletedProjectIds = new Set(data.projects);
      }
    }
  } catch (e) {
    console.warn('Failed to load tombstones:', e);
  }
}

export function saveTombstones() {
  try {
    const data = {
      sessions: Array.from(appState.deletedSessionIds),
      projects: Array.from(appState.deletedProjectIds)
    };
    localStorage.setItem(STORAGE_KEY_TOMBSTONES, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save tombstones:', e);
  }
}

export function loadSettingsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem('nexus_ai_settings');
    if (saved) {
      appState.settings = { ...appState.settings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings from storage:', e);
  }
}

export function saveSettingsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appState.settings));
  } catch (e) {
    console.warn('Failed to save settings to storage:', e);
  }
}

export function getActiveSession() {
  return appState.sessions.find(s => s.id === appState.currentSessionId) || null;
}

