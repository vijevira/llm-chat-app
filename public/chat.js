/**
 * Omni Chat — Universal Multi-Model Chat
 * Built with Puter.js (docs.puter.com/llms.txt)
 */

(function () {
  'use strict';

  // --- Constants & Presets ---
  const APP_VERSION = 'v1.0.0';
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
  const imageFileInput = document.getElementById('image-file-input');
  const btnChatPlus = document.getElementById('btn-chat-plus');
  const chatToolsPopover = document.getElementById('chat-tools-popover');
  const toolAttachFile = document.getElementById('tool-attach-file');
  const toolAttachImage = document.getElementById('tool-attach-image');
  const toolCreateImage = document.getElementById('tool-create-image');
  const toolCreateVideo = document.getElementById('tool-create-video');
  const toolCreateMusic = document.getElementById('tool-create-music');
  const toolBadgeImage = document.getElementById('tool-badge-image');
  const toolBadgeVideo = document.getElementById('tool-badge-video');
  const toolBadgeMusic = document.getElementById('tool-badge-music');
  const activeModeIndicator = document.getElementById('active-mode-indicator');
  const activeModeIcon = document.getElementById('active-mode-icon');
  const activeModeText = document.getElementById('active-mode-text');
  const btnClearMode = document.getElementById('btn-clear-mode');
  const btnChatModelPicker = document.getElementById('btn-chat-model-picker');
  const chatModelName = document.getElementById('chat-model-name');
  const btnVoiceInput = document.getElementById('btn-voice-input');
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
  const appVersionBadge = document.getElementById('app-version-badge');
  if (appVersionBadge) {
    appVersionBadge.textContent = `Omni Chat ${APP_VERSION}`;
  }

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

  // Interactive Artifacts & Sandboxed Web Apps Elements
  const artifactsPane = document.getElementById('artifacts-pane');
  const artifactsTitle = document.getElementById('artifacts-title');
  const artifactsSandboxFrame = document.getElementById('artifacts-sandbox-frame');
  const artifactsFrameContainer = document.getElementById('artifacts-frame-container');
  const btnArtifactVpDesktop = document.getElementById('btn-artifact-vp-desktop');
  const btnArtifactVpMobile = document.getElementById('btn-artifact-vp-mobile');
  const btnArtifactReload = document.getElementById('btn-artifact-reload');
  const btnPublishArtifact = document.getElementById('btn-publish-artifact');
  const btnCloseArtifacts = document.getElementById('btn-close-artifacts');
  const artifactsPublishedBanner = document.getElementById('artifacts-published-banner');
  const artifactsPublishedLink = document.getElementById('artifacts-published-link');
  const btnCopyPublishedLink = document.getElementById('btn-copy-published-link');
  const mainChat = document.querySelector('.main-chat');
  let currentArtifact = { title: '', code: '', lang: '', publishedUrl: null };

  // --- Plugins & Tools Engine Elements ---
  const STORAGE_KEY_PLUGINS = 'omni_plugins_state';
  const pillToolSearch = document.getElementById('pill-tool-search');
  const pillToolCode = document.getElementById('pill-tool-code');
  const pillManagePlugins = document.getElementById('pill-manage-plugins');
  const toolToggleSearch = document.getElementById('tool-toggle-search');
  const toolToggleCode = document.getElementById('tool-toggle-code');
  const toolBadgeSearch = document.getElementById('tool-badge-search');
  const toolBadgeCode = document.getElementById('tool-badge-code');
  const pluginsModal = document.getElementById('plugins-modal');
  const btnClosePluginsModal = document.getElementById('btn-close-plugins-modal');
  const btnClosePluginsModalFooter = document.getElementById('btn-close-plugins-modal-footer');
  const togglePluginSearch = document.getElementById('toggle-plugin-search');
  const togglePluginCode = document.getElementById('toggle-plugin-code');
  const badgePluginSearchStatus = document.getElementById('badge-plugin-search-status');
  const badgePluginCodeStatus = document.getElementById('badge-plugin-code-status');

  // --- Custom AI Apps & Community Catalog Elements ---
  const btnExploreApps = document.getElementById('btn-explore-apps');
  const exploreAppsModal = document.getElementById('explore-apps-modal');
  const btnCloseExploreAppsModal = document.getElementById('btn-close-explore-apps-modal');
  const btnCancelExploreAppsModal = document.getElementById('btn-cancel-explore-apps-modal');
  const exploreAppsSearch = document.getElementById('explore-apps-search');
  const exploreAppsGrid = document.getElementById('explore-apps-grid');
  const exploreCategoryPills = document.getElementById('explore-category-pills');
  const btnStudioShare = document.getElementById('btn-studio-share');
  const btnAddFormField = document.getElementById('btn-add-form-field');
  const appFormFieldsBuilder = document.getElementById('app-form-fields-builder');

  let pluginsState = {
    webSearch: false,
    codeRunner: false
  };

  let editingProjectFormFields = [];

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

  // --- Puter Cloud Storage & State Sync ---


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
      await loadCloudSettings();
      await syncTombstones();
      await loadProjects();
      await loadSessions();
      await persistSessions();
      await persistProjects();
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

  // Background Auto-Sync when returning to tab or focus
  let lastBackgroundSyncTime = 0;
  function triggerBackgroundSync() {
    if (Date.now() - lastBackgroundSyncTime < 15000) return; // At most once every 15s
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode !== 'local') {
      lastBackgroundSyncTime = Date.now();
      console.log('[Omni Sync] Window active: checking for updates...');
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
          showToast(`Synced ${sessions.length} conversations with Puter Cloud!`);
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
    const displayName = name || found.name || settings.selectedModel;
    if (selectedModelName) selectedModelName.textContent = displayName;
    if (selectedModelProvider) selectedModelProvider.textContent = provider || found.canonicalFamily || found.rawProvider || 'AI';
    if (chatModelName) chatModelName.textContent = displayName;
  }

  function openModelPickerModal() {
    modelSearchInput.value = '';
    activeProviderFilter = 'all';
    providerPillsBar.querySelectorAll('.provider-pill').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-provider') === 'all');
    });
    renderModelsList();
    openModal(modelModal);
    setTimeout(() => modelSearchInput.focus(), 60);
  }

  if (btnModelPicker) btnModelPicker.addEventListener('click', openModelPickerModal);
  if (btnChatModelPicker) btnChatModelPicker.addEventListener('click', openModelPickerModal);

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
    closeSidebarIfMobile();
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
    closeSidebarIfMobile();
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
    closeSidebarIfMobile();
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
      editingProjectFormFields = (proj.formFields || []).map(f => ({ ...f }));
      if (btnStudioDelete) btnStudioDelete.style.display = 'inline-flex';
      if (btnStudioShare) btnStudioShare.style.display = 'inline-flex';
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
      editingProjectFormFields = [];
      if (btnStudioDelete) btnStudioDelete.style.display = 'none';
      if (btnStudioShare) btnStudioShare.style.display = 'none';
    }

    if (studioHeaderIcon) studioHeaderIcon.textContent = editingProjectIcon;
    if (emojiPickerRow) {
      emojiPickerRow.querySelectorAll('.emoji-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-emoji') === editingProjectIcon);
      });
    }

    renderProjectFilesList();
    renderAppFormFieldsBuilder();
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
          studioPreviewMessages.scrollTop = studioPreviewMessages.scrollHeight;
        }
      }
      attachCodeCopyHandlers(assistantBubble);

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
      formFields: (editingProjectFormFields || []).filter(f => f && f.label && f.label.trim()),
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
    closeSidebarIfMobile();
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
    closeSidebarIfMobile();
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
      const proj = getActiveProject();

      const existingGuidedForm = welcomeContainer.querySelector('.app-guided-form-card');
      if (existingGuidedForm) existingGuidedForm.remove();

      if (proj) {
        if (welcomeSubtitle) {
          welcomeSubtitle.innerHTML = `Working in <strong>${escapeHtml(proj.icon || '⚡')} ${escapeHtml(proj.name)}</strong> workspace`;
        }
        if (proj.formFields && Array.isArray(proj.formFields) && proj.formFields.length > 0) {
          const starterGrid = welcomeContainer.querySelector('.starter-grid');
          if (starterGrid) starterGrid.style.display = 'none';

          const formCard = document.createElement('div');
          formCard.className = 'app-guided-form-card';
          formCard.innerHTML = `
            <div class="guided-form-header">
              <span class="guided-form-badge">🚀 Guided Generator</span>
              <span class="guided-form-title">${escapeHtml(proj.name)}</span>
            </div>
            <div class="guided-form-fields">
              ${proj.formFields.map(field => `
                <div class="guided-field-group">
                  <label class="guided-field-label">${escapeHtml(field.label)}</label>
                  ${field.type === 'textarea'
                    ? `<textarea class="form-textarea guided-field-input" data-label="${escapeHtml(field.label)}" rows="2" placeholder="${escapeHtml(field.placeholder || '')}"></textarea>`
                    : `<input type="text" class="form-input guided-field-input" data-label="${escapeHtml(field.label)}" placeholder="${escapeHtml(field.placeholder || '')}" />`
                  }
                </div>
              `).join('')}
            </div>
            <button class="btn-primary btn-sm btn-generate-from-form" type="button">
              <span>Generate Response</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          `;

          formCard.querySelector('.btn-generate-from-form').addEventListener('click', () => {
            const inputs = formCard.querySelectorAll('.guided-field-input');
            const lines = [];
            inputs.forEach(inp => {
              const label = inp.getAttribute('data-label');
              const val = inp.value.trim();
              if (val) lines.push(`**${label}**: ${val}`);
            });
            if (lines.length === 0) {
              showToast('Please fill out at least one field.');
              return;
            }
            chatTextarea.value = lines.join('\n');
            handleSend();
          });

          welcomeContainer.appendChild(formCard);
        } else {
          const starterGrid = welcomeContainer.querySelector('.starter-grid');
          if (starterGrid) starterGrid.style.display = 'grid';
        }
      } else {
        if (welcomeSubtitle) {
          welcomeSubtitle.textContent = 'How can I help you today?';
        }
        const starterGrid = welcomeContainer.querySelector('.starter-grid');
        if (starterGrid) starterGrid.style.display = 'grid';
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

    // Optional AI Generated Music Card
    if (msg.musicGeneration) {
      const musicCard = document.createElement('div');
      musicCard.className = 'ai-generated-music-card';
      const trackId = 'track_' + (msg.timestamp || Date.now());
      musicCard.id = trackId;
      musicCard.innerHTML = `
        <div class="music-card-header">
          <button class="music-play-btn" type="button" title="Play / Pause melody" aria-label="Play track">
            <svg class="icon-play" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            <svg class="icon-pause" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
          <div class="music-meta">
            <div class="music-title">🎵 ${escapeHtml(msg.musicGeneration.title || msg.musicGeneration.prompt)}</div>
            <div class="music-subtitle">
              <span>${escapeHtml(msg.musicGeneration.genre || 'Ambient Melody')}</span>
              <span>•</span>
              <span>${msg.musicGeneration.bpm || 95} BPM</span>
              <span>•</span>
              <span>${escapeHtml(msg.musicGeneration.key || 'C Major')}</span>
            </div>
          </div>
          <div class="music-waveform-bars">
            <span class="waveform-bar"></span>
            <span class="waveform-bar"></span>
            <span class="waveform-bar"></span>
            <span class="waveform-bar"></span>
            <span class="waveform-bar"></span>
            <span class="waveform-bar"></span>
          </div>
        </div>
        <div class="music-card-body">
          <div class="music-desc"><strong>Prompt:</strong> "${escapeHtml(msg.musicGeneration.prompt)}"</div>
          <div class="music-composition-notes">
            🎹 <strong>Instrumentation & Arrangement:</strong> Synthesizer, warm sub-bass, atmospheric pads, rhythmic drums (${msg.musicGeneration.bpm || 95} BPM).
          </div>
          <div class="music-tags-row">
            <span class="music-tag">🎧 AI Soundscape</span>
            <span class="music-tag">🎼 ${escapeHtml(msg.musicGeneration.genre || 'Electronic / Lofi')}</span>
            <span class="music-tag">🎚️ 44.1 kHz Stereo</span>
          </div>
        </div>
      `;

      // Wire play button to Web Audio Synthesizer
      const playBtn = musicCard.querySelector('.music-play-btn');
      playBtn.addEventListener('click', () => {
        togglePlaySynthesizedMusic(musicCard, msg.musicGeneration);
      });

      container.appendChild(musicCard);
    }

    // Optional Web Search Grounding Card
    if (msg.searchSources && Array.isArray(msg.searchSources) && msg.searchSources.length > 0) {
      const searchCard = createSearchSourcesCard(msg.searchSources, msg.searchQuery);
      container.appendChild(searchCard);
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

  // --- Phase 1: Interactive Artifacts & Sandboxed Web Apps Runner ---
  function isRunnableWebCode(lang, codeText) {
    if (!codeText || typeof codeText !== 'string') return false;
    const l = (lang || '').toLowerCase().trim();
    if (l === 'html' || l === 'htm' || l === 'svg') return true;
    if (l === 'xml' && /<svg[\s>]/i.test(codeText)) return true;
    const trimmed = codeText.trim();
    if (/<!DOCTYPE\s+html/i.test(trimmed)) return true;
    if (/<html[\s>]/i.test(trimmed) && /<\/html>/i.test(trimmed)) return true;
    if (/<svg[\s>]/i.test(trimmed) && /<\/svg>/i.test(trimmed)) return true;
    return false;
  }

  function prepareExecutableHtml(code, lang) {
    if (!code) return '';
    const l = (lang || '').toLowerCase().trim();
    const trimmed = code.trim();
    if (l === 'svg' || (/^<svg[\s>]/i.test(trimmed) && !/<!DOCTYPE/i.test(trimmed) && !/<html/i.test(trimmed))) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Omni SVG Preview</title>
  <style>
    body {
      margin: 0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f1117;
      box-sizing: border-box;
    }
    svg {
      max-width: 100%;
      max-height: 90vh;
      height: auto;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
    }

    let processed = trimmed;
    if (!/<meta[^>]+viewport/i.test(processed)) {
      if (/<head[\s>]/i.test(processed)) {
        processed = processed.replace(/<head[\s>]/i, '$&\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
      } else if (/<html[\s>]/i.test(processed)) {
        processed = processed.replace(/<html[\s>]/i, '$&\n<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>');
      }
    }
    return processed;
  }

  function openArtifact(title, code, lang) {
    if (!artifactsPane || !artifactsSandboxFrame) return;
    currentArtifact = {
      title: title || 'Interactive Web Application',
      code: code,
      lang: lang || 'html',
      publishedUrl: null
    };

    if (artifactsTitle) {
      artifactsTitle.textContent = currentArtifact.title;
    }
    if (artifactsPublishedBanner) {
      artifactsPublishedBanner.style.display = 'none';
    }

    artifactsPane.style.display = 'flex';
    if (mainChat) {
      mainChat.classList.add('has-artifact-open');
    }

    const execHtml = prepareExecutableHtml(code, lang);
    artifactsSandboxFrame.srcdoc = execHtml;
  }

  function closeArtifact() {
    if (!artifactsPane) return;
    artifactsPane.style.display = 'none';
    if (mainChat) {
      mainChat.classList.remove('has-artifact-open');
    }
    if (artifactsSandboxFrame) {
      artifactsSandboxFrame.srcdoc = '';
    }
    currentArtifact = { title: '', code: '', lang: '', publishedUrl: null };
  }

  async function publishCurrentArtifact() {
    if (!currentArtifact.code) {
      showToast('No active application to publish.');
      return;
    }

    if (typeof puter === 'undefined') {
      showToast('Puter SDK not loaded');
      return;
    }

    try {
      if (!puter.auth.isSignedIn()) {
        showToast('Please sign in with Puter to publish your app.');
        const signedIn = await puter.auth.signIn();
        if (!signedIn || !puter.auth.isSignedIn()) {
          showToast('Publishing cancelled (sign-in required).');
          return;
        }
      }

      const origBtnHtml = btnPublishArtifact.innerHTML;
      btnPublishArtifact.disabled = true;
      btnPublishArtifact.innerHTML = `<span class="spinner-small" style="width:12px;height:12px;display:inline-block;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Publishing...`;

      showToast('Publishing live app to Puter Cloud hosting...');

      const baseSlug = (currentArtifact.title || 'omni-app')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 16) || 'app';
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const subdomain = `${baseSlug}-${randomSuffix}`;
      const dirPath = `hosted_apps/${subdomain}`;

      await puter.fs.mkdir(dirPath, { createMissingParents: true });
      const htmlContent = prepareExecutableHtml(currentArtifact.code, currentArtifact.lang);
      await puter.fs.write(`${dirPath}/index.html`, htmlContent);

      const site = await puter.hosting.create(subdomain, dirPath);
      const publishedUrl = site && site.subdomain
        ? `https://${site.subdomain}.puter.site`
        : `https://${subdomain}.puter.site`;

      currentArtifact.publishedUrl = publishedUrl;

      if (artifactsPublishedBanner && artifactsPublishedLink) {
        artifactsPublishedLink.href = publishedUrl;
        artifactsPublishedLink.textContent = publishedUrl;
        artifactsPublishedBanner.style.display = 'flex';
      }

      showToast(`🎉 App live at ${publishedUrl}!`, 5000);

      btnPublishArtifact.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Published`;
      setTimeout(() => {
        btnPublishArtifact.disabled = false;
        btnPublishArtifact.innerHTML = origBtnHtml;
      }, 3000);
    } catch (err) {
      console.error('Failed to publish artifact:', err);
      showToast('Failed to publish app: ' + (err.message || 'Unknown error'));
      btnPublishArtifact.disabled = false;
      btnPublishArtifact.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
        <span>Publish App</span>
      `;
    }
  }

  // ==========================================================================
  // Pillar 2 & 3: Plugins Engine & Custom AI Apps Catalog
  // ==========================================================================

  const COMMUNITY_APPS = [
    {
      id: 'app-web-architect',
      name: 'Full-Stack Web App Architect',
      icon: '🚀',
      category: 'coding',
      desc: 'Builds interactive single-file HTML/CSS/JS apps, web games, dashboards, and tools ready for split-screen live preview and 1-click Puter hosting.',
      model: 'claude-sonnet-5',
      intent: 'You are a principal frontend engineer and UI/UX designer. When the user asks for a feature, calculator, game, or tool, always write a complete, standalone, interactive single-file HTML document with embedded CSS and modern JavaScript.',
      context: 'Modern web standards, responsive design, beautiful CSS gradients, intuitive user controls.',
      output: 'Always deliver a single contiguous ```html code block containing <!DOCTYPE html>, complete <style>, and vanilla JS. Ensure the application is visually polished, reactive, and fully playable or interactive.',
      formFields: [
        { label: 'App or Game Concept', placeholder: 'e.g. Retro Space Invaders arcade game, Pomodoro timer with sound, Financial Compound Interest calculator', type: 'text' },
        { label: 'Key Features / Theme', placeholder: 'e.g. Dark neon aesthetic, sound effects, local storage high scores', type: 'text' }
      ]
    },
    {
      id: 'app-data-analyst',
      name: 'Financial & Data Analyst',
      icon: '📊',
      category: 'analysis',
      desc: 'Performs quantitative financial modeling, ROI calculations, statistical distributions, and algorithmic projections with executable JavaScript.',
      model: 'gemini-2.5-pro',
      intent: 'You are a quantitative financial analyst and data scientist. Provide structured, mathematically rigorous models, ROI analyses, and data calculations.',
      context: 'Corporate finance, unit economics, statistical analysis, mathematical modeling.',
      output: 'Show assumptions clearly, provide key summary metrics in tables, and include executable JavaScript code calculations where appropriate.',
      formFields: [
        { label: 'Dataset or Financial Scenario', placeholder: 'e.g. SaaS metrics with $50k MRR, 5% monthly churn, $250 CAC', type: 'textarea' },
        { label: 'Core Analysis Goal', placeholder: 'e.g. Forecast 24-month ARR, runway, and break-even point', type: 'text' }
      ]
    },
    {
      id: 'app-doc-architect',
      name: 'Document & Proposal Architect',
      icon: '📄',
      category: 'writing',
      desc: 'Drafts formal executive summaries, consulting proposals, client invoices, and business reports formatted for 1-click PDF and Word export.',
      model: 'gpt-4o',
      intent: 'You are an executive proposal consultant and technical writer. Draft formal, compelling, high-converting client proposals, contracts, and business reports.',
      context: 'Enterprise RFP responses, consulting statements of work, executive summaries, pricing tables.',
      output: 'Use clean Markdown headers (# ## ###), structured executive summaries, deliverables tables, and timeline phases. Ready for instant PDF/DOCX generation.',
      formFields: [
        { label: 'Document Type', placeholder: 'e.g. Enterprise Consulting Proposal, Statement of Work (SOW), Project Spec', type: 'text' },
        { label: 'Client / Target Audience', placeholder: 'e.g. Fortune 500 VP of Engineering, SMB Retail Chain Owner', type: 'text' },
        { label: 'Project Scope & Deliverables', placeholder: 'e.g. Cloud migration, 3-month timeline, $45,000 fixed price', type: 'textarea' }
      ]
    },
    {
      id: 'app-deep-researcher',
      name: 'Fact-Checking Deep Researcher',
      icon: '🔍',
      category: 'research',
      desc: 'Conducts grounded research on current events, tech developments, and market trends using real-time web search and verified citations.',
      model: 'gemini-2.5-flash',
      intent: 'You are an investigative tech researcher and fact-checker. Provide rigorous, objective, citation-backed deep dives into current technologies and trends.',
      context: 'Academic standards, scientific rigor, cross-referencing claims, neutral balanced perspective.',
      output: 'Synthesize findings with clear section headers, key takeaways, and numbered citations referencing verified sources.',
      formFields: [
        { label: 'Research Subject or Question', placeholder: 'e.g. Breakthroughs in solid-state battery commercialization', type: 'text' },
        { label: 'Specific Focus Areas', placeholder: 'e.g. Leading manufacturers, energy density vs lithium-ion, 2026-2030 timeline', type: 'textarea' }
      ]
    },
    {
      id: 'app-socratic-tutor',
      name: 'Socratic Learning Tutor',
      icon: '🎓',
      category: 'research',
      desc: 'Master complex subjects from first principles. Instead of lecturing, guides you with targeted questions and vivid mental models.',
      model: 'claude-sonnet-5',
      intent: 'You are an elite private tutor utilizing the Socratic method. Guide the student to discover principles themselves through thought-provoking questions, real-world analogies, and step-by-step reasoning.',
      context: 'Cognitive science, pedagogical best practices, first-principles thinking.',
      output: 'Never dump answers all at once. Present clear intuition, ask one focused check-for-understanding question, and wait for the user to respond.',
      formFields: [
        { label: 'Topic or Concept to Master', placeholder: 'e.g. Eigenvectors & Eigenvalues, Neural Network Backpropagation, General Relativity', type: 'text' },
        { label: 'Current Level & Background', placeholder: 'e.g. College sophomore in engineering, Beginner programmer', type: 'text' }
      ]
    },
    {
      id: 'app-regex-specialist',
      name: 'Regex, SQL & Algorithm Specialist',
      icon: '🛠️',
      category: 'coding',
      desc: 'Designs optimized regular expressions, SQL queries with indexing strategies, and algorithmic functions with benchmark calculations.',
      model: 'gpt-4o',
      intent: 'You are a database architect and algorithmic optimization expert. Write battle-tested regex patterns, optimal SQL queries, and clean algorithms.',
      context: 'PostgreSQL, MySQL, SQLite, modern ECMAScript/PCRE regex engines, Big-O computational complexity.',
      output: 'Provide the exact solution, a detailed breakdown of how each clause/token works, edge cases handled, and performance characteristics.',
      formFields: [
        { label: 'Problem Statement or Query Goal', placeholder: 'e.g. Match nested ISO-8601 dates with timezone offsets, Find top 3 customers per category in SQL', type: 'textarea' },
        { label: 'Engine / Dialect', placeholder: 'e.g. PostgreSQL 16, JavaScript PCRE, Python re', type: 'text' }
      ]
    }
  ];

  // --- Plugins State Management ---
  function loadPluginsState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLUGINS);
      if (saved) {
        pluginsState = Object.assign(pluginsState, JSON.parse(saved));
      }
    } catch (_) {}
    updatePluginsUI();
  }

  function savePluginsState() {
    try {
      localStorage.setItem(STORAGE_KEY_PLUGINS, JSON.stringify(pluginsState));
    } catch (_) {}
    updatePluginsUI();
  }

  function updatePluginsUI() {
    // Web Search
    if (pillToolSearch) {
      pillToolSearch.classList.toggle('active', !!pluginsState.webSearch);
      const status = pillToolSearch.querySelector('.tool-pill-status');
      if (status) status.textContent = pluginsState.webSearch ? 'ON' : 'OFF';
    }
    if (toolToggleSearch) {
      if (toolBadgeSearch) toolBadgeSearch.style.display = pluginsState.webSearch ? 'inline-flex' : 'none';
    }
    if (togglePluginSearch) {
      togglePluginSearch.checked = !!pluginsState.webSearch;
    }
    if (badgePluginSearchStatus) {
      badgePluginSearchStatus.textContent = pluginsState.webSearch ? 'Active' : 'Inactive';
      badgePluginSearchStatus.style.background = pluginsState.webSearch ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      badgePluginSearchStatus.style.color = pluginsState.webSearch ? 'var(--success-color, #10b981)' : 'var(--text-muted)';
    }

    // Code Runner
    if (pillToolCode) {
      pillToolCode.classList.toggle('active', !!pluginsState.codeRunner);
      const status = pillToolCode.querySelector('.tool-pill-status');
      if (status) status.textContent = pluginsState.codeRunner ? 'ON' : 'OFF';
    }
    if (toolToggleCode) {
      if (toolBadgeCode) toolBadgeCode.style.display = pluginsState.codeRunner ? 'inline-flex' : 'none';
    }
    if (togglePluginCode) {
      togglePluginCode.checked = !!pluginsState.codeRunner;
    }
    if (badgePluginCodeStatus) {
      badgePluginCodeStatus.textContent = pluginsState.codeRunner ? 'Active' : 'Inactive';
      badgePluginCodeStatus.style.background = pluginsState.codeRunner ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      badgePluginCodeStatus.style.color = pluginsState.codeRunner ? 'var(--success-color, #10b981)' : 'var(--text-muted)';
    }
  }

  function toggleWebSearch() {
    pluginsState.webSearch = !pluginsState.webSearch;
    savePluginsState();
    showToast(pluginsState.webSearch ? '🌐 Live Web Search Grounding enabled' : 'Web Search disabled');
  }

  function toggleCodeRunner() {
    pluginsState.codeRunner = !pluginsState.codeRunner;
    savePluginsState();
    showToast(pluginsState.codeRunner ? '⚡ JS Code Runner enabled' : 'Code Runner disabled');
  }

  // --- Live Web Search Tool Execution ---
  function detectSearchIntent(text) {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase();
    const triggers = [
      'search for', 'latest news', 'current price', 'today news',
      'who won', 'stock price', 'weather in', 'recent update',
      'current events', 'what happened to', 'what is the latest'
    ];
    return triggers.some(tr => t.includes(tr));
  }

  async function fetchLiveWebSearchResults(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    // Attempt 1: Call /api/search on Cloudflare Worker
    try {
      const resp = await fetch('/api/search?q=' + encodeURIComponent(cleanQuery));
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return data.results;
        }
      }
    } catch (e) {
      console.warn('Backend /api/search unreachable, attempting client fallback...', e);
    }

    // Attempt 2: If puter.net.fetch is available (CORS-free client fetch)
    if (typeof puter !== 'undefined' && puter.net && typeof puter.net.fetch === 'function') {
      try {
        const ddgResp = await puter.net.fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(cleanQuery), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const html = await ddgResp.text();
        const results = [];
        const regex = /<h2 class="result__title">[\s\S]*?<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 5) {
          const rawHref = match[1];
          let actualUrl = rawHref;
          if (rawHref.includes('uddg=')) {
            const parts = rawHref.split('uddg=');
            if (parts[1]) actualUrl = decodeURIComponent(parts[1].split('&')[0]);
          }
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippet = match[3].replace(/<[^>]+>/g, '').trim();
          let domain = '';
          try { domain = new URL(actualUrl).hostname; } catch (_) {}
          results.push({ title, snippet, url: actualUrl, domain });
        }
        if (results.length > 0) return results;
      } catch (err) {
        console.warn('Puter client DDG fetch error:', err);
      }
    }

    // Attempt 3: Wikipedia public search API (CORS friendly)
    try {
      const wikiResp = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=4&namespace=0&format=json&origin=*`);
      if (wikiResp.ok) {
        const wikiData = await wikiResp.json();
        const titles = wikiData[1] || [];
        const snippets = wikiData[2] || [];
        const urls = wikiData[3] || [];
        const results = [];
        for (let i = 0; i < titles.length; i++) {
          results.push({
            title: titles[i],
            snippet: snippets[i] || titles[i],
            url: urls[i],
            domain: 'en.wikipedia.org'
          });
        }
        if (results.length > 0) return results;
      }
    } catch (wikiErr) {
      console.warn('Wikipedia fallback search error:', wikiErr);
    }

    return [];
  }

  function createSearchSourcesCard(sources, query) {
    const card = document.createElement('div');
    card.className = 'tool-call-card tool-search-card';
    card.innerHTML = `
      <div class="tool-call-header">
        <div class="tool-call-header-left">
          <span class="tool-call-icon">🌐</span>
          <span class="tool-call-title">Web Search: <strong>${escapeHtml(query || 'Verified Sources')}</strong></span>
        </div>
        <span class="tool-call-badge">✓ ${sources.length} sources grounded</span>
      </div>
      <div class="tool-sources-list">
        ${sources.map(s => `
          <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="tool-source-chip" title="${escapeHtml(s.snippet || s.title)}">
            <span class="source-chip-domain">${escapeHtml(s.domain || 'WEB')}</span>
            <span class="source-chip-title">${escapeHtml(s.title)}</span>
          </a>
        `).join('')}
      </div>
    `;
    return card;
  }

  // --- JavaScript Code Runner Client Sandbox ---
  function executeClientSideJs(code, targetWrapper) {
    const existingOutput = targetWrapper.querySelector('.tool-code-card');
    if (existingOutput) existingOutput.remove();

    const startTime = performance.now();
    let logs = [];
    let result = undefined;
    let error = null;

    try {
      const customConsole = {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        info: (...args) => logs.push('[info] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        warn: (...args) => logs.push('[warn] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        error: (...args) => logs.push('[error] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '))
      };

      const wrapped = new Function('console', `
        "use strict";
        ${code}
      `);
      result = wrapped(customConsole);
    } catch (err) {
      error = err.message || String(err);
    }

    const duration = Math.round(performance.now() - startTime);

    const card = document.createElement('div');
    card.className = 'tool-call-card tool-code-card';
    card.innerHTML = `
      <div class="tool-call-header">
        <div class="tool-call-header-left">
          <span class="tool-call-icon">⚡</span>
          <span class="tool-call-title">Code Execution Result</span>
        </div>
        <span class="tool-call-badge ${error ? 'badge-error' : ''}">${error ? 'Error' : 'Success'} • ${duration}ms</span>
      </div>
      <div class="tool-code-body">
        ${logs.length > 0 ? `
          <div class="tool-code-logs">
            <span class="tool-code-label">Console Output</span>
            <pre>${escapeHtml(logs.join('\n'))}</pre>
          </div>
        ` : ''}
        ${result !== undefined ? `
          <div class="tool-code-result" style="margin-top: ${logs.length > 0 ? '0.5rem' : '0'};">
            <span class="tool-code-label">Return Value</span>
            <code>${escapeHtml(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))}</code>
          </div>
        ` : ''}
        ${error ? `
          <div class="tool-code-error">
            <span class="tool-code-label">Execution Exception</span>
            <span>${escapeHtml(error)}</span>
          </div>
        ` : ''}
        ${logs.length === 0 && result === undefined && !error ? `
          <div style="color: #8b949e; font-style: italic;">Code executed cleanly with no return value.</div>
        ` : ''}
      </div>
    `;

    targetWrapper.appendChild(card);
    showToast('Executed in ' + duration + 'ms');
  }

  // --- Explore Community Apps Catalog Functions ---
  function initExploreAppsModal() {
    renderExploreAppsGrid('all', '');

    if (btnExploreApps) {
      btnExploreApps.addEventListener('click', () => {
        openModal(exploreAppsModal);
      });
    }

    if (btnCloseExploreAppsModal) {
      btnCloseExploreAppsModal.addEventListener('click', () => {
        closeModal(exploreAppsModal);
      });
    }

    if (btnCancelExploreAppsModal) {
      btnCancelExploreAppsModal.addEventListener('click', () => {
        closeModal(exploreAppsModal);
      });
    }

    if (exploreAppsSearch) {
      exploreAppsSearch.addEventListener('input', () => {
        const activeCat = exploreCategoryPills?.querySelector('.explore-cat-pill.active')?.getAttribute('data-cat') || 'all';
        renderExploreAppsGrid(activeCat, exploreAppsSearch.value.trim());
      });
    }

    if (exploreCategoryPills) {
      exploreCategoryPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.explore-cat-pill');
        if (!pill) return;
        exploreCategoryPills.querySelectorAll('.explore-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.getAttribute('data-cat') || 'all';
        renderExploreAppsGrid(cat, exploreAppsSearch?.value.trim() || '');
      });
    }
  }

  function renderExploreAppsGrid(category = 'all', searchQuery = '') {
    if (!exploreAppsGrid) return;
    const q = searchQuery.toLowerCase();
    const filtered = COMMUNITY_APPS.filter(app => {
      const matchesCat = category === 'all' || app.category === category;
      const matchesQuery = !q || app.name.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      exploreAppsGrid.innerHTML = `
        <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">
          No custom apps found matching "${escapeHtml(searchQuery)}".
        </div>
      `;
      return;
    }

    exploreAppsGrid.innerHTML = filtered.map(app => `
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

    exploreAppsGrid.querySelectorAll('.btn-launch-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.getAttribute('data-id');
        const found = COMMUNITY_APPS.find(a => a.id === appId);
        if (found) {
          launchCustomApp(found);
          closeModal(exploreAppsModal);
        }
      });
    });

    exploreAppsGrid.querySelectorAll('.btn-save-app').forEach(btn => {
      btn.addEventListener('click', async () => {
        const appId = btn.getAttribute('data-id');
        const found = COMMUNITY_APPS.find(a => a.id === appId);
        if (found) {
          await cloneCommunityAppToUserProjects(found);
          btn.textContent = '✓ Saved';
          btn.disabled = true;
        }
      });
    });
  }

  async function cloneCommunityAppToUserProjects(app) {
    const existing = projects.find(p => p.id === app.id);
    if (existing) {
      showToast(`"${app.name}" is already in your apps!`);
      return;
    }
    const newProj = {
      id: app.id,
      name: app.name,
      icon: app.icon,
      desc: app.desc,
      model: app.model,
      intent: app.intent,
      context: app.context,
      output: app.output,
      files: [],
      formFields: app.formFields || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    projects.push(newProj);
    await persistProjects();
    renderProjectsList();
    showToast(`Added "${app.name}" to your Custom Apps!`);
  }

  function launchCustomApp(app) {
    let proj = projects.find(p => p.id === app.id);
    if (!proj) {
      proj = {
        id: app.id,
        name: app.name,
        icon: app.icon,
        desc: app.desc,
        model: app.model,
        intent: app.intent,
        context: app.context,
        output: app.output,
        files: [],
        formFields: app.formFields || [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      projects.push(proj);
      persistProjects();
      renderProjectsList();
    }
    selectProject(proj.id);
  }

  function handleUrlAppRouting() {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('app') || params.get('project');
    if (appId) {
      const userProj = projects.find(p => p.id === appId);
      if (userProj) {
        selectProject(userProj.id);
        showToast(`Loaded app: ${userProj.name}`);
        return;
      }
      const commApp = COMMUNITY_APPS.find(a => a.id === appId);
      if (commApp) {
        launchCustomApp(commApp);
        showToast(`Loaded community app: ${commApp.name}`);
      }
    }
  }

  // --- Studio App Form Field Builder ---
  function renderAppFormFieldsBuilder() {
    if (!appFormFieldsBuilder) return;
    if (editingProjectFormFields.length === 0) {
      appFormFieldsBuilder.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">
          No custom inputs defined. The app will launch with a standard conversational welcome screen. Click "+ Add Input Field" above to create guided fields.
        </div>
      `;
      return;
    }

    appFormFieldsBuilder.innerHTML = editingProjectFormFields.map((field, idx) => `
      <div class="app-form-field-row" data-index="${idx}">
        <input type="text" class="form-input form-field-label-input" placeholder="Field Label (e.g. Topic, Audience)" value="${escapeHtml(field.label || '')}">
        <input type="text" class="form-input form-field-ph-input" placeholder="Placeholder Hint" value="${escapeHtml(field.placeholder || '')}">
        <select class="form-select form-field-type-select" style="width: 100px;">
          <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
          <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Textarea</option>
        </select>
        <button type="button" class="icon-btn-sm btn-delete-form-field" data-index="${idx}" title="Delete field">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    appFormFieldsBuilder.querySelectorAll('.form-field-label-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.closest('.app-form-field-row').getAttribute('data-index'), 10);
        if (editingProjectFormFields[idx]) editingProjectFormFields[idx].label = e.target.value;
      });
    });

    appFormFieldsBuilder.querySelectorAll('.form-field-ph-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.closest('.app-form-field-row').getAttribute('data-index'), 10);
        if (editingProjectFormFields[idx]) editingProjectFormFields[idx].placeholder = e.target.value;
      });
    });

    appFormFieldsBuilder.querySelectorAll('.form-field-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.closest('.app-form-field-row').getAttribute('data-index'), 10);
        if (editingProjectFormFields[idx]) editingProjectFormFields[idx].type = e.target.value;
      });
    });

    appFormFieldsBuilder.querySelectorAll('.btn-delete-form-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        editingProjectFormFields.splice(idx, 1);
        renderAppFormFieldsBuilder();
      });
    });
  }

  function attachCodeCopyHandlers(parentElement) {
    const codeBlocks = parentElement.querySelectorAll('pre');
    codeBlocks.forEach(pre => {
      if (pre.parentElement.classList.contains('code-block-wrapper')) return;

      const codeEl = pre.querySelector('code');
      const langClass = Array.from(codeEl?.classList || []).find(c => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : 'code';
      const codeText = codeEl ? codeEl.innerText : pre.innerText;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${escapeHtml(lang)}</span>
        <div class="code-header-actions" style="display:flex;align-items:center;gap:0.4rem;">
          <button class="btn-copy-code" type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
      `;

      header.querySelector('.btn-copy-code').addEventListener('click', function () {
        const text = codeEl ? codeEl.innerText : pre.innerText;
        navigator.clipboard.writeText(text);
        this.innerHTML = '✓ Copied!';
        setTimeout(() => {
          this.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          `;
        }, 2000);
      });

      const isRunnable = isRunnableWebCode(lang, codeText);
      if (isRunnable) {
        const headerActions = header.querySelector('.code-header-actions');
        const btnRun = document.createElement('button');
        btnRun.className = 'btn-run-artifact';
        btnRun.type = 'button';
        btnRun.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Run App
        `;
        btnRun.title = 'Run / Preview in interactive sandbox';
        btnRun.addEventListener('click', () => {
          const currentText = codeEl ? codeEl.innerText : pre.innerText;
          openArtifact((lang === 'svg' ? 'Interactive SVG' : 'Interactive Web App'), currentText, lang);
        });
        if (headerActions) {
          headerActions.insertBefore(btnRun, headerActions.firstChild);
        }
      }

      // JavaScript Code Runner Inline Execution
      if (lang === 'javascript' || lang === 'js') {
        const headerActions = header.querySelector('.code-header-actions');
        const btnRunCode = document.createElement('button');
        btnRunCode.className = 'btn-run-artifact';
        btnRunCode.type = 'button';
        btnRunCode.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Run JS
        `;
        btnRunCode.title = 'Execute JavaScript in client sandbox';
        btnRunCode.addEventListener('click', () => {
          const currentText = codeEl ? codeEl.innerText : pre.innerText;
          executeClientSideJs(currentText, wrapper);
        });
        if (headerActions) {
          headerActions.insertBefore(btnRunCode, headerActions.firstChild);
        }
      }

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      if (isRunnable) {
        const launchCard = document.createElement('div');
        launchCard.className = 'artifact-launch-card';
        launchCard.innerHTML = `
          <div class="artifact-launch-info">
            <span class="artifact-launch-icon">🚀</span>
            <div>
              <span class="artifact-launch-title">Interactive Application Ready</span>
              <span class="artifact-launch-sub">Run and test this ${escapeHtml(lang.toUpperCase())} application live in the sandbox</span>
            </div>
          </div>
          <button class="btn-primary btn-sm btn-open-card-artifact" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Preview App
          </button>
        `;
        launchCard.querySelector('.btn-open-card-artifact').addEventListener('click', () => {
          const currentText = codeEl ? codeEl.innerText : pre.innerText;
          openArtifact((lang === 'svg' ? 'Interactive SVG' : 'Interactive Web App'), currentText, lang);
        });
        wrapper.appendChild(launchCard);
      }
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

  // --- Gemini Chatbox Tools Popover & Creative Modes (Image, Video, Music) ---
  let isImageModeActive = false;
  let isVideoModeActive = false;
  let isMusicModeActive = false;

  const btnImageMode = document.getElementById('btn-image-mode');
  const btnVideoMode = document.getElementById('btn-video-mode');

  function setCreativeMode(mode) {
    isImageModeActive = (mode === 'image');
    isVideoModeActive = (mode === 'video');
    isMusicModeActive = (mode === 'music');

    if (btnImageMode) btnImageMode.classList.toggle('active', isImageModeActive);
    if (btnVideoMode) btnVideoMode.classList.toggle('active', isVideoModeActive);

    if (toolBadgeImage) toolBadgeImage.style.display = isImageModeActive ? 'inline-block' : 'none';
    if (toolBadgeVideo) toolBadgeVideo.style.display = isVideoModeActive ? 'inline-block' : 'none';
    if (toolBadgeMusic) toolBadgeMusic.style.display = isMusicModeActive ? 'inline-block' : 'none';

    if (activeModeIndicator) {
      if (mode === 'none') {
        activeModeIndicator.style.display = 'none';
      } else {
        activeModeIndicator.style.display = 'flex';
        const pill = activeModeIndicator.querySelector('.active-mode-pill');
        if (pill) {
          pill.className = `active-mode-pill mode-${mode}`;
        }
        if (activeModeIcon) {
          activeModeIcon.textContent = mode === 'image' ? '🎨' : (mode === 'video' ? '🎬' : '🎵');
        }
        if (activeModeText) {
          activeModeText.textContent = mode === 'image' ? 'AI Image Mode' : (mode === 'video' ? 'AI Video Mode' : 'AI Music Mode');
        }
      }
    }

    if (chatTextarea) {
      chatTextarea.classList.remove('image-mode', 'video-mode', 'music-mode');
      if (mode === 'image') {
        chatTextarea.classList.add('image-mode');
        chatTextarea.placeholder = '🎨 Describe the image or logo to generate (e.g. modern logo for Omni Chat app)...';
      } else if (mode === 'video') {
        chatTextarea.classList.add('video-mode');
        chatTextarea.placeholder = '🎬 Describe the video to generate (e.g. cinematic aerial view of city at night)...';
      } else if (mode === 'music') {
        chatTextarea.classList.add('music-mode');
        chatTextarea.placeholder = '🎵 Describe the music, beat, or soundtrack to compose (e.g. relaxing lofi chill beat for coding)...';
      } else {
        chatTextarea.placeholder = 'Ask anything, paste images/files, or type /image, /video, /music...';
      }
    }
  }

  // --- Popover Toggle & Dismissal ---
  function toggleToolsPopover(forceState) {
    if (!chatToolsPopover) return;
    const isCurrentlyOpen = chatToolsPopover.style.display === 'flex';
    const nextOpen = (typeof forceState === 'boolean') ? forceState : !isCurrentlyOpen;

    if (nextOpen) {
      chatToolsPopover.style.display = 'flex';
      btnChatPlus?.classList.add('open');
      btnChatPlus?.setAttribute('aria-expanded', 'true');
    } else {
      chatToolsPopover.style.display = 'none';
      btnChatPlus?.classList.remove('open');
      btnChatPlus?.setAttribute('aria-expanded', 'false');
    }
  }

  function closeToolsPopover() {
    toggleToolsPopover(false);
  }

  if (btnChatPlus) {
    btnChatPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleToolsPopover();
    });
  }

  // Click outside dismissal
  document.addEventListener('click', (e) => {
    if (chatToolsPopover && chatToolsPopover.style.display === 'flex') {
      if (!e.target.closest('.chat-tools-dropdown-wrapper')) {
        closeToolsPopover();
      }
    }
  });

  // Escape key dismissal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeToolsPopover();
    }
  });

  // Attach files (PDF, DOCX, TXT, Code, etc.)
  if (toolAttachFile) {
    toolAttachFile.addEventListener('click', () => {
      closeToolsPopover();
      if (fileInput) fileInput.click();
    });
  }

  // Attach images (photos, screenshots)
  if (toolAttachImage) {
    toolAttachImage.addEventListener('click', () => {
      closeToolsPopover();
      if (imageFileInput) {
        imageFileInput.click();
      } else if (fileInput) {
        fileInput.click();
      }
    });
  }

  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleAttachmentFile(file);
      imageFileInput.value = '';
    });
  }

  // Create Image Tool
  if (toolCreateImage) {
    toolCreateImage.addEventListener('click', () => {
      closeToolsPopover();
      setCreativeMode(isImageModeActive ? 'none' : 'image');
      if (isImageModeActive) {
        showToast('🎨 AI Image Mode active! Enter your description to generate.');
      } else {
        showToast('Switched to chat mode.');
      }
      chatTextarea?.focus();
    });
  }

  // Create Video Tool
  if (toolCreateVideo) {
    toolCreateVideo.addEventListener('click', () => {
      closeToolsPopover();
      setCreativeMode(isVideoModeActive ? 'none' : 'video');
      if (isVideoModeActive) {
        showToast('🎬 AI Video Mode active! Enter your description to render a clip.');
      } else {
        showToast('Switched to chat mode.');
      }
      chatTextarea?.focus();
    });
  }

  // Create Music Tool
  if (toolCreateMusic) {
    toolCreateMusic.addEventListener('click', () => {
      closeToolsPopover();
      setCreativeMode(isMusicModeActive ? 'none' : 'music');
      if (isMusicModeActive) {
        showToast('🎵 AI Music Mode active! Enter your description to compose a track.');
      } else {
        showToast('Switched to chat mode.');
      }
      chatTextarea?.focus();
    });
  }

  // Clear Active Mode Pill
  if (btnClearMode) {
    btnClearMode.addEventListener('click', () => {
      setCreativeMode('none');
      showToast('Exited creation mode.');
      chatTextarea?.focus();
    });
  }

  // --- Voice Dictation (Speak from Mic via Web Speech API) ---
  let speechRecognition = null;
  let isVoiceListening = false;

  function initVoiceInput() {
    const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!btnVoiceInput) return;

    if (!SpeechRecClass) {
      btnVoiceInput.addEventListener('click', () => {
        showToast('Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.');
      });
      return;
    }

    btnVoiceInput.addEventListener('click', () => {
      if (isVoiceListening) {
        stopVoiceInput();
      } else {
        startVoiceInput(SpeechRecClass);
      }
    });
  }

  function startVoiceInput(SpeechRecClass) {
    try {
      speechRecognition = new SpeechRecClass();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = true;
      speechRecognition.lang = navigator.language || 'en-US';

      speechRecognition.onstart = () => {
        isVoiceListening = true;
        btnVoiceInput.classList.add('listening');
        btnVoiceInput.title = 'Listening... Click to stop';
        showToast('🎙️ Listening... Speak clearly now');
      };

      speechRecognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const captured = (finalTranscript || interimTranscript).trim();
        if (captured && chatTextarea) {
          chatTextarea.value = captured;
          chatTextarea.dispatchEvent(new Event('input'));
        }
      };

      speechRecognition.onerror = (event) => {
        console.warn('[Omni Voice] Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Microphone access denied. Please grant microphone permission.');
        } else if (event.error !== 'no-speech') {
          showToast(`Voice error: ${event.error}`);
        }
        stopVoiceInput();
      };

      speechRecognition.onend = () => {
        stopVoiceInput();
      };

      speechRecognition.start();
    } catch (err) {
      console.warn('[Omni Voice] Start failed:', err);
      stopVoiceInput();
      showToast('Could not access microphone.');
    }
  }

  function stopVoiceInput() {
    isVoiceListening = false;
    if (speechRecognition) {
      try { speechRecognition.stop(); } catch (e) {}
      speechRecognition = null;
    }
    if (btnVoiceInput) {
      btnVoiceInput.classList.remove('listening');
      btnVoiceInput.title = 'Speak to chat (Voice dictation)';
    }
  }

  initVoiceInput();

  // --- Web Audio Synthesizer for AI Music Track Playback ---
  let activeAudioCtx = null;
  let activeMusicTimer = null;
  let currentlyPlayingCard = null;

  function togglePlaySynthesizedMusic(cardEl, musicData) {
    if (currentlyPlayingCard === cardEl) {
      stopSynthesizedMusic();
      return;
    }

    stopSynthesizedMusic();

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        showToast('Web Audio is not supported in this browser.');
        return;
      }

      activeAudioCtx = new AudioContextClass();
      if (activeAudioCtx.state === 'suspended') {
        activeAudioCtx.resume();
      }

      currentlyPlayingCard = cardEl;
      cardEl.classList.add('playing');
      const iconPlay = cardEl.querySelector('.icon-play');
      const iconPause = cardEl.querySelector('.icon-pause');
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconPause) iconPause.style.display = 'block';

      const bpm = (musicData && musicData.bpm) ? musicData.bpm : 95;
      const beatSec = 60 / bpm;

      // Melodic notes progression (C Pentatonic / Minor chord suite)
      const melodyNotes = [
        261.63, 329.63, 392.00, 523.25,
        293.66, 349.23, 440.00, 587.33,
        329.63, 392.00, 493.88, 659.25,
        261.63, 392.00, 523.25, 659.25
      ];

      let noteIdx = 0;
      const playNextNote = () => {
        if (!activeAudioCtx || currentlyPlayingCard !== cardEl) return;
        const now = activeAudioCtx.currentTime;
        const freq = melodyNotes[noteIdx % melodyNotes.length];

        // Lead synth oscillator
        const osc = activeAudioCtx.createOscillator();
        const gain = activeAudioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + beatSec * 0.85);

        osc.connect(gain);
        gain.connect(activeAudioCtx.destination);
        osc.start(now);
        osc.stop(now + beatSec);

        // Sub-bass chord root every 4 beats
        if (noteIdx % 4 === 0) {
          const bassOsc = activeAudioCtx.createOscillator();
          const bassGain = activeAudioCtx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(freq / 2, now);
          bassGain.gain.setValueAtTime(0.18, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + beatSec * 3.6);
          bassOsc.connect(bassGain);
          bassGain.connect(activeAudioCtx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + beatSec * 3.6);
        }

        noteIdx++;
        activeMusicTimer = setTimeout(playNextNote, beatSec * 1000);
      };

      playNextNote();
      showToast(`▶ Playing: "${(musicData && (musicData.title || musicData.prompt)) || 'AI Track'}"`);
    } catch (e) {
      console.warn('Audio playback error:', e);
      stopSynthesizedMusic();
      showToast('Could not play audio track.');
    }
  }

  function stopSynthesizedMusic() {
    if (activeMusicTimer) {
      clearTimeout(activeMusicTimer);
      activeMusicTimer = null;
    }
    if (activeAudioCtx) {
      try { activeAudioCtx.close(); } catch (e) {}
      activeAudioCtx = null;
    }
    if (currentlyPlayingCard) {
      currentlyPlayingCard.classList.remove('playing');
      const iconPlay = currentlyPlayingCard.querySelector('.icon-play');
      const iconPause = currentlyPlayingCard.querySelector('.icon-pause');
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      currentlyPlayingCard = null;
    }
  }

  function detectMusicGenre(prompt) {
    const p = (prompt || '').toLowerCase();
    if (p.includes('lofi') || p.includes('chill') || p.includes('study')) return 'Lofi / Chillhop';
    if (p.includes('synth') || p.includes('80s') || p.includes('retro')) return 'Synthwave / Retro';
    if (p.includes('cinematic') || p.includes('movie') || p.includes('epic') || p.includes('orchestral')) return 'Cinematic Soundscape';
    if (p.includes('rock') || p.includes('metal')) return 'Rock / Upbeat';
    if (p.includes('jazz') || p.includes('piano') || p.includes('acoustic')) return 'Acoustic / Jazz';
    if (p.includes('techno') || p.includes('edm') || p.includes('dance') || p.includes('club')) return 'Electronic / EDM';
    if (p.includes('ambient') || p.includes('meditation') || p.includes('sleep') || p.includes('nature')) return 'Ambient / Meditative';
    return 'Modern Melodic Beat';
  }

  function detectMusicBPM(prompt) {
    const match = (prompt || '').match(/(\d{2,3})\s*bpm/i);
    if (match && parseInt(match[1])) return parseInt(match[1]);
    const p = (prompt || '').toLowerCase();
    if (p.includes('fast') || p.includes('upbeat') || p.includes('dance') || p.includes('techno') || p.includes('edm')) return 128;
    if (p.includes('lofi') || p.includes('chill') || p.includes('slow') || p.includes('ambient')) return 80;
    return 100;
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

  // --- AI Music Generation Detection & Handler ---
  function isMusicGenerationPrompt(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // 1. Explicit command prefixes
    const slashMatch = trimmed.match(/^\/(?:music|song|beat|track|soundtrack|melody|audio)\s+(.+)/i);
    if (slashMatch && slashMatch[1].trim()) {
      return slashMatch[1].trim();
    }

    // 2. Music and audio nouns
    const musicNouns = [
      'music', 'song', 'songs', 'soundtrack', 'soundtracks', 'beat', 'beats',
      'track', 'tracks', 'melody', 'melodies', 'tune', 'tunes', 'jingle',
      'audio clip', 'soundscape', 'instrumental', 'ambient sound', 'lofi beat',
      'theme song', 'composition'
    ];
    const nounPattern = musicNouns.join('|');

    // Pattern A: [generate/create/compose/make/produce/synthesize/play] [a/an/the?] <musicNoun> [of/for/about] <subject>
    const verbNounRegex = new RegExp(
      '^(?:(?:please|can you|could you|kindly)\\s+)?(?:generate|create|compose|produce|synthesize|make|write|play)\\s+(?:me\\s+)?(?:an?\\s+|the\\s+)?(' +
      nounPattern +
      ')\\s*(?:of|for|showing|with|depicting|about)?\\s*(.+)$',
      'i'
    );
    const vnMatch = trimmed.match(verbNounRegex);
    if (vnMatch && vnMatch[2] && vnMatch[2].trim().length > 1) {
      return `${vnMatch[1].trim()} for ${vnMatch[2].trim()}`;
    }

    // Pattern B: Direct verbs: "compose a symphony for...", "write a song about..."
    const directVerbRegex = /^(?:(?:please|can you|could you|kindly)\s+)?(?:compose|synthesize)\s+(?:me\s+)?(?:an?\s+|the\s+)?(.+)$/i;
    const dvMatch = trimmed.match(directVerbRegex);
    if (dvMatch && dvMatch[1] && dvMatch[1].trim().length > 2) {
      return dvMatch[1].trim();
    }

    // Pattern C: "music for...", "soundtrack for...", "beat for..."
    const directNounRegex = new RegExp('^(?:an?\\s+|the\\s+)?(' + nounPattern + ')\\s+(?:of|for|about)\\s+(.+)$', 'i');
    const dnMatch = trimmed.match(directNounRegex);
    if (dnMatch && dnMatch[2] && dnMatch[2].trim().length > 1) {
      return trimmed;
    }

    return null;
  }

  async function handleMusicGeneration(session, promptText, originalUserPrompt) {
    console.log('[Omni Music] Composing music with prompt:', promptText);

    const genre = detectMusicGenre(promptText);
    const bpm = detectMusicBPM(promptText);

    const assistantMsg = {
      role: 'assistant',
      content: `Here is your composed music track for: **"${promptText}"**`,
      model: 'Omni Audio Synth',
      musicGeneration: {
        prompt: promptText,
        title: promptText.length > 35 ? promptText.slice(0, 32) + '...' : promptText,
        genre: genre,
        bpm: bpm,
        key: 'C Major / A Minor',
        timestamp: Date.now()
      },
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
    assistantBubble.innerHTML = `<span style="color: #0ea5e9; font-style: italic;">🎵 Composing melody, chord progressions & synthesized audio for "${escapeHtml(promptText)}"...</span>`;

    assistantContainer.appendChild(assistantBubble);
    assistantWrapper.appendChild(assistantAvatar);
    assistantWrapper.appendChild(assistantContainer);
    messagesInner.appendChild(assistantWrapper);
    scrollToBottom();

    try {
      showToast('🎵 Composing AI music & audio...');
      await new Promise(r => setTimeout(r, 650));

      session.messages.push(assistantMsg);
      session.updatedAt = Date.now();
      await persistSessions();

      renderActiveSession();
      showToast('Music track composed! Click Play to listen.');
    } catch (err) {
      console.warn('[Omni Music] Generation error:', err);
      assistantBubble.innerHTML = `<span style="color: var(--danger-color);">⚠️ Music generation error: ${escapeHtml(err.message)}. Falling back to assistant...</span>`;
      await triggerAssistantResponse(session);
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

    // Direct /run JS Code Execution Command
    if (/^\/run\s+/i.test(text.trim())) {
      const codeToRun = text.replace(/^\/run\s+/i, '').trim();
      const userMsg = {
        role: 'user',
        content: text,
        timestamp: Date.now()
      };
      session.messages.push(userMsg);
      chatTextarea.value = '';
      chatTextarea.style.height = 'auto';
      btnSend.disabled = true;

      const assistantMsg = {
        role: 'assistant',
        content: `Executed JavaScript code:\n\`\`\`javascript\n${codeToRun}\n\`\`\``,
        model: settings.selectedModel,
        timestamp: Date.now()
      };
      session.messages.push(assistantMsg);
      session.updatedAt = Date.now();
      await persistSessions();
      renderActiveSession();

      const lastPre = messagesInner.querySelector('.message-wrapper:last-child .code-block-wrapper');
      if (lastPre) {
        executeClientSideJs(codeToRun, lastPre);
      }
      return;
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

    // Check if user is asking for music generation (via mode or natural prompt)
    let musicPrompt = null;
    if (isMusicModeActive) {
      musicPrompt = text.replace(/^\/(?:music|song|beat|track|melody|soundtrack|audio)\s+/i, '').trim() || text;
    } else {
      musicPrompt = isMusicGenerationPrompt(text);
    }

    if (musicPrompt) {
      await handleMusicGeneration(session, musicPrompt, text);
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

      // Check if Web Search should be invoked
      let searchSources = null;
      let searchQueryUsed = '';
      const lastUserMsg = [...session.messages].reverse().find(m => m.role === 'user');
      const userText = lastUserMsg ? lastUserMsg.content : '';
      const isSearchIntent = pluginsState.webSearch || /^\/search\b/i.test(userText.trim()) || detectSearchIntent(userText);

      if (isSearchIntent && userText.trim()) {
        searchQueryUsed = userText.replace(/^\/search\s*/i, '').trim();
        assistantBubble.innerHTML = `
          <div class="tool-call-card tool-search-card">
            <div class="tool-call-header">
              <div class="tool-call-header-left">
                <span class="tool-call-icon">🌐</span>
                <span class="tool-call-title">Searching the web for: <strong>${escapeHtml(searchQueryUsed.substring(0, 45))}...</strong></span>
              </div>
              <span class="tool-call-badge" style="background:rgba(79,70,229,0.15);color:var(--accent-color);">Searching...</span>
            </div>
          </div>
          <span style="color: var(--text-muted); font-style: italic;">Grounding with verified real-time sources...</span>
        `;
        scrollToBottom();

        searchSources = await fetchLiveWebSearchResults(searchQueryUsed);

        if (searchSources && searchSources.length > 0) {
          systemPromptContent += `\n\n[REAL-TIME VERIFIED WEB SEARCH GROUNDING]\nThe user asked: "${searchQueryUsed}". Here are the latest verified search results:\n`;
          searchSources.forEach((s, idx) => {
            systemPromptContent += `[Source ${idx + 1}]: "${s.title}" (${s.url})\nSnippet: ${s.snippet}\n\n`;
          });
          systemPromptContent += `Instruction: Ground your response in these verified real-time facts. Cite numbers, names, and sources accurately where relevant.\n`;

          assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Synthesizing answer from grounded sources...</span>';
        } else {
          assistantBubble.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Thinking...</span>';
        }
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
      let streamRenderPending = false;
      let lastStreamRenderTime = 0;
      const STREAM_RENDER_INTERVAL_MS = 45; // Smooth ~22fps DOM updates to completely eliminate mobile UI blinking

      function flushStreamRender() {
        streamRenderPending = false;
        lastStreamRenderTime = performance.now();
        if (accumulatedText) {
          assistantBubble.innerHTML = formatMarkdown(accumulatedText);
        }
        if (liveReasoningContent && accumulatedReasoning) {
          liveReasoningContent.textContent = accumulatedReasoning;
        }
        scrollToBottom();
      }

      function scheduleStreamRender() {
        if (streamRenderPending) return;
        const now = performance.now();
        const elapsed = now - lastStreamRenderTime;
        if (elapsed >= STREAM_RENDER_INTERVAL_MS) {
          streamRenderPending = true;
          requestAnimationFrame(flushStreamRender);
        } else {
          streamRenderPending = true;
          setTimeout(() => {
            requestAnimationFrame(flushStreamRender);
          }, STREAM_RENDER_INTERVAL_MS - elapsed);
        }
      }

      for await (const part of responseStream) {
        if (part?.type === 'text' || part?.text) {
          accumulatedText += (part.text || '');
          scheduleStreamRender();
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
            scheduleStreamRender();
          }
        }

        if (part?.type === 'error') {
          throw new Error(part.message || 'Streaming error');
        }
      }

      // Final synchronous flush and attach code handlers once generation is complete
      flushStreamRender();
      attachCodeCopyHandlers(assistantBubble);

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

      // Render search sources card if web search was executed
      if (searchSources && searchSources.length > 0) {
        assistantMsg.searchSources = searchSources;
        assistantMsg.searchQuery = searchQueryUsed;
        const searchCard = createSearchSourcesCard(searchSources, searchQueryUsed);
        assistantContainer.insertBefore(searchCard, assistantBubble);
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

  if (btnAttach) {
    btnAttach.addEventListener('click', () => fileInput?.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleAttachmentFile(file);
      fileInput.value = '';
    });
  }

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
    if (e.key === 'Enter') {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
      if (isMobile) {
        // On mobile devices, Enter inserts a new line; message is sent via the send button
        return;
      }
      if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
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

  btnScrollBottom.addEventListener('click', () => {
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
  });

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
    sidebar.classList.add('mobile-open');
    updateSidebarToggleUI(false);
    if (window.innerWidth <= 768 && sidebarBackdrop) {
      sidebarBackdrop.classList.add('active');
    }
  }

  function closeSidebar() {
    sidebar.classList.add('closed');
    sidebar.classList.remove('mobile-open');
    updateSidebarToggleUI(true);
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.remove('active');
    }
  }

  function closeSidebarIfMobile() {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    const isClosed = isMobile
      ? !sidebar.classList.contains('mobile-open')
      : sidebar.classList.contains('closed');
    if (isClosed) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  // Sync initial state: on mobile, start strictly closed; on desktop, honor class
  if (sidebar) {
    if (window.innerWidth <= 768) {
      closeSidebar();
    } else {
      updateSidebarToggleUI(sidebar.classList.contains('closed'));
    }
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

  // Artifact Controls Event Listeners
  if (btnCloseArtifacts) {
    btnCloseArtifacts.addEventListener('click', closeArtifact);
  }

  if (btnPublishArtifact) {
    btnPublishArtifact.addEventListener('click', publishCurrentArtifact);
  }

  if (btnArtifactReload) {
    btnArtifactReload.addEventListener('click', () => {
      if (artifactsSandboxFrame && currentArtifact.code) {
        artifactsSandboxFrame.srcdoc = prepareExecutableHtml(currentArtifact.code, currentArtifact.lang);
        showToast('App reloaded');
      }
    });
  }

  if (btnArtifactVpDesktop) {
    btnArtifactVpDesktop.addEventListener('click', () => {
      btnArtifactVpDesktop.classList.add('active');
      if (btnArtifactVpMobile) btnArtifactVpMobile.classList.remove('active');
      if (artifactsFrameContainer) artifactsFrameContainer.classList.remove('viewport-mobile');
    });
  }

  if (btnArtifactVpMobile) {
    btnArtifactVpMobile.addEventListener('click', () => {
      btnArtifactVpMobile.classList.add('active');
      if (btnArtifactVpDesktop) btnArtifactVpDesktop.classList.remove('active');
      if (artifactsFrameContainer) artifactsFrameContainer.classList.add('viewport-mobile');
    });
  }

  if (btnCopyPublishedLink) {
    btnCopyPublishedLink.addEventListener('click', () => {
      if (currentArtifact.publishedUrl) {
        navigator.clipboard.writeText(currentArtifact.publishedUrl);
        showToast('Live link copied to clipboard!');
      }
    });
  }

  // Custom App Sharing
  if (btnStudioShare) {
    btnStudioShare.addEventListener('click', () => {
      if (editingProjectId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?app=${encodeURIComponent(editingProjectId)}`;
        navigator.clipboard.writeText(shareUrl);
        showToast('🔗 Custom App link copied to clipboard!');
      } else {
        showToast('Please save your app before sharing.');
      }
    });
  }

  // Plugins Controls Event Listeners
  if (pillToolSearch) pillToolSearch.addEventListener('click', toggleWebSearch);
  if (toolToggleSearch) {
    toolToggleSearch.addEventListener('click', () => {
      toggleWebSearch();
      closeToolsPopover();
    });
  }
  if (togglePluginSearch) {
    togglePluginSearch.addEventListener('change', (e) => {
      pluginsState.webSearch = e.target.checked;
      savePluginsState();
    });
  }

  if (pillToolCode) pillToolCode.addEventListener('click', toggleCodeRunner);
  if (toolToggleCode) {
    toolToggleCode.addEventListener('click', () => {
      toggleCodeRunner();
      closeToolsPopover();
    });
  }
  if (togglePluginCode) {
    togglePluginCode.addEventListener('change', (e) => {
      pluginsState.codeRunner = e.target.checked;
      savePluginsState();
    });
  }

  if (pillManagePlugins) {
    pillManagePlugins.addEventListener('click', () => openModal(pluginsModal));
  }
  if (btnClosePluginsModal) {
    btnClosePluginsModal.addEventListener('click', () => closeModal(pluginsModal));
  }
  if (btnClosePluginsModalFooter) {
    btnClosePluginsModalFooter.addEventListener('click', () => closeModal(pluginsModal));
  }

  // Studio Form Field Builder Listener
  if (btnAddFormField) {
    btnAddFormField.addEventListener('click', () => {
      editingProjectFormFields.push({ label: '', placeholder: '', type: 'text' });
      renderAppFormFieldsBuilder();
    });
  }

  [modelModal, settingsModal, pluginsModal, exploreAppsModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (artifactsPane && artifactsPane.style.display !== 'none') {
        closeArtifact();
        return;
      }
      if (pluginsModal && pluginsModal.classList.contains('active')) {
        closeModal(pluginsModal);
        return;
      }
      if (exploreAppsModal && exploreAppsModal.classList.contains('active')) {
        closeModal(exploreAppsModal);
        return;
      }
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
  loadPluginsState();
  initExploreAppsModal();
  loadSessionsFromLocal();
  handleUrlAppRouting();
  initPuter();

})();
