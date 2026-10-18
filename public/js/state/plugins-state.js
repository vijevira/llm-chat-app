/**
 * Omni Chat - Plugins State Management
 * Separates installation status from active/enabled status cleanly.
 */

import { STORAGE_KEY_PLUGINS } from '../config/constants.js';
import { PLUGINS_CATALOG } from '../config/plugins-catalog.js';

// Default initial state matching catalog defaults
const initialPluginState = {};
PLUGINS_CATALOG.forEach(p => {
  initialPluginState[p.id] = {
    installed: !!p.installed,
    enabled: !!p.enabled
  };
});

export const pluginsState = { ...initialPluginState };

export function isPluginInstalled(pluginId) {
  return !!pluginsState[pluginId]?.installed;
}

export function isPluginEnabled(pluginId) {
  return !!pluginsState[pluginId]?.installed && !!pluginsState[pluginId]?.enabled;
}

export function setPluginInstalled(pluginId, installed) {
  if (!pluginsState[pluginId]) {
    pluginsState[pluginId] = { installed: false, enabled: false };
  }
  pluginsState[pluginId].installed = !!installed;
  if (!installed) {
    pluginsState[pluginId].enabled = false;
  }
  syncCatalogFromState();
  savePluginsState();
}

export function setPluginEnabled(pluginId, enabled) {
  if (!pluginsState[pluginId]) {
    pluginsState[pluginId] = { installed: false, enabled: false };
  }
  if (enabled) {
    pluginsState[pluginId].installed = true;
  }
  pluginsState[pluginId].enabled = !!enabled;
  syncCatalogFromState();
  savePluginsState();
}

export function syncCatalogFromState() {
  PLUGINS_CATALOG.forEach(p => {
    if (pluginsState[p.id]) {
      p.installed = !!pluginsState[p.id].installed;
      p.enabled = !!pluginsState[p.id].enabled;
    }
  });
}

export function loadPluginsState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLUGINS);
    if (saved) {
      const parsed = JSON.parse(saved);
      PLUGINS_CATALOG.forEach(p => {
        if (parsed[p.id] !== undefined) {
          const val = parsed[p.id];
          if (typeof val === 'object' && val !== null) {
            pluginsState[p.id] = {
              installed: !!val.installed,
              enabled: !!val.enabled
            };
          } else {
            // Legacy schema: boolean enabled value
            pluginsState[p.id] = {
              installed: p.installed || !!val,
              enabled: !!val
            };
          }
        }
      });
      syncCatalogFromState();
    }
  } catch (err) {
    console.warn('Failed to load plugins state:', err);
  }
}

export function savePluginsState() {
  try {
    localStorage.setItem(STORAGE_KEY_PLUGINS, JSON.stringify(pluginsState));
    if (typeof puter !== 'undefined' && puter.kv) {
      puter.kv.set('omni_chat_plugins_state', JSON.stringify(pluginsState)).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to save plugins state:', err);
  }
}

