/**
 * Omni Chat — Universal Multi-Model Chat
 * Built with Puter.js (docs.puter.com/llms.txt)
 */

(function () {
  'use strict';

  // --- Constants & Presets ---
  const APP_VERSION = 'v1.2.0';
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
  let expandedSandboxIds = new Set();
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
  const sandboxSidebarSection = document.getElementById('sandbox-sidebar-section');
  const btnSidebarCreateSandbox = document.getElementById('btn-sidebar-create-sandbox');
  const sidebarSandboxList = document.getElementById('sidebar-sandbox-list');
  const sidebarSandboxCountBadge = document.getElementById('sidebar-sandbox-count-badge');
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
  const projectModalFileCount = document.getElementById('project-modal-file-count');
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
  const btnArtifactGithub = document.getElementById('btn-artifact-github');
  const artifactsGithubPanel = document.getElementById('artifacts-github-panel');
  const btnCloseGithubPanel = document.getElementById('btn-close-github-panel');
  const githubRepoInput = document.getElementById('github-repo-input');
  const btnFetchGithubRepo = document.getElementById('btn-fetch-github-repo');
  const artifactsPromptInput = document.getElementById('artifacts-prompt-input');
  const btnSubmitArtifactPrompt = document.getElementById('btn-submit-artifact-prompt');
  const artifactsStatusIndicator = document.getElementById('artifacts-status-indicator');
  const artifactsStatusText = document.getElementById('artifacts-status-text');
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
  const pluginsList = document.getElementById('plugins-list');
  const pluginsCategoriesBar = document.getElementById('plugins-categories-bar');
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

  const PLUGINS_CATALOG = [
    {
      id: 'webSearch',
      name: 'Live Web Search Grounding',
      icon: '🌐',
      category: 'Research',
      desc: 'Grounds AI responses in real-time web facts, news, and clickable citations via DuckDuckGo.',
      installed: true,
      enabled: false
    },
    {
      id: 'codeRunner',
      name: 'JavaScript Code Runner',
      icon: '⚡',
      category: 'Developer',
      desc: 'Client-side isolated execution sandbox for JavaScript algorithms, math, and string transformations.',
      installed: true,
      enabled: false
    },
    {
      id: 'githubExplorer',
      name: 'GitHub Repo & Code Explorer',
      icon: '🐙',
      category: 'Developer',
      desc: 'Inspect public repositories, view file trees, and load remote code into chat and the Web Sandbox.',
      installed: true,
      enabled: true
    },
    {
      id: 'chartVisualizer',
      name: 'Chart & Data Visualizer',
      icon: '📊',
      category: 'Analytics',
      desc: 'Automatically visualizes structured datasets, financial numbers, and matrices using Chart.js.',
      installed: true,
      enabled: true
    },
    {
      id: 'mathSolver',
      name: 'LaTeX & Scientific Math Solver',
      icon: '🧮',
      category: 'Developer',
      desc: 'Step-by-step mathematical reasoning formatted with crisp KaTeX and LaTeX equation rendering.',
      installed: false,
      enabled: false
    },
    {
      id: 'uiComponents',
      name: 'Tailwind & UI Component Studio',
      icon: '🎨',
      category: 'Developer',
      desc: 'Generates production-grade Tailwind CSS, glassmorphic cards, and responsive components.',
      installed: false,
      enabled: false
    },
    {
      id: 'seoAuditor',
      name: 'SEO & Web Meta Auditor',
      icon: '🔍',
      category: 'Research',
      desc: 'Audits web page structure, analyzes Open Graph meta tags, and generates schema.org JSON-LD.',
      installed: false,
      enabled: false
    },
    {
      id: 'docInspector',
      name: 'Document & PDF Deep Inspector',
      icon: '📄',
      category: 'Analytics',
      desc: 'Extracts tabular data, key clauses, summaries, and hierarchies from uploaded documents.',
      installed: false,
      enabled: false
    }
  ];

  let pluginsState = {
    webSearch: false,
    codeRunner: false,
    githubExplorer: true,
    chartVisualizer: true,
    mathSolver: false,
    uiComponents: false,
    seoAuditor: false,
    docInspector: false
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
      await syncSandboxHistoryFromCloud();
      renderSidebarSandboxAppsList();
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
    renderSidebarSandboxAppsList();
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
    if (sandboxStudioView) sandboxStudioView.style.display = 'none';

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
      if (studioHeaderTitle) studioHeaderTitle.textContent = 'Create Custom AI App';
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
    if (chatTopbar) chatTopbar.style.display = '';
    if (messagesContainer) messagesContainer.style.display = '';
    if (inputAreaWrapper) inputAreaWrapper.style.display = '';
    if (btnScrollBottom) btnScrollBottom.style.display = '';
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
    if (sandboxStudioView && sandboxStudioView.style.display !== 'none') {
      closeSandboxStudio();
    }
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
    if (sandboxStudioView && sandboxStudioView.style.display !== 'none') {
      closeSandboxStudio();
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

    // Safe in-memory storage shim and error listener to prevent sandbox crashes
    const runtimeShims = `<script>
(function() {
  // In-Memory Storage Shim for Sandboxed iframes
  try {
    window.localStorage && window.localStorage.getItem('__test');
  } catch (e) {
    var _memStore = {};
    window.localStorage = {
      getItem: function(k) { return _memStore.hasOwnProperty(k) ? _memStore[k] : null; },
      setItem: function(k, v) { _memStore[k] = String(v); },
      removeItem: function(k) { delete _memStore[k]; },
      clear: function() { _memStore = {}; },
      key: function(i) { return Object.keys(_memStore)[i] || null; },
      get length() { return Object.keys(_memStore).length; }
    };
  }
  try {
    window.sessionStorage && window.sessionStorage.getItem('__test');
  } catch (e) {
    var _sessStore = {};
    window.sessionStorage = {
      getItem: function(k) { return _sessStore.hasOwnProperty(k) ? _sessStore[k] : null; },
      setItem: function(k, v) { _sessStore[k] = String(v); },
      removeItem: function(k) { delete _sessStore[k]; },
      clear: function() { _sessStore = {}; },
      key: function(i) { return Object.keys(_sessStore)[i] || null; },
      get length() { return Object.keys(_sessStore).length; }
    };
  }
  // Error listener to catch and report runtime crashes visually
  window.addEventListener('error', function(err) {
    console.warn('[Sandbox Runtime Error]:', err.message);
    if (!document.body || document.body.children.length === 0 || document.body.offsetHeight < 30) {
      var box = document.getElementById('__omni_err_box') || document.createElement('div');
      box.id = '__omni_err_box';
      box.style = 'position:fixed;top:10px;left:10px;right:10px;background:#7f1d1d;color:#fecaca;padding:10px 14px;border-radius:8px;font-family:sans-serif;font-size:12px;z-index:999999;border:1px solid #ef4444;box-shadow:0 4px 14px rgba(0,0,0,0.4);';
      box.innerHTML = '<strong>App Error:</strong> ' + (err.message || 'Script error');
      if (document.body) document.body.appendChild(box);
    }
  });
})();
<\/script>`;

    let processed = trimmed;

    // If pure HTML fragment without full doctype/html envelope, wrap properly
    if (!/<!DOCTYPE\s+html/i.test(processed) && !/<html[\s>]/i.test(processed)) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    html, body { min-height: 100vh; margin: 0; }
  </style>
  ${runtimeShims}
</head>
<body>
  ${processed}
</body>
</html>`;
    }

    // Ensure viewport meta tag exists
    if (!/<meta[^>]+viewport/i.test(processed)) {
      if (/<head[\s>]/i.test(processed)) {
        processed = processed.replace(/<head[\s>]/i, '$&\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
      } else if (/<html[\s>]/i.test(processed)) {
        processed = processed.replace(/<html[\s>]/i, '$&\n<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>');
      }
    }

    // Inject runtime shims into head or before body
    if (/<head[\s>]/i.test(processed)) {
      processed = processed.replace(/<head[\s>]/i, '$&\n  ' + runtimeShims);
    } else if (/<body[\s>]/i.test(processed)) {
      processed = processed.replace(/<body[\s>]/i, runtimeShims + '\n$&');
    } else {
      processed = runtimeShims + '\n' + processed;
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

  // --- In-Sandbox Generative Web App Builder & GitHub Integration ---
  const STARTER_TEMPLATES = {
    arcade: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Neon Breakout Arcade</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #090a0f; color: #fff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    #score-board { margin-bottom: 12px; font-size: 1.15rem; font-weight: bold; color: #00f2fe; }
    canvas { background: #13151f; border: 2px solid #00f2fe; border-radius: 12px; box-shadow: 0 0 25px rgba(0, 242, 254, 0.25); }
    .btn-restart { margin-top: 14px; padding: 7px 18px; background: #00f2fe; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div id="score-board">Score: <span id="score">0</span> | Lives: <span id="lives">3</span></div>
  <canvas id="gameCanvas" width="460" height="300"></canvas>
  <button class="btn-restart" onclick="restartGame()">Restart Game</button>
  <script>
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    let ballRadius = 6, x = canvas.width/2, y = canvas.height-30, dx = 2.5, dy = -2.5;
    let paddleHeight = 10, paddleWidth = 75, paddleX = (canvas.width-paddleWidth)/2;
    let rightPressed = false, leftPressed = false, score = 0, lives = 3;
    const brickRowCount = 4, brickColumnCount = 6, brickWidth = 62, brickHeight = 15, brickPadding = 10, brickOffsetTop = 25, brickOffsetLeft = 18;
    let bricks = [];
    function initBricks() {
      bricks = [];
      for(let c=0; c<brickColumnCount; c++) {
        bricks[c] = [];
        for(let r=0; r<brickRowCount; r++) bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }
    initBricks();
    document.addEventListener("keydown", (e) => { if(e.key === "Right" || e.key === "ArrowRight") rightPressed = true; else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = true; });
    document.addEventListener("keyup", (e) => { if(e.key === "Right" || e.key === "ArrowRight") rightPressed = false; else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = false; });
    function collisionDetection() {
      for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
          let b = bricks[c][r];
          if(b.status === 1) {
            if(x > b.x && x < b.x+brickWidth && y > b.y && y < b.y+brickHeight) {
              dy = -dy; b.status = 0; score++;
              document.getElementById("score").textContent = score;
              if(score === brickRowCount*brickColumnCount) { alert("🎉 YOU WIN!"); restartGame(); }
            }
          }
        }
      }
    }
    function drawBall() { ctx.beginPath(); ctx.arc(x, y, ballRadius, 0, Math.PI*2); ctx.fillStyle = "#ff007f"; ctx.fill(); ctx.closePath(); }
    function drawPaddle() { ctx.beginPath(); ctx.rect(paddleX, canvas.height-paddleHeight-2, paddleWidth, paddleHeight); ctx.fillStyle = "#00f2fe"; ctx.fill(); ctx.closePath(); }
    function drawBricks() {
      const colors = ["#ff007f", "#9d00ff", "#00f2fe", "#00ff87"];
      for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
          if(bricks[c][r].status === 1) {
            let brickX = (c*(brickWidth+brickPadding))+brickOffsetLeft;
            let brickY = (r*(brickHeight+brickPadding))+brickOffsetTop;
            bricks[c][r].x = brickX; bricks[c][r].y = brickY;
            ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight);
            ctx.fillStyle = colors[r % colors.length]; ctx.fill(); ctx.closePath();
          }
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks(); drawBall(); drawPaddle(); collisionDetection();
      if(x + dx > canvas.width-ballRadius || x + dx < ballRadius) dx = -dx;
      if(y + dy < ballRadius) dy = -dy;
      else if(y + dy > canvas.height-ballRadius-paddleHeight) {
        if(x > paddleX && x < paddleX + paddleWidth) dy = -dy;
        else {
          lives--; document.getElementById("lives").textContent = lives;
          if(!lives) { alert("💥 GAME OVER"); restartGame(); return; }
          else { x = canvas.width/2; y = canvas.height-30; dx = 2.5; dy = -2.5; paddleX = (canvas.width-paddleWidth)/2; }
        }
      }
      if(rightPressed && paddleX < canvas.width-paddleWidth) paddleX += 5;
      else if(leftPressed && paddleX > 0) paddleX -= 5;
      x += dx; y += dy; requestAnimationFrame(draw);
    }
    function restartGame() { score = 0; lives = 3; document.getElementById("score").textContent = "0"; document.getElementById("lives").textContent = "3"; initBricks(); x = canvas.width/2; y = canvas.height-30; dx = 2.5; dy = -2.5; }
    draw();
  <\/script>
</body>
</html>`,

    dashboard: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Omni Analytics Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="flex justify-between items-center pb-4 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">SaaS Executive Dashboard</h1>
        <p class="text-sm text-slate-400">Live operational overview & conversion metrics</p>
      </div>
      <button onclick="refreshData()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition">Refresh Data</button>
    </header>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Monthly Active Users</div>
        <div class="text-2xl font-bold mt-1 text-blue-400" id="stat-users">128,450</div>
        <div class="text-xs text-emerald-400 mt-2">↑ 14.8% from last month</div>
      </div>
      <div class="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Monthly Recurring Revenue</div>
        <div class="text-2xl font-bold mt-1 text-emerald-400" id="stat-mrr">$48,920</div>
        <div class="text-xs text-emerald-400 mt-2">↑ 22.4% ARR target pace</div>
      </div>
      <div class="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Avg Latency (Edge Workers)</div>
        <div class="text-2xl font-bold mt-1 text-purple-400" id="stat-latency">18ms</div>
        <div class="text-xs text-slate-400 mt-2">Global 99.98% uptime SLA</div>
      </div>
    </div>
    <div class="p-5 bg-slate-800 border border-slate-700 rounded-xl space-y-4">
      <h2 class="text-base font-semibold">Weekly Volume Breakdown</h2>
      <div class="h-32 flex items-end gap-3 pt-4 border-b border-slate-700">
        <div class="flex-1 bg-indigo-500 rounded-t h-[45%] flex items-center justify-center text-xs font-bold">M</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[65%] flex items-center justify-center text-xs font-bold">T</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[80%] flex items-center justify-center text-xs font-bold">W</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[55%] flex items-center justify-center text-xs font-bold">T</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[95%] flex items-center justify-center text-xs font-bold">F</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[40%] flex items-center justify-center text-xs font-bold">S</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[30%] flex items-center justify-center text-xs font-bold">S</div>
      </div>
    </div>
  </div>
  <script>
    function refreshData() {
      const u = Math.floor(120000 + Math.random() * 20000);
      const m = Math.floor(45000 + Math.random() * 8000);
      document.getElementById('stat-users').textContent = u.toLocaleString();
      document.getElementById('stat-mrr').textContent = '$' + m.toLocaleString();
    }
  <\/script>
</body>
</html>`,

    kanban: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Minimalist Kanban</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 1.5rem; }
    h1 { font-size: 1.3rem; margin-bottom: 1.25rem; color: #38bdf8; }
    .board { display: flex; gap: 1rem; overflow-x: auto; }
    .column { flex: 1; min-width: 220px; background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem; }
    .col-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem; color: #94a3b8; }
    .task { background: #334155; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; font-size: 0.85rem; cursor: pointer; }
    .task:hover { background: #475569; }
    .add-btn { width: 100%; padding: 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>📋 Agile Kanban Workspace</h1>
  <div class="board">
    <div class="column" id="col-todo">
      <div class="col-title">To Do</div>
      <div class="task" onclick="moveTask(this, 'col-doing')">Implement Search Grounding</div>
      <div class="task" onclick="moveTask(this, 'col-doing')">Add GitHub Sandbox Bridge</div>
      <button class="add-btn" onclick="addTask('col-todo')">+ Add Task</button>
    </div>
    <div class="column" id="col-doing">
      <div class="col-title">In Progress</div>
      <div class="task" onclick="moveTask(this, 'col-done')">Interactive Webapp Sandbox</div>
    </div>
    <div class="column" id="col-done">
      <div class="col-title">Done</div>
      <div class="task">Release notes v1.1.0</div>
    </div>
  </div>
  <script>
    function moveTask(el, targetColId) {
      document.getElementById(targetColId).insertBefore(el, document.getElementById(targetColId).querySelector('.add-btn'));
    }
    function addTask(colId) {
      const text = prompt('Task title:');
      if (!text) return;
      const t = document.createElement('div');
      t.className = 'task';
      t.textContent = text;
      t.onclick = function() { moveTask(this, 'col-doing'); };
      document.getElementById(colId).insertBefore(t, document.getElementById(colId).querySelector('.add-btn'));
    }
  <\/script>
</body>
</html>`,

    pomodoro: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Focus Pomodoro</title>
  <style>
    body { font-family: sans-serif; background: #111827; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .timer { font-size: 5rem; font-weight: 800; color: #ef4444; font-variant-numeric: tabular-nums; margin-bottom: 1.5rem; }
    .btn-row { display: flex; gap: 0.75rem; }
    button { padding: 0.75rem 1.5rem; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: bold; cursor: pointer; }
    .btn-start { background: #ef4444; color: white; }
    .btn-reset { background: #374151; color: #d1d5db; }
  </style>
</head>
<body>
  <div class="timer" id="time">25:00</div>
  <div class="btn-row">
    <button class="btn-start" id="btn-toggle" onclick="toggle()">Start Focus</button>
    <button class="btn-reset" onclick="reset()">Reset</button>
  </div>
  <script>
    let sec = 1500, active = false, interval = null;
    function format(s) { const m = Math.floor(s/60); const rem = s%60; return (m<10?'0':'')+m+':'+(rem<10?'0':'')+rem; }
    function toggle() {
      active = !active;
      document.getElementById('btn-toggle').textContent = active ? 'Pause' : 'Start Focus';
      if (active) {
        interval = setInterval(() => {
          if (sec > 0) { sec--; document.getElementById('time').textContent = format(sec); }
          else { clearInterval(interval); active = false; alert('Session complete!'); }
        }, 1000);
      } else { clearInterval(interval); }
    }
    function reset() { clearInterval(interval); active = false; sec = 1500; document.getElementById('time').textContent = '25:00'; document.getElementById('btn-toggle').textContent = 'Start Focus'; }
  <\/script>
</body>
</html>`
  };

  async function fetchFromGitHub(query) {
    let url = (query || '').trim();
    if (!url) {
      showToast('Please enter a GitHub repository or file URL.');
      return;
    }

    showToast('Fetching code from GitHub...');
    if (url.startsWith('https://github.com/')) {
      const parts = url.replace('https://github.com/', '').split('/');
      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1];
        const path = parts.slice(2).join('/') || 'index.html';
        url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path.replace(/^blob\/main\//, '')}`;
      }
    } else if (!url.startsWith('http')) {
      const parts = url.split('/');
      if (parts.length >= 2) {
        url = `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/main/index.html`;
      }
    }

    try {
      let res = await fetch(url);
      if (!res.ok && url.includes('/main/')) {
        const masterUrl = url.replace('/main/', '/master/');
        res = await fetch(masterUrl);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const code = await res.text();
      openArtifact('GitHub: ' + (url.split('/').slice(-2).join('/') || 'App'), code, 'html');
      if (artifactsGithubPanel) artifactsGithubPanel.style.display = 'none';
      showToast('🎉 GitHub application loaded into Sandbox!');
    } catch (err) {
      console.error('GitHub fetch failed:', err);
      showToast('Could not load GitHub URL: ' + (err.message || 'File not found'));
    }
  }

  async function handleArtifactPromptSubmit() {
    const prompt = artifactsPromptInput?.value?.trim();
    if (!prompt) return;

    artifactsPromptInput.value = '';
    if (artifactsStatusIndicator) {
      artifactsStatusIndicator.style.display = 'flex';
      if (artifactsStatusText) artifactsStatusText.textContent = `AI is coding: "${prompt.slice(0, 42)}..."`;
    }
    if (btnSubmitArtifactPrompt) btnSubmitArtifactPrompt.disabled = true;

    try {
      const currentCode = currentArtifact.code || DEFAULT_SANDBOX_STARTER;
      const systemPrompt = `You are an expert Principal Frontend Web Architect.
The user wants you to create or modify this interactive web application based on this prompt: "${prompt}".

Current Web Application Code:
${currentCode}

Requirements:
1. Return ONLY the complete, production-ready, single-file HTML code containing all HTML, CSS (or modern Tailwind CSS via <script src="https://cdn.tailwindcss.com"></script>), and JavaScript.
2. Ensure all UI interactions, animations, buttons, and state management work smoothly and without external broken dependencies.
3. Output the raw code inside a single \`\`\`html ... \`\`\` block. Do NOT include conversational filler, introductory markdown, or explanations.`;

      const response = await puter.ai.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        { model: settings.selectedModel || DEFAULT_MODEL, temperature: 0.7 }
      );

      let rawCode = typeof response === 'string' ? response : (response?.message?.content || response?.text || '');
      if (!rawCode && response?.choices) {
        rawCode = response.choices[0]?.message?.content || '';
      }

      const codeMatch = rawCode.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
      const finalCode = codeMatch ? codeMatch[1].trim() : rawCode.trim();

      if (finalCode) {
        currentArtifact.code = finalCode;
        currentArtifact.title = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
        if (artifactsTitle) artifactsTitle.textContent = currentArtifact.title;
        artifactsSandboxFrame.srcdoc = prepareExecutableHtml(finalCode, 'html');
        showToast('✨ Web app updated successfully!');
      }
    } catch (err) {
      console.error('Artifact generation error:', err);
      showToast('Failed to generate web app: ' + (err.message || 'Unknown error'));
    } finally {
      if (artifactsStatusIndicator) artifactsStatusIndicator.style.display = 'none';
      if (btnSubmitArtifactPrompt) btnSubmitArtifactPrompt.disabled = false;
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

  // --- Plugins State & Marketplace Management ---
  let activePluginCategory = 'all';

  function loadPluginsState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLUGINS);
      if (saved) {
        const parsed = JSON.parse(saved);
        pluginsState = Object.assign(pluginsState, parsed);
        PLUGINS_CATALOG.forEach(p => {
          if (parsed[p.id] !== undefined) {
            p.enabled = !!parsed[p.id];
            p.installed = true;
          }
        });
      }
    } catch (_) {}
    updatePluginsUI();
    renderPluginsMarketplace(activePluginCategory);
  }

  function savePluginsState() {
    try {
      localStorage.setItem(STORAGE_KEY_PLUGINS, JSON.stringify(pluginsState));
      if (typeof puter !== 'undefined' && puter.kv) {
        puter.kv.set('omni_chat_plugins_state', JSON.stringify(pluginsState)).catch(() => {});
      }
    } catch (_) {}
    updatePluginsUI();
    renderPluginsMarketplace(activePluginCategory);
  }

  function renderPluginsMarketplace(category = 'all') {
    activePluginCategory = category;
    if (!pluginsList) return;
    pluginsList.innerHTML = '';

    const filtered = PLUGINS_CATALOG.filter(plugin => {
      if (category === 'all') return true;
      if (category === 'installed') return !!plugin.installed;
      return plugin.category === category;
    });

    if (filtered.length === 0) {
      pluginsList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
          No plugins found in this category.
        </div>
      `;
      return;
    }

    filtered.forEach(plugin => {
      const isInstalled = !!plugin.installed;
      const isEnabled = !!plugin.enabled;

      const card = document.createElement('div');
      card.className = 'plugin-card';
      card.innerHTML = `
        <div class="plugin-card-left">
          <span class="plugin-card-icon">${plugin.icon}</span>
          <div class="plugin-card-info">
            <div class="plugin-card-title-row">
              <strong>${escapeHtml(plugin.name)}</strong>
              <span class="plugin-badge-builtin" style="font-size:0.7rem;">${escapeHtml(plugin.category)}</span>
              ${isInstalled ? `<span class="plugin-badge-active" style="font-size:0.7rem;background:${isEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)'};color:${isEnabled ? 'var(--success-color, #10b981)' : 'var(--text-muted)'};">${isEnabled ? 'Active' : 'Installed'}</span>` : ''}
            </div>
            <p class="plugin-card-desc">${escapeHtml(plugin.desc)}</p>
          </div>
        </div>
        <div class="plugin-card-action" style="display:flex;align-items:center;gap:0.6rem;">
          ${isInstalled ? `
            <label class="toggle-switch" title="${isEnabled ? 'Disable' : 'Enable'} plugin">
              <input type="checkbox" class="plugin-toggle-checkbox" data-plugin-id="${plugin.id}" ${isEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <button type="button" class="icon-btn-xs btn-uninstall-plugin" data-plugin-id="${plugin.id}" title="Uninstall Plugin" style="color:var(--text-muted);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : `
            <button type="button" class="btn-primary btn-sm btn-install-plugin" data-plugin-id="${plugin.id}">
              + Install
            </button>
          `}
        </div>
      `;

      // Toggle switch
      const toggle = card.querySelector('.plugin-toggle-checkbox');
      if (toggle) {
        toggle.addEventListener('change', (e) => {
          plugin.enabled = e.target.checked;
          pluginsState[plugin.id] = plugin.enabled;
          savePluginsState();
          showToast(`${plugin.icon} ${plugin.name} ${plugin.enabled ? 'activated' : 'deactivated'}`);
        });
      }

      // Install button
      const btnInstall = card.querySelector('.btn-install-plugin');
      if (btnInstall) {
        btnInstall.addEventListener('click', () => {
          plugin.installed = true;
          plugin.enabled = true;
          pluginsState[plugin.id] = true;
          savePluginsState();
          showToast(`🎉 ${plugin.icon} ${plugin.name} installed & enabled!`);
        });
      }

      // Uninstall button
      const btnUninstall = card.querySelector('.btn-uninstall-plugin');
      if (btnUninstall) {
        btnUninstall.addEventListener('click', () => {
          plugin.installed = false;
          plugin.enabled = false;
          pluginsState[plugin.id] = false;
          savePluginsState();
          showToast(`${plugin.icon} ${plugin.name} uninstalled.`);
        });
      }

      pluginsList.appendChild(card);
    });
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

    // Code Runner
    if (pillToolCode) {
      pillToolCode.classList.toggle('active', !!pluginsState.codeRunner);
      const status = pillToolCode.querySelector('.tool-pill-status');
      if (status) status.textContent = pluginsState.codeRunner ? 'ON' : 'OFF';
    }
    if (toolToggleCode) {
      if (toolBadgeCode) toolBadgeCode.style.display = pluginsState.codeRunner ? 'inline-flex' : 'none';
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
    if (!modal) return;
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('active');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.style.display = 'none';
      }
    }, 200);
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

  const btnArtifactToStudio = document.getElementById('btn-artifact-to-studio');
  if (btnArtifactToStudio) {
    btnArtifactToStudio.addEventListener('click', () => {
      if (currentArtifact && currentArtifact.code) {
        const art = { ...currentArtifact };
        closeArtifact();
        openSandboxStudio({
          title: art.title,
          code: art.code,
          prompt: `Opened from artifact: ${art.title}`
        });
      }
    });
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

  const DEFAULT_SANDBOX_STARTER = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Omni Sandbox App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 1.25rem;
      padding: 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.6rem; margin-bottom: 0.5rem; font-weight: 700; }
    p { color: #94a3b8; font-size: 0.92rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .counter-display {
      font-size: 3rem;
      font-weight: 800;
      color: #818cf8;
      margin-bottom: 1.25rem;
      font-variant-numeric: tabular-nums;
    }
    .btn-row { display: flex; gap: 0.75rem; justify-content: center; }
    button {
      padding: 0.7rem 1.25rem;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    button:hover { background: #4338ca; transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    .btn-reset { background: rgba(255, 255, 255, 0.1); color: #cbd5e1; }
    .btn-reset:hover { background: rgba(255, 255, 255, 0.2); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">⚡ Omni Live Sandbox</div>
    <h1>Interactive Web App</h1>
    <p>Ask Omni Chat to create any game, dashboard, or tool. Preview it live here or publish it with 1 click to Puter cloud!</p>
    <div class="counter-display" id="count">0</div>
    <div class="btn-row">
      <button id="btn-inc">+ Click Me</button>
      <button id="btn-reset" class="btn-reset">Reset</button>
    </div>
  </div>
  <script>
    let n = 0;
    const countEl = document.getElementById('count');
    document.getElementById('btn-inc').addEventListener('click', () => {
      n++;
      countEl.textContent = n;
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      n = 0;
      countEl.textContent = n;
    });
  <\/script>
</body>
</html>`;

  const btnTopbarSandbox = document.getElementById('btn-topbar-sandbox');
  const sidebarBtnSandbox = document.getElementById('sidebar-btn-sandbox');
  const btnTopbarPlugins = document.getElementById('btn-topbar-plugins');
  const sidebarBtnPlugins = document.getElementById('sidebar-btn-plugins');
  const sidebarBtnExploreApps = document.getElementById('sidebar-btn-explore-apps');

  // --- Dedicated Web App Sandbox Studio (v0 / Bolt style) ---
  const sandboxStudioView = document.getElementById('sandbox-studio-view');
  const btnSandboxStudioBack = document.getElementById('btn-sandbox-studio-back');
  const sandboxHeaderTitle = document.getElementById('sandbox-header-title');
  const sandboxHeaderSubtitle = document.getElementById('sandbox-header-subtitle');
  const sandboxMobileToggle = document.getElementById('sandbox-mobile-toggle');
  const btnSandboxVpDesktop = document.getElementById('btn-sandbox-vp-desktop');
  const btnSandboxVpMobile = document.getElementById('btn-sandbox-vp-mobile');
  const btnSandboxReload = document.getElementById('btn-sandbox-reload');
  const btnSandboxGithubToggle = document.getElementById('btn-sandbox-github-toggle');
  const btnSandboxDownload = document.getElementById('btn-sandbox-download');
  const btnSandboxPublish = document.getElementById('btn-sandbox-publish');
  const btnSandboxNew = document.getElementById('btn-sandbox-new');

  const sandboxGithubDrawer = document.getElementById('sandbox-github-drawer');
  const btnCloseSandboxGithub = document.getElementById('btn-close-sandbox-github');
  const sandboxGithubInput = document.getElementById('sandbox-github-input');
  const btnSandboxGithubFetch = document.getElementById('btn-sandbox-github-fetch');

  const sandboxPublishedBanner = document.getElementById('sandbox-published-banner');
  const sandboxPublishedLink = document.getElementById('sandbox-published-link');
  const btnCopySandboxPublishedLink = document.getElementById('btn-copy-sandbox-published-link');

  const tabBtnSandboxChat = document.getElementById('tab-btn-sandbox-chat');
  const tabBtnSandboxCode = document.getElementById('tab-btn-sandbox-code');
  const sandboxFileCountBadge = document.getElementById('sandbox-file-count-badge');
  const sandboxPaneChat = document.getElementById('sandbox-pane-chat');
  const sandboxPaneCode = document.getElementById('sandbox-pane-code');

  const sandboxInitialState = document.getElementById('sandbox-initial-state');
  const sandboxInitialPrompt = document.getElementById('sandbox-initial-prompt');
  const btnSandboxGenerate = document.getElementById('btn-sandbox-generate');

  const sandboxActiveChat = document.getElementById('sandbox-active-chat');
  const sandboxMessagesThread = document.getElementById('sandbox-messages-thread');
  const sandboxIterationInput = document.getElementById('sandbox-iteration-input');
  const btnSandboxIterationSubmit = document.getElementById('btn-sandbox-iteration-submit');
  const sandboxStatusIndicator = document.getElementById('sandbox-status-indicator');
  const sandboxStatusText = document.getElementById('sandbox-status-text');

  const sandboxCodeFileTabs = document.getElementById('sandbox-code-file-tabs');
  const sandboxCodeStats = document.getElementById('sandbox-code-stats');
  const btnSandboxCopyCode = document.getElementById('btn-sandbox-copy-code');
  const sandboxCodeContent = document.getElementById('sandbox-code-content');
  const sandboxCodeEditor = document.getElementById('sandbox-code-editor');
  const sandboxEditorGutter = document.getElementById('sandbox-editor-gutter');
  const sandboxEditorStatus = document.getElementById('sandbox-editor-status');
  const btnSandboxRunCode = document.getElementById('btn-sandbox-run-code');
  const btnSandboxRevertCode = document.getElementById('btn-sandbox-revert-code');
  const btnSandboxCodeExport = document.getElementById('btn-sandbox-code-export');

  const btnSandboxHistoryToggle = document.getElementById('btn-sandbox-history-toggle');
  const sandboxHistoryCountBadge = document.getElementById('sandbox-history-count-badge');
  const sandboxHistoryDrawer = document.getElementById('sandbox-history-drawer');
  const btnCloseSandboxHistory = document.getElementById('btn-close-sandbox-history');
  const btnClearSandboxHistory = document.getElementById('btn-clear-sandbox-history');
  const sandboxHistorySearch = document.getElementById('sandbox-history-search');
  const sandboxHistoryList = document.getElementById('sandbox-history-list');
  const historyTotalCount = document.getElementById('history-total-count');

  const sandboxRecentBuildsSection = document.getElementById('sandbox-recent-builds-section');
  const sandboxRecentBuildsGrid = document.getElementById('sandbox-recent-builds-grid');
  const btnInitialViewAllHistory = document.getElementById('btn-initial-view-all-history');

  const btnSandboxExportToggle = document.getElementById('btn-sandbox-export-toggle');
  const sandboxExportModal = document.getElementById('sandbox-export-modal');
  const btnCloseExportModal = document.getElementById('btn-close-export-modal');
  const btnCancelExportModal = document.getElementById('btn-cancel-export-modal');
  const exportAppTitle = document.getElementById('export-app-title');
  const exportAppMeta = document.getElementById('export-app-meta');
  const btnExportZip = document.getElementById('btn-export-zip');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnExportCodepen = document.getElementById('btn-export-codepen');
  const btnCopyHtmlPart = document.getElementById('btn-copy-html-part');
  const btnCopyCssPart = document.getElementById('btn-copy-css-part');
  const btnCopyJsPart = document.getElementById('btn-copy-js-part');
  const btnCopyAllPart = document.getElementById('btn-copy-all-part');

  const sandboxPreviewStandby = document.getElementById('sandbox-preview-standby');
  const sandboxPreviewFrameWrap = document.getElementById('sandbox-preview-frame-wrap');
  const sandboxStudioIframe = document.getElementById('sandbox-studio-iframe');

  const SANDBOX_HISTORY_STORAGE_KEY = 'omni_sandbox_history';
  let sandboxOriginalAiCode = '';
  let sandboxIsDirty = false;
  let activeExportApp = null;

  let currentSandboxApp = {
    id: '',
    title: '',
    prompt: '',
    code: '',
    activeFileTab: 'all',
    turns: [],
    publishedUrl: null
  };

  function openSandboxStudio(initialApp = null) {
    if (chatTopbar) chatTopbar.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (inputAreaWrapper) inputAreaWrapper.style.display = 'none';
    if (btnScrollBottom) btnScrollBottom.style.display = 'none';
    if (artifactsPane) artifactsPane.style.display = 'none';
    if (projectStudioView) projectStudioView.style.display = 'none';

    if (sandboxStudioView) {
      sandboxStudioView.style.display = 'flex';
    }

    renderSandboxHistoryBadge();
    renderSandboxRecentBuilds();

    if (initialApp && initialApp.code) {
      loadSandboxApp(initialApp.title || 'Web Application', initialApp.code, initialApp.prompt || '', initialApp.id || null, initialApp.turns || null);
    } else if (currentSandboxApp && currentSandboxApp.code) {
      renderSandboxStudioState();
    } else {
      // Clean initial state: NO default app!
      resetSandboxStudio();
    }
    renderSidebarSandboxAppsList();
  }

  function closeSandboxStudio() {
    if (sandboxStudioView) {
      sandboxStudioView.style.display = 'none';
    }
    if (chatTopbar) chatTopbar.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'flex';
    if (inputAreaWrapper) inputAreaWrapper.style.display = 'block';
    renderSidebarSandboxAppsList();
  }

  function resetSandboxStudio() {
    currentSandboxApp = {
      id: '',
      title: '',
      prompt: '',
      code: '',
      activeFileTab: 'all',
      turns: [],
      publishedUrl: null
    };
    sandboxOriginalAiCode = '';
    sandboxIsDirty = false;

    if (sandboxHeaderTitle) sandboxHeaderTitle.textContent = 'Web App Sandbox Studio';
    if (sandboxHeaderSubtitle) sandboxHeaderSubtitle.textContent = 'AI Codebase & Live Interactive Preview';

    if (sandboxInitialState) sandboxInitialState.style.display = 'flex';
    if (sandboxActiveChat) sandboxActiveChat.style.display = 'none';
    if (sandboxPreviewStandby) sandboxPreviewStandby.style.display = 'flex';
    if (sandboxPreviewFrameWrap) sandboxPreviewFrameWrap.style.display = 'none';
    if (sandboxPublishedBanner) sandboxPublishedBanner.style.display = 'none';
    if (sandboxGithubDrawer) sandboxGithubDrawer.style.display = 'none';
    if (sandboxHistoryDrawer) sandboxHistoryDrawer.style.display = 'none';

    if (sandboxStudioIframe) sandboxStudioIframe.srcdoc = '';
    if (sandboxInitialPrompt) sandboxInitialPrompt.value = '';
    if (sandboxMessagesThread) sandboxMessagesThread.innerHTML = '';
    if (sandboxCodeContent) sandboxCodeContent.textContent = '// Your generated codebase will appear here...';
    if (sandboxCodeEditor) sandboxCodeEditor.value = '';
    if (sandboxFileCountBadge) sandboxFileCountBadge.textContent = '0 files';
    if (sandboxCodeStats) sandboxCodeStats.textContent = '0 lines';

    renderSandboxHistoryBadge();
    renderSandboxRecentBuilds();
    renderSidebarSandboxAppsList();
    switchSandboxSubTab('chat');
  }

  function switchSandboxSubTab(tab) {
    if (tab === 'chat') {
      tabBtnSandboxChat?.classList.add('active');
      tabBtnSandboxCode?.classList.remove('active');
      if (sandboxPaneChat) sandboxPaneChat.style.display = 'flex';
      if (sandboxPaneCode) sandboxPaneCode.style.display = 'none';
    } else {
      tabBtnSandboxCode?.classList.add('active');
      tabBtnSandboxChat?.classList.remove('active');
      if (sandboxPaneChat) sandboxPaneChat.style.display = 'none';
      if (sandboxPaneCode) sandboxPaneCode.style.display = 'flex';
      renderSandboxCodeView();
    }
  }

  function loadSandboxApp(title, code, prompt = '', existingId = null, existingTurns = null) {
    currentSandboxApp.id = existingId || ('sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    currentSandboxApp.title = title || 'Interactive Web Application';
    currentSandboxApp.prompt = prompt || (existingTurns && existingTurns[0]?.text) || '';
    currentSandboxApp.code = code;
    currentSandboxApp.publishedUrl = null;
    sandboxOriginalAiCode = code;

    if (existingTurns && existingTurns.length > 0) {
      currentSandboxApp.turns = existingTurns;
    } else if (prompt && (!currentSandboxApp.turns || currentSandboxApp.turns.length === 0)) {
      currentSandboxApp.turns = [
        { sender: 'user', text: prompt },
        { sender: 'ai', text: `Generated **${currentSandboxApp.title}** with full responsive layout and interactivity.` }
      ];
    } else if (!currentSandboxApp.turns || currentSandboxApp.turns.length === 0) {
      currentSandboxApp.turns = [
        { sender: 'ai', text: `Loaded **${currentSandboxApp.title}** into Sandbox Studio.` }
      ];
    }

    saveSandboxAppToHistory(currentSandboxApp);
    renderSandboxStudioState();
  }

  function updateSandboxIframe(code) {
    if (!sandboxStudioIframe) return;
    const execHtml = prepareExecutableHtml(code, 'html');

    // 1. Assign srcdoc
    sandboxStudioIframe.srcdoc = execHtml;

    // 2. Also assign Blob URL for instant rendering across all browser engines
    try {
      const blob = new Blob([execHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      sandboxStudioIframe.src = blobUrl;
    } catch (e) {
      // Fallback relies on srcdoc
    }
  }

  function renderSandboxStudioState() {
    if (!currentSandboxApp.code) {
      resetSandboxStudio();
      return;
    }

    if (sandboxHeaderTitle) sandboxHeaderTitle.textContent = currentSandboxApp.title;
    if (sandboxHeaderSubtitle) sandboxHeaderSubtitle.textContent = 'Live Interactive Preview Active';

    if (sandboxInitialState) sandboxInitialState.style.display = 'none';
    if (sandboxActiveChat) sandboxActiveChat.style.display = 'flex';
    if (sandboxPreviewStandby) sandboxPreviewStandby.style.display = 'none';
    if (sandboxPreviewFrameWrap) sandboxPreviewFrameWrap.style.display = 'flex';

    if (sandboxStudioIframe) {
      updateSandboxIframe(currentSandboxApp.code);
    }

    renderSandboxMessages();
    renderSandboxCodeView();
  }

  function renderSandboxMessages() {
    if (!sandboxMessagesThread) return;
    sandboxMessagesThread.innerHTML = '';

    currentSandboxApp.turns.forEach(turn => {
      const bubble = document.createElement('div');
      bubble.className = `sandbox-chat-bubble ${turn.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;

      if (turn.sender === 'user') {
        bubble.textContent = turn.text;
      } else {
        const header = document.createElement('div');
        header.className = 'sandbox-building-header';
        header.style.marginBottom = '0.5rem';
        header.innerHTML = `
          <div class="sandbox-building-icon-wrap" style="width:24px;height:24px;font-size:0.75rem;background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.3);animation:none;">✓</div>
          <div class="sandbox-building-title" style="font-size:0.85rem;color:var(--text-primary);">${escapeHtml(currentSandboxApp.title || 'AI Web App Architect')}</div>
        `;
        bubble.appendChild(header);

        const textSpan = document.createElement('div');
        textSpan.innerHTML = formatMarkdown(turn.text);
        bubble.appendChild(textSpan);

        const fileBadge = document.createElement('div');
        fileBadge.className = 'sandbox-card-files';
        fileBadge.style.marginTop = '0.5rem';
        fileBadge.innerHTML = `
          <span class="sandbox-file-generation-badge">📄 index.html</span>
          <span class="sandbox-file-generation-badge">🎨 style.css</span>
          <span class="sandbox-file-generation-badge">⚡ script.js</span>
        `;
        bubble.appendChild(fileBadge);
      }

      sandboxMessagesThread.appendChild(bubble);
    });

    sandboxMessagesThread.scrollTop = sandboxMessagesThread.scrollHeight;
  }

  function extractCodeSection(code, type) {
    if (!code) return '';
    if (type === 'css') {
      const styleMatches = code.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches && styleMatches.length > 0) {
        return styleMatches.map(m => m.replace(/<\/?style[^>]*>/gi, '').trim()).join('\n\n');
      }
      return '/* No internal <style> blocks detected. */';
    }
    if (type === 'js') {
      const scriptMatches = code.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches && scriptMatches.length > 0) {
        return scriptMatches.map(m => m.replace(/<\/?script[^>]*>/gi, '').trim()).join('\n\n');
      }
      return '// No internal <script> blocks detected.';
    }
    if (type === 'html') {
      return code.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '<!-- Styles in style.css -->')
                 .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '<!-- Scripts in script.js -->');
    }
    return code;
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function getSandboxHistory() {
    try {
      const raw = localStorage.getItem(SANDBOX_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveSandboxAppToHistory(appData) {
    if (!appData || !appData.code) return;
    const history = getSandboxHistory();
    const id = appData.id || ('sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    appData.id = id;

    const existingIndex = history.findIndex(item => item.id === id);
    const historyEntry = {
      id,
      title: appData.title || 'Web Application',
      prompt: appData.prompt || (appData.turns && appData.turns[0]?.text) || 'Interactive Web Application',
      code: appData.code,
      createdAt: existingIndex !== -1 ? (history[existingIndex].createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now(),
      turns: appData.turns || [],
      publishedUrl: appData.publishedUrl || null
    };

    if (existingIndex !== -1) {
      history[existingIndex] = historyEntry;
    } else {
      history.unshift(historyEntry);
    }

    if (history.length > 50) history.length = 50;

    try {
      localStorage.setItem(SANDBOX_HISTORY_STORAGE_KEY, JSON.stringify(history));
      if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
        puter.kv.set(SANDBOX_HISTORY_STORAGE_KEY, history).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to save sandbox history:', e);
    }

    renderSandboxHistoryBadge();
    renderSandboxRecentBuilds();
    renderSidebarSandboxAppsList();
  }

  function deleteSandboxHistoryItem(id) {
    let history = getSandboxHistory();
    history = history.filter(item => item.id !== id);
    try {
      localStorage.setItem(SANDBOX_HISTORY_STORAGE_KEY, JSON.stringify(history));
      if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
        puter.kv.set(SANDBOX_HISTORY_STORAGE_KEY, history).catch(() => {});
      }
    } catch (e) {}

    if (currentSandboxApp && currentSandboxApp.id === id) {
      resetSandboxStudio();
    }
    renderSandboxHistoryBadge();
    renderSandboxHistoryList(sandboxHistorySearch?.value || '');
    renderSandboxRecentBuilds();
    renderSidebarSandboxAppsList();
    showToast('Application deleted from history.');
  }

  function clearSandboxHistory() {
    if (!confirm('Clear all web app build history? This cannot be undone.')) return;
    try {
      localStorage.removeItem(SANDBOX_HISTORY_STORAGE_KEY);
      if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
        puter.kv.del(SANDBOX_HISTORY_STORAGE_KEY).catch(() => {});
      }
    } catch (e) {}
    resetSandboxStudio();
    renderSandboxHistoryBadge();
    renderSandboxHistoryList();
    renderSandboxRecentBuilds();
    renderSidebarSandboxAppsList();
    showToast('Build history cleared.');
  }

  function loadSandboxFromHistory(id) {
    const history = getSandboxHistory();
    const item = history.find(h => h.id === id);
    if (!item) {
      showToast('App not found in history.');
      return;
    }
    openSandboxStudio();
    loadSandboxApp(item.title, item.code, item.prompt, item.id, item.turns);
    closeSandboxHistoryDrawer();
    renderSidebarSandboxAppsList();
    showToast(`Loaded "${item.title}" into Sandbox Studio!`);
  }

  function renameSandboxApp(id, newTitle) {
    if (!newTitle || !newTitle.trim()) return;
    const history = getSandboxHistory();
    const item = history.find(h => h.id === id);
    if (!item) return;
    item.title = newTitle.trim();
    item.updatedAt = Date.now();

    try {
      localStorage.setItem(SANDBOX_HISTORY_STORAGE_KEY, JSON.stringify(history));
      if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
        puter.kv.set(SANDBOX_HISTORY_STORAGE_KEY, history).catch(() => {});
      }
    } catch (e) {}

    if (currentSandboxApp && currentSandboxApp.id === id) {
      currentSandboxApp.title = item.title;
      if (sandboxHeaderTitle) sandboxHeaderTitle.textContent = item.title;
    }

    renderSandboxHistoryBadge();
    renderSandboxRecentBuilds();
    renderSidebarSandboxAppsList();
    showToast(`Renamed to "${item.title}"`);
  }

  function startSidebarSandboxInlineRename(header, app) {
    if (!header || !app) return;
    header.classList.add('editing');
    header.innerHTML = `
      <div class="chat-item-rename-box" style="width:100%;display:flex;align-items:center;gap:4px;">
        <input type="text" class="chat-item-rename-input" value="${escapeHtml(app.title || '')}" maxlength="60" style="flex:1;" />
        <button class="icon-btn-sm btn-confirm-rename" title="Save name">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="icon-btn-sm btn-cancel-rename" title="Cancel">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    const input = header.querySelector('.chat-item-rename-input');
    const btnConfirm = header.querySelector('.btn-confirm-rename');
    const btnCancel = header.querySelector('.btn-cancel-rename');

    if (input) {
      input.focus();
      input.select();
    }

    let isDone = false;
    const commitRename = (e) => {
      if (isDone) return;
      isDone = true;
      if (e) e.stopPropagation();
      const val = input ? input.value.trim() : '';
      if (val && val !== app.title) {
        renameSandboxApp(app.id, val);
      } else {
        renderSidebarSandboxAppsList();
      }
    };

    const cancelRename = (e) => {
      if (isDone) return;
      isDone = true;
      if (e) e.stopPropagation();
      renderSidebarSandboxAppsList();
    };

    if (btnConfirm) btnConfirm.addEventListener('click', commitRename);
    if (btnCancel) btnCancel.addEventListener('click', cancelRename);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename(e);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelRename(e);
        }
      });
      input.addEventListener('blur', (e) => {
        setTimeout(() => {
          if (!isDone) commitRename(e);
        }, 150);
      });
    }
  }

  function renderSidebarSandboxAppsList() {
    if (!sidebarSandboxList) return;
    sidebarSandboxList.innerHTML = '';

    const history = getSandboxHistory();

    if (sidebarSandboxCountBadge) {
      if (history.length > 0) {
        sidebarSandboxCountBadge.textContent = history.length > 99 ? '99+' : String(history.length);
        sidebarSandboxCountBadge.style.display = 'inline-flex';
      } else {
        sidebarSandboxCountBadge.style.display = 'none';
      }
    }

    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'projects-empty-hint';
      empty.textContent = 'No web apps yet. Click + to build your first interactive web app!';
      sidebarSandboxList.appendChild(empty);
      return;
    }

    const isStudioOpen = sandboxStudioView && sandboxStudioView.style.display !== 'none';

    history.forEach(app => {
      const isExpanded = expandedSandboxIds.has(app.id);
      const isActiveApp = isStudioOpen && currentSandboxApp && (currentSandboxApp.id === app.id);

      const userTurns = (app.turns || []).filter(t => t.sender === 'user');
      const turnCount = userTurns.length || 1;
      const turnBadge = `<span class="project-nav-badge" title="${turnCount} conversation iteration${turnCount === 1 ? '' : 's'}">${turnCount} 💬</span>`;
      const fileBadge = `<span class="project-nav-badge" title="3 codebase files (HTML/CSS/JS)">3 📄</span>`;

      const group = document.createElement('div');
      group.className = 'project-group sandbox-app-group' + (isExpanded ? ' expanded' : '') + (isActiveApp ? ' active' : '');
      group.setAttribute('data-sandbox-id', app.id);

      const header = document.createElement('div');
      header.className = 'project-group-header';
      header.innerHTML = `
        <button class="project-group-chevron" title="${isExpanded ? 'Collapse app iterations' : 'Expand app iterations'}" aria-label="Toggle app iterations">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <div class="project-group-main">
          <span class="project-group-icon">⚡</span>
          <span class="project-group-name" title="${escapeHtml(app.title || 'Web Application')}">${escapeHtml(app.title || 'Web Application')}</span>
          ${turnBadge}
          ${fileBadge}
        </div>
        <div class="project-group-actions">
          <button class="icon-btn-xs btn-iterate-sandbox" title="Iterate / New Prompt in ${escapeHtml(app.title || 'App')}" aria-label="Iterate in web app">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="icon-btn-xs btn-rename-sandbox" title="Rename App" aria-label="Rename App">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <button class="icon-btn-xs btn-export-sidebar-sandbox" title="Export Codebase (${escapeHtml(app.title || 'App')})" aria-label="Export Codebase">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="icon-btn-xs btn-delete-sidebar-sandbox" title="Delete ${escapeHtml(app.title || 'App')}" aria-label="Delete App" style="color:var(--text-muted);">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // Click header to open Sandbox app
      header.addEventListener('click', (e) => {
        if (e.target.closest('.project-group-actions') || e.target.closest('.icon-btn-xs') || e.target.closest('.project-group-chevron') || header.classList.contains('editing')) return;
        loadSandboxFromHistory(app.id);
        closeSidebarIfMobile();
      });

      // Chevron toggle
      const chevronBtn = header.querySelector('.project-group-chevron');
      if (chevronBtn) {
        chevronBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (expandedSandboxIds.has(app.id)) {
            expandedSandboxIds.delete(app.id);
          } else {
            expandedSandboxIds.add(app.id);
          }
          renderSidebarSandboxAppsList();
        });
      }

      // Iterate button (+)
      const btnIterate = header.querySelector('.btn-iterate-sandbox');
      if (btnIterate) {
        btnIterate.addEventListener('click', (e) => {
          e.stopPropagation();
          loadSandboxFromHistory(app.id);
          switchSandboxSubTab('chat');
          if (sandboxChatInput) {
            sandboxChatInput.focus();
          }
          closeSidebarIfMobile();
          showToast(`Ready to iterate on "${app.title}". Type your instructions.`);
        });
      }

      // Rename button
      const btnRename = header.querySelector('.btn-rename-sandbox');
      if (btnRename) {
        btnRename.addEventListener('click', (e) => {
          e.stopPropagation();
          startSidebarSandboxInlineRename(header, app);
        });
      }

      // Double-click name to rename
      const nameSpan = header.querySelector('.project-group-name');
      if (nameSpan) {
        nameSpan.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          startSidebarSandboxInlineRename(header, app);
        });
      }

      // Export button
      const btnExport = header.querySelector('.btn-export-sidebar-sandbox');
      if (btnExport) {
        btnExport.addEventListener('click', (e) => {
          e.stopPropagation();
          openSandboxExportModal(app);
        });
      }

      // Delete button
      const btnDelete = header.querySelector('.btn-delete-sidebar-sandbox');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${app.title || 'this app'}" from Sandbox history?`)) {
            deleteSandboxHistoryItem(app.id);
          }
        });
      }

      group.appendChild(header);

      // If expanded, render the nested iterations (conversational iteration thread)
      if (isExpanded) {
        const chatsContainer = document.createElement('div');
        chatsContainer.className = 'project-group-chats';

        const turns = (app.turns || []).filter(t => t.sender === 'user');
        if (turns.length === 0 && app.prompt) {
          turns.push({ sender: 'user', text: app.prompt });
        }

        if (turns.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'project-empty-hint';
          empty.textContent = 'Initial build';
          chatsContainer.appendChild(empty);
        } else {
          turns.forEach((turn, idx) => {
            const chatItem = document.createElement('div');
            chatItem.className = 'project-nested-chat';
            chatItem.innerHTML = `
              <svg class="project-nested-chat-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="project-nested-chat-title" title="${escapeHtml(turn.text)}">${idx === 0 ? 'Initial: ' : 'Iteration: '}${escapeHtml(turn.text)}</span>
            `;

            chatItem.addEventListener('click', (e) => {
              e.stopPropagation();
              loadSandboxFromHistory(app.id);
              switchSandboxSubTab('chat');
              closeSidebarIfMobile();
            });

            chatsContainer.appendChild(chatItem);
          });
        }

        // Action row to add a new prompt / iteration
        const addIterRow = document.createElement('div');
        addIterRow.className = 'project-nested-chat';
        addIterRow.style.color = 'var(--accent-color)';
        addIterRow.style.fontWeight = '500';
        addIterRow.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span class="project-nested-chat-title">+ Add iteration / prompt</span>
        `;
        addIterRow.addEventListener('click', (e) => {
          e.stopPropagation();
          loadSandboxFromHistory(app.id);
          switchSandboxSubTab('chat');
          if (sandboxChatInput) {
            sandboxChatInput.focus();
          }
          closeSidebarIfMobile();
        });
        chatsContainer.appendChild(addIterRow);

        group.appendChild(chatsContainer);
      }

      sidebarSandboxList.appendChild(group);
    });
  }

  async function syncSandboxHistoryFromCloud() {
    if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
      try {
        const cloudData = await puter.kv.get(SANDBOX_HISTORY_STORAGE_KEY);
        if (cloudData) {
          const parsed = typeof cloudData === 'string' ? JSON.parse(cloudData) : cloudData;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const local = getSandboxHistory();
            const map = new Map();
            [...parsed, ...local].forEach(item => {
              if (!item || !item.id) return;
              const existing = map.get(item.id);
              if (!existing || (item.updatedAt || item.createdAt || 0) > (existing.updatedAt || existing.createdAt || 0)) {
                map.set(item.id, item);
              }
            });
            const merged = Array.from(map.values()).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
            localStorage.setItem(SANDBOX_HISTORY_STORAGE_KEY, JSON.stringify(merged));
            renderSandboxHistoryBadge();
            renderSandboxRecentBuilds();
            renderSidebarSandboxAppsList();
          }
        }
      } catch (e) {
        console.warn('Failed to sync sandbox history from cloud:', e);
      }
    }
  }

  function renderSandboxHistoryBadge() {
    if (!sandboxHistoryCountBadge) return;
    const count = getSandboxHistory().length;
    if (count > 0) {
      sandboxHistoryCountBadge.textContent = count > 99 ? '99+' : String(count);
      sandboxHistoryCountBadge.style.display = 'inline-flex';
    } else {
      sandboxHistoryCountBadge.style.display = 'none';
    }
  }

  function renderSandboxHistoryList(query = '') {
    if (!sandboxHistoryList) return;
    const history = getSandboxHistory();
    const q = (query || '').toLowerCase().trim();
    const filtered = q
      ? history.filter(h => (h.title || '').toLowerCase().includes(q) || (h.prompt || '').toLowerCase().includes(q))
      : history;

    if (historyTotalCount) {
      historyTotalCount.textContent = `${history.length} app${history.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      sandboxHistoryList.innerHTML = `
        <div class="history-empty-placeholder">
          ${q ? 'No applications match your search query.' : 'No past applications yet. Describe any web app to generate your first build!'}
        </div>
      `;
      return;
    }

    sandboxHistoryList.innerHTML = '';
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-app-card';
      const lines = (item.code || '').split('\n').length;
      const relativeTime = formatRelativeTime(item.updatedAt || item.createdAt);

      card.innerHTML = `
        <div class="history-card-header">
          <div class="history-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title || 'Untitled App')}</div>
          <span style="font-size:0.72rem;color:var(--accent-color);font-weight:600;">${lines} lines</span>
        </div>
        <div class="history-card-prompt" title="${escapeHtml(item.prompt)}">${escapeHtml(item.prompt || 'No description')}</div>
        <div class="history-card-meta">
          <span>🕒 ${relativeTime}</span>
          <span>3 files (HTML/CSS/JS)</span>
        </div>
        <div class="history-card-actions">
          <button class="btn-primary btn-xs btn-open-history-app" data-id="${item.id}" type="button">Open App</button>
          <button class="btn-secondary btn-xs btn-export-history-app" data-id="${item.id}" type="button" title="Export Codebase">Export</button>
          <button class="icon-btn-xs btn-delete-history-app" data-id="${item.id}" type="button" title="Delete app from history" style="margin-left:auto;color:var(--text-muted);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
      sandboxHistoryList.appendChild(card);
    });
  }

  function renderSandboxRecentBuilds() {
    if (!sandboxRecentBuildsSection || !sandboxRecentBuildsGrid) return;
    const history = getSandboxHistory();
    if (history.length === 0) {
      sandboxRecentBuildsSection.style.display = 'none';
      return;
    }

    sandboxRecentBuildsSection.style.display = 'flex';
    sandboxRecentBuildsGrid.innerHTML = '';
    const recent = history.slice(0, 4);

    recent.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'recent-build-chip';
      chip.setAttribute('data-id', item.id);
      chip.innerHTML = `
        <div class="recent-build-chip-title">⚡ ${escapeHtml(item.title || 'Web App')}</div>
        <div class="recent-build-chip-time">${formatRelativeTime(item.updatedAt || item.createdAt)} • ${(item.code || '').split('\n').length} lines</div>
      `;
      chip.addEventListener('click', () => {
        loadSandboxFromHistory(item.id);
      });
      sandboxRecentBuildsGrid.appendChild(chip);
    });
  }

  function openSandboxHistoryDrawer() {
    if (sandboxGithubDrawer) sandboxGithubDrawer.style.display = 'none';
    if (sandboxHistoryDrawer) {
      sandboxHistoryDrawer.style.display = 'flex';
      renderSandboxHistoryList();
      if (sandboxHistorySearch) {
        sandboxHistorySearch.value = '';
        setTimeout(() => sandboxHistorySearch.focus(), 60);
      }
    }
  }

  function closeSandboxHistoryDrawer() {
    if (sandboxHistoryDrawer) sandboxHistoryDrawer.style.display = 'none';
  }

  function toggleSandboxHistoryDrawer() {
    if (!sandboxHistoryDrawer) return;
    if (sandboxHistoryDrawer.style.display === 'none' || !sandboxHistoryDrawer.style.display) {
      openSandboxHistoryDrawer();
    } else {
      closeSandboxHistoryDrawer();
    }
  }

  function openSandboxExportModal(app = null) {
    activeExportApp = app || currentSandboxApp;
    if (!activeExportApp || !activeExportApp.code) {
      showToast('No application code to export.');
      return;
    }

    if (exportAppTitle) exportAppTitle.textContent = activeExportApp.title || 'Web Application';
    const lines = (activeExportApp.code || '').split('\n').length;
    if (exportAppMeta) exportAppMeta.textContent = `3 files (index.html, style.css, script.js) • ${lines} lines compiled`;

    if (sandboxExportModal) sandboxExportModal.style.display = 'flex';
  }

  function closeSandboxExportModal() {
    if (sandboxExportModal) sandboxExportModal.style.display = 'none';
  }

  async function exportMultiFileZip() {
    const app = activeExportApp || currentSandboxApp;
    if (!app || !app.code) return;

    if (typeof JSZip === 'undefined') {
      showToast('JSZip not ready. Downloading index.html fallback...');
      exportStandaloneHtml();
      return;
    }

    try {
      const zip = new JSZip();
      const code = app.code;
      const css = extractCodeSection(code, 'css');
      const js = extractCodeSection(code, 'js');

      let cleanHtml = code
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      if (/<\/head>/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/<\/head>/i, '  <link rel="stylesheet" href="style.css">\n</head>');
      } else {
        cleanHtml = '<link rel="stylesheet" href="style.css">\n' + cleanHtml;
      }
      if (/<\/body>/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/<\/body>/i, '  <script src="script.js"></script>\n</body>');
      } else {
        cleanHtml = cleanHtml + '\n<script src="script.js"></script>';
      }

      zip.file("index.html", cleanHtml);
      zip.file("style.css", css || '/* Styles */\n');
      zip.file("script.js", js || '// Interactive Logic\n');
      zip.file("README.md", `# ${app.title || 'Web Application'}

${app.prompt || 'Generated with Omni Chat Web App Sandbox Studio.'}

## Project Structure
- \`index.html\` — Application markup
- \`style.css\` — Styling and responsive layout
- \`script.js\` — Interactive JavaScript logic

## How to Run
Simply open \`index.html\` in any web browser, or launch with any local static server:
\`\`\`bash
npx serve .
\`\`\`
`);
      zip.file("package.json", JSON.stringify({
        name: (app.title || 'web-app').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        version: "1.0.0",
        description: app.title,
        scripts: {
          start: "npx serve ."
        }
      }, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const slug = (app.title || 'web-app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'web-app';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-codebase.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      closeSandboxExportModal();
      showToast(`📦 Downloaded ${slug}-codebase.zip!`);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
      showToast('Export error: ' + (err.message || 'Could not create ZIP'));
    }
  }

  function exportStandaloneHtml() {
    const app = activeExportApp || currentSandboxApp;
    if (!app || !app.code) return;
    const blob = new Blob([app.code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const slug = (app.title || 'web-app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'web-app';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeSandboxExportModal();
    showToast(`📄 Downloaded ${slug}.html!`);
  }

  function exportToCodePen() {
    const app = activeExportApp || currentSandboxApp;
    if (!app || !app.code) return;
    const css = extractCodeSection(app.code, 'css');
    const js = extractCodeSection(app.code, 'js');
    const html = app.code
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<!DOCTYPE html>/i, '')
      .replace(/<html[^>]*>|<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>|<\/body>/gi, '')
      .trim();

    const data = JSON.stringify({
      title: app.title || 'Web Application',
      description: app.prompt || 'Built with Omni Chat Sandbox Studio',
      html,
      css,
      js
    });

    const form = document.createElement('form');
    form.action = 'https://codepen.io/pen/define';
    form.method = 'POST';
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = data;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    closeSandboxExportModal();
    showToast('🚀 Opening codebase in CodePen!');
  }

  function copyCodePart(part) {
    const app = activeExportApp || currentSandboxApp;
    if (!app || !app.code) return;
    let text = '';
    if (part === 'all') text = app.code;
    else text = extractCodeSection(app.code, part);

    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied ${part.toUpperCase()} to clipboard!`);
    }).catch(() => {
      showToast('Could not copy to clipboard');
    });
  }

  function setSandboxEditorStatus(state) {
    if (!sandboxEditorStatus) return;
    sandboxEditorStatus.className = `sandbox-editor-status ${state}`;
    if (state === 'unsaved') {
      sandboxEditorStatus.textContent = '● Unsaved (⌘S)';
    } else if (state === 'saved') {
      sandboxEditorStatus.textContent = '✓ Saved & Running';
    } else {
      sandboxEditorStatus.textContent = 'Ready';
    }
  }

  function updateEditorGutter() {
    if (!sandboxEditorGutter || !sandboxCodeEditor) return;
    const count = (sandboxCodeEditor.value || '').split('\n').length;
    let numbers = '';
    for (let i = 1; i <= count; i++) {
      numbers += i + '\n';
    }
    sandboxEditorGutter.textContent = numbers;
    sandboxEditorGutter.scrollTop = sandboxCodeEditor.scrollTop;
  }

  function mergeEditorCodeIntoApp(val, tab) {
    if (!currentSandboxApp.code) {
      currentSandboxApp.code = val;
      return;
    }
    if (tab === 'all') {
      currentSandboxApp.code = val;
    } else if (tab === 'css') {
      if (/<style[^>]*>[\s\S]*?<\/style>/i.test(currentSandboxApp.code)) {
        currentSandboxApp.code = currentSandboxApp.code.replace(/<style[^>]*>[\s\S]*?<\/style>/i, `<style>\n${val}\n</style>`);
      } else if (/<\/head>/i.test(currentSandboxApp.code)) {
        currentSandboxApp.code = currentSandboxApp.code.replace(/<\/head>/i, `  <style>\n${val}\n  </style>\n</head>`);
      } else {
        currentSandboxApp.code = `<style>\n${val}\n</style>\n` + currentSandboxApp.code;
      }
    } else if (tab === 'js') {
      if (/<script[^>]*>[\s\S]*?<\/script>/i.test(currentSandboxApp.code)) {
        currentSandboxApp.code = currentSandboxApp.code.replace(/<script[^>]*>[\s\S]*?<\/script>/i, `<script>\n${val}\n</script>`);
      } else if (/<\/body>/i.test(currentSandboxApp.code)) {
        currentSandboxApp.code = currentSandboxApp.code.replace(/<\/body>/i, `  <script>\n${val}\n  </script>\n</body>`);
      } else {
        currentSandboxApp.code = currentSandboxApp.code + `\n<script>\n${val}\n</script>`;
      }
    } else if (tab === 'html') {
      const existingCss = extractCodeSection(currentSandboxApp.code, 'css');
      const existingJs = extractCodeSection(currentSandboxApp.code, 'js');
      let combined = val;
      if (existingCss && !combined.includes('<style')) {
        if (/<\/head>/i.test(combined)) {
          combined = combined.replace(/<\/head>/i, `  <style>\n${existingCss}\n  </style>\n</head>`);
        } else {
          combined = `<style>\n${existingCss}\n</style>\n` + combined;
        }
      }
      if (existingJs && !combined.includes('<script')) {
        if (/<\/body>/i.test(combined)) {
          combined = combined.replace(/<\/body>/i, `  <script>\n${existingJs}\n  </script>\n</body>`);
        } else {
          combined = combined + `\n<script>\n${existingJs}\n</script>`;
        }
      }
      currentSandboxApp.code = combined;
    }
  }

  function applyManualCodeEdits() {
    if (!sandboxCodeEditor) return;
    const tab = currentSandboxApp.activeFileTab || 'all';
    const val = sandboxCodeEditor.value;

    mergeEditorCodeIntoApp(val, tab);
    updateSandboxIframe(currentSandboxApp.code);
    saveSandboxAppToHistory(currentSandboxApp);

    sandboxIsDirty = false;
    setSandboxEditorStatus('saved');
    const lines = (currentSandboxApp.code || '').split('\n').length;
    if (sandboxCodeStats) sandboxCodeStats.textContent = `${lines} lines`;
    showToast('✨ Code compiled and live preview updated!');
  }

  function renderSandboxCodeView() {
    if (!sandboxCodeContent && !sandboxCodeEditor) return;
    const tab = currentSandboxApp.activeFileTab || 'all';
    const displayCode = extractCodeSection(currentSandboxApp.code, tab);

    if (sandboxCodeContent) {
      sandboxCodeContent.textContent = displayCode || '// No code available';
    }
    if (sandboxCodeEditor) {
      sandboxCodeEditor.value = displayCode || '';
      updateEditorGutter();
    }

    const lines = (displayCode || '').split('\n').length;
    if (sandboxCodeStats) sandboxCodeStats.textContent = `${lines} lines`;
    if (sandboxFileCountBadge) sandboxFileCountBadge.textContent = '3 files';
    sandboxIsDirty = false;
    setSandboxEditorStatus('ready');
  }

  async function extractAiContent(resp) {
    if (!resp) return '';
    if (typeof resp === 'string') return resp;

    // Check if it's an async iterable
    if (typeof resp[Symbol.asyncIterator] === 'function') {
      let acc = '';
      for await (const chunk of resp) {
        if (typeof chunk === 'string') acc += chunk;
        else if (chunk?.text) acc += chunk.text;
        else if (typeof chunk?.message?.content === 'string') acc += chunk.message.content;
        else if (Array.isArray(chunk?.message?.content)) {
          acc += chunk.message.content.map(c => c.text || '').join('');
        }
      }
      return acc;
    }

    if (typeof resp.text === 'string' && resp.text) return resp.text;

    if (resp.message) {
      if (typeof resp.message.content === 'string') return resp.message.content;
      if (Array.isArray(resp.message.content)) {
        return resp.message.content.map(c => c.text || '').join('');
      }
    }

    if (resp.choices && resp.choices[0]?.message) {
      const c = resp.choices[0].message.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.map(part => part.text || '').join('');
    }

    return typeof resp === 'object' ? JSON.stringify(resp) : String(resp);
  }

  function extractExecutableCode(rawResponse, prompt = 'Web Application') {
    if (!rawResponse || typeof rawResponse !== 'string') return '';
    const trimmed = rawResponse.trim();

    // 1. Match code blocks ```html ... ``` or ``` ... ```
    const codeMatch = trimmed.match(/```(?:html|htm|xml)?\s*\n?([\s\S]*?)```/i);
    if (codeMatch && codeMatch[1] && codeMatch[1].trim()) {
      return codeMatch[1].trim();
    }

    // 2. Match raw HTML tags starting with <!DOCTYPE or <html
    const htmlStart = trimmed.search(/<!DOCTYPE\s+html|<html[\s>]/i);
    if (htmlStart !== -1) {
      const htmlEnd = trimmed.toLowerCase().lastIndexOf('</html>');
      if (htmlEnd !== -1) {
        return trimmed.slice(htmlStart, htmlEnd + 7).trim();
      }
      return trimmed.slice(htmlStart).trim();
    }

    // 3. If it contains generic HTML tags, use it directly
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
      return trimmed;
    }

    // 4. Fallback: wrap raw response in a clean modern template
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(prompt)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #fff; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; box-sizing: border-box; text-align: center; }
    .card { background: #1a1d27; border: 1px solid #2d3139; border-radius: 12px; padding: 1.5rem 2rem; max-width: 520px; width: 100%; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    h2 { margin-top: 0; color: #60a5fa; font-size: 1.35rem; }
    p { color: #cbd5e1; line-height: 1.6; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${escapeHtml(prompt)}</h2>
    <p>${escapeHtml(trimmed)}</p>
  </div>
</body>
</html>`;
  }

  async function handleSandboxInitialGenerate(customPrompt = '') {
    const prompt = (customPrompt || sandboxInitialPrompt?.value || '').trim();
    if (!prompt) {
      showToast('Please describe the web app you want to build.');
      if (sandboxInitialPrompt) sandboxInitialPrompt.focus();
      return;
    }

    // Immediately transition the UI to active chat and preview pane!
    if (sandboxInitialState) sandboxInitialState.style.display = 'none';
    if (sandboxActiveChat) sandboxActiveChat.style.display = 'flex';
    if (sandboxPreviewStandby) sandboxPreviewStandby.style.display = 'none';
    if (sandboxPreviewFrameWrap) sandboxPreviewFrameWrap.style.display = 'flex';
    switchSandboxSubTab('chat');

    const words = prompt.split(/\s+/).slice(0, 4).join(' ');
    const tentativeTitle = words ? (words.charAt(0).toUpperCase() + words.slice(1)) : 'Web Application';

    if (sandboxHeaderTitle) sandboxHeaderTitle.textContent = tentativeTitle;
    if (sandboxHeaderSubtitle) sandboxHeaderSubtitle.textContent = 'Generating files & compiling live preview...';

    // 1. Add user prompt bubble in chat thread
    if (sandboxMessagesThread) {
      sandboxMessagesThread.innerHTML = '';
      const userBubble = document.createElement('div');
      userBubble.className = 'sandbox-chat-bubble user-bubble';
      userBubble.textContent = prompt;
      sandboxMessagesThread.appendChild(userBubble);
    }

    // 2. Add live building card in chat thread
    const builderCard = document.createElement('div');
    builderCard.className = 'sandbox-building-card';
    builderCard.innerHTML = `
      <div class="sandbox-building-header">
        <div class="sandbox-building-icon-wrap" id="sb-build-icon">⚡</div>
        <div>
          <div class="sandbox-building-title" id="sb-build-title">AI Web App Architect</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);" id="sb-build-subtitle">Analyzing prompt & planning web application...</div>
        </div>
      </div>

      <div class="sandbox-building-steps">
        <div class="sandbox-step-row active" id="sb-step-arch">
          <span class="sandbox-step-icon">🔍</span>
          <span>Analyzing prompt & planning application architecture</span>
        </div>
        <div class="sandbox-step-row" id="sb-step-html">
          <span class="sandbox-step-icon">⏳</span>
          <span>Scaffolding structure & semantics (<strong>index.html</strong>)</span>
        </div>
        <div class="sandbox-step-row" id="sb-step-css">
          <span class="sandbox-step-icon">⏳</span>
          <span>Designing responsive styles & theme (<strong>style.css</strong>)</span>
        </div>
        <div class="sandbox-step-row" id="sb-step-js">
          <span class="sandbox-step-icon">⏳</span>
          <span>Implementing interactive logic (<strong>script.js</strong>)</span>
        </div>
        <div class="sandbox-step-row" id="sb-step-compile">
          <span class="sandbox-step-icon">⏳</span>
          <span>Compiling code into live iframe runtime</span>
        </div>
      </div>

      <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:2px;" id="sb-files-badge-bar">
        <span class="sandbox-file-generation-badge" id="sb-badge-html" style="opacity:0.45;">📄 index.html</span>
        <span class="sandbox-file-generation-badge" id="sb-badge-css" style="opacity:0.45;">🎨 style.css</span>
        <span class="sandbox-file-generation-badge" id="sb-badge-js" style="opacity:0.45;">⚡ script.js</span>
      </div>

      <div class="sandbox-live-stream-log" id="sb-stream-log">// Connecting to AI model...</div>
    `;
    if (sandboxMessagesThread) {
      sandboxMessagesThread.appendChild(builderCard);
      sandboxMessagesThread.scrollTop = sandboxMessagesThread.scrollHeight;
    }

    // 3. Mount compiling overlay on preview frame
    let previewOverlay = sandboxPreviewFrameWrap ? sandboxPreviewFrameWrap.querySelector('.sandbox-preview-compiling-overlay') : null;
    if (!previewOverlay && sandboxPreviewFrameWrap) {
      previewOverlay = document.createElement('div');
      previewOverlay.className = 'sandbox-preview-compiling-overlay';
      previewOverlay.innerHTML = `
        <div class="sandbox-compiling-pulse-ring"></div>
        <div class="sandbox-compiling-text">Compiling Web Application...</div>
        <div class="sandbox-compiling-sub">Generating HTML, CSS, & JS assets live in sandbox runtime</div>
      `;
      sandboxPreviewFrameWrap.appendChild(previewOverlay);
    }
    if (previewOverlay) {
      const textEl = previewOverlay.querySelector('.sandbox-compiling-text');
      if (textEl) textEl.textContent = 'Compiling Web Application...';
      previewOverlay.style.display = 'flex';
    }

    if (btnSandboxGenerate) {
      btnSandboxGenerate.disabled = true;
      btnSandboxGenerate.innerHTML = `<span class="spinner-sm"></span> Building...`;
    }

    try {
      const systemPrompt = `You are an expert full-stack web developer and UI designer.
Build a complete, fully functional, modern single-file HTML web application based on this request:
"${prompt}"

Rules:
1. Return the complete application inside a single html code block (\`\`\`html ... \`\`\`).
2. Include complete inline CSS (or modern Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>) and vanilla JavaScript inside <style> and <script> tags.
3. Make it visually beautiful, responsive, and fully interactive with error-free JavaScript.
4. No placeholder comments or incomplete snippets. Return working code ready to run directly in an iframe sandbox.`;

      if (typeof puter === 'undefined' || !puter.ai || typeof puter.ai.chat !== 'function') {
        throw new Error('Puter AI SDK not available');
      }

      const chosenModel = settings.selectedModel || DEFAULT_MODEL;
      const idLower = (chosenModel || '').toLowerCase();
      const isReasoning = idLower.includes('reason') || idLower.includes('r1') || idLower.includes('argon') || idLower.startsWith('o1') || idLower.startsWith('o3');

      const chatOptions = {
        model: chosenModel,
        stream: true
      };
      if (!isReasoning && typeof settings.temperature === 'number') {
        chatOptions.temperature = 0.7;
      }

      const streamLog = builderCard.querySelector('#sb-stream-log');
      const stepArch = builderCard.querySelector('#sb-step-arch');
      const stepHtml = builderCard.querySelector('#sb-step-html');
      const stepCss = builderCard.querySelector('#sb-step-css');
      const stepJs = builderCard.querySelector('#sb-step-js');
      const stepCompile = builderCard.querySelector('#sb-step-compile');
      const badgeHtml = builderCard.querySelector('#sb-badge-html');
      const badgeCss = builderCard.querySelector('#sb-badge-css');
      const badgeJs = builderCard.querySelector('#sb-badge-js');

      // Update architectural step to done and html step to active
      if (stepArch) {
        stepArch.className = 'sandbox-step-row completed';
        const icon = stepArch.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }
      if (stepHtml) {
        stepHtml.className = 'sandbox-step-row active';
        const icon = stepHtml.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '⚡';
      }
      if (badgeHtml) {
        badgeHtml.style.opacity = '1';
        badgeHtml.style.borderColor = 'var(--accent-color)';
      }

      const resp = await puter.ai.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        chatOptions
      );

      let rawResponse = '';
      let hasCssStarted = false;
      let hasJsStarted = false;

      if (resp && typeof resp[Symbol.asyncIterator] === 'function') {
        for await (const chunk of resp) {
          const text = chunk?.text || (typeof chunk === 'string' ? chunk : (chunk?.message?.content || ''));
          if (text) {
            rawResponse += text;
            if (streamLog) {
              streamLog.textContent = rawResponse.slice(-500);
              streamLog.scrollTop = streamLog.scrollHeight;
            }

            if (!hasCssStarted && (rawResponse.includes('<style') || rawResponse.includes('class="') || rawResponse.includes('tailwindcss'))) {
              hasCssStarted = true;
              if (stepHtml) {
                stepHtml.className = 'sandbox-step-row completed';
                const icon = stepHtml.querySelector('.sandbox-step-icon');
                if (icon) icon.textContent = '✓';
              }
              if (stepCss) {
                stepCss.className = 'sandbox-step-row active';
                const icon = stepCss.querySelector('.sandbox-step-icon');
                if (icon) icon.textContent = '⚡';
              }
              if (badgeCss) {
                badgeCss.style.opacity = '1';
                badgeCss.style.borderColor = 'var(--accent-color)';
              }
            }

            if (!hasJsStarted && (rawResponse.includes('<script') || rawResponse.includes('addEventListener') || rawResponse.includes('function ') || rawResponse.includes('const ') || rawResponse.includes('let '))) {
              hasJsStarted = true;
              if (stepCss) {
                stepCss.className = 'sandbox-step-row completed';
                const icon = stepCss.querySelector('.sandbox-step-icon');
                if (icon) icon.textContent = '✓';
              }
              if (stepJs) {
                stepJs.className = 'sandbox-step-row active';
                const icon = stepJs.querySelector('.sandbox-step-icon');
                if (icon) icon.textContent = '⚡';
              }
              if (badgeJs) {
                badgeJs.style.opacity = '1';
                badgeJs.style.borderColor = 'var(--accent-color)';
              }
            }

            if (sandboxMessagesThread) {
              sandboxMessagesThread.scrollTop = sandboxMessagesThread.scrollHeight;
            }
          }
        }
      } else {
        rawResponse = await extractAiContent(resp);
      }

      // Mark JS & compile step
      if (stepHtml) {
        stepHtml.className = 'sandbox-step-row completed';
        const icon = stepHtml.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }
      if (stepCss) {
        stepCss.className = 'sandbox-step-row completed';
        const icon = stepCss.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }
      if (stepJs) {
        stepJs.className = 'sandbox-step-row completed';
        const icon = stepJs.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }
      if (stepCompile) {
        stepCompile.className = 'sandbox-step-row active';
        const icon = stepCompile.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '⚡';
      }

      const generatedCode = extractExecutableCode(rawResponse, prompt);
      const appTitle = tentativeTitle;

      // Update runtime iframe
      updateSandboxIframe(generatedCode);

      if (stepCompile) {
        stepCompile.className = 'sandbox-step-row completed';
        const icon = stepCompile.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }

      // Set titles
      if (sandboxHeaderTitle) sandboxHeaderTitle.textContent = appTitle;
      if (sandboxHeaderSubtitle) sandboxHeaderSubtitle.textContent = 'Live Interactive Preview Active';

      // Hide compiling overlay
      setTimeout(() => {
        if (previewOverlay) previewOverlay.style.display = 'none';
      }, 300);

      // Save state
      currentSandboxApp.id = 'sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      currentSandboxApp.title = appTitle;
      currentSandboxApp.prompt = prompt;
      currentSandboxApp.code = generatedCode;
      currentSandboxApp.publishedUrl = null;
      sandboxOriginalAiCode = generatedCode;
      currentSandboxApp.turns = [
        { sender: 'user', text: prompt },
        { sender: 'ai', text: `Generated **${appTitle}** with responsive layout, custom styling, and interactive JavaScript.` }
      ];

      saveSandboxAppToHistory(currentSandboxApp);

      // Finalize the builder card header & stream log
      const buildIcon = builderCard.querySelector('#sb-build-icon');
      const buildTitle = builderCard.querySelector('#sb-build-title');
      const buildSubtitle = builderCard.querySelector('#sb-build-subtitle');
      if (buildIcon) {
        buildIcon.textContent = '✅';
        buildIcon.style.background = 'rgba(16, 185, 129, 0.2)';
        buildIcon.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        buildIcon.style.animation = 'none';
      }
      if (buildTitle) {
        buildTitle.textContent = `${appTitle} — Ready`;
        buildTitle.style.color = '#10b981';
      }
      if (buildSubtitle) {
        buildSubtitle.textContent = 'All 3 files compiled & running in live sandbox runtime';
      }
      if (streamLog) {
        streamLog.textContent = `// Build succeeded: ${generatedCode.split('\n').length} lines compiled.`;
      }

      renderSandboxCodeView();
      showToast('✨ Web application generated and running live!');
    } catch (err) {
      console.error('Failed to generate sandbox app:', err);
      showToast('Failed to generate app: ' + (err.message || 'Unknown error'));
      if (previewOverlay) previewOverlay.style.display = 'none';

      const buildIcon = builderCard.querySelector('#sb-build-icon');
      const buildTitle = builderCard.querySelector('#sb-build-title');
      const buildSubtitle = builderCard.querySelector('#sb-build-subtitle');
      const streamLog = builderCard.querySelector('#sb-stream-log');
      if (buildIcon) {
        buildIcon.textContent = '⚠️';
        buildIcon.style.animation = 'none';
      }
      if (buildTitle) {
        buildTitle.textContent = 'Build Failed';
        buildTitle.style.color = 'var(--danger-color)';
      }
      if (buildSubtitle) {
        buildSubtitle.textContent = err.message || 'Error compiling application';
      }
      if (streamLog) {
        streamLog.textContent += `\n[Error]: ${err.message || 'Failed'}`;
      }
    } finally {
      if (btnSandboxGenerate) {
        btnSandboxGenerate.disabled = false;
        btnSandboxGenerate.innerHTML = `<span>✨ Build Web App</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      }
    }
  }

  async function handleSandboxIterationSubmit() {
    const iteration = (sandboxIterationInput?.value || '').trim();
    if (!iteration) return;
    if (!currentSandboxApp.code) {
      showToast('No active application to iterate on.');
      return;
    }

    if (sandboxIterationInput) sandboxIterationInput.value = '';
    if (sandboxStatusIndicator) sandboxStatusIndicator.style.display = 'flex';
    if (btnSandboxIterationSubmit) btnSandboxIterationSubmit.disabled = true;

    // 1. Add user bubble to chat thread
    if (sandboxMessagesThread) {
      const userBubble = document.createElement('div');
      userBubble.className = 'sandbox-chat-bubble user-bubble';
      userBubble.textContent = iteration;
      sandboxMessagesThread.appendChild(userBubble);
    }

    // 2. Add iteration building card
    const iterCard = document.createElement('div');
    iterCard.className = 'sandbox-building-card';
    iterCard.innerHTML = `
      <div class="sandbox-building-header">
        <div class="sandbox-building-icon-wrap" id="sb-iter-icon">🔄</div>
        <div>
          <div class="sandbox-building-title" id="sb-iter-title">Updating Web Application</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);" id="sb-iter-subtitle">Applying changes: "${escapeHtml(iteration)}"</div>
        </div>
      </div>

      <div class="sandbox-building-steps">
        <div class="sandbox-step-row active" id="sb-iter-step-plan">
          <span class="sandbox-step-icon">🔍</span>
          <span>Analyzing requested changes & application codebase</span>
        </div>
        <div class="sandbox-step-row" id="sb-iter-step-code">
          <span class="sandbox-step-icon">⏳</span>
          <span>Patching HTML, styles, and event handlers</span>
        </div>
        <div class="sandbox-step-row" id="sb-iter-step-compile">
          <span class="sandbox-step-icon">⏳</span>
          <span>Hot-reloading & recompiling live preview</span>
        </div>
      </div>

      <div class="sandbox-live-stream-log" id="sb-iter-stream-log">// Requesting code updates from AI...</div>
    `;
    if (sandboxMessagesThread) {
      sandboxMessagesThread.appendChild(iterCard);
      sandboxMessagesThread.scrollTop = sandboxMessagesThread.scrollHeight;
    }

    // 3. Mount / show compiling overlay on preview frame
    let previewOverlay = sandboxPreviewFrameWrap ? sandboxPreviewFrameWrap.querySelector('.sandbox-preview-compiling-overlay') : null;
    if (!previewOverlay && sandboxPreviewFrameWrap) {
      previewOverlay = document.createElement('div');
      previewOverlay.className = 'sandbox-preview-compiling-overlay';
      previewOverlay.innerHTML = `
        <div class="sandbox-compiling-pulse-ring"></div>
        <div class="sandbox-compiling-text">Hot-Reloading Application...</div>
        <div class="sandbox-compiling-sub">Applying your requested changes to live preview</div>
      `;
      sandboxPreviewFrameWrap.appendChild(previewOverlay);
    }
    if (previewOverlay) {
      const textEl = previewOverlay.querySelector('.sandbox-compiling-text');
      if (textEl) textEl.textContent = 'Hot-Reloading Application...';
      previewOverlay.style.display = 'flex';
    }

    try {
      const updatePrompt = `You are updating an existing single-file HTML web application.
Current Code:
\`\`\`html
${currentSandboxApp.code}
\`\`\`

User's Requested Changes:
"${iteration}"

Return ONLY the updated, complete single-file HTML application code inside a single html code block (\`\`\`html ... \`\`\`).
Do NOT truncate. Preserve all working functionality and apply the requested features or fixes.`;

      if (typeof puter === 'undefined' || !puter.ai || typeof puter.ai.chat !== 'function') {
        throw new Error('Puter AI SDK not available');
      }

      const chosenModel = settings.selectedModel || DEFAULT_MODEL;
      const idLower = (chosenModel || '').toLowerCase();
      const isReasoning = idLower.includes('reason') || idLower.includes('r1') || idLower.includes('argon') || idLower.startsWith('o1') || idLower.startsWith('o3');

      const chatOptions = {
        model: chosenModel,
        stream: true
      };
      if (!isReasoning && typeof settings.temperature === 'number') {
        chatOptions.temperature = 0.7;
      }

      const streamLog = iterCard.querySelector('#sb-iter-stream-log');
      const stepPlan = iterCard.querySelector('#sb-iter-step-plan');
      const stepCode = iterCard.querySelector('#sb-iter-step-code');
      const stepCompile = iterCard.querySelector('#sb-iter-step-compile');

      // Update plan step
      if (stepPlan) {
        stepPlan.className = 'sandbox-step-row completed';
        const icon = stepPlan.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }
      if (stepCode) {
        stepCode.className = 'sandbox-step-row active';
        const icon = stepCode.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '⚡';
      }

      const resp = await puter.ai.chat(
        [
          { role: 'system', content: updatePrompt },
          { role: 'user', content: iteration }
        ],
        chatOptions
      );

      let rawResponse = '';
      if (resp && typeof resp[Symbol.asyncIterator] === 'function') {
        for await (const chunk of resp) {
          const text = chunk?.text || (typeof chunk === 'string' ? chunk : (chunk?.message?.content || ''));
          if (text) {
            rawResponse += text;
            if (streamLog) {
              streamLog.textContent = rawResponse.slice(-500);
              streamLog.scrollTop = streamLog.scrollHeight;
            }
            if (sandboxMessagesThread) {
              sandboxMessagesThread.scrollTop = sandboxMessagesThread.scrollHeight;
            }
          }
        }
      } else {
        rawResponse = await extractAiContent(resp);
      }

      if (stepCode) {
        stepCode.className = 'sandbox-step-row completed';
        const icon = stepCode.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }
      if (stepCompile) {
        stepCompile.className = 'sandbox-step-row active';
        const icon = stepCompile.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '⚡';
      }

      const updatedCode = extractExecutableCode(rawResponse, iteration);
      if (!updatedCode) {
        throw new Error('Could not parse updated code from AI response');
      }

      currentSandboxApp.code = updatedCode;
      sandboxOriginalAiCode = updatedCode;
      currentSandboxApp.turns.push({ sender: 'user', text: iteration });
      currentSandboxApp.turns.push({
        sender: 'ai',
        text: `Applied updates: **${iteration}**. Live preview recompiled.`
      });

      saveSandboxAppToHistory(currentSandboxApp);

      updateSandboxIframe(updatedCode);

      if (stepCompile) {
        stepCompile.className = 'sandbox-step-row completed';
        const icon = stepCompile.querySelector('.sandbox-step-icon');
        if (icon) icon.textContent = '✓';
      }

      setTimeout(() => {
        if (previewOverlay) previewOverlay.style.display = 'none';
      }, 300);

      // Finalize iteration card
      const iterIcon = iterCard.querySelector('#sb-iter-icon');
      const iterTitle = iterCard.querySelector('#sb-iter-title');
      const iterSubtitle = iterCard.querySelector('#sb-iter-subtitle');
      if (iterIcon) {
        iterIcon.textContent = '✅';
        iterIcon.style.background = 'rgba(16, 185, 129, 0.2)';
        iterIcon.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        iterIcon.style.animation = 'none';
      }
      if (iterTitle) {
        iterTitle.textContent = 'Update Applied & Hot-Reloaded';
        iterTitle.style.color = '#10b981';
      }
      if (iterSubtitle) {
        iterSubtitle.textContent = `Applied: "${iteration}" • Runtime recompiled`;
      }
      if (streamLog) {
        streamLog.textContent = `// Update compiled successfully: ${updatedCode.split('\n').length} lines.`;
      }

      renderSandboxCodeView();
      showToast('Live preview updated and reloaded!');
    } catch (err) {
      console.error('Failed to iterate sandbox app:', err);
      showToast('Iteration error: ' + (err.message || 'Unknown error'));
      if (previewOverlay) previewOverlay.style.display = 'none';

      const iterIcon = iterCard.querySelector('#sb-iter-icon');
      const iterTitle = iterCard.querySelector('#sb-iter-title');
      const iterSubtitle = iterCard.querySelector('#sb-iter-subtitle');
      const streamLog = iterCard.querySelector('#sb-iter-stream-log');
      if (iterIcon) {
        iterIcon.textContent = '⚠️';
        iterIcon.style.animation = 'none';
      }
      if (iterTitle) {
        iterTitle.textContent = 'Update Failed';
        iterTitle.style.color = 'var(--danger-color)';
      }
      if (iterSubtitle) {
        iterSubtitle.textContent = err.message || 'Error updating application code';
      }
      if (streamLog) {
        streamLog.textContent += `\n[Error]: ${err.message || 'Failed'}`;
      }
    } finally {
      if (sandboxStatusIndicator) sandboxStatusIndicator.style.display = 'none';
      if (btnSandboxIterationSubmit) btnSandboxIterationSubmit.disabled = false;
    }
  }

  async function publishSandboxApp() {
    if (!currentSandboxApp.code) {
      showToast('No active web app to publish.');
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

      const origBtnHtml = btnSandboxPublish.innerHTML;
      btnSandboxPublish.disabled = true;
      btnSandboxPublish.innerHTML = `<span class="spinner-small" style="width:12px;height:12px;display:inline-block;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Publishing...`;

      showToast('Publishing live app to Puter Cloud hosting...');

      const baseSlug = (currentSandboxApp.title || 'omni-app')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 16) || 'app';
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const subdomain = `${baseSlug}-${randomSuffix}`;
      const dirPath = `hosted_apps/${subdomain}`;

      await puter.fs.mkdir(dirPath, { createMissingParents: true });
      const htmlContent = prepareExecutableHtml(currentSandboxApp.code, 'html');
      await puter.fs.write(`${dirPath}/index.html`, htmlContent);

      const site = await puter.hosting.create(subdomain, dirPath);
      const publishedUrl = site && site.subdomain
        ? `https://${site.subdomain}.puter.site`
        : `https://${subdomain}.puter.site`;

      currentSandboxApp.publishedUrl = publishedUrl;

      if (sandboxPublishedBanner && sandboxPublishedLink) {
        sandboxPublishedLink.href = publishedUrl;
        sandboxPublishedLink.textContent = publishedUrl;
        sandboxPublishedBanner.style.display = 'flex';
      }

      showToast(`🎉 App live at ${publishedUrl}!`, 5000);

      btnSandboxPublish.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Published`;
      setTimeout(() => {
        btnSandboxPublish.disabled = false;
        btnSandboxPublish.innerHTML = origBtnHtml;
      }, 3000);
    } catch (err) {
      console.error('Failed to publish sandbox app:', err);
      showToast('Failed to publish: ' + (err.message || 'Unknown error'));
      btnSandboxPublish.disabled = false;
      btnSandboxPublish.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
        <span>Publish App</span>
      `;
    }
  }

  function downloadSandboxApp() {
    if (!currentSandboxApp.code) {
      showToast('No code to download.');
      return;
    }
    const blob = new Blob([currentSandboxApp.code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (currentSandboxApp.title || 'web-app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app';
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}.html!`);
  }

  // --- Wire Sandbox Studio Event Listeners ---
  if (btnTopbarSandbox) btnTopbarSandbox.addEventListener('click', () => openSandboxStudio());
  if (sidebarBtnSandbox) sidebarBtnSandbox.addEventListener('click', () => openSandboxStudio());
  if (btnSidebarCreateSandbox) {
    btnSidebarCreateSandbox.addEventListener('click', (e) => {
      e.stopPropagation();
      openSandboxStudio();
      resetSandboxStudio();
      closeSidebarIfMobile();
      if (sandboxInitialPrompt) {
        sandboxInitialPrompt.focus();
      }
      showToast('Started new Web App Sandbox');
    });
  }
  if (btnSandboxStudioBack) btnSandboxStudioBack.addEventListener('click', closeSandboxStudio);

  if (tabBtnSandboxChat) tabBtnSandboxChat.addEventListener('click', () => switchSandboxSubTab('chat'));
  if (tabBtnSandboxCode) tabBtnSandboxCode.addEventListener('click', () => switchSandboxSubTab('code'));

  if (btnSandboxGenerate) {
    btnSandboxGenerate.addEventListener('click', () => handleSandboxInitialGenerate());
  }

  if (sandboxInitialPrompt) {
    sandboxInitialPrompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSandboxInitialGenerate();
      }
    });
  }

  // Suggestion prompt chips in initial state
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.sandbox-prompt-chip');
    if (!chip) return;
    const prompt = chip.getAttribute('data-prompt');
    if (prompt) {
      if (sandboxInitialPrompt) sandboxInitialPrompt.value = prompt;
      handleSandboxInitialGenerate(prompt);
    }
  });

  // Iteration submit
  if (btnSandboxIterationSubmit) {
    btnSandboxIterationSubmit.addEventListener('click', handleSandboxIterationSubmit);
  }

  if (sandboxIterationInput) {
    sandboxIterationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSandboxIterationSubmit();
      }
    });
  }

  // Topbar actions
  if (btnSandboxPublish) btnSandboxPublish.addEventListener('click', publishSandboxApp);
  if (btnSandboxDownload) btnSandboxDownload.addEventListener('click', downloadSandboxApp);
  if (btnSandboxNew) btnSandboxNew.addEventListener('click', () => {
    if (currentSandboxApp.code && !confirm('Start a new application? Current unsaved changes will be cleared.')) return;
    resetSandboxStudio();
    showToast('Sandbox reset for a new web app.');
  });

  if (btnSandboxReload) {
    btnSandboxReload.addEventListener('click', () => {
      if (sandboxStudioIframe && currentSandboxApp.code) {
        updateSandboxIframe(currentSandboxApp.code);
        showToast('Preview reloaded!');
      }
    });
  }

  if (btnSandboxVpDesktop) {
    btnSandboxVpDesktop.addEventListener('click', () => {
      btnSandboxVpDesktop.classList.add('active');
      btnSandboxVpMobile?.classList.remove('active');
      sandboxStudioIframe?.classList.remove('mobile-viewport');
    });
  }

  if (btnSandboxVpMobile) {
    btnSandboxVpMobile.addEventListener('click', () => {
      btnSandboxVpMobile.classList.add('active');
      btnSandboxVpDesktop?.classList.remove('active');
      sandboxStudioIframe?.classList.add('mobile-viewport');
    });
  }

  // Mobile column switcher
  if (sandboxMobileToggle) {
    sandboxMobileToggle.addEventListener('click', (e) => {
      const pill = e.target.closest('.sandbox-toggle-pill');
      if (!pill) return;
      sandboxMobileToggle.querySelectorAll('.sandbox-toggle-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const pane = pill.getAttribute('data-pane');
      if (pane === 'right') {
        sandboxStudioView?.classList.add('mobile-pane-right');
        sandboxStudioView?.classList.remove('mobile-pane-left');
      } else {
        sandboxStudioView?.classList.add('mobile-pane-left');
        sandboxStudioView?.classList.remove('mobile-pane-right');
      }
    });
  }

  // Copy code in codebase tab
  if (btnSandboxCopyCode) {
    btnSandboxCopyCode.addEventListener('click', async () => {
      const code = sandboxCodeEditor ? sandboxCodeEditor.value : (sandboxCodeContent?.textContent || '');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        showToast('Code copied to clipboard!');
      } catch (err) {
        showToast('Failed to copy code.');
      }
    });
  }

  // Manual Code Editor listeners
  if (sandboxCodeEditor) {
    sandboxCodeEditor.addEventListener('scroll', () => {
      if (sandboxEditorGutter) sandboxEditorGutter.scrollTop = sandboxCodeEditor.scrollTop;
    });

    sandboxCodeEditor.addEventListener('input', () => {
      sandboxIsDirty = true;
      setSandboxEditorStatus('unsaved');
      updateEditorGutter();
      const lines = sandboxCodeEditor.value.split('\n').length;
      if (sandboxCodeStats) sandboxCodeStats.textContent = `${lines} lines`;
    });

    sandboxCodeEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = sandboxCodeEditor.selectionStart;
        const end = sandboxCodeEditor.selectionEnd;
        sandboxCodeEditor.value = sandboxCodeEditor.value.substring(0, start) + '  ' + sandboxCodeEditor.value.substring(end);
        sandboxCodeEditor.selectionStart = sandboxCodeEditor.selectionEnd = start + 2;
        sandboxIsDirty = true;
        setSandboxEditorStatus('unsaved');
        updateEditorGutter();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault();
        applyManualCodeEdits();
      }
    });
  }

  if (btnSandboxRunCode) {
    btnSandboxRunCode.addEventListener('click', applyManualCodeEdits);
  }

  if (btnSandboxRevertCode) {
    btnSandboxRevertCode.addEventListener('click', () => {
      if (!sandboxOriginalAiCode) {
        showToast('No original AI code to revert to.');
        return;
      }
      if (confirm('Revert all manual edits back to the last AI build?')) {
        currentSandboxApp.code = sandboxOriginalAiCode;
        renderSandboxCodeView();
        updateSandboxIframe(currentSandboxApp.code);
        saveSandboxAppToHistory(currentSandboxApp);
        showToast('Reverted to AI code baseline.');
      }
    });
  }

  // Copy published link
  if (btnCopySandboxPublishedLink) {
    btnCopySandboxPublishedLink.addEventListener('click', async () => {
      if (currentSandboxApp.publishedUrl) {
        try {
          await navigator.clipboard.writeText(currentSandboxApp.publishedUrl);
          showToast('Published URL copied to clipboard!');
        } catch (err) {
          showToast('Failed to copy link.');
        }
      }
    });
  }

  // Codebase file tabs switcher
  if (sandboxCodeFileTabs) {
    sandboxCodeFileTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.code-file-tab');
      if (!tab) return;
      if (sandboxIsDirty && sandboxCodeEditor) {
        mergeEditorCodeIntoApp(sandboxCodeEditor.value, currentSandboxApp.activeFileTab || 'all');
      }
      sandboxCodeFileTabs.querySelectorAll('.code-file-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSandboxApp.activeFileTab = tab.getAttribute('data-file') || 'all';
      renderSandboxCodeView();
    });
  }

  // App Build History Drawer listeners
  if (btnSandboxHistoryToggle) {
    btnSandboxHistoryToggle.addEventListener('click', toggleSandboxHistoryDrawer);
  }
  if (btnCloseSandboxHistory) {
    btnCloseSandboxHistory.addEventListener('click', closeSandboxHistoryDrawer);
  }
  if (btnClearSandboxHistory) {
    btnClearSandboxHistory.addEventListener('click', clearSandboxHistory);
  }
  if (sandboxHistorySearch) {
    sandboxHistorySearch.addEventListener('input', (e) => {
      renderSandboxHistoryList(e.target.value);
    });
  }
  if (btnInitialViewAllHistory) {
    btnInitialViewAllHistory.addEventListener('click', openSandboxHistoryDrawer);
  }

  // Delegation on History Cards List
  if (sandboxHistoryList) {
    sandboxHistoryList.addEventListener('click', (e) => {
      const openBtn = e.target.closest('.btn-open-history-app');
      if (openBtn) {
        const id = openBtn.getAttribute('data-id');
        if (id) loadSandboxFromHistory(id);
        return;
      }
      const exportBtn = e.target.closest('.btn-export-history-app');
      if (exportBtn) {
        const id = exportBtn.getAttribute('data-id');
        const item = getSandboxHistory().find(h => h.id === id);
        if (item) openSandboxExportModal(item);
        return;
      }
      const deleteBtn = e.target.closest('.btn-delete-history-app');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        if (id && confirm('Delete this application from history?')) {
          deleteSandboxHistoryItem(id);
        }
        return;
      }
    });
  }

  // Export Codebase Modal listeners
  if (btnSandboxExportToggle) {
    btnSandboxExportToggle.addEventListener('click', () => openSandboxExportModal());
  }
  if (btnSandboxCodeExport) {
    btnSandboxCodeExport.addEventListener('click', () => openSandboxExportModal());
  }
  if (btnCloseExportModal) {
    btnCloseExportModal.addEventListener('click', closeSandboxExportModal);
  }
  if (btnCancelExportModal) {
    btnCancelExportModal.addEventListener('click', closeSandboxExportModal);
  }
  if (btnExportZip) {
    btnExportZip.addEventListener('click', exportMultiFileZip);
  }
  if (btnExportHtml) {
    btnExportHtml.addEventListener('click', exportStandaloneHtml);
  }
  if (btnExportCodepen) {
    btnExportCodepen.addEventListener('click', exportToCodePen);
  }
  if (btnCopyHtmlPart) {
    btnCopyHtmlPart.addEventListener('click', () => copyCodePart('html'));
  }
  if (btnCopyCssPart) {
    btnCopyCssPart.addEventListener('click', () => copyCodePart('css'));
  }
  if (btnCopyJsPart) {
    btnCopyJsPart.addEventListener('click', () => copyCodePart('js'));
  }
  if (btnCopyAllPart) {
    btnCopyAllPart.addEventListener('click', () => copyCodePart('all'));
  }

  // GitHub Drawer in Sandbox Studio
  if (btnSandboxGithubToggle) {
    btnSandboxGithubToggle.addEventListener('click', () => {
      if (!sandboxGithubDrawer) return;
      const isOpen = sandboxGithubDrawer.style.display !== 'none';
      sandboxGithubDrawer.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen && sandboxGithubInput) setTimeout(() => sandboxGithubInput.focus(), 60);
    });
  }

  if (btnCloseSandboxGithub) {
    btnCloseSandboxGithub.addEventListener('click', () => {
      if (sandboxGithubDrawer) sandboxGithubDrawer.style.display = 'none';
    });
  }

  if (btnSandboxGithubFetch) {
    btnSandboxGithubFetch.addEventListener('click', async () => {
      const url = (sandboxGithubInput?.value || '').trim();
      if (!url) return;
      try {
        showToast('Fetching code from GitHub...');
        const cleanUrl = url.replace('https://github.com/', '').replace(/\/$/, '');
        const parts = cleanUrl.split('/');
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1];
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/index.html`;
          let res = await fetch(rawUrl);
          if (!res.ok) {
            res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/index.html`);
          }
          if (res.ok) {
            const code = await res.text();
            loadSandboxApp(`${owner}/${repo}`, code, `Imported from GitHub: ${url}`);
            if (sandboxGithubDrawer) sandboxGithubDrawer.style.display = 'none';
            showToast('Imported GitHub application into Sandbox Studio!');
            return;
          }
        }
        showToast('Could not find index.html in repository. Check URL.');
      } catch (err) {
        showToast('Failed to import: ' + err.message);
      }
    });
  }

  // Starter template chips for Sandbox Studio
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.sandbox-github-drawer .starter-chip');
    if (!chip) return;
    const tplKey = chip.getAttribute('data-template');
    if (tplKey && STARTER_TEMPLATES[tplKey]) {
      const titles = {
        arcade: '🎮 Retro Arcade (Breakout)',
        dashboard: '📊 SaaS Executive Dashboard',
        kanban: '📋 Kanban Workspace',
        pomodoro: '⏱️ Focus Pomodoro'
      };
      loadSandboxApp(titles[tplKey] || 'Template App', STARTER_TEMPLATES[tplKey], `Loaded template: ${titles[tplKey]}`);
      if (sandboxGithubDrawer) sandboxGithubDrawer.style.display = 'none';
      showToast(`Loaded ${titles[tplKey]}!`);
    }
  });

  // Topbar and sidebar plugins modal listeners
  if (btnTopbarPlugins) btnTopbarPlugins.addEventListener('click', () => {
    openModal(pluginsModal);
    renderPluginsMarketplace(activePluginCategory);
  });
  if (sidebarBtnPlugins) sidebarBtnPlugins.addEventListener('click', () => {
    openModal(pluginsModal);
    renderPluginsMarketplace(activePluginCategory);
  });

  // Explore Apps modal listeners
  if (sidebarBtnExploreApps) {
    sidebarBtnExploreApps.addEventListener('click', () => {
      openModal(exploreAppsModal);
      renderExploreAppsGrid('all', '');
    });
  }
  if (btnExploreApps) {
    btnExploreApps.addEventListener('click', () => {
      openModal(exploreAppsModal);
      renderExploreAppsGrid('all', '');
    });
  }

  // Plugins Category Filter Pills
  if (pluginsCategoriesBar) {
    pluginsCategoriesBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.category-pill');
      if (!pill) return;
      pluginsCategoriesBar.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.getAttribute('data-category') || 'all';
      renderPluginsMarketplace(cat);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (sandboxExportModal && sandboxExportModal.style.display !== 'none') {
        closeSandboxExportModal();
        return;
      }
      if (sandboxHistoryDrawer && sandboxHistoryDrawer.style.display !== 'none') {
        closeSandboxHistoryDrawer();
        return;
      }
      if (sandboxStudioView && sandboxStudioView.style.display !== 'none') {
        closeSandboxStudio();
        return;
      }
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
