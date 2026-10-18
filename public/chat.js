/**
 * Omni Chat — Universal Multi-Model Chat
 * Built with Puter.js (docs.puter.com/llms.txt)
 */

(function () {
  'use strict';

  // --- Constants & Presets ---
  const DEFAULT_MODEL = 'gpt-4o-mini';
  const STORAGE_KEY_SESSIONS = 'omni_chat_sessions';
  const STORAGE_KEY_SETTINGS = 'omni_chat_settings';
  const STORAGE_KEY_THEME = 'omni_chat_theme';
  const STORAGE_KEY_PROJECTS = 'omni_chat_projects';
  const STORAGE_KEY_DELETED_SESSIONS = 'omni_chat_deleted_sessions';
  const STORAGE_KEY_DELETED_PROJECTS = 'omni_chat_deleted_projects';
  const PUTER_FS_SESSIONS_PATH = 'omni_chat_sessions.json';
  const PUTER_FS_PROJECTS_PATH = 'omni_chat_projects.json';
  const PUTER_FS_DELETED_SESSIONS_PATH = 'omni_deleted_sessions.json';
  const PUTER_FS_DELETED_PROJECTS_PATH = 'omni_deleted_projects.json';

  const PERSONA_PRESETS = {
    default: 'You are Omni Chat, a brilliant, friendly, and concise assistant. Format responses using clean markdown, bullet points, and code blocks where helpful.',
    coder: 'You are a Principal Software Architect. Provide production-ready, clean, modern code with concise technical explanations. Minimize conversational fluff.',
    researcher: 'You are an Academic AI Researcher. Provide rigorous, in-depth analytical responses with step-by-step reasoning and objective conclusions.',
    concise: 'Provide ultra-concise, direct responses using short bullet points. Skip pleasantries and filler.',
    creative: 'You are an imaginative creative writer and storyteller. Use vivid metaphors, evocative prose, and engaging narrative flow.',
    custom: ''
  };

  const CURATED_MODELS = [
    // Google Gemini
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', isCurated: true, description: 'Google’s lightning-fast multimodal model' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', isCurated: true, description: 'Google’s flagship model for coding & reasoning' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'Google', isCurated: true, description: 'Next-gen hybrid reasoning model from Google' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', isCurated: true, description: 'Cutting-edge Gemini preview model' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', provider: 'Google', isCurated: true, description: 'Advanced reasoning & tool use preview' },
    
    // OpenAI
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', isCurated: true, description: 'Fast, cost-effective multimodal model' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', isCurated: true, description: 'Flagship high-intelligence multimodal model' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', provider: 'OpenAI', isCurated: true, description: 'Puter default high-efficiency model' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', isCurated: true, description: 'Next-generation lightweight powerhouse' },
    
    // Anthropic Claude
    { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', isCurated: true, description: 'Superior nuance, coding, and thought clarity' },
    { id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', isCurated: true, description: 'Deep analytical intelligence & complex synthesis' },
    { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', provider: 'Anthropic', isCurated: true, description: 'Ultra-fast, responsive assistant' },
    
    // DeepSeek
    { id: 'deepseek-chat', name: 'DeepSeek Chat (V3.1)', provider: 'DeepSeek', isCurated: true, description: 'State-of-the-art open chat model' },
    { id: 'openrouter:deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', provider: 'DeepSeek', isCurated: true, description: 'Open reasoning model with chain-of-thought' },
    { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', provider: 'DeepSeek', isCurated: true, description: 'High-throughput reasoning model' },
    
    // xAI Grok
    { id: 'grok-4.3', name: 'Grok 4.3', provider: 'xAI', isCurated: true, description: 'xAI advanced conversational intelligence' },
    { id: 'grok-4-1-fast-reasoning', name: 'Grok 4.1 Fast Reasoning', provider: 'xAI', isCurated: true, description: 'Real-time reasoning from xAI' },

    // Meta Llama
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', isCurated: true, description: 'Top-tier open-source general knowledge model' },

    // Mistral
    { id: 'mistral-large-2512', name: 'Mistral Large 3', provider: 'Mistral', isCurated: true, description: 'European multilingual frontier model' }
  ];

  // --- State ---
  let allModels = [...CURATED_MODELS];
  let activeProviderFilter = 'all';
  let sessions = [];
  let currentSessionId = null;
  let activeAbortController = null;
  let currentAttachment = null; // { name, dataUrl, type }

  let projects = [];
  let activeProjectId = null;
  let expandedProjectIds = new Set();
  let editingProjectId = null;
  let editingProjectFiles = [];
  let editingProjectIcon = '⚡';

  let deletedSessionIds = new Set();
  let deletedProjectIds = new Set();

  let settings = {
    personaPreset: 'default',
    systemPrompt: PERSONA_PRESETS.default,
    temperature: 0.7,
    selectedModel: DEFAULT_MODEL,
    storageMode: 'cloud',
    displayName: '',
    customUsername: ''
  };

  let puterUser = null;

  // --- DOM Elements ---
  const sidebar = document.getElementById('sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnSidebarCollapse = document.getElementById('btn-sidebar-collapse');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const btnNewChat = document.getElementById('btn-new-chat');
  const projectsSection = document.getElementById('projects-section');
  const btnCreateProject = document.getElementById('btn-create-project');
  const projectsList = document.getElementById('projects-list');
  const chatHistoryList = document.getElementById('chat-history-list');

  const userProfileBar = document.getElementById('user-profile-bar');
  const userAvatar = document.getElementById('user-avatar');
  const userStatusDot = document.getElementById('user-status-dot');
  const userName = document.getElementById('user-name');
  const userTier = document.getElementById('user-tier');

  const topbarChatTitle = document.getElementById('topbar-chat-title');
  const topbarTitleDisplay = document.getElementById('topbar-title-display');
  const btnRenameTopbar = document.getElementById('btn-rename-topbar');
  const topbarRenameForm = document.getElementById('topbar-rename-form');
  const topbarRenameInput = document.getElementById('topbar-rename-input');
  const btnSaveTopbarRename = document.getElementById('btn-save-topbar-rename');
  const btnCancelTopbarRename = document.getElementById('btn-cancel-topbar-rename');

  const topbarProjectPill = document.getElementById('topbar-project-pill');
  const topbarProjectIcon = document.getElementById('topbar-project-icon');
  const topbarProjectName = document.getElementById('topbar-project-name');
  const btnEditActiveProject = document.getElementById('btn-edit-active-project');
  const btnExitProject = document.getElementById('btn-exit-project');

  const btnTopbarSync = document.getElementById('btn-topbar-sync');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');

  const btnModelPicker = document.getElementById('btn-model-picker');
  const selectedModelName = document.getElementById('selected-model-name');
  const selectedModelProvider = document.getElementById('selected-model-provider');
  const modelModal = document.getElementById('model-modal');
  const btnCloseModelModal = document.getElementById('btn-close-model-modal');
  const btnCancelModelModal = document.getElementById('btn-cancel-model-modal');
  const modelSearchInput = document.getElementById('model-search-input');
  const modelsListContainer = document.getElementById('models-list-container');
  const providerPillsBar = document.getElementById('provider-pills-bar');

  const messagesContainer = document.getElementById('messages-container');
  const messagesInner = document.getElementById('messages-inner');
  const welcomeContainer = document.getElementById('welcome-container');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');

  const inputBoxContainer = document.getElementById('input-box-container');
  const dropZoneOverlay = document.getElementById('drop-zone-overlay');
  const chatTextarea = document.getElementById('chat-textarea');
  const btnSend = document.getElementById('btn-send');
  const btnStopStream = document.getElementById('btn-stop-stream');
  const btnAttach = document.getElementById('btn-attach');
  const fileInput = document.getElementById('file-input');
  const attachmentPreviewBar = document.getElementById('attachment-preview-bar');
  const attachmentImgPreview = document.getElementById('attachment-img-preview');
  const attachmentFilename = document.getElementById('attachment-filename');
  const btnRemoveAttachment = document.getElementById('btn-remove-attachment');

  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal');
  const btnCancelSettings = document.getElementById('btn-cancel-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  // Settings Tabs & Content
  const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const modalAccountAvatar = document.getElementById('modal-account-avatar');
  const modalAccountName = document.getElementById('modal-account-name');
  const modalAccountStatus = document.getElementById('modal-account-status');
  const btnModalAuth = document.getElementById('btn-modal-auth');
  const statSyncStatus = document.getElementById('stat-sync-status');
  const statChatCount = document.getElementById('stat-chat-count');
  const btnManualSync = document.getElementById('btn-manual-sync');
  const syncLastTime = document.getElementById('sync-last-time');
  const settingDisplayName = document.getElementById('setting-display-name');
  const settingCustomUsername = document.getElementById('setting-custom-username');
  const btnResetUsername = document.getElementById('btn-reset-username');
  const linkManagePuter = document.getElementById('link-manage-puter');
  const settingStorageMode = document.getElementById('setting-storage-mode');

  const settingPersonaPreset = document.getElementById('setting-persona-preset');
  const settingSystemPrompt = document.getElementById('setting-system-prompt');
  const settingTemperature = document.getElementById('setting-temperature');
  const tempValDisplay = document.getElementById('temp-val-display');

  const btnExportChats = document.getElementById('btn-export-chats');
  const btnImportChats = document.getElementById('btn-import-chats');
  const importFileInput = document.getElementById('import-file-input');
  const btnModalClearChats = document.getElementById('btn-modal-clear-chats');
  const toastContainer = document.getElementById('toast-container');

  // In-Window Custom Project Studio Elements
  const chatTopbar = document.getElementById('chat-topbar');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const projectStudioView = document.getElementById('project-studio-view');
  const btnStudioBack = document.getElementById('btn-studio-back');
  const btnStudioCancel = document.getElementById('btn-studio-cancel');
  const btnStudioSave = document.getElementById('btn-studio-save');
  const btnStudioDelete = document.getElementById('btn-studio-delete');
  const studioHeaderIcon = document.getElementById('studio-header-icon');
  const studioHeaderTitle = document.getElementById('studio-header-title');
  const studioMobileToggle = document.getElementById('studio-mobile-toggle');
  const studioEditorPane = document.getElementById('studio-editor-pane');
  const studioPreviewPane = document.getElementById('studio-preview-pane');
  const studioContentGrid = document.querySelector('.studio-content-grid');

  const projectNameInput = document.getElementById('project-name-input');
  const projectDescInput = document.getElementById('project-desc-input');
  const projectModelSelect = document.getElementById('project-model-select');
  const projectIntentInput = document.getElementById('project-intent-input');
  const projectContextInput = document.getElementById('project-context-input');
  const projectOutputInput = document.getElementById('project-output-input');
  const emojiPickerRow = document.getElementById('emoji-picker-row');
  const projectDropzone = document.getElementById('project-dropzone');
  const projectFileInput = document.getElementById('project-file-input');
  const projectFilesList = document.getElementById('project-files-list');
  const projectTokenCount = document.getElementById('project-token-count');

  // Studio Live Preview Elements
  const studioPreviewMessages = document.getElementById('studio-preview-messages');
  const studioPreviewTextarea = document.getElementById('studio-preview-textarea');
  const btnSendPreview = document.getElementById('btn-send-preview');
  const btnResetPreview = document.getElementById('btn-reset-preview');
  let studioPreviewAbortController = null;
  let studioPreviewHistory = [];

  // --- Initialize Marked & Highlighting ---
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {
            console.error('Highlight error:', e);
          }
        }
        return code;
      }
    });
  }

  // --- Helper: Toast Notifications ---
  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // --- Theme Management ---
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      themeIconSun.style.display = 'block';
      themeIconMoon.style.display = 'none';
    } else {
      themeIconSun.style.display = 'none';
      themeIconMoon.style.display = 'block';
    }
  }

  btnThemeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // --- Settings & Modal Tabs ---
  function initModalTabs() {
    document.querySelectorAll('.modal-dialog').forEach(dialog => {
      const tabBtns = dialog.querySelectorAll('.modal-tab-btn');
      const tabPanes = dialog.querySelectorAll('.tab-content');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          tabBtns.forEach(b => b.classList.remove('active'));
          tabPanes.forEach(c => c.classList.remove('active'));

          btn.classList.add('active');
          const content = dialog.querySelector(`#${targetTab}`);
          if (content) content.classList.add('active');
        });
      });
    });
  }

  function getEffectiveDisplayName() {
    if (settings.displayName && settings.displayName.trim()) {
      return settings.displayName.trim();
    }
    if (settings.customUsername && settings.customUsername.trim()) {
      return settings.customUsername.trim();
    }
    if (puterUser && (puterUser.name || puterUser.username)) {
      return puterUser.name || puterUser.username;
    }
    return 'Guest User';
  }

  function getEffectiveUsernameHandle() {
    if (settings.customUsername && settings.customUsername.trim()) {
      return settings.customUsername.trim().replace(/^@+/, '');
    }
    if (puterUser && puterUser.username) {
      return puterUser.username;
    }
    return '';
  }

  function getEffectiveUserInitial() {
    const name = getEffectiveDisplayName();
    if (name && name !== 'Guest User') {
      return name.charAt(0).toUpperCase();
    }
    const handle = getEffectiveUsernameHandle();
    if (handle) {
      return handle.charAt(0).toUpperCase();
    }
    return '?';
  }

  function loadLocalSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem('nexus_ai_settings');
      if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    loadProjectsFromLocal();
    updateModelButtonUI();
  }

  async function persistSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode !== 'local') {
        await puter.kv.set(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      }
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  }

  async function loadCloudSettings() {
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn()) {
      try {
        let cloudSettings = await puter.kv.get(STORAGE_KEY_SETTINGS);
        if (!cloudSettings) {
          cloudSettings = await puter.kv.get('nexus_ai_settings');
        }
        if (cloudSettings) {
          const parsed = typeof cloudSettings === 'string' ? JSON.parse(cloudSettings) : cloudSettings;
          settings = { ...settings, ...parsed };
          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
          updateModelButtonUI();
        }
      } catch (err) {
        console.warn('Failed to load settings from Puter KV:', err);
      }
    }
  }

  function populateSettingsModal() {
    settingPersonaPreset.value = settings.personaPreset || 'default';
    settingSystemPrompt.value = settings.systemPrompt || PERSONA_PRESETS.default;
    settingTemperature.value = settings.temperature;
    tempValDisplay.textContent = settings.temperature;
    settingStorageMode.value = settings.storageMode || 'cloud';
    if (settingDisplayName) {
      settingDisplayName.value = settings.displayName || '';
    }
    if (settingCustomUsername) {
      settingCustomUsername.value = settings.customUsername || '';
    }
    statChatCount.textContent = sessions.length;
    updateAuthUI();
  }

  async function saveSettings() {
    settings.personaPreset = settingPersonaPreset.value;
    settings.systemPrompt = settingSystemPrompt.value.trim() || PERSONA_PRESETS.default;
    settings.temperature = parseFloat(settingTemperature.value) || 0.7;
    settings.storageMode = settingStorageMode.value;
    if (settingDisplayName) {
      settings.displayName = settingDisplayName.value.trim();
    }
    if (settingCustomUsername) {
      settings.customUsername = settingCustomUsername.value.trim().replace(/^@+/, '');
    }

    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && typeof puter.auth.updateProfile === 'function') {
      try {
        const nameToSync = settings.displayName || settings.customUsername;
        if (nameToSync) {
          await puter.auth.updateProfile({ displayName: nameToSync });
        }
      } catch (err) {
        console.warn('Could not sync to Puter profile:', err);
      }
    }

    await persistSettings();
    await writeSharedCrossDeviceState(false);
    updateAuthUI();
    renderActiveSession();
    showToast('Profile and settings saved successfully');
    closeModal(settingsModal);
  }

  if (btnResetUsername) {
    btnResetUsername.addEventListener('click', () => {
      if (settingDisplayName) settingDisplayName.value = '';
      if (settingCustomUsername) {
        settingCustomUsername.value = puterUser ? puterUser.username : '';
        settingCustomUsername.focus();
      }
      showToast('Reset to default account credentials. Click Save to apply.');
    });
  }

  settingPersonaPreset.addEventListener('change', (e) => {
    const preset = e.target.value;
    if (preset !== 'custom' && PERSONA_PRESETS[preset] !== undefined) {
      settingSystemPrompt.value = PERSONA_PRESETS[preset];
    }
  });

  settingSystemPrompt.addEventListener('input', () => {
    settingPersonaPreset.value = 'custom';
  });

  settingTemperature.addEventListener('input', (e) => {
    tempValDisplay.textContent = e.target.value;
  });

  userProfileBar.addEventListener('click', () => {
    populateSettingsModal();
    // Switch directly to profile tab within settingsModal
    const settingsBtns = settingsModal.querySelectorAll('.modal-tab-btn');
    const settingsPanes = settingsModal.querySelectorAll('.tab-content');
    settingsBtns.forEach(b => b.classList.remove('active'));
    settingsPanes.forEach(c => c.classList.remove('active'));
    settingsModal.querySelector('[data-tab="tab-profile"]')?.classList.add('active');
    settingsModal.querySelector('#tab-profile')?.classList.add('active');
    openModal(settingsModal);
  });

  btnSaveSettings.addEventListener('click', saveSettings);
  btnCancelSettings.addEventListener('click', () => closeModal(settingsModal));
  btnCloseSettingsModal.addEventListener('click', () => closeModal(settingsModal));

  // --- Cloud Storage I/O & Dual-Tier Helpers (Puter.fs + Puter.kv) ---
  function loadLocalTombstones() {
    try {
      const s = localStorage.getItem(STORAGE_KEY_DELETED_SESSIONS) || localStorage.getItem('nexus_ai_deleted_sessions');
      if (s) deletedSessionIds = new Set(JSON.parse(s));
    } catch (e) {}
    try {
      const p = localStorage.getItem(STORAGE_KEY_DELETED_PROJECTS) || localStorage.getItem('nexus_ai_deleted_projects');
      if (p) deletedProjectIds = new Set(JSON.parse(p));
    } catch (e) {}
  }

  function saveLocalTombstones() {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_SESSIONS, JSON.stringify(Array.from(deletedSessionIds)));
      localStorage.setItem(STORAGE_KEY_DELETED_PROJECTS, JSON.stringify(Array.from(deletedProjectIds)));
    } catch (e) {}
  }

  async function syncTombstones() {
    saveLocalTombstones();
    const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
    if (isSignedIn && settings.storageMode !== 'local') {
      try {
        let remoteDelSessions = await readPuterFileOrKV(PUTER_FS_DELETED_SESSIONS_PATH, STORAGE_KEY_DELETED_SESSIONS);
        if (!remoteDelSessions) {
          remoteDelSessions = await readPuterFileOrKV('nexus_deleted_sessions.json', 'nexus_ai_deleted_sessions');
        }
        if (Array.isArray(remoteDelSessions)) {
          remoteDelSessions.forEach(id => deletedSessionIds.add(id));
        }
        let remoteDelProjects = await readPuterFileOrKV(PUTER_FS_DELETED_PROJECTS_PATH, STORAGE_KEY_DELETED_PROJECTS);
        if (!remoteDelProjects) {
          remoteDelProjects = await readPuterFileOrKV('nexus_deleted_projects.json', 'nexus_ai_deleted_projects');
        }
        if (Array.isArray(remoteDelProjects)) {
          remoteDelProjects.forEach(id => deletedProjectIds.add(id));
        }

        if (deletedSessionIds.size > 200) {
          deletedSessionIds = new Set(Array.from(deletedSessionIds).slice(-200));
        }
        if (deletedProjectIds.size > 100) {
          deletedProjectIds = new Set(Array.from(deletedProjectIds).slice(-100));
        }

        saveLocalTombstones();
        await writePuterFileAndKV(PUTER_FS_DELETED_SESSIONS_PATH, STORAGE_KEY_DELETED_SESSIONS, Array.from(deletedSessionIds));
        await writePuterFileAndKV(PUTER_FS_DELETED_PROJECTS_PATH, STORAGE_KEY_DELETED_PROJECTS, Array.from(deletedProjectIds));
      } catch (e) {
        console.warn('[Omni Sync] Tombstone sync warning:', e);
      }
    }
  }

  // --- Shared Documents Cross-Device Synchronization ---
  let sharedDocumentsDirPath = null;
  function updateCrossSyncUIState(isConnected) {
    const btnCrossSync = document.getElementById('btn-enable-cross-sync');
    if (btnCrossSync) {
      if (isConnected) {
        btnCrossSync.innerHTML = '<span>✓ Cross-Device Sync Connected</span>';
        btnCrossSync.className = 'btn-secondary btn-cross-sync-connected';
        btnCrossSync.title = 'Cross-device storage is connected via Puter Documents. All chats, projects, and username sync across devices.';
        btnCrossSync.style.color = 'var(--success-color, #10b981)';
        btnCrossSync.style.borderColor = 'var(--success-color, #10b981)';
      } else {
        btnCrossSync.innerHTML = '<span>🌐 Connect Cross-Device Storage</span>';
        btnCrossSync.className = 'btn-secondary';
        btnCrossSync.title = 'Share chats between devices via Puter Documents folder';
        btnCrossSync.style.color = '';
        btnCrossSync.style.borderColor = '';
      }
    }
  }

  async function getSharedDocumentsDir(promptIfMissing = false) {
    if (typeof puter === 'undefined' || !puter.perms || typeof puter.perms.check !== 'function') {
      return null;
    }
    if (sharedDocumentsDirPath && !promptIfMissing) {
      return sharedDocumentsDirPath;
    }
    try {
      const hasPerm = await puter.perms.check('folder', { name: 'Documents', access: 'write' });
      if (hasPerm) {
        const res = await puter.perms.request('folder', { name: 'Documents', access: 'write' });
        const path = typeof res === 'string' ? res : (res && (res.path || res.name) ? (res.path || res.name) : 'Documents');
        sharedDocumentsDirPath = path || 'Documents';
        updateCrossSyncUIState(true);
        return sharedDocumentsDirPath;
      }
      if (promptIfMissing) {
        const res = await puter.perms.request('folder', { name: 'Documents', access: 'write' });
        if (res) {
          const path = typeof res === 'string' ? res : (res && (res.path || res.name) ? (res.path || res.name) : 'Documents');
          sharedDocumentsDirPath = path || 'Documents';
          updateCrossSyncUIState(true);
          return sharedDocumentsDirPath;
        }
      }
    } catch (e) {
      console.warn('[Omni Sync] Shared folder perm error:', e);
    }
    updateCrossSyncUIState(false);
    return null;
  }

  async function readSharedCrossDeviceState() {
    const docDir = await getSharedDocumentsDir(false);
    if (!docDir || typeof puter === 'undefined' || !puter.fs) return null;

    const candidatePaths = [
      `${docDir}/OmniChat/omni_sync_state.json`,
      `${docDir}/omni_sync_state.json`,
      `${docDir}/NexusAI/nexus_sync_state.json`,
      `${docDir}/nexus_sync_state.json`
    ];

    for (const p of candidatePaths) {
      try {
        const blob = await puter.fs.read(p);
        if (blob) {
          const txt = await blob.text();
          if (txt && txt.trim()) {
            return JSON.parse(txt);
          }
        }
      } catch (e) {}
    }
    return null;
  }

  async function writeSharedCrossDeviceState(forcePrompt = false) {
    const docDir = await getSharedDocumentsDir(forcePrompt);
    if (!docDir || typeof puter === 'undefined' || !puter.fs) return false;

    const payload = {
      version: 1,
      updatedAt: Date.now(),
      settings: {
        displayName: settings.displayName || '',
        customUsername: settings.customUsername || '',
        personaPreset: settings.personaPreset,
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature,
        selectedModel: settings.selectedModel
      },
      projects: projects,
      sessions: sessions,
      deletedSessionIds: Array.from(deletedSessionIds),
      deletedProjectIds: Array.from(deletedProjectIds)
    };

    const jsonStr = JSON.stringify(payload);

    try {
      if (typeof puter.fs.mkdir === 'function') {
        try { await puter.fs.mkdir(`${docDir}/OmniChat`); } catch (err) {}
      }
      await puter.fs.write(`${docDir}/OmniChat/omni_sync_state.json`, jsonStr);
      return true;
    } catch (err) {
      try {
        await puter.fs.write(`${docDir}/omni_sync_state.json`, jsonStr);
        return true;
      } catch (e2) {
        console.warn('[Omni Sync] Failed to write shared cross-device state:', e2);
        return false;
      }
    }
  }

  async function syncAllSharedCrossDevice(promptIfMissing = false) {
    const sharedData = await (promptIfMissing ? (async () => {
      const dir = await getSharedDocumentsDir(true);
      return dir ? await readSharedCrossDeviceState() : null;
    })() : readSharedCrossDeviceState());

    if (sharedData) {
      if (sharedData.settings) {
        if (sharedData.settings.displayName) {
          settings.displayName = sharedData.settings.displayName;
        }
        if (sharedData.settings.customUsername) {
          settings.customUsername = sharedData.settings.customUsername;
        }
        if (sharedData.settings.selectedModel) {
          settings.selectedModel = sharedData.settings.selectedModel;
        }
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        updateModelButtonUI();
        updateAuthUI();
      }

      if (Array.isArray(sharedData.deletedSessionIds)) {
        sharedData.deletedSessionIds.forEach(id => deletedSessionIds.add(id));
      }
      if (Array.isArray(sharedData.deletedProjectIds)) {
        sharedData.deletedProjectIds.forEach(id => deletedProjectIds.add(id));
      }
      saveLocalTombstones();

      if (Array.isArray(sharedData.projects)) {
        projects = mergeProjects(sharedData.projects, projects);
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
        renderProjectsList();
      }

      if (Array.isArray(sharedData.sessions)) {
        sessions = mergeSessions(sharedData.sessions, sessions);
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
        renderSessionList();
        restoreActiveSession();
      }

      await writeSharedCrossDeviceState(false);
      updateCrossSyncUIState(true);
      return true;
    } else {
      const docDir = await getSharedDocumentsDir(promptIfMissing);
      if (docDir) {
        await writeSharedCrossDeviceState(false);
        updateCrossSyncUIState(true);
        return true;
      }
    }
    return false;
  }

  async function readPuterFileOrKV(filePath, kvKey) {
    if (typeof puter !== 'undefined' && puter.fs && typeof puter.fs.read === 'function') {
      try {
        const blob = await puter.fs.read(filePath);
        if (blob) {
          const text = await blob.text();
          if (text && text.trim()) {
            return JSON.parse(text);
          }
        }
      } catch (fsErr) {
        // Fallback to KV
      }
    }

    if (typeof puter !== 'undefined' && puter.kv && typeof puter.kv.get === 'function') {
      try {
        const kvData = await puter.kv.get(kvKey);
        if (kvData !== undefined && kvData !== null) {
          return typeof kvData === 'string' ? JSON.parse(kvData) : kvData;
        }
      } catch (kvErr) {
        console.warn(`[Omni Sync] puter.kv.get(${kvKey}) error:`, kvErr?.message || kvErr);
      }
    }

    return null;
  }

  async function writePuterFileAndKV(filePath, kvKey, data) {
    const jsonStr = JSON.stringify(data);
    let fsSuccess = false;

    if (typeof puter !== 'undefined' && puter.fs && typeof puter.fs.write === 'function') {
      try {
        await puter.fs.write(filePath, jsonStr);
        fsSuccess = true;
      } catch (fsErr) {
        console.warn(`[Omni Sync] puter.fs.write(${filePath}) error:`, fsErr);
      }
    }

    if (typeof puter !== 'undefined' && puter.kv && typeof puter.kv.set === 'function') {
      if (jsonStr.length < 380000) {
        try {
          await puter.kv.set(kvKey, data);
        } catch (kvErr) {
          console.warn(`[Omni Sync] puter.kv.set(${kvKey}) error:`, kvErr);
        }
      } else {
        console.log(`[Omni Sync] Payload (${jsonStr.length} bytes) exceeds Puter KV limit. Stored safely via puter.fs.`);
      }
    }

    // Also mirror to shared Documents folder if connected
    writeSharedCrossDeviceState(false).catch(() => {});

    return fsSuccess;
  }

  function mergeSessions(cloudList, localList) {
    if (!Array.isArray(cloudList) && !Array.isArray(localList)) return [];
    const cList = Array.isArray(cloudList) ? cloudList : [];
    const lList = Array.isArray(localList) ? localList : [];

    const map = new Map();

    cList.forEach(s => {
      if (s && s.id && !deletedSessionIds.has(s.id)) {
        map.set(s.id, s);
      }
    });

    lList.forEach(localS => {
      if (!localS || !localS.id || deletedSessionIds.has(localS.id)) return;
      const existing = map.get(localS.id);
      if (!existing) {
        const hasContent = (localS.messages && localS.messages.length > 0) || (localS.title && !localS.title.includes('New Conversation'));
        if (hasContent || map.size === 0) {
          map.set(localS.id, localS);
        }
      } else {
        const existingCount = (existing.messages || []).length;
        const localCount = (localS.messages || []).length;
        if (localCount > existingCount) {
          map.set(localS.id, localS);
        } else if (localCount === existingCount) {
          const existingTime = existing.updatedAt || (existing.messages && existing.messages.length > 0 ? existing.messages[existing.messages.length - 1].timestamp : 0) || existing.createdAt || 0;
          const localTime = localS.updatedAt || (localS.messages && localS.messages.length > 0 ? localS.messages[localS.messages.length - 1].timestamp : 0) || localS.createdAt || 0;
          if (localTime > existingTime) {
            map.set(localS.id, localS);
          }
        }
      }
    });

    const all = Array.from(map.values());
    const realSessions = all.filter(s => (s.messages && s.messages.length > 0) || (s.title && !s.title.includes('New Conversation')));
    const finalSessions = realSessions.length > 0 ? realSessions : all;

    finalSessions.sort((a, b) => {
      const timeA = a.updatedAt || (a.messages && a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : 0) || a.createdAt || 0;
      const timeB = b.updatedAt || (b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : 0) || b.createdAt || 0;
      return timeB - timeA;
    });

    return finalSessions;
  }

  function mergeProjects(cloudList, localList) {
    if (!Array.isArray(cloudList) && !Array.isArray(localList)) return [];
    const cList = Array.isArray(cloudList) ? cloudList : [];
    const lList = Array.isArray(localList) ? localList : [];

    const map = new Map();
    cList.forEach(p => {
      if (p && p.id && !deletedProjectIds.has(p.id)) {
        map.set(p.id, p);
      }
    });

    lList.forEach(p => {
      if (!p || !p.id || deletedProjectIds.has(p.id)) return;
      const existing = map.get(p.id);
      if (!existing) {
        map.set(p.id, p);
      } else {
        const existingTime = existing.updatedAt || existing.createdAt || 0;
        const localTime = p.updatedAt || p.createdAt || 0;
        if (localTime > existingTime) {
          map.set(p.id, p);
        }
      }
    });

    return Array.from(map.values());
  }

  // --- Puter Authentication & Cloud Storage Synchronization ---
  function updateSyncStatusUI(statusText, isSuccess = true) {
    if (statSyncStatus) {
      const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
      if (isSignedIn) {
        statSyncStatus.textContent = statusText || 'Synced (Puter Cloud)';
        statSyncStatus.style.color = isSuccess ? 'var(--success-color)' : 'var(--warning-color, #f59e0b)';
      } else {
        statSyncStatus.textContent = 'Local Storage Only';
        statSyncStatus.style.color = 'var(--text-muted)';
      }
    }
    if (syncLastTime) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      syncLastTime.textContent = isSuccess ? `Last synced ${timeStr}` : 'Sync issue (using local cache)';
    }
  }

  async function waitForPuter(timeoutMs = 4000) {
    const start = Date.now();
    while (typeof puter === 'undefined' && (Date.now() - start < timeoutMs)) {
      await new Promise(r => setTimeout(r, 50));
    }
    return typeof puter !== 'undefined';
  }

  async function initPuter() {
    const isReady = await waitForPuter();
    if (!isReady) {
      console.warn('[Omni Puter] Puter.js SDK not available after wait.');
      updateAuthUI();
      return;
    }

    try {
      // Check if shared cross-device Documents folder is already connected
      await getSharedDocumentsDir(false);
      await syncAllSharedCrossDevice(false);

      await loadCloudSettings();
      await updateAuthUI();
      fetchPuterModels();
      await syncTombstones();
      await loadProjects();
      await loadSessions();
      updateSyncStatusUI('Synced (Puter Cloud)', true);
    } catch (err) {
      console.error('[Omni Puter] Puter init error:', err);
      updateSyncStatusUI('Sync error (using local cache)', false);
    }
  }

  async function updateAuthUI() {
    const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();

    if (isSignedIn) {
      try {
        puterUser = await puter.auth.getUser();
        const displayName = getEffectiveDisplayName();
        const handle = getEffectiveUsernameHandle();
        const initial = getEffectiveUserInitial();

        userName.textContent = displayName;
        userTier.textContent = `@${handle || puterUser.username || 'user'} • Puter Cloud`;
        userAvatar.textContent = initial;
        userStatusDot.className = 'user-status-dot';

        modalAccountName.textContent = displayName;
        modalAccountStatus.textContent = settings.customUsername
          ? `@${handle} (Puter Cloud: @${puterUser.username || 'user'})`
          : `@${puterUser.username || 'user'} • Puter Cloud Account`;
        modalAccountAvatar.textContent = initial;
        btnModalAuth.textContent = 'Sign Out';
        btnModalAuth.className = 'btn-secondary';
        updateSyncStatusUI('Synced (Puter Cloud)', true);

        if (linkManagePuter) linkManagePuter.style.display = 'inline-flex';
      } catch (e) {
        console.warn('[Omni Auth] Failed to get user:', e);
      }
    } else {
      puterUser = null;
      const displayName = getEffectiveDisplayName();
      const handle = getEffectiveUsernameHandle();
      const initial = getEffectiveUserInitial();

      userName.textContent = displayName;
      userTier.textContent = handle ? `@${handle} • Local` : 'Click to connect Puter';
      userAvatar.textContent = initial;
      userStatusDot.className = 'user-status-dot offline';

      modalAccountName.textContent = displayName;
      modalAccountStatus.textContent = handle ? `@${handle} • Local guest profile` : 'Saved in browser local storage';
      modalAccountAvatar.textContent = initial;
      btnModalAuth.textContent = 'Sign In with Puter';
      btnModalAuth.className = 'btn-primary';
      updateSyncStatusUI('Local Storage Only', true);

      if (linkManagePuter) linkManagePuter.style.display = 'none';
    }

    const welcomeUsername = document.getElementById('welcome-username');
    if (welcomeUsername) {
      const displayName = getEffectiveDisplayName();
      welcomeUsername.textContent = (displayName !== 'Guest User') ? displayName : 'human';
    }

    if (statChatCount) {
      statChatCount.textContent = sessions.length;
    }
  }

  async function manualSyncAll(showFeedback = true) {
    const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
    if (!isSignedIn) {
      if (showFeedback) showToast('Please sign in with Puter to sync with cloud.');
      return;
    }

    if (btnTopbarSync) btnTopbarSync.classList.add('syncing');
    if (btnManualSync) {
      btnManualSync.classList.add('syncing');
      btnManualSync.disabled = true;
    }

    try {
      if (showFeedback) showToast('Syncing chats with Puter Cloud...');
      if (!sharedDocumentsDirPath && showFeedback) {
        await syncAllSharedCrossDevice(true);
      } else {
        await syncAllSharedCrossDevice(false);
      }
      await loadCloudSettings();
      await syncTombstones();
      await loadProjects();
      await loadSessions();
      await persistSessions();
      await persistProjects();
      await writeSharedCrossDeviceState(false);
      updateAuthUI();
      updateSyncStatusUI('Synced (Puter Cloud)', true);
      if (showFeedback) {
        showToast(`Cloud Sync Complete: ${sessions.length} chats & ${projects.length} projects synced!`);
      }
    } catch (err) {
      console.error('[Omni Sync] Manual sync failed:', err);
      updateSyncStatusUI('Sync error', false);
      if (showFeedback) showToast('Sync failed: ' + (err.message || 'Network error'));
    } finally {
      if (btnTopbarSync) btnTopbarSync.classList.remove('syncing');
      if (btnManualSync) {
        btnManualSync.classList.remove('syncing');
        btnManualSync.disabled = false;
      }
    }
  }

  if (btnTopbarSync) {
    btnTopbarSync.addEventListener('click', () => manualSyncAll(true));
  }
  if (btnManualSync) {
    btnManualSync.addEventListener('click', () => manualSyncAll(true));
  }

  const btnEnableCrossSync = document.getElementById('btn-enable-cross-sync');
  if (btnEnableCrossSync) {
    btnEnableCrossSync.addEventListener('click', async () => {
      const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
      if (!isSignedIn) {
        showToast('Please sign in with Puter first');
        return;
      }
      btnEnableCrossSync.disabled = true;
      btnEnableCrossSync.innerHTML = '<span>⏳ Connecting...</span>';
      try {
        const success = await syncAllSharedCrossDevice(true);
        if (success) {
          updateCrossSyncUIState(true);
          showToast('✓ Connected to Puter Documents! All chats, projects & usernames now sync across devices.');
        } else {
          showToast('Cross-device storage connection cancelled or not granted.');
        }
      } catch (err) {
        showToast('Connection error: ' + (err.message || 'Permission failed'));
      } finally {
        btnEnableCrossSync.disabled = false;
        updateCrossSyncUIState(!!sharedDocumentsDirPath);
      }
    });
  }

  // Background Auto-Sync when returning to tab or focus
  let lastBackgroundSyncTime = 0;
  function triggerBackgroundSync() {
    if (Date.now() - lastBackgroundSyncTime < 15000) return; // At most once every 15s
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode !== 'local') {
      lastBackgroundSyncTime = Date.now();
      console.log('[Omni Sync] Window active: checking for updates from other devices...');
      manualSyncAll(false);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerBackgroundSync();
    }
  });

  window.addEventListener('focus', () => {
    triggerBackgroundSync();
  });

  btnModalAuth.addEventListener('click', async () => {
    if (typeof puter === 'undefined') {
      showToast('Puter.js SDK not ready');
      return;
    }

    if (puter.auth.isSignedIn()) {
      await puter.auth.signOut();
      updateAuthUI();
      showToast('Signed out from Puter');
      loadProjectsFromLocal();
      loadSessionsFromLocal();
    } else {
      try {
        await puter.auth.signIn();
        if (puter.auth.isSignedIn()) {
          const user = await puter.auth.getUser();
          showToast(`Welcome back, ${getEffectiveDisplayName() || user.username || 'friend'}! Syncing...`);
          await loadCloudSettings();
          await syncTombstones();
          await loadProjects();
          await loadSessions();
          await persistSessions();
          await updateAuthUI();
          updateSyncStatusUI('Synced (Puter Cloud)', true);
          showToast(`Synced ${sessions.length} conversations across all devices!`);
        }
      } catch (err) {
        console.error('Sign-in failed:', err);
        showToast('Sign-in canceled or failed');
      }
    }
  });

  // --- Puter Models Catalog (`puter.ai.listModels()`) ---
  function normalizeModel(m) {
    const id = typeof m === 'string' ? m : m.id;
    const rawProvider = (typeof m === 'object' && m.provider ? m.provider : '').toLowerCase();
    const rawName = (typeof m === 'object' && m.name ? m.name : id);
    const idLower = (id || '').toLowerCase();
    const nameLower = (rawName || '').toLowerCase();

    // Determine Logical Canonical Family
    let canonicalFamily = 'Other';
    if (
      rawProvider === 'gemini' ||
      rawProvider === 'google' ||
      idLower.includes('gemini') ||
      idLower.includes('google/') ||
      idLower.includes('gemma') ||
      nameLower.includes('gemini') ||
      nameLower.includes('google:')
    ) {
      canonicalFamily = 'Google';
    } else if (
      rawProvider.includes('openai') ||
      rawProvider === 'azure-openai' ||
      idLower.includes('openai/') ||
      idLower.startsWith('gpt') ||
      idLower.startsWith('o1') ||
      idLower.startsWith('o3') ||
      idLower.startsWith('o4') ||
      nameLower.includes('openai') ||
      nameLower.startsWith('gpt-')
    ) {
      canonicalFamily = 'OpenAI';
    } else if (
      rawProvider === 'claude' ||
      rawProvider.includes('anthropic') ||
      idLower.includes('claude') ||
      idLower.includes('anthropic/') ||
      nameLower.includes('claude') ||
      nameLower.includes('anthropic')
    ) {
      canonicalFamily = 'Anthropic';
    } else if (
      rawProvider.includes('deepseek') ||
      idLower.includes('deepseek') ||
      nameLower.includes('deepseek')
    ) {
      canonicalFamily = 'DeepSeek';
    } else if (
      rawProvider.includes('meta') ||
      idLower.includes('llama') ||
      idLower.includes('meta-llama') ||
      nameLower.includes('llama')
    ) {
      canonicalFamily = 'Meta';
    } else if (
      rawProvider.includes('mistral') ||
      idLower.includes('mistral') ||
      idLower.includes('codestral') ||
      nameLower.includes('mistral')
    ) {
      canonicalFamily = 'Mistral';
    } else if (
      rawProvider.includes('xai') ||
      rawProvider.includes('x-ai') ||
      idLower.includes('grok') ||
      nameLower.includes('grok')
    ) {
      canonicalFamily = 'xAI';
    } else if (
      rawProvider.includes('alibaba') ||
      idLower.includes('qwen') ||
      nameLower.includes('qwen')
    ) {
      canonicalFamily = 'Alibaba';
    } else {
      canonicalFamily = rawProvider ? rawProvider.charAt(0).toUpperCase() + rawProvider.slice(1) : 'Other';
    }

    // Clean human-friendly name
    let cleanName = rawName
      .replace(/\s*\((OpenRouter|Infron|batch)\)/gi, '')
      .replace(/^(Google|Anthropic|OpenAI|Meta|Mistral|xAI):\s*/i, '')
      .trim();

    const isReasoning = idLower.includes('reason') || idLower.includes('r1') || idLower.includes('thinking') || idLower.startsWith('o1') || idLower.startsWith('o3');

    // Context format
    let contextStr = '';
    if (m && typeof m.context === 'number') {
      if (m.context >= 1000000) contextStr = `${Math.round(m.context / 1000000)}M ctx`;
      else if (m.context >= 1000) contextStr = `${Math.round(m.context / 1000)}K ctx`;
    }

    return {
      id,
      name: cleanName || id,
      rawName,
      canonicalFamily,
      rawProvider: m.provider || '',
      isCurated: !!m.isCurated,
      isReasoning,
      contextStr,
      description: m.description || ''
    };
  }

  async function fetchPuterModels() {
    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.listModels) return;

    try {
      const models = await puter.ai.listModels();
      if (Array.isArray(models) && models.length > 0) {
        // Filter out non-interactive models (batch-only, audio-only, embeddings)
        const chatModels = models.filter(m => {
          const id = typeof m === 'string' ? m : m.id;
          if (!id) return false;
          if (id.endsWith(':batch')) return false; // Batch processing models cannot do real-time chat
          if (m.modalities && m.modalities.input && !m.modalities.input.includes('text')) return false;
          if (id.includes('whisper') || id.includes('lyria') || id.includes('embedding') || id.includes('fun-asr')) return false;
          return true;
        });

        const normalized = chatModels.map(m => normalizeModel(m));
        
        // Deduplicate by ID
        const seen = new Set();
        const list = [];
        for (const item of normalized) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            list.push(item);
          }
        }

        // Flag curated models and ensure they're at top
        const curatedList = [];
        CURATED_MODELS.forEach(cm => {
          const match = list.find(m => m.id === cm.id || (m.aliases && m.aliases.includes(cm.id)));
          if (match) {
            match.isCurated = true;
            if (cm.description && !match.description) match.description = cm.description;
            if (!curatedList.some(c => c.id === match.id)) {
              curatedList.push(match);
            }
          }
        });

        // Combine curated with the rest
        const remaining = list.filter(m => !curatedList.some(c => c.id === m.id));
        allModels = [...curatedList, ...remaining];
      }
    } catch (e) {
      console.warn('puter.ai.listModels fallback to curated:', e);
      allModels = CURATED_MODELS.map(m => normalizeModel(m));
    }
    updateProjectModelOptions();
  }

  function renderModelsList() {
    modelsListContainer.innerHTML = '';
    const q = (modelSearchInput.value || '').toLowerCase().trim();

    const filtered = allModels.filter(m => {
      // Canonical Provider filter
      if (activeProviderFilter !== 'all') {
        const fam = (m.canonicalFamily || '').toLowerCase();
        const idLower = (m.id || '').toLowerCase();
        const rawProv = (m.rawProvider || '').toLowerCase();

        if (activeProviderFilter === 'google') {
          if (fam !== 'google' && !idLower.includes('gemini') && !idLower.includes('google') && !rawProv.includes('gemini')) return false;
        } else if (activeProviderFilter === 'openai') {
          if (fam !== 'openai' && !idLower.includes('gpt') && !idLower.includes('openai') && !rawProv.includes('openai')) return false;
        } else if (activeProviderFilter === 'anthropic') {
          if (fam !== 'anthropic' && !idLower.includes('claude') && !idLower.includes('anthropic') && !rawProv.includes('claude')) return false;
        } else if (activeProviderFilter === 'deepseek') {
          if (fam !== 'deepseek' && !idLower.includes('deepseek') && !rawProv.includes('deepseek')) return false;
        } else if (activeProviderFilter === 'xai') {
          if (fam !== 'xai' && !idLower.includes('grok') && !idLower.includes('xai') && !rawProv.includes('xai')) return false;
        } else if (activeProviderFilter === 'meta') {
          if (fam !== 'meta' && !idLower.includes('llama') && !idLower.includes('meta')) return false;
        } else if (activeProviderFilter === 'mistral') {
          if (fam !== 'mistral' && !idLower.includes('mistral') && !idLower.includes('codestral')) return false;
        } else if (fam !== activeProviderFilter && !idLower.includes(activeProviderFilter)) {
          return false;
        }
      }

      // Search query filter
      if (q) {
        return (m.id && m.id.toLowerCase().includes(q)) ||
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.canonicalFamily && m.canonicalFamily.toLowerCase().includes(q)) ||
          (m.rawProvider && m.rawProvider.toLowerCase().includes(q));
      }
      return true;
    });

    if (filtered.length === 0) {
      modelsListContainer.innerHTML = '<div style="padding: 2rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.88rem;">No matching models found. Try a different search keyword or provider filter.</div>';
      return;
    }

    // Group models by Canonical Family
    const groups = {};
    filtered.forEach(m => {
      const fam = m.canonicalFamily || 'Other';
      if (!groups[fam]) groups[fam] = [];
      groups[fam].push(m);
    });

    // Provider priority sorting
    const familyOrder = ['Google', 'OpenAI', 'Anthropic', 'DeepSeek', 'xAI', 'Meta', 'Mistral', 'Alibaba'];
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const idxA = familyOrder.indexOf(a);
      const idxB = familyOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(familyKey => {
      const header = document.createElement('div');
      header.className = 'model-group-header';
      header.textContent = `${familyKey} (${groups[familyKey].length})`;
      modelsListContainer.appendChild(header);

      groups[familyKey].forEach(m => {
        const item = document.createElement('div');
        item.className = 'model-option-item' + (m.id === settings.selectedModel ? ' selected' : '');
        item.innerHTML = `
          <div class="model-option-info">
            <div class="model-option-name">${escapeHtml(m.name)}</div>
            <div class="model-option-id">${escapeHtml(m.id)}</div>
          </div>
          <div class="model-badges-row">
            ${m.isCurated ? '<span class="badge-featured">Featured</span>' : ''}
            ${m.isReasoning ? '<span class="badge-reasoning">Reasoning</span>' : ''}
            ${m.contextStr ? `<span class="badge-context">${escapeHtml(m.contextStr)}</span>` : ''}
            <span class="model-provider-badge">${escapeHtml(m.canonicalFamily || m.rawProvider || 'AI')}</span>
          </div>
        `;
        item.addEventListener('click', () => {
          selectModel(m.id, m.name, m.canonicalFamily || m.rawProvider);
          closeModal(modelModal);
        });
        modelsListContainer.appendChild(item);
      });
    });
  }

  function selectModel(id, name, provider) {
    settings.selectedModel = id;
    persistSettings();
    updateModelButtonUI(name, provider);
    showToast(`Active model: ${name || id}`);
  }

  function updateModelButtonUI(name, provider) {
    const found = allModels.find(m => m.id === settings.selectedModel) || { name: settings.selectedModel, canonicalFamily: 'AI' };
    selectedModelName.textContent = name || found.name || settings.selectedModel;
    selectedModelProvider.textContent = provider || found.canonicalFamily || found.rawProvider || 'AI';
  }

  btnModelPicker.addEventListener('click', () => {
    modelSearchInput.value = '';
    activeProviderFilter = 'all';
    providerPillsBar.querySelectorAll('.provider-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-provider') === 'all');
    });
    renderModelsList();
    openModal(modelModal);
    setTimeout(() => modelSearchInput.focus(), 60);
  });

  providerPillsBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.provider-pill');
    if (!pill) return;
    providerPillsBar.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeProviderFilter = pill.getAttribute('data-provider');
    renderModelsList();
  });

  modelSearchInput.addEventListener('input', renderModelsList);
  btnCloseModelModal.addEventListener('click', () => closeModal(modelModal));
  btnCancelModelModal.addEventListener('click', () => closeModal(modelModal));

  // --- Custom Projects (Workspaces) Management ---
  function getLocalProjects() {
    try {
      const local = localStorage.getItem(STORAGE_KEY_PROJECTS) || localStorage.getItem('nexus_ai_projects');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }

  async function loadProjects() {
    const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
    if (isSignedIn && settings.storageMode !== 'local') {
      try {
        let cloudData = await readPuterFileOrKV(PUTER_FS_PROJECTS_PATH, STORAGE_KEY_PROJECTS);
        if (!cloudData) {
          cloudData = await readPuterFileOrKV('nexus_chat_projects.json', 'nexus_ai_projects');
        }
        const local = getLocalProjects();

        if (cloudData && Array.isArray(cloudData)) {
          projects = mergeProjects(cloudData, local);
          localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
          if (projects.length > cloudData.length || local.length > 0) {
            writePuterFileAndKV(PUTER_FS_PROJECTS_PATH, STORAGE_KEY_PROJECTS, projects).catch(e => console.warn(e));
          }
          ensureProjectExpandedState();
          renderProjectsList();
          updateTopbarProjectPill();
          return;
        } else if (local.length > 0) {
          projects = local.filter(p => p && p.id && !deletedProjectIds.has(p.id));
          await writePuterFileAndKV(PUTER_FS_PROJECTS_PATH, STORAGE_KEY_PROJECTS, projects);
          ensureProjectExpandedState();
          renderProjectsList();
          updateTopbarProjectPill();
          return;
        }
      } catch (err) {
        console.warn('[Omni Sync] Failed to load projects from Puter Cloud:', err);
      }
    }
    loadProjectsFromLocal();
  }

  function ensureProjectExpandedState() {
    if (activeProjectId) {
      expandedProjectIds.add(activeProjectId);
    } else if (projects.length > 0 && expandedProjectIds.size === 0) {
      expandedProjectIds.add(projects[0].id);
    }
  }

  function loadProjectsFromLocal() {
    projects = getLocalProjects().filter(p => p && p.id && !deletedProjectIds.has(p.id));
    ensureProjectExpandedState();
    renderProjectsList();
    updateTopbarProjectPill();
  }

  async function persistProjects() {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
      if (isSignedIn && settings.storageMode !== 'local') {
        await writePuterFileAndKV(PUTER_FS_PROJECTS_PATH, STORAGE_KEY_PROJECTS, projects);
      }
    } catch (e) {
      console.warn('[Omni Sync] Failed to persist projects:', e);
    }
    renderProjectsList();
    updateTopbarProjectPill();
  }

  function getActiveProject() {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId) || null;
  }

  function selectProject(projectId) {
    if (activeProjectId === projectId) return;
    activeProjectId = projectId;
    if (activeProjectId) expandedProjectIds.add(activeProjectId);
    updateTopbarProjectPill();

    const projectSessions = sessions.filter(s => s.projectId === activeProjectId);
    if (projectSessions.length > 0) {
      switchSession(projectSessions[0].id);
    } else {
      createNewSessionForProject(projectId);
    }

    renderProjectsList();
    renderSessionList();

    const proj = getActiveProject();
    if (proj) {
      showToast(`Entered project: ${proj.name}`);
    }
  }

  function exitProject() {
    if (!activeProjectId) return;
    activeProjectId = null;
    updateTopbarProjectPill();

    const generalSessions = sessions.filter(s => !s.projectId);
    if (generalSessions.length > 0) {
      switchSession(generalSessions[0].id);
    } else {
      createNewSession();
    }

    renderProjectsList();
    renderSessionList();
    showToast('Exited to standard chats');
  }

  function updateTopbarProjectPill() {
    const proj = getActiveProject();
    if (proj && topbarProjectPill) {
      if (topbarProjectIcon) topbarProjectIcon.textContent = proj.icon || '📁';
      if (topbarProjectName) topbarProjectName.textContent = proj.name || 'Untitled Project';
      topbarProjectPill.style.display = 'inline-flex';
    } else if (topbarProjectPill) {
      topbarProjectPill.style.display = 'none';
    }
  }

  function createNewSessionForProject(projectId) {
    if (!projectId) return;
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    activeProjectId = projectId;
    expandedProjectIds.add(projectId);
    const newSession = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: `${proj.icon || '📁'} New Chat`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: proj.model || settings.selectedModel,
      projectId: activeProjectId,
      messages: []
    };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    persistSessions();
    updateTopbarProjectPill();
    renderProjectsList();
    renderSessionList();
    renderActiveSession();
    chatTextarea.focus();
    showToast(`Started new chat in "${proj.name}"`);
  }

  function renderProjectsList() {
    if (!projectsList) return;
    projectsList.innerHTML = '';

    if (projects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'projects-empty-hint';
      empty.textContent = 'No custom projects yet. Click + to build your first AI workspace!';
      projectsList.appendChild(empty);
      return;
    }

    projects.forEach(p => {
      const pSessions = sessions.filter(s => s.projectId === p.id);
      const isExpanded = expandedProjectIds.has(p.id);
      const isActiveProject = (p.id === activeProjectId);

      const fileCount = (p.files && p.files.length) ? p.files.length : 0;
      const fileBadge = fileCount > 0 ? `<span class="project-nav-badge" title="${fileCount} attached files">${fileCount} 📄</span>` : '';
      const chatBadge = pSessions.length > 0 ? `<span class="project-nav-badge" title="${pSessions.length} conversations in this project">${pSessions.length} 💬</span>` : '';

      const group = document.createElement('div');
      group.className = 'project-group' + (isExpanded ? ' expanded' : '') + (isActiveProject ? ' active' : '');
      group.setAttribute('data-project-id', p.id);

      const header = document.createElement('div');
      header.className = 'project-group-header';
      header.innerHTML = `
        <button class="project-group-chevron" title="${isExpanded ? 'Collapse project' : 'Expand project'}" aria-label="Toggle project chats">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <div class="project-group-main">
          <span class="project-group-icon">${escapeHtml(p.icon || '📁')}</span>
          <span class="project-group-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          ${chatBadge}
          ${fileBadge}
        </div>
        <div class="project-group-actions">
          <button class="icon-btn-xs btn-add-chat-project" title="New chat in ${escapeHtml(p.name)}" aria-label="New chat in project">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="icon-btn-xs btn-edit-project" title="Edit Project Studio" aria-label="Edit project">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
      `;

      header.addEventListener('click', (e) => {
        if (e.target.closest('.project-group-actions') || e.target.closest('.icon-btn-xs')) return;
        if (expandedProjectIds.has(p.id)) {
          expandedProjectIds.delete(p.id);
        } else {
          expandedProjectIds.add(p.id);
        }
        renderProjectsList();
      });

      const chevronBtn = header.querySelector('.project-group-chevron');
      if (chevronBtn) {
        chevronBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (expandedProjectIds.has(p.id)) {
            expandedProjectIds.delete(p.id);
          } else {
            expandedProjectIds.add(p.id);
          }
          renderProjectsList();
        });
      }

      const btnAddChat = header.querySelector('.btn-add-chat-project');
      if (btnAddChat) {
        btnAddChat.addEventListener('click', (e) => {
          e.stopPropagation();
          createNewSessionForProject(p.id);
        });
      }

      const btnEdit = header.querySelector('.btn-edit-project');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openProjectStudio(p.id);
        });
      }

      group.appendChild(header);

      if (isExpanded) {
        const chatsContainer = document.createElement('div');
        chatsContainer.className = 'project-group-chats';

        if (pSessions.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'project-empty-hint';
          empty.textContent = 'No conversations yet';
          chatsContainer.appendChild(empty);
        } else {
          pSessions.forEach(s => {
            const chatItem = document.createElement('div');
            chatItem.className = 'project-nested-chat' + (s.id === currentSessionId ? ' active' : '');
            chatItem.setAttribute('data-id', s.id);
            chatItem.innerHTML = `
              <svg class="project-nested-chat-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="project-nested-chat-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
              <div class="project-nested-chat-actions">
                <button class="icon-btn-xs btn-rename-nested-chat" title="Rename conversation" aria-label="Rename conversation">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="icon-btn-xs btn-delete-nested-chat" title="Delete conversation" aria-label="Delete conversation">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            `;

            chatItem.addEventListener('click', () => {
              if (chatItem.classList.contains('editing')) return;
              switchSession(s.id);
            });

            const btnDel = chatItem.querySelector('.btn-delete-nested-chat');
            if (btnDel) {
              btnDel.addEventListener('click', (e) => deleteSession(s.id, e));
            }

            const btnRename = chatItem.querySelector('.btn-rename-nested-chat');
            if (btnRename) {
              btnRename.addEventListener('click', (e) => {
                e.stopPropagation();
                startSidebarInlineRename(chatItem, s);
              });
            }

            const titleSpan = chatItem.querySelector('.project-nested-chat-title');
            if (titleSpan) {
              titleSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startSidebarInlineRename(chatItem, s);
              });
            }

            chatsContainer.appendChild(chatItem);
          });
        }

        group.appendChild(chatsContainer);
      }

      projectsList.appendChild(group);
    });
  }

  function updateProjectModelOptions() {
    if (!projectModelSelect) return;
    const currentVal = projectModelSelect.value;
    projectModelSelect.innerHTML = `<option value="">(Inherit Global Active Model: ${escapeHtml(settings.selectedModel)})</option>`;

    allModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.canonicalFamily || m.rawProvider || 'AI'})`;
      projectModelSelect.appendChild(opt);
    });

    if (currentVal) {
      projectModelSelect.value = currentVal;
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function calculateProjectTokens() {
    let chars = (projectIntentInput?.value || '').length +
                (projectContextInput?.value || '').length +
                (projectOutputInput?.value || '').length;
    editingProjectFiles.forEach(f => {
      chars += (f.content || '').length;
    });
    return Math.ceil(chars / 4);
  }

  function updateProjectTokenCounter() {
    if (!projectTokenCount) return;
    const tokens = calculateProjectTokens();
    projectTokenCount.textContent = tokens.toLocaleString();
  }

  function renderProjectFilesList() {
    if (!projectFilesList) return;
    projectFilesList.innerHTML = '';

    if (editingProjectFiles.length === 0) {
      projectFilesList.innerHTML = `
        <div style="text-align: center; padding: 1.25rem 0.5rem; color: var(--text-muted); font-size: 0.82rem;">
          No documents attached yet. Drop files above to enrich this project's knowledge.
        </div>
      `;
      if (projectModalFileCount) projectModalFileCount.textContent = '0';
      return;
    }

    if (projectModalFileCount) {
      projectModalFileCount.textContent = editingProjectFiles.length;
    }

    editingProjectFiles.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'project-file-card';
      card.innerHTML = `
        <div class="project-file-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="project-file-meta">
          <div class="project-file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <div class="project-file-info">
            <span>${formatFileSize(f.size)}</span>
            <span>•</span>
            <span>~${(f.tokens || 0).toLocaleString()} tokens</span>
          </div>
        </div>
        <button type="button" class="project-file-btn-delete" title="Remove document" aria-label="Remove document">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      card.querySelector('.project-file-btn-delete').addEventListener('click', () => {
        editingProjectFiles.splice(idx, 1);
        renderProjectFilesList();
        updateProjectTokenCounter();
      });

      projectFilesList.appendChild(card);
    });
  }

  function handleProjectFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const maxFileSize = 2 * 1024 * 1024; // 2MB limit per file

    Array.from(fileList).forEach(file => {
      if (file.size > maxFileSize) {
        showToast(`File "${file.name}" exceeds 2MB limit.`);
        return;
      }

      const existing = editingProjectFiles.find(f => f.name === file.name);
      if (existing) {
        showToast(`"${file.name}" is already attached.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target.result;
        if (typeof textContent === 'string') {
          const tokens = Math.ceil(textContent.length / 4);
          editingProjectFiles.push({
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: file.name,
            size: file.size,
            type: file.type || 'text/plain',
            content: textContent,
            tokens: tokens
          });
          renderProjectFilesList();
          updateProjectTokenCounter();
        }
      };
      reader.onerror = () => {
        showToast(`Failed to read "${file.name}"`);
      };
      reader.readAsText(file);
    });
  }

  function openProjectStudio(projectId = null) {
    editingProjectId = projectId;
    updateProjectModelOptions();

    // In-window transition: hide chat view and display studio view
    if (chatTopbar) chatTopbar.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (inputAreaWrapper) inputAreaWrapper.style.display = 'none';
    if (btnScrollBottom) btnScrollBottom.style.display = 'none';
    if (projectStudioView) projectStudioView.style.display = 'flex';

    // Reset mobile pane toggle
    if (studioMobileToggle) {
      studioMobileToggle.querySelectorAll('.studio-toggle-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-pane') === 'editor');
      });
    }
    if (studioContentGrid) studioContentGrid.classList.remove('show-preview');

    // Reset live preview chat
    resetStudioPreview();

    if (projectId) {
      const proj = projects.find(p => p.id === projectId);
      if (!proj) return;
      if (studioHeaderTitle) studioHeaderTitle.textContent = `Edit "${proj.name}"`;
      editingProjectIcon = proj.icon || '⚡';
      if (projectNameInput) projectNameInput.value = proj.name || '';
      if (projectDescInput) projectDescInput.value = proj.description || '';
      if (projectModelSelect) projectModelSelect.value = proj.model || '';
      if (projectIntentInput) projectIntentInput.value = proj.intent || '';
      if (projectContextInput) projectContextInput.value = proj.context || '';
      if (projectOutputInput) projectOutputInput.value = proj.outputGuidelines || '';
      editingProjectFiles = (proj.files || []).map(f => ({ ...f }));
      if (btnStudioDelete) btnStudioDelete.style.display = 'inline-flex';
    } else {
      if (studioHeaderTitle) studioHeaderTitle.textContent = 'Create Custom Project';
      editingProjectIcon = '⚡';
      if (projectNameInput) projectNameInput.value = '';
      if (projectDescInput) projectDescInput.value = '';
      if (projectModelSelect) projectModelSelect.value = '';
      if (projectIntentInput) projectIntentInput.value = '';
      if (projectContextInput) projectContextInput.value = '';
      if (projectOutputInput) projectOutputInput.value = '';
      editingProjectFiles = [];
      if (btnStudioDelete) btnStudioDelete.style.display = 'none';
    }

    if (studioHeaderIcon) studioHeaderIcon.textContent = editingProjectIcon;
    if (emojiPickerRow) {
      emojiPickerRow.querySelectorAll('.emoji-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-emoji') === editingProjectIcon);
      });
    }

    renderProjectFilesList();
    updateProjectTokenCounter();
    setTimeout(() => projectNameInput?.focus(), 80);
  }

  function closeProjectStudio() {
    if (studioPreviewAbortController) {
      studioPreviewAbortController.abort();
      studioPreviewAbortController = null;
    }
    if (projectStudioView) projectStudioView.style.display = 'none';
    if (chatTopbar) chatTopbar.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'flex';
    if (inputAreaWrapper) inputAreaWrapper.style.display = 'flex';
    renderActiveSession();
  }

  function resetStudioPreview() {
    if (studioPreviewAbortController) {
      studioPreviewAbortController.abort();
      studioPreviewAbortController = null;
    }
    studioPreviewHistory = [];
    if (studioPreviewMessages) {
      studioPreviewMessages.innerHTML = `
        <div class="studio-preview-empty">
          <div class="preview-empty-icon">💬</div>
          <div class="preview-empty-text">Test your project live</div>
          <div class="preview-empty-sub">Ask questions to verify how your custom instructions and uploaded documents behave before saving.</div>
        </div>
      `;
    }
    if (studioPreviewTextarea) studioPreviewTextarea.value = '';
    if (btnSendPreview) btnSendPreview.disabled = true;
  }

  async function handleStudioPreviewSend() {
    if (!studioPreviewTextarea) return;
    const userText = studioPreviewTextarea.value.trim();
    if (!userText || studioPreviewAbortController) return;

    studioPreviewTextarea.value = '';
    btnSendPreview.disabled = true;

    // Clear empty placeholder if first message
    const emptyPlaceholder = studioPreviewMessages.querySelector('.studio-preview-empty');
    if (emptyPlaceholder) emptyPlaceholder.remove();

    // Render user message bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'preview-bubble user';
    userBubble.textContent = userText;
    studioPreviewMessages.appendChild(userBubble);
    studioPreviewMessages.scrollTop = studioPreviewMessages.scrollHeight;

    studioPreviewHistory.push({ role: 'user', content: userText });

    // Render assistant placeholder bubble
    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'preview-bubble assistant markdown-body';
    assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Thinking...</span>';
    studioPreviewMessages.appendChild(assistantBubble);
    studioPreviewMessages.scrollTop = studioPreviewMessages.scrollHeight;

    // Assemble draft project system prompt from the active form state
    const draftProject = {
      name: (projectNameInput?.value.trim()) || 'Untitled Project',
      description: projectDescInput?.value.trim() || '',
      intent: projectIntentInput?.value.trim() || '',
      context: projectContextInput?.value.trim() || '',
      outputGuidelines: projectOutputInput?.value.trim() || '',
      files: editingProjectFiles
    };

    const draftSystemPrompt = compileProjectSystemPrompt(draftProject);
    const chosenModel = (projectModelSelect?.value) || settings.selectedModel;

    const previewPayload = [
      { role: 'system', content: draftSystemPrompt },
      ...studioPreviewHistory
    ];

    studioPreviewAbortController = new AbortController();

    try {
      if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
        throw new Error('Puter AI not ready');
      }

      const stream = await puter.ai.chat(previewPayload, {
        model: chosenModel,
        stream: true,
        signal: studioPreviewAbortController.signal
      });

      let accumulated = '';
      for await (const chunk of stream) {
        if (chunk?.type === 'text' || chunk?.text) {
          accumulated += (chunk.text || '');
          assistantBubble.innerHTML = formatMarkdown(accumulated);
          attachCodeCopyHandlers(assistantBubble);
          studioPreviewMessages.scrollTop = studioPreviewMessages.scrollHeight;
        }
      }

      studioPreviewHistory.push({ role: 'assistant', content: accumulated || '(Empty)' });
    } catch (err) {
      if (err.name !== 'AbortError') {
        assistantBubble.innerHTML = `<span style="color: var(--danger-color);">⚠️ ${escapeHtml(err.message || 'Error occurred')}</span>`;
      }
    } finally {
      studioPreviewAbortController = null;
      if (studioPreviewTextarea) studioPreviewTextarea.focus();
    }
  }

  async function saveProject() {
    const name = projectNameInput ? projectNameInput.value.trim() : '';
    if (!name) {
      showToast('Please enter a project name');
      projectNameInput?.focus();
      return;
    }

    const projectData = {
      id: editingProjectId || ('proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
      name: name,
      description: projectDescInput ? projectDescInput.value.trim() : '',
      icon: editingProjectIcon || '⚡',
      model: projectModelSelect ? projectModelSelect.value : '',
      intent: projectIntentInput ? projectIntentInput.value.trim() : '',
      context: projectContextInput ? projectContextInput.value.trim() : '',
      outputGuidelines: projectOutputInput ? projectOutputInput.value.trim() : '',
      files: editingProjectFiles,
      updatedAt: Date.now()
    };

    if (editingProjectId) {
      const idx = projects.findIndex(p => p.id === editingProjectId);
      if (idx !== -1) {
        projects[idx] = projectData;
      } else {
        projects.unshift(projectData);
      }
    } else {
      projects.unshift(projectData);
    }

    await persistProjects();
    closeProjectStudio();
    selectProject(projectData.id);
    showToast(`Project "${projectData.name}" saved!`);
  }

  async function deleteProject(projectId) {
    if (!projectId) return;
    const proj = projects.find(p => p.id === projectId);
    const projName = proj ? proj.name : 'Project';

    deletedProjectIds.add(projectId);
    projects = projects.filter(p => p.id !== projectId);
    if (activeProjectId === projectId) {
      activeProjectId = null;
    }
    sessions.forEach(s => {
      if (s.projectId === projectId) {
        s.projectId = null;
        s.updatedAt = Date.now();
      }
    });

    await persistProjects();
    await persistSessions();
    syncTombstones();
    closeProjectStudio();
    renderProjectsList();
    renderSessionList();
    restoreActiveSession();
    showToast(`Project "${projName}" deleted`);
  }

  function compileProjectSystemPrompt(project) {
    if (!project) return settings.systemPrompt;

    const sections = [];
    sections.push(`You are an expert AI assistant operating strictly within the custom project workspace: "${project.name}".`);

    if (project.description) {
      sections.push(`Workspace Mission: ${project.description}`);
    }

    if (project.intent) {
      sections.push(`### 1. PROJECT OBJECTIVE & INTENT\n${project.intent}`);
    }

    if (project.context) {
      sections.push(`### 2. BACKGROUND CONTEXT & ENVIRONMENT\n${project.context}`);
    }

    if (project.outputGuidelines) {
      sections.push(`### 3. OUTPUT SPECIFICATIONS & GUIDELINES\n${project.outputGuidelines}`);
    }

    if (project.files && project.files.length > 0) {
      const fileDocs = project.files.map(f => {
        return `--- BEGIN FILE: ${f.name} ---\n${f.content}\n--- END FILE: ${f.name} ---`;
      }).join('\n\n');
      sections.push(`### 4. PROJECT KNOWLEDGE BASE & ATTACHED DOCUMENTS\nReference the following uploaded files as accurate primary source materials for this workspace:\n\n${fileDocs}`);
    }

    // User Profile
    const effectiveDisplayName = getEffectiveDisplayName();
    const effectiveUsernameHandle = getEffectiveUsernameHandle();
    if (effectiveDisplayName !== 'Guest User' || effectiveUsernameHandle) {
      sections.push(`### USER PROFILE\nYou are speaking with ${effectiveDisplayName}${effectiveUsernameHandle ? ` (@${effectiveUsernameHandle})` : ''}. Address them naturally when appropriate.`);
    }

    // General instructions if configured
    if (settings.systemPrompt && settings.systemPrompt !== PERSONA_PRESETS.default) {
      sections.push(`### GENERAL INSTRUCTIONS\n${settings.systemPrompt}`);
    }

    return sections.join('\n\n');
  }

  // --- Session & History Management ---
  function getLocalSessions() {
    try {
      const local = localStorage.getItem(STORAGE_KEY_SESSIONS) || localStorage.getItem('nexus_ai_chat_sessions');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }

  async function loadSessions() {
    const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
    const canUseCloud = isSignedIn && settings.storageMode !== 'local';

    if (canUseCloud) {
      try {
        console.log('[Omni Sync] Fetching chat sessions from Puter Cloud...');
        let cloudData = await readPuterFileOrKV(PUTER_FS_SESSIONS_PATH, STORAGE_KEY_SESSIONS);
        if (!cloudData) {
          cloudData = await readPuterFileOrKV('nexus_chat_sessions.json', 'nexus_ai_chat_sessions');
        }
        const local = getLocalSessions();

        if (cloudData && Array.isArray(cloudData)) {
          console.log(`[Omni Sync] Retrieved ${cloudData.length} cloud sessions. Merging with ${local.length} local sessions.`);
          sessions = mergeSessions(cloudData, local);
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));

          // If local had sessions not yet in cloud, upload merged list back to cloud
          if (sessions.length > cloudData.length || local.length > 0) {
            writePuterFileAndKV(PUTER_FS_SESSIONS_PATH, STORAGE_KEY_SESSIONS, sessions).catch(e => console.warn(e));
          }

          updateSyncStatusUI('Synced (Puter Cloud)', true);
          renderSessionList();
          restoreActiveSession();
          return;
        } else if (local.length > 0) {
          console.log(`[Omni Sync] Puter Cloud sessions empty. Uploading ${local.length} local sessions to cloud...`);
          sessions = local.filter(s => s && s.id && !deletedSessionIds.has(s.id));
          await writePuterFileAndKV(PUTER_FS_SESSIONS_PATH, STORAGE_KEY_SESSIONS, sessions);
          updateSyncStatusUI('Synced (Puter Cloud)', true);
          renderSessionList();
          restoreActiveSession();
          return;
        }
      } catch (err) {
        console.warn('[Omni Sync] Failed to load sessions from Puter Cloud:', err);
        updateSyncStatusUI('Sync error (using local cache)', false);
      }
    }
    loadSessionsFromLocal();
  }

  function loadSessionsFromLocal() {
    sessions = getLocalSessions().filter(s => s && s.id && !deletedSessionIds.has(s.id));
    renderSessionList();
    restoreActiveSession();
  }

  async function persistSessions() {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn('[Omni Storage] LocalStorage write error:', e);
    }

    const isSignedIn = typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn();
    if (isSignedIn && settings.storageMode !== 'local') {
      try {
        await writePuterFileAndKV(PUTER_FS_SESSIONS_PATH, STORAGE_KEY_SESSIONS, sessions);
        updateSyncStatusUI('Synced (Puter Cloud)', true);
      } catch (e) {
        console.warn('[Omni Sync] Failed to persist to Puter Cloud:', e);
        updateSyncStatusUI('Sync warning (local saved)', false);
      }
    }
    if (statChatCount) {
      statChatCount.textContent = sessions.length;
    }
  }

  function createNewSession() {
    activeProjectId = null;
    const newSession = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: settings.selectedModel,
      projectId: null,
      messages: []
    };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    persistSessions();
    updateTopbarProjectPill();
    renderProjectsList();
    renderSessionList();
    renderActiveSession();
    chatTextarea.focus();
  }

  function restoreActiveSession() {
    if (currentSessionId) {
      const cur = sessions.find(s => s.id === currentSessionId);
      if (cur) {
        activeProjectId = cur.projectId || null;
        if (activeProjectId) expandedProjectIds.add(activeProjectId);
        updateTopbarProjectPill();
        renderProjectsList();
        renderSessionList();
        renderActiveSession();
        return;
      }
    }
    if (sessions.length > 0) {
      currentSessionId = sessions[0].id;
      activeProjectId = sessions[0].projectId || null;
      if (activeProjectId) expandedProjectIds.add(activeProjectId);
    } else {
      createNewSession();
      return;
    }
    updateTopbarProjectPill();
    renderProjectsList();
    renderSessionList();
    renderActiveSession();
  }

  function switchSession(id) {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    currentSessionId = id;
    const session = sessions.find(s => s.id === id);
    if (session) {
      activeProjectId = session.projectId || null;
      if (activeProjectId) {
        expandedProjectIds.add(activeProjectId);
      }
      updateTopbarProjectPill();
    }
    renderProjectsList();
    renderSessionList();
    renderActiveSession();
  }

  function deleteSession(id, e) {
    if (e) e.stopPropagation();
    deletedSessionIds.add(id);
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
      if (activeProjectId) {
        const remainingInProj = sessions.filter(s => s.projectId === activeProjectId);
        if (remainingInProj.length > 0) {
          currentSessionId = remainingInProj[0].id;
        } else {
          const generalSessions = sessions.filter(s => !s.projectId);
          if (generalSessions.length > 0) {
            currentSessionId = generalSessions[0].id;
            activeProjectId = null;
          } else if (sessions.length > 0) {
            currentSessionId = sessions[0].id;
            activeProjectId = sessions[0].projectId || null;
          } else {
            currentSessionId = null;
          }
        }
      } else {
        const remainingGeneral = sessions.filter(s => !s.projectId);
        if (remainingGeneral.length > 0) {
          currentSessionId = remainingGeneral[0].id;
        } else if (sessions.length > 0) {
          currentSessionId = sessions[0].id;
          activeProjectId = sessions[0].projectId || null;
        } else {
          currentSessionId = null;
        }
      }
    }
    persistSessions();
    syncTombstones();
    updateTopbarProjectPill();
    renderProjectsList();
    renderSessionList();
    if (!currentSessionId) {
      createNewSession();
    } else {
      renderActiveSession();
    }
    showToast('Conversation deleted');
  }

  let clearConfirmState = false;
  let clearConfirmTimer = null;

  function clearAllChats() {
    if (!clearConfirmState) {
      clearConfirmState = true;
      btnModalClearChats.textContent = '⚠️ Click again to confirm';
      btnModalClearChats.style.backgroundColor = 'var(--danger-color)';
      btnModalClearChats.style.color = '#ffffff';
      clearConfirmTimer = setTimeout(() => {
        clearConfirmState = false;
        btnModalClearChats.textContent = '🗑️ Clear All Conversations';
        btnModalClearChats.style.backgroundColor = '';
        btnModalClearChats.style.color = '';
      }, 4000);
      return;
    }

    if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
    clearConfirmState = false;
    btnModalClearChats.textContent = '🗑️ Clear All Conversations';
    btnModalClearChats.style.backgroundColor = '';
    btnModalClearChats.style.color = '';

    sessions.forEach(s => {
      if (s && s.id) deletedSessionIds.add(s.id);
    });
    sessions = [];
    currentSessionId = null;
    activeProjectId = null;
    persistSessions();
    syncTombstones();
    updateTopbarProjectPill();
    renderProjectsList();
    createNewSession();
    closeModal(settingsModal);
    showToast('All conversations cleared');
  }

  btnModalClearChats.addEventListener('click', clearAllChats);

  // Export / Import Chats
  btnExportChats.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `omni_chat_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Chat history exported successfully');
  });

  btnImportChats.addEventListener('click', () => importFileInput.click());

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          sessions = imported;
          currentSessionId = sessions.length > 0 ? sessions[0].id : null;
          await persistSessions();
          renderProjectsList();
          renderSessionList();
          renderActiveSession();
          showToast(`Imported ${sessions.length} conversations!`);
          closeModal(settingsModal);
        } else {
          showToast('Invalid backup file format');
        }
      } catch (err) {
        showToast('Failed to parse backup JSON file');
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });

  function renderSessionList() {
    chatHistoryList.innerHTML = '<div class="chat-history-title">Recent Conversations</div>';

    const generalSessions = sessions.filter(s => !s.projectId);

    if (generalSessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-history-empty';
      empty.textContent = 'No past conversations';
      chatHistoryList.appendChild(empty);
      return;
    }

    generalSessions.forEach(s => {
      const item = document.createElement('div');
      item.className = 'chat-item' + (s.id === currentSessionId ? ' active' : '');
      item.setAttribute('data-id', s.id);

      item.innerHTML = `
        <span class="chat-item-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
        <div class="chat-item-actions">
          <button class="icon-btn-sm btn-rename-chat" title="Rename conversation" aria-label="Rename conversation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </button>
          <button class="icon-btn-sm btn-delete-chat" title="Delete conversation" aria-label="Delete conversation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      item.addEventListener('click', () => {
        if (item.classList.contains('editing')) return;
        switchSession(s.id);
      });

      const btnDel = item.querySelector('.btn-delete-chat');
      btnDel.addEventListener('click', (e) => deleteSession(s.id, e));

      const btnRename = item.querySelector('.btn-rename-chat');
      btnRename.addEventListener('click', (e) => {
        e.stopPropagation();
        startSidebarInlineRename(item, s);
      });

      const titleSpan = item.querySelector('.chat-item-title');
      titleSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startSidebarInlineRename(item, s);
      });

      chatHistoryList.appendChild(item);
    });
  }

  function startSidebarInlineRename(item, session) {
    const alreadyEditing = document.querySelector('.chat-item.editing, .project-nested-chat.editing');
    if (alreadyEditing && alreadyEditing !== item) {
      renderSessionList();
      renderProjectsList();
      item = document.querySelector(`[data-id="${session.id}"]`);
      if (!item) return;
    }

    item.classList.add('editing');
    item.innerHTML = `
      <div class="chat-item-rename-box">
        <input type="text" class="chat-item-rename-input" value="${escapeHtml(session.title)}" maxlength="60" />
        <button class="icon-btn-sm btn-confirm-rename" title="Save name">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="icon-btn-sm btn-cancel-rename" title="Cancel">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    const input = item.querySelector('.chat-item-rename-input');
    const btnConfirm = item.querySelector('.btn-confirm-rename');
    const btnCancel = item.querySelector('.btn-cancel-rename');

    input.focus();
    input.select();

    const commitRename = async (e) => {
      if (e) e.stopPropagation();
      const val = input.value.trim();
      if (val && val !== session.title) {
        session.title = val;
        session.isRenamed = true;
        session.updatedAt = Date.now();
        await persistSessions();
        if (session.id === currentSessionId && topbarChatTitle) {
          topbarChatTitle.textContent = session.title;
        }
        showToast('Conversation renamed');
      }
      renderSessionList();
      renderProjectsList();
    };

    const cancelRename = (e) => {
      if (e) e.stopPropagation();
      renderSessionList();
      renderProjectsList();
    };

    btnConfirm.addEventListener('click', commitRename);
    btnCancel.addEventListener('click', cancelRename);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelRename(e);
      }
    });

    input.addEventListener('click', (e) => e.stopPropagation());
  }

  // --- Topbar Title Rename Functions & Listeners ---
  function startTopbarRename() {
    const session = getActiveSession();
    if (!session || !topbarRenameForm || !topbarRenameInput || !topbarTitleDisplay) return;

    topbarRenameInput.value = session.title || 'New Conversation';
    topbarTitleDisplay.style.display = 'none';
    topbarRenameForm.style.display = 'flex';
    topbarRenameInput.focus();
    topbarRenameInput.select();
  }

  function cancelTopbarRename() {
    if (topbarTitleDisplay && topbarRenameForm) {
      topbarTitleDisplay.style.display = 'flex';
      topbarRenameForm.style.display = 'none';
    }
  }

  async function saveTopbarRename() {
    const session = getActiveSession();
    if (!session || !topbarRenameInput) return;

    const val = topbarRenameInput.value.trim();
    if (val && val !== session.title) {
      session.title = val;
      session.isRenamed = true;
      session.updatedAt = Date.now();
      await persistSessions();
      if (topbarChatTitle) {
        topbarChatTitle.textContent = session.title;
      }
      renderSessionList();
      renderProjectsList();
      showToast('Conversation renamed');
    }
    cancelTopbarRename();
  }

  if (topbarTitleDisplay) {
    topbarTitleDisplay.addEventListener('click', startTopbarRename);
  }
  if (btnRenameTopbar) {
    btnRenameTopbar.addEventListener('click', (e) => {
      e.stopPropagation();
      startTopbarRename();
    });
  }
  if (btnSaveTopbarRename) {
    btnSaveTopbarRename.addEventListener('click', saveTopbarRename);
  }
  if (btnCancelTopbarRename) {
    btnCancelTopbarRename.addEventListener('click', cancelTopbarRename);
  }
  if (topbarRenameInput) {
    topbarRenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveTopbarRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelTopbarRename();
      }
    });
  }

  btnNewChat.addEventListener('click', createNewSession);

  // --- Message Rendering in Main Viewport ---
  function getActiveSession() {
    return sessions.find(s => s.id === currentSessionId);
  }

  function renderActiveSession() {
    cancelTopbarRename();
    const session = getActiveSession();
    messagesInner.innerHTML = '';

    if (topbarChatTitle) {
      topbarChatTitle.textContent = session ? (session.title || 'New Conversation') : 'New Conversation';
    }

    if (!session || session.messages.length === 0) {
      messagesInner.appendChild(welcomeContainer);
      welcomeContainer.style.display = 'flex';
      const welcomeSubtitle = welcomeContainer.querySelector('.welcome-gemini-subtitle');
      if (welcomeSubtitle) {
        const proj = getActiveProject();
        if (proj) {
          welcomeSubtitle.innerHTML = `Working in <strong>${escapeHtml(proj.icon || '⚡')} ${escapeHtml(proj.name)}</strong> workspace`;
        } else {
          welcomeSubtitle.textContent = 'How can I help you today?';
        }
      }
      setupStarterCards();
      return;
    }

    welcomeContainer.style.display = 'none';

    session.messages.forEach((msg, idx) => {
      const wrapper = createMessageDOM(msg, idx);
      messagesInner.appendChild(wrapper);
    });

    scrollToBottom();
  }

  function createMessageDOM(msg, msgIndex) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.role}`;

    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${msg.role}`;
    if (msg.role === 'assistant') {
      avatar.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path fill="url(#geminiSparkleGrad)" d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"/>
        </svg>
      `;
    } else {
      avatar.textContent = getEffectiveUserInitial();
    }

    const container = document.createElement('div');
    container.className = 'message-content-container';

    // Optional image attachment rendering
    if (msg.attachment) {
      const img = document.createElement('img');
      img.src = msg.attachment;
      img.alt = 'Attached image';
      img.className = 'message-attachment';
      container.appendChild(img);
    }

    // Optional document attachment rendering
    if (msg.documentAttachment) {
      const docBadge = document.createElement('div');
      docBadge.className = 'message-doc-attachment-tag';
      docBadge.style.cssText = 'display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; padding: 0.2rem 0.55rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.35rem; color: var(--text-secondary);';
      docBadge.innerHTML = `📄 <strong>${escapeHtml(msg.documentAttachment.name)}</strong> <span style="font-size: 0.72rem; color: var(--text-muted);">(${formatFileSize(msg.documentAttachment.size)})</span>`;
      container.appendChild(docBadge);
    }

    // Optional reasoning block
    if (msg.reasoning) {
      const reasoningBlock = document.createElement('div');
      reasoningBlock.className = 'reasoning-block collapsed';
      reasoningBlock.innerHTML = `
        <div class="reasoning-header">
          <span>🧠 Thought Process</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="reasoning-content">${escapeHtml(msg.reasoning)}</div>
      `;
      reasoningBlock.querySelector('.reasoning-header').addEventListener('click', () => {
        reasoningBlock.classList.toggle('collapsed');
      });
      container.appendChild(reasoningBlock);
    }

    // Optional AI Generated Image Card
    if (msg.imageGeneration) {
      const imgCard = document.createElement('div');
      imgCard.className = 'ai-generated-image-card';
      imgCard.innerHTML = `
        <img src="${escapeHtml(msg.imageGeneration.url)}" alt="${escapeHtml(msg.imageGeneration.prompt)}" class="ai-generated-image" />
        <div class="ai-image-footer">
          <span>🎨 ${escapeHtml(msg.imageGeneration.prompt)}</span>
          <a href="${escapeHtml(msg.imageGeneration.url)}" download="omni_chat_image_${Date.now()}.png" class="btn-export-doc" style="text-decoration: none;">
            ⬇ Download Image
          </a>
        </div>
      `;
      container.appendChild(imgCard);
    }

    // Optional AI Generated Video Card
    if (msg.videoGeneration) {
      const vidCard = document.createElement('div');
      vidCard.className = 'ai-generated-video-card';
      vidCard.innerHTML = `
        <div class="ai-video-container">
          <video src="${escapeHtml(msg.videoGeneration.url)}" controls autoplay loop playsinline class="ai-generated-video"></video>
        </div>
        <div class="ai-video-footer">
          <span>🎬 ${escapeHtml(msg.videoGeneration.prompt)}</span>
          <a href="${escapeHtml(msg.videoGeneration.url)}" download="omni_chat_video_${Date.now()}.mp4" class="btn-export-doc" style="text-decoration: none;" target="_blank">
            ⬇ Download Video (MP4)
          </a>
        </div>
      `;
      container.appendChild(vidCard);
    }

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.role}`;

    if (msg.role === 'user') {
      bubble.textContent = msg.content;
    } else {
      bubble.className += ' markdown-body';
      bubble.innerHTML = formatMarkdown(msg.content);
      attachCodeCopyHandlers(bubble);
    }

    container.appendChild(bubble);

    // Meta & Action Bar for User Messages (Prompt Editing & Copy)
    if (msg.role === 'user') {
      const userActions = document.createElement('div');
      userActions.className = 'message-actions user';
      userActions.innerHTML = `
        <button class="icon-btn-sm btn-edit-prompt" title="Edit prompt" aria-label="Edit prompt">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn-sm btn-copy-user-msg" title="Copy prompt" aria-label="Copy prompt">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      `;

      userActions.querySelector('.btn-edit-prompt').addEventListener('click', () => {
        startInlinePromptEdit(wrapper, bubble, msg, msgIndex);
      });

      userActions.querySelector('.btn-copy-user-msg').addEventListener('click', () => {
        navigator.clipboard.writeText(msg.content);
        showToast('Prompt copied to clipboard');
      });

      container.appendChild(userActions);
    }

    // Dedicated Document Card when document intent is present (PDF / DOCX)
    if (msg.role === 'assistant' && msg.documentIntent) {
      const docCard = document.createElement('div');
      docCard.className = 'ai-generated-document-card';
      const isPdf = msg.documentIntent.type === 'pdf';
      const docLabel = isPdf ? 'PDF' : 'Word (.docx)';
      const docIcon = isPdf ? '📄' : '📝';
      docCard.innerHTML = `
        <div class="doc-card-left">
          <span class="doc-card-badge">${docIcon}</span>
          <div class="doc-card-text">
            <span class="doc-card-title">${escapeHtml(msg.documentIntent.title || `${docLabel} Document Ready`)}</span>
            <span class="doc-card-desc">Formatted document compiled and ready for download</span>
          </div>
        </div>
        <button class="btn-download-doc-card" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download ${docLabel}
        </button>
      `;
      docCard.querySelector('.btn-download-doc-card').addEventListener('click', () => {
        if (isPdf) {
          exportMessageAsPdf(msg.content, msgIndex);
        } else {
          exportMessageAsDocx(msg.content, msgIndex);
        }
      });
      container.appendChild(docCard);
    }

    // Clean Action Bar for Assistant Messages (Model Tag, Copy, Regenerate)
    if (msg.role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      actions.innerHTML = `
        <span class="message-meta-tag">${escapeHtml(msg.model || settings.selectedModel)}</span>
        <button class="icon-btn-sm btn-copy-msg" title="Copy response">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="icon-btn-sm btn-regen-msg" title="Regenerate from here">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      `;

      actions.querySelector('.btn-copy-msg').addEventListener('click', () => {
        navigator.clipboard.writeText(msg.content);
        showToast('Copied to clipboard');
      });

      actions.querySelector('.btn-regen-msg').addEventListener('click', () => {
        regenerateFromIndex(msgIndex);
      });

      container.appendChild(actions);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(container);
    return wrapper;
  }

  // --- Document Export Utilities ---
  function exportMessageAsMarkdown(text, index) {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni_response_${index + 1}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded response as Markdown');
  }

  function exportMessageAsDocx(text, index) {
    if (!text) return;
    const htmlBody = formatMarkdown(text);
    const htmlContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Omni Chat Document</title>
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 2rem; }
    h1, h2, h3, h4 { color: #0f172a; margin-top: 1.2rem; }
    pre { background: #f1f5f9; padding: 12px; border-radius: 6px; font-family: Consolas, monospace; font-size: 10pt; }
    code { font-family: Consolas, monospace; background: #f1f5f9; padding: 2px 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: bold; }
    blockquote { border-left: 3px solid #3b82f6; margin-left: 0; padding-left: 1rem; color: #475569; }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omni_document_${index + 1}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Downloaded formatted Word document');
  }

  function exportMessageAsPdf(text, index) {
    if (!text) return;
    const htmlBody = formatMarkdown(text);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to export PDF');
      return;
    }
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Omni Chat Document Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; padding: 2.5rem; max-width: 800px; margin: 0 auto; }
    h1, h2, h3, h4 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3rem; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 10pt; }
    code { font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 0.9em; }
    table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    blockquote { border-left: 3px solid #3b82f6; margin: 1rem 0; padding-left: 1rem; color: #475569; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${htmlBody}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 200);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
    showToast('Opened formatted PDF print dialog');
  }

  // --- Inline Prompt Editing ---
  function startInlinePromptEdit(wrapper, bubble, msg, msgIndex) {
    if (wrapper.querySelector('.user-prompt-edit-container')) return;

    bubble.style.display = 'none';
    const editContainer = document.createElement('div');
    editContainer.className = 'user-prompt-edit-container';

    const textarea = document.createElement('textarea');
    textarea.className = 'user-prompt-edit-textarea';
    textarea.value = msg.content;
    textarea.rows = 2;

    const btnRow = document.createElement('div');
    btnRow.className = 'user-prompt-edit-buttons';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-secondary';
    btnCancel.textContent = 'Cancel';
    btnCancel.type = 'button';

    const btnSave = document.createElement('button');
    btnSave.className = 'btn-primary';
    btnSave.textContent = 'Save & Submit';
    btnSave.type = 'button';

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnSave);
    editContainer.appendChild(textarea);
    editContainer.appendChild(btnRow);

    const contentContainer = wrapper.querySelector('.message-content-container');
    contentContainer.insertBefore(editContainer, bubble);

    textarea.focus();
    textarea.select();

    const cleanup = () => {
      editContainer.remove();
      bubble.style.display = '';
    };

    btnCancel.addEventListener('click', cleanup);

    btnSave.addEventListener('click', async () => {
      const newText = textarea.value.trim();
      if (!newText) {
        showToast('Prompt cannot be empty');
        return;
      }
      cleanup();

      const session = getActiveSession();
      if (!session) return;

      // Update user message content
      msg.content = newText;
      msg.rawPrompt = newText + (msg.documentAttachment ? `\n\n[Attached File: ${msg.documentAttachment.name}]` : '');
      msg.timestamp = Date.now();

      // Truncate subsequent messages in session
      session.messages = session.messages.slice(0, msgIndex + 1);
      session.updatedAt = Date.now();
      await persistSessions();

      renderActiveSession();

      const videoPrompt = isVideoGenerationPrompt(newText);
      if (videoPrompt && typeof puter !== 'undefined' && puter.ai && typeof puter.ai.txt2vid === 'function') {
        showToast('Rendering AI video...');
        await handleVideoGeneration(session, videoPrompt, newText);
        return;
      }

      const imagePrompt = isImageGenerationPrompt(newText);
      if (imagePrompt && typeof puter !== 'undefined' && puter.ai && typeof puter.ai.txt2img === 'function') {
        showToast('Generating AI image...');
        await handleImageGeneration(session, imagePrompt, newText);
        return;
      }

      showToast('Prompt updated. Generating response...');
      await triggerAssistantResponse(session);
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnSave.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    });
  }

  function formatMarkdown(content) {
    if (!content) return '';
    if (typeof marked !== 'undefined') {
      try {
        return marked.parse(content);
      } catch (e) {
        console.error('Marked parsing error:', e);
      }
    }
    return escapeHtml(content).replace(/\n/g, '<br>');
  }

  function attachCodeCopyHandlers(parentElement) {
    const codeBlocks = parentElement.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      if (pre.parentElement.classList.contains('code-block-wrapper')) return;

      const codeEl = pre.querySelector('code');
      const langClass = Array.from(codeEl?.classList || []).find(c => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : 'code';

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${escapeHtml(lang)}</span>
        <button class="btn-copy-code">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
      `;

      header.querySelector('.btn-copy-code').addEventListener('click', function () {
        const codeText = codeEl ? codeEl.innerText : pre.innerText;
        navigator.clipboard.writeText(codeText);
        this.innerHTML = '✓ Copied!';
        setTimeout(() => {
          this.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          `;
        }, 2000);
      });

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  function setupStarterCards() {
    const cards = welcomeContainer.querySelectorAll('.starter-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          chatTextarea.value = prompt;
          handleSend();
        }
      });
    });
  }

  // --- Document Generation Intent Detection (PDF / DOCX) ---
  function detectDocumentIntent(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // PDF Intent: e.g. "generate a pdf", "create pdf report", "export as pdf", "draft pdf proposal", "write a pdf"
    const pdfRegex = /(?:(?:generate|create|make|export|draft|write|download|prepare|produce|give\s+me)\s+(?:me\s+)?(?:an?\s+|the\s+)?(?:formatted\s+|clean\s+)?pdf|\b(?:as|in|into|to)\s+(?:a\s+)?pdf\b|\bpdf\s+(?:report|document|file|invoice|proposal|summary|doc|contract|guide)\b)/i;
    if (pdfRegex.test(trimmed)) {
      return { type: 'pdf', title: 'PDF Document Ready' };
    }

    // DOCX / Word Intent: e.g. "generate a docx", "create word document", "draft docx report", "export to docx"
    const docxRegex = /(?:(?:generate|create|make|export|draft|write|download|prepare|produce|give\s+me)\s+(?:me\s+)?(?:an?\s+|the\s+)?(?:formatted\s+|clean\s+)?(?:docx?|word\s+doc(?:ument)?|ms\s*word)|\b(?:as|in|into|to)\s+(?:a\s+)?(?:docx?|word\s+doc(?:ument)?)\b|\b(?:docx?|word\s+doc(?:ument)?)\s+(?:report|document|file|proposal|summary|contract|guide)\b)/i;
    if (docxRegex.test(trimmed)) {
      return { type: 'docx', title: 'Word Document (.docx) Ready' };
    }

    return null;
  }

  // --- Regenerate from Assistant message index ---
  function regenerateFromIndex(msgIndex) {
    const session = getActiveSession();
    if (!session || activeAbortController) return;

    // Truncate to before this message
    session.messages = session.messages.slice(0, msgIndex);
    renderActiveSession();
    triggerAssistantResponse(session);
  }

  // --- AI Image & Video Generation Modes & Detection ---
  let isImageModeActive = false;
  let isVideoModeActive = false;
  const btnImageMode = document.getElementById('btn-image-mode');
  const btnVideoMode = document.getElementById('btn-video-mode');

  function updateImageModeUI() {
    if (btnImageMode) {
      btnImageMode.classList.toggle('active', isImageModeActive);
    }
    if (chatTextarea) {
      if (isImageModeActive) {
        chatTextarea.classList.add('image-mode');
        chatTextarea.classList.remove('video-mode');
        chatTextarea.placeholder = '🎨 Describe the image or logo to generate (e.g. modern logo for Omni Chat app)...';
      } else {
        chatTextarea.classList.remove('image-mode');
        if (!isVideoModeActive) {
          chatTextarea.placeholder = 'Ask anything, paste images/files, or type /image, /video...';
        }
      }
    }
  }

  function updateVideoModeUI() {
    if (btnVideoMode) {
      btnVideoMode.classList.toggle('active', isVideoModeActive);
    }
    if (chatTextarea) {
      if (isVideoModeActive) {
        chatTextarea.classList.add('video-mode');
        chatTextarea.classList.remove('image-mode');
        chatTextarea.placeholder = '🎬 Describe the video to generate (e.g. cinematic aerial view of city at night)...';
      } else {
        chatTextarea.classList.remove('video-mode');
        if (!isImageModeActive) {
          chatTextarea.placeholder = 'Ask anything, paste images/files, or type /image, /video...';
        }
      }
    }
  }

  if (btnImageMode) {
    btnImageMode.addEventListener('click', () => {
      isImageModeActive = !isImageModeActive;
      if (isImageModeActive && isVideoModeActive) {
        isVideoModeActive = false;
        updateVideoModeUI();
      }
      updateImageModeUI();
      if (isImageModeActive) {
        showToast('🎨 AI Image Mode active! Enter any description to generate an image.');
      } else {
        showToast('Switched to chat mode.');
      }
      chatTextarea.focus();
    });
  }

  if (btnVideoMode) {
    btnVideoMode.addEventListener('click', () => {
      isVideoModeActive = !isVideoModeActive;
      if (isVideoModeActive && isImageModeActive) {
        isImageModeActive = false;
        updateImageModeUI();
      }
      updateVideoModeUI();
      if (isVideoModeActive) {
        showToast('🎬 AI Video Mode active! Enter any description to render a video clip.');
      } else {
        showToast('Switched to chat mode.');
      }
      chatTextarea.focus();
    });
  }

  function isImageGenerationPrompt(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // 1. Explicit command prefixes
    const slashMatch = trimmed.match(/^\/(?:image|img|draw|generate|art|paint)\s+(.+)/i);
    if (slashMatch && slashMatch[1].trim()) {
      return slashMatch[1].trim();
    }

    // 2. Graphic and visual nouns
    const visualNouns = [
      'image', 'images', 'picture', 'pictures', 'photo', 'photos', 'photograph',
      'logo', 'logos', 'icon', 'icons', 'banner', 'banners', 'avatar', 'avatars',
      'illustration', 'illustrations', 'drawing', 'drawings', 'artwork', 'art',
      'wallpaper', 'wallpapers', 'poster', 'posters', 'badge', 'badges',
      'graphic', 'graphics', 'sketch', 'sketches', 'portrait', 'portraits',
      'painting', 'paintings', 'render', 'renders', 'visual', 'visuals',
      'emblem', 'emblems', 'symbol', 'symbols'
    ];
    const nounPattern = visualNouns.join('|');

    // Pattern A: [please/can you/could you] [generate/create/draw/paint/make/design/render/sketch/illustrate/show me/produce] [me?] [a/an/the?] <noun> [of/for/showing/with/depicting/about?] <subject>
    const verbNounRegex = new RegExp(
      '^(?:(?:please|can you|could you|kindly)\\s+)?(?:generate|create|draw|paint|make|design|render|sketch|illustrate|show me|produce)\\s+(?:me\\s+)?(?:an?\\s+|the\\s+)?(' +
      nounPattern +
      ')\\s*(?:of|for|showing|with|depicting|about)?\\s*(.+)$',
      'i'
    );
    const vnMatch = trimmed.match(verbNounRegex);
    if (vnMatch && vnMatch[2] && vnMatch[2].trim().length > 1) {
      const noun = vnMatch[1].trim();
      const subject = vnMatch[2].trim();
      return `${noun} for ${subject}`;
    }

    // Pattern B: Direct creative verbs: "draw a cat", "paint a sunset", "sketch a mountain"
    const directVerbRegex = /^(?:(?:please|can you|could you|kindly)\s+)?(?:draw|paint|sketch|illustrate)\s+(?:me\s+)?(?:an?\s+|the\s+)?(.+)$/i;
    const dvMatch = trimmed.match(directVerbRegex);
    if (dvMatch && dvMatch[1] && dvMatch[1].trim().length > 2) {
      const target = dvMatch[1].trim();
      if (!/^(?:conclusions?|inferences?|parallels?|diagrams?\s+of\s+code|comparisons?)/i.test(target)) {
        return target;
      }
    }

    // Pattern C: "logo for..." or "icon for..." without leading verb
    const directNounRegex = new RegExp('^(?:an?\\s+|the\\s+)?(' + nounPattern + ')\\s+(?:of|for|showing)\\s+(.+)$', 'i');
    const dnMatch = trimmed.match(directNounRegex);
    if (dnMatch && dnMatch[2] && dnMatch[2].trim().length > 1) {
      return trimmed;
    }

    return null;
  }

  async function handleImageGeneration(session, promptText, originalUserPrompt) {
    console.log('[Omni Image] Generating image via puter.ai.txt2img with prompt:', promptText);

    const assistantMsg = {
      role: 'assistant',
      content: `Here is your generated image for: **"${promptText}"**`,
      model: 'puter.ai.txt2img',
      timestamp: Date.now()
    };

    const assistantWrapper = document.createElement('div');
    assistantWrapper.className = 'message-wrapper assistant';

    const assistantAvatar = document.createElement('div');
    assistantAvatar.className = 'message-avatar assistant';
    assistantAvatar.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="url(#geminiSparkleGrad)" d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"/>
      </svg>
    `;

    const assistantContainer = document.createElement('div');
    assistantContainer.className = 'message-content-container';

    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'message-bubble assistant markdown-body';
    assistantBubble.innerHTML = `<span style="color: var(--accent-color); font-style: italic;">🎨 Generating image: "${escapeHtml(promptText)}"...</span>`;

    assistantContainer.appendChild(assistantBubble);
    assistantWrapper.appendChild(assistantAvatar);
    assistantWrapper.appendChild(assistantContainer);
    messagesInner.appendChild(assistantWrapper);
    scrollToBottom();

    try {
      showToast('Generating AI image with Puter...');

      if (typeof puter === 'undefined' || !puter.ai || typeof puter.ai.txt2img !== 'function') {
        throw new Error('Puter AI txt2img is not available. Please verify Puter.js is loaded.');
      }

      const imgResult = await puter.ai.txt2img(promptText);

      let imgSrc = null;
      if (typeof imgResult === 'string') {
        imgSrc = imgResult;
      } else if (imgResult && typeof imgResult.src === 'string' && imgResult.src) {
        imgSrc = imgResult.src;
      } else if (imgResult && typeof imgResult.getAttribute === 'function' && imgResult.getAttribute('src')) {
        imgSrc = imgResult.getAttribute('src');
      } else if (imgResult && imgResult.url) {
        imgSrc = imgResult.url;
      } else if (imgResult instanceof Blob) {
        imgSrc = URL.createObjectURL(imgResult);
      }

      if (!imgSrc && imgResult && imgResult.tagName && imgResult.tagName.toLowerCase() === 'img') {
        imgSrc = imgResult.src;
      }

      if (!imgSrc) {
        throw new Error('No image returned from Puter AI txt2img.');
      }

      assistantBubble.innerHTML = `Here is your generated image for: **"${escapeHtml(promptText)}"**`;
      assistantMsg.imageGeneration = {
        prompt: promptText,
        url: imgSrc
      };

      session.messages.push(assistantMsg);
      session.updatedAt = Date.now();
      await persistSessions();

      renderActiveSession();
      showToast('Image generated successfully!');
    } catch (err) {
      console.warn('[Omni Image] Generation error:', err);
      const isAuthErr = (err.message || '').toLowerCase().includes('sign in') || (err.message || '').toLowerCase().includes('auth') || (err.message || '').toLowerCase().includes('login');
      if (isAuthErr) {
        assistantBubble.innerHTML = `
          <div class="chat-error-card">
            <div class="chat-error-header"><strong>Puter Sign In Required</strong></div>
            <div class="chat-error-body">Please sign in with Puter to generate AI images. Puter accounts receive free AI image credits.</div>
            <div class="chat-error-actions">
              <button class="btn-recovery" id="btn-err-signin-puter">Sign In with Puter</button>
            </div>
          </div>
        `;
        assistantBubble.querySelector('#btn-err-signin-puter')?.addEventListener('click', () => {
          puter.auth.signIn();
        });
      } else {
        assistantBubble.innerHTML = `<span style="color: var(--danger-color);">⚠️ Image generation failed: ${escapeHtml(err.message || 'Error occurred')}. Switching to text model...</span>`;
        await triggerAssistantResponse(session);
      }
    }
  }

  function isVideoGenerationPrompt(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // 1. Explicit command prefixes: /video, /vid, /clip, /film, /movie, /animate, /animation
    const slashMatch = trimmed.match(/^\/(?:video|vid|clip|film|movie|animate|animation)\s+(.+)/i);
    if (slashMatch && slashMatch[1].trim()) {
      return slashMatch[1].trim();
    }

    // 2. Video and motion nouns
    const videoNouns = [
      'video', 'videos', 'clip', 'clips', 'short video', 'footage', 'film',
      'movie', 'movies', 'animation', 'animations', 'motion graphic', 'motion graphics',
      'reel', 'reels', 'b-roll', 'timelapse', 'cinematic video', 'cgi clip', 'cgi video'
    ];
    const nounPattern = videoNouns.join('|');

    // Pattern A: [please/can you/could you] [generate/create/make/render/produce/shoot/animate] [a/an/the?] <videoNoun> [of/for/showing/with/depicting/about] <subject>
    const verbNounRegex = new RegExp(
      '^(?:(?:please|can you|could you|kindly)\\s+)?(?:generate|create|produce|render|animate|make|shoot|show me|record|build)\\s+(?:me\\s+)?(?:an?\\s+|the\\s+)?(' +
      nounPattern +
      ')\\s*(?:of|for|showing|with|depicting|about)?\\s*(.+)$',
      'i'
    );
    const vnMatch = trimmed.match(verbNounRegex);
    if (vnMatch && vnMatch[2] && vnMatch[2].trim().length > 1) {
      const noun = vnMatch[1].trim();
      const subject = vnMatch[2].trim();
      return `${noun} of ${subject}`;
    }

    // Pattern B: Direct creative motion verbs: "animate a spaceship taking off", "film a sunset over mountains"
    const directVerbRegex = /^(?:(?:please|can you|could you|kindly)\s+)?(?:animate|film|record)\s+(?:me\s+)?(?:an?\s+|the\s+)?(.+)$/i;
    const dvMatch = trimmed.match(directVerbRegex);
    if (dvMatch && dvMatch[1] && dvMatch[1].trim().length > 2) {
      return dvMatch[1].trim();
    }

    // Pattern C: "video of...", "clip of..." without leading verb
    const directNounRegex = new RegExp('^(?:an?\\s+|the\\s+)?(' + nounPattern + ')\\s+(?:of|for|showing)\\s+(.+)$', 'i');
    const dnMatch = trimmed.match(directNounRegex);
    if (dnMatch && dnMatch[2] && dnMatch[2].trim().length > 1) {
      return trimmed;
    }

    return null;
  }

  async function handleVideoGeneration(session, promptText, originalUserPrompt) {
    console.log('[Omni Video] Generating video via puter.ai.txt2vid with prompt:', promptText);

    const assistantMsg = {
      role: 'assistant',
      content: `Here is your generated video for: **"${promptText}"**`,
      model: 'puter.ai.txt2vid',
      timestamp: Date.now()
    };

    const assistantWrapper = document.createElement('div');
    assistantWrapper.className = 'message-wrapper assistant';

    const assistantAvatar = document.createElement('div');
    assistantAvatar.className = 'message-avatar assistant';
    assistantAvatar.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="url(#geminiSparkleGrad)" d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"/>
      </svg>
    `;

    const assistantContainer = document.createElement('div');
    assistantContainer.className = 'message-content-container';

    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'message-bubble assistant markdown-body';
    assistantBubble.innerHTML = `
      <div class="video-generating-indicator">
        <div class="video-generating-spinner"></div>
        <div class="video-generating-text">
          <strong>🎬 Generating AI Video:</strong> "${escapeHtml(promptText)}"
          <div class="video-generating-sub">Rendering motion and frames via Puter AI. This typically takes 15–40 seconds...</div>
        </div>
      </div>
    `;

    assistantContainer.appendChild(assistantBubble);
    assistantWrapper.appendChild(assistantAvatar);
    assistantWrapper.appendChild(assistantContainer);
    messagesInner.appendChild(assistantWrapper);
    scrollToBottom();

    try {
      showToast('Rendering AI video clip (15–40s)...');

      if (typeof puter === 'undefined' || !puter.ai || typeof puter.ai.txt2vid !== 'function') {
        throw new Error('Puter AI txt2vid is not available. Please verify Puter.js is loaded.');
      }

      const vidResult = await puter.ai.txt2vid(promptText, {
        model: 'wan-ai/wan2.7-t2v'
      });

      let videoSrc = null;
      if (typeof vidResult === 'string') {
        videoSrc = vidResult;
      } else if (vidResult && typeof vidResult.src === 'string' && vidResult.src) {
        videoSrc = vidResult.src;
      } else if (vidResult && typeof vidResult.getAttribute === 'function' && vidResult.getAttribute('src')) {
        videoSrc = vidResult.getAttribute('src');
      } else if (vidResult && vidResult.url) {
        videoSrc = vidResult.url;
      } else if (vidResult instanceof Blob) {
        videoSrc = URL.createObjectURL(vidResult);
      } else if (vidResult && vidResult.tagName && vidResult.tagName.toLowerCase() === 'video') {
        videoSrc = vidResult.src;
      }

      if (!videoSrc) {
        throw new Error('No video URL or element returned from Puter AI txt2vid.');
      }

      assistantBubble.innerHTML = `Here is your generated video for: **"${escapeHtml(promptText)}"**`;
      assistantMsg.videoGeneration = {
        prompt: promptText,
        url: videoSrc
      };

      session.messages.push(assistantMsg);
      session.updatedAt = Date.now();
      await persistSessions();

      renderActiveSession();
      showToast('Video generated successfully!');
    } catch (err) {
      console.warn('[Omni Video] Generation error:', err);
      const isAuthErr = (err.message || '').toLowerCase().includes('sign in') ||
                        (err.message || '').toLowerCase().includes('auth') ||
                        (err.message || '').toLowerCase().includes('login');
      if (isAuthErr) {
        assistantBubble.innerHTML = `
          <div class="chat-error-card">
            <div class="chat-error-header"><strong>Puter Sign In Required</strong></div>
            <div class="chat-error-body">Please sign in with Puter to generate AI videos. Puter accounts receive free AI generation credits.</div>
            <div class="chat-error-actions">
              <button class="btn-recovery" id="btn-err-signin-puter-vid">Sign In with Puter</button>
            </div>
          </div>
        `;
        assistantBubble.querySelector('#btn-err-signin-puter-vid')?.addEventListener('click', () => {
          puter.auth.signIn();
        });
      } else {
        assistantBubble.innerHTML = `<span style="color: var(--danger-color);">⚠️ Video generation failed: ${escapeHtml(err.message || 'Error occurred')}. Switching to text response...</span>`;
        await triggerAssistantResponse(session);
      }
    }
  }

  // --- Send Message & Puter AI Streaming ---
  async function handleSend() {
    const text = chatTextarea.value.trim();
    if (!text && !currentAttachment) return;
    if (activeAbortController) return;

    let session = getActiveSession();
    if (!session) {
      createNewSession();
      session = getActiveSession();
    }

    if (session.messages.length === 0) {
      if (!session.isRenamed) {
        session.title = text.slice(0, 36) || (currentAttachment ? currentAttachment.name : 'New Conversation');
        if (topbarChatTitle) topbarChatTitle.textContent = session.title;
      }
      renderSessionList();
      renderProjectsList();
    }

    welcomeContainer.style.display = 'none';

    // Prepare document attachment payload if present
    let docContext = '';
    let docAttachment = null;
    if (currentAttachment && currentAttachment.kind === 'document') {
      docAttachment = {
        name: currentAttachment.name,
        size: currentAttachment.size,
        type: currentAttachment.type
      };
      docContext = `\n\n[Attached File: ${currentAttachment.name}]\n\`\`\`\n${(currentAttachment.content || '').slice(0, 45000)}\n\`\`\``;
    }

    // Add user message
    const userMsg = {
      role: 'user',
      content: text,
      attachment: (currentAttachment && currentAttachment.kind === 'image') ? currentAttachment.dataUrl : null,
      documentAttachment: docAttachment,
      rawPrompt: text + docContext,
      timestamp: Date.now()
    };
    session.messages.push(userMsg);
    session.updatedAt = Date.now();
    persistSessions();

    clearAttachment();
    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    btnSend.disabled = true;

    const userEl = createMessageDOM(userMsg, session.messages.length - 1);
    messagesInner.appendChild(userEl);
    scrollToBottom();

    // Check if user is asking for video generation (via mode or natural prompt)
    let videoPrompt = null;
    if (isVideoModeActive) {
      videoPrompt = text.replace(/^\/(?:video|vid|clip|film|movie|animate|animation)\s+/i, '').trim() || text;
    } else {
      videoPrompt = isVideoGenerationPrompt(text);
    }

    if (videoPrompt && typeof puter !== 'undefined' && puter.ai && typeof puter.ai.txt2vid === 'function') {
      await handleVideoGeneration(session, videoPrompt, text);
      return;
    }

    // Check if user is asking for image generation (via mode or natural prompt)
    let imagePrompt = null;
    if (isImageModeActive) {
      imagePrompt = text.replace(/^\/(?:image|img|draw|generate)\s+/i, '').trim() || text;
    } else {
      imagePrompt = isImageGenerationPrompt(text);
    }

    if (imagePrompt && typeof puter !== 'undefined' && puter.ai && typeof puter.ai.txt2img === 'function') {
      await handleImageGeneration(session, imagePrompt, text);
      return;
    }

    // Check for document intent (PDF / DOCX)
    const docIntent = detectDocumentIntent(text);

    await triggerAssistantResponse(session, docIntent);
  }

  async function triggerAssistantResponse(session, docIntent = null) {
    if (!docIntent && session && Array.isArray(session.messages)) {
      const lastUserMsg = [...session.messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg && lastUserMsg.content) {
        docIntent = detectDocumentIntent(lastUserMsg.content);
      }
    }

    const sessionProj = (session && session.projectId)
      ? projects.find(p => p.id === session.projectId)
      : getActiveProject();
    const effectiveModel = (sessionProj && sessionProj.model) ? sessionProj.model : settings.selectedModel;

    const assistantMsg = {
      role: 'assistant',
      content: '',
      reasoning: '',
      model: effectiveModel,
      documentIntent: docIntent || undefined,
      timestamp: Date.now()
    };

    const assistantWrapper = document.createElement('div');
    assistantWrapper.className = 'message-wrapper assistant';

    const assistantAvatar = document.createElement('div');
    assistantAvatar.className = 'message-avatar assistant';
    assistantAvatar.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="url(#geminiSparkleGrad)" d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"/>
      </svg>
    `;

    const assistantContainer = document.createElement('div');
    assistantContainer.className = 'message-content-container';

    let liveReasoningBlock = null;
    let liveReasoningContent = null;

    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'message-bubble assistant markdown-body';
    assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Thinking...</span>';

    assistantContainer.appendChild(assistantBubble);
    assistantWrapper.appendChild(assistantAvatar);
    assistantWrapper.appendChild(assistantContainer);
    messagesInner.appendChild(assistantWrapper);
    scrollToBottom();

    activeAbortController = new AbortController();
    btnSend.style.display = 'none';
    btnStopStream.style.display = 'flex';

    btnStopStream.onclick = () => {
      if (activeAbortController) {
        activeAbortController.abort();
      }
    };

    try {
      if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
        throw new Error('Puter.js AI SDK not available. Check your internet connection.');
      }

      // Prepare conversation payload with compiled project instructions or global system prompt
      let systemPromptContent = sessionProj
        ? compileProjectSystemPrompt(sessionProj)
        : settings.systemPrompt;

      if (docIntent) {
        systemPromptContent += `\n\n[DOCUMENT DRAFTING DIRECTIVE: The user's goal is to generate/export a ${docIntent.type.toUpperCase()} document. Do NOT output disclaimers saying you cannot create files or download documents. Directly draft the complete, comprehensive, beautifully structured document using clean Markdown (clear headings #/##/###, structured sections, bullet points, and tables where appropriate). The Omni Chat interface will automatically compile your response into a downloadable ${docIntent.type.toUpperCase()} document file for the user.]`;
      }

      const conversationPayload = [
        { role: 'system', content: systemPromptContent }
      ];

      session.messages.forEach(m => {
        const textContent = m.rawPrompt || m.content;
        if (m.attachment) {
          conversationPayload.push({
            role: m.role,
            content: [
              { type: 'text', text: textContent || 'Analyze this image.' },
              { type: 'file', puter_path: m.attachment }
            ]
          });
        } else {
          conversationPayload.push({
            role: m.role,
            content: textContent
          });
        }
      });

      const isReasoning = (effectiveModel || '').toLowerCase().includes('reason') ||
                          (effectiveModel || '').toLowerCase().includes('r1') ||
                          (effectiveModel || '').toLowerCase().includes('argon') ||
                          (effectiveModel || '').toLowerCase().startsWith('o1') ||
                          (effectiveModel || '').toLowerCase().startsWith('o3');

      const chatOptions = {
        model: effectiveModel,
        stream: true,
        signal: activeAbortController.signal
      };

      // Only pass temperature for non-reasoning models (models like o1/o3/argon reject temperature)
      if (!isReasoning && typeof settings.temperature === 'number') {
        chatOptions.temperature = settings.temperature;
      }

      const responseStream = await puter.ai.chat(conversationPayload, chatOptions);

      let accumulatedText = '';
      let accumulatedReasoning = '';

      for await (const part of responseStream) {
        if (part?.type === 'text' || part?.text) {
          accumulatedText += (part.text || '');
          assistantBubble.innerHTML = formatMarkdown(accumulatedText);
          attachCodeCopyHandlers(assistantBubble);
          scrollToBottom();
        }

        if (part?.type === 'reasoning' || part?.reasoning) {
          const rChunk = part.reasoning || (typeof part.text === 'string' && part.type === 'reasoning' ? part.text : '');
          if (rChunk) {
            accumulatedReasoning += rChunk;
            if (!liveReasoningBlock) {
              liveReasoningBlock = document.createElement('div');
              liveReasoningBlock.className = 'reasoning-block';
              liveReasoningBlock.innerHTML = `
                <div class="reasoning-header">
                  <span>🧠 Thinking Process (Live)</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="reasoning-content"></div>
              `;
              liveReasoningBlock.querySelector('.reasoning-header').addEventListener('click', () => {
                liveReasoningBlock.classList.toggle('collapsed');
              });
              assistantContainer.insertBefore(liveReasoningBlock, assistantBubble);
              liveReasoningContent = liveReasoningBlock.querySelector('.reasoning-content');
            }
            liveReasoningContent.textContent = accumulatedReasoning;
            scrollToBottom();
          }
        }

        if (part?.type === 'error') {
          throw new Error(part.message || 'Streaming error');
        }
      }

      if (liveReasoningBlock) {
        liveReasoningBlock.classList.add('collapsed');
        liveReasoningBlock.querySelector('.reasoning-header span').textContent = '🧠 Thought Process';
      }

      assistantMsg.content = accumulatedText || '*(Empty response)*';
      assistantMsg.reasoning = accumulatedReasoning;
      if (docIntent) {
        assistantMsg.documentIntent = docIntent;
      }
      session.messages.push(assistantMsg);
      session.updatedAt = Date.now();
      await persistSessions();

      // If document intent was detected, render the interactive document download card
      if (docIntent) {
        const docCard = document.createElement('div');
        docCard.className = 'ai-generated-document-card';
        const isPdf = docIntent.type === 'pdf';
        const docLabel = isPdf ? 'PDF' : 'Word (.docx)';
        const docIcon = isPdf ? '📄' : '📝';
        docCard.innerHTML = `
          <div class="doc-card-left">
            <span class="doc-card-badge">${docIcon}</span>
            <div class="doc-card-text">
              <span class="doc-card-title">${escapeHtml(docIntent.title || `${docLabel} Document Ready`)}</span>
              <span class="doc-card-desc">Formatted document compiled and ready for download</span>
            </div>
          </div>
          <button class="btn-download-doc-card" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Download ${docLabel}
          </button>
        `;
        docCard.querySelector('.btn-download-doc-card').addEventListener('click', () => {
          if (isPdf) {
            exportMessageAsPdf(assistantMsg.content, session.messages.length - 1);
          } else {
            exportMessageAsDocx(assistantMsg.content, session.messages.length - 1);
          }
        });
        assistantContainer.appendChild(docCard);
      }

      // Render clean action buttons
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      actions.innerHTML = `
        <span class="message-meta-tag">${escapeHtml(settings.selectedModel)}</span>
        <button class="icon-btn-sm btn-copy-msg" title="Copy response">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="icon-btn-sm btn-regen-msg" title="Regenerate">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      `;
      actions.querySelector('.btn-copy-msg').addEventListener('click', () => {
        navigator.clipboard.writeText(assistantMsg.content);
        showToast('Copied to clipboard');
      });
      actions.querySelector('.btn-regen-msg').addEventListener('click', () => {
        regenerateFromIndex(session.messages.length - 1);
      });
      assistantContainer.appendChild(actions);

    } catch (err) {
      if (err.name === 'AbortError') {
        assistantBubble.innerHTML += '<br><em style="color: var(--text-muted); font-size: 0.8rem;">[Generation stopped by user]</em>';
        assistantMsg.content = (assistantBubble.innerText || '') + ' [Stopped]';
        session.messages.push(assistantMsg);
        session.updatedAt = Date.now();
        await persistSessions();
      } else {
        console.error('Chat error:', err);
        const errorMsg = err.message || 'Failed to complete chat request.';
        const isModelIssue = errorMsg.toLowerCase().includes('model not found') || 
                             errorMsg.toLowerCase().includes('not available') ||
                             errorMsg.toLowerCase().includes('rate limit') ||
                             errorMsg.toLowerCase().includes('404') ||
                             errorMsg.toLowerCase().includes('unknown model');

        assistantBubble.innerHTML = `
          <div class="chat-error-card">
            <div class="chat-error-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <strong>Unable to complete request with ${escapeHtml(settings.selectedModel)}</strong>
            </div>
            <div class="chat-error-body">${escapeHtml(errorMsg)}</div>
            ${isModelIssue ? `
              <div class="chat-error-hint">This model is currently unavailable on Puter's upstream provider. Switch to one of our verified frontier models to continue seamlessly:</div>
              <div class="chat-error-actions">
                <button class="btn-recovery" data-switch-model="gemini-2.5-flash">Switch to Gemini 2.5 Flash</button>
                <button class="btn-recovery" data-switch-model="gpt-4o-mini">Switch to GPT-4o Mini</button>
                <button class="btn-recovery" data-switch-model="claude-sonnet-5">Switch to Claude Sonnet 5</button>
              </div>
            ` : `
              <div class="chat-error-actions">
                <button class="btn-recovery btn-retry-msg">Retry Request</button>
              </div>
            `}
          </div>
        `;

        assistantBubble.querySelectorAll('[data-switch-model]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const newModelId = btn.getAttribute('data-switch-model');
            const found = allModels.find(m => m.id === newModelId) || { id: newModelId, name: newModelId, canonicalFamily: 'AI' };
            selectModel(found.id, found.name, found.canonicalFamily);
            showToast(`Switched to ${found.name || newModelId}. Retrying...`);
            assistantWrapper.remove();
            await triggerAssistantResponse(session);
          });
        });

        const retryBtn = assistantBubble.querySelector('.btn-retry-msg');
        if (retryBtn) {
          retryBtn.addEventListener('click', async () => {
            assistantWrapper.remove();
            await triggerAssistantResponse(session);
          });
        }
      }
    } finally {
      activeAbortController = null;
      btnStopStream.style.display = 'none';
      btnSend.style.display = 'flex';
      btnSend.disabled = chatTextarea.value.trim().length === 0;
      chatTextarea.focus();
    }
  }

  // --- Drag and Drop File Upload ---
  ['dragenter', 'dragover'].forEach(eventName => {
    inputBoxContainer.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZoneOverlay.classList.add('active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    inputBoxContainer.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZoneOverlay.classList.remove('active');
    });
  });

  inputBoxContainer.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      handleAttachmentFile(file);
    }
  });

  btnAttach.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleAttachmentFile(file);
  });

  function handleAttachmentFile(file) {
    if (!file) return;

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target.result;

        // Downscale high-resolution images so storage quota is preserved
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1280;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          currentAttachment = {
            kind: 'image',
            name: file.name,
            dataUrl: optimizedDataUrl,
            type: 'image/jpeg'
          };
          if (attachmentImgPreview) {
            attachmentImgPreview.src = currentAttachment.dataUrl;
            attachmentImgPreview.style.display = 'block';
          }
          const attachmentDocIcon = document.getElementById('attachment-doc-icon');
          if (attachmentDocIcon) attachmentDocIcon.style.display = 'none';
          if (attachmentFilename) attachmentFilename.textContent = file.name;
          if (attachmentPreviewBar) attachmentPreviewBar.style.display = 'flex';
          btnSend.disabled = false;
        };
        img.onerror = () => {
          currentAttachment = {
            kind: 'image',
            name: file.name,
            dataUrl: rawDataUrl,
            type: file.type
          };
          if (attachmentImgPreview) {
            attachmentImgPreview.src = currentAttachment.dataUrl;
            attachmentImgPreview.style.display = 'block';
          }
          const attachmentDocIcon = document.getElementById('attachment-doc-icon');
          if (attachmentDocIcon) attachmentDocIcon.style.display = 'none';
          if (attachmentFilename) attachmentFilename.textContent = file.name;
          if (attachmentPreviewBar) attachmentPreviewBar.style.display = 'flex';
          btnSend.disabled = false;
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    } else {
      // Document / Code / Text file
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target.result;
        currentAttachment = {
          kind: 'document',
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: typeof textContent === 'string' ? textContent : ''
        };

        if (attachmentImgPreview) attachmentImgPreview.style.display = 'none';
        const attachmentDocIcon = document.getElementById('attachment-doc-icon');
        if (attachmentDocIcon) {
          attachmentDocIcon.textContent = file.name.endsWith('.pdf') ? '📕' : (file.name.match(/\.(docx?|odt)$/i) ? '📝' : '📄');
          attachmentDocIcon.style.display = 'inline-flex';
        }
        if (attachmentFilename) attachmentFilename.textContent = `${file.name} (${formatFileSize(file.size)})`;
        if (attachmentPreviewBar) attachmentPreviewBar.style.display = 'flex';
        btnSend.disabled = false;
        showToast(`Attached ${file.name}`);
      };
      reader.onerror = () => {
        showToast(`Could not read file "${file.name}"`);
      };
      reader.readAsText(file);
    }
    fileInput.value = '';
  }

  // Clipboard Paste (Cmd+V / Ctrl+V for images and files)
  chatTextarea.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleAttachmentFile(file);
          showToast('Image pasted from clipboard');
          return;
        }
      } else if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleAttachmentFile(file);
          showToast(`File "${file.name}" pasted from clipboard`);
          return;
        }
      }
    }
  });

  function clearAttachment() {
    currentAttachment = null;
    if (attachmentPreviewBar) attachmentPreviewBar.style.display = 'none';
    if (attachmentImgPreview) {
      attachmentImgPreview.src = '';
      attachmentImgPreview.style.display = 'none';
    }
    const attachmentDocIcon = document.getElementById('attachment-doc-icon');
    if (attachmentDocIcon) attachmentDocIcon.style.display = 'none';
  }

  btnRemoveAttachment.addEventListener('click', () => {
    clearAttachment();
    btnSend.disabled = chatTextarea.value.trim().length === 0;
  });

  // --- Input & Keyboard Controls ---
  chatTextarea.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 180) + 'px';
    btnSend.disabled = this.value.trim().length === 0 && !currentAttachment;
  });

  chatTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  btnSend.addEventListener('click', handleSend);

  // --- Scroll Utilities ---
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  messagesContainer.addEventListener('scroll', () => {
    const fromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    if (fromBottom > 150) {
      btnScrollBottom.classList.add('visible');
    } else {
      btnScrollBottom.classList.remove('visible');
    }
  });

  btnScrollBottom.addEventListener('click', scrollToBottom);

  // --- Gemini Sidebar Toggle Logic ---
  function updateSidebarToggleUI(isClosed) {
    document.body.classList.toggle('sidebar-closed', isClosed);
    if (btnToggleSidebar) {
      btnToggleSidebar.title = isClosed ? 'Open sidebar' : 'Close sidebar';
      btnToggleSidebar.setAttribute('aria-label', isClosed ? 'Open sidebar' : 'Close sidebar');
    }
  }

  function openSidebar() {
    sidebar.classList.remove('closed');
    updateSidebarToggleUI(false);
    if (window.innerWidth <= 768 && sidebarBackdrop) {
      sidebarBackdrop.classList.add('active');
    }
  }

  function closeSidebar() {
    sidebar.classList.add('closed');
    updateSidebarToggleUI(true);
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.remove('active');
    }
  }

  function toggleSidebar() {
    if (sidebar.classList.contains('closed')) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  // Sync initial state
  if (sidebar) {
    updateSidebarToggleUI(sidebar.classList.contains('closed'));
  }

  // --- Modal Utilities ---
  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  // --- In-Window Project Studio Listeners ---
  if (btnCreateProject) {
    btnCreateProject.addEventListener('click', () => openProjectStudio(null));
  }

  if (btnEditActiveProject) {
    btnEditActiveProject.addEventListener('click', () => openProjectStudio(activeProjectId));
  }

  if (btnExitProject) {
    btnExitProject.addEventListener('click', exitProject);
  }

  if (btnStudioBack) {
    btnStudioBack.addEventListener('click', closeProjectStudio);
  }

  if (btnStudioCancel) {
    btnStudioCancel.addEventListener('click', closeProjectStudio);
  }

  if (btnStudioSave) {
    btnStudioSave.addEventListener('click', saveProject);
  }

  if (btnStudioDelete) {
    btnStudioDelete.addEventListener('click', () => deleteProject(editingProjectId));
  }

  if (emojiPickerRow) {
    emojiPickerRow.addEventListener('click', (e) => {
      const pill = e.target.closest('.emoji-pill');
      if (!pill) return;
      emojiPickerRow.querySelectorAll('.emoji-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      editingProjectIcon = pill.getAttribute('data-emoji') || '⚡';
      if (studioHeaderIcon) studioHeaderIcon.textContent = editingProjectIcon;
    });
  }

  if (projectDropzone) {
    projectDropzone.addEventListener('click', () => {
      if (projectFileInput) projectFileInput.click();
    });

    projectDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      projectDropzone.classList.add('dragover');
    });

    projectDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      projectDropzone.classList.remove('dragover');
    });

    projectDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      projectDropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        handleProjectFiles(e.dataTransfer.files);
      }
    });
  }

  if (projectFileInput) {
    projectFileInput.addEventListener('change', (e) => {
      if (e.target.files) {
        handleProjectFiles(e.target.files);
        projectFileInput.value = '';
      }
    });
  }

  [projectIntentInput, projectContextInput, projectOutputInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', updateProjectTokenCounter);
    }
  });

  // Studio Live Preview Listeners
  if (studioPreviewTextarea) {
    studioPreviewTextarea.addEventListener('input', () => {
      if (btnSendPreview) {
        btnSendPreview.disabled = !studioPreviewTextarea.value.trim();
      }
    });

    studioPreviewTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleStudioPreviewSend();
      }
    });
  }

  if (btnSendPreview) {
    btnSendPreview.addEventListener('click', handleStudioPreviewSend);
  }

  if (btnResetPreview) {
    btnResetPreview.addEventListener('click', resetStudioPreview);
  }

  if (studioMobileToggle) {
    studioMobileToggle.addEventListener('click', (e) => {
      const pill = e.target.closest('.studio-toggle-pill');
      if (!pill) return;
      studioMobileToggle.querySelectorAll('.studio-toggle-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const pane = pill.getAttribute('data-pane');
      if (studioContentGrid) {
        studioContentGrid.classList.toggle('show-preview', pane === 'preview');
      }
    });
  }

  [modelModal, settingsModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (projectStudioView && projectStudioView.style.display !== 'none') {
        closeProjectStudio();
        return;
      }
      closeModal(modelModal);
      closeModal(settingsModal);
    }
  });

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Startup Execution ---
  initTheme();
  initModalTabs();
  loadLocalTombstones();
  loadLocalSettings();
  loadSessionsFromLocal();
  initPuter();

})();
