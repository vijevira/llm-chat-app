/**
 * Nexus AI — Universal Multi-Model Chat
 * Built with Puter.js (docs.puter.com/llms.txt)
 */

(function () {
  'use strict';

  // --- Constants & Presets ---
  const DEFAULT_MODEL = 'gpt-4o-mini';
  const STORAGE_KEY_SESSIONS = 'nexus_ai_chat_sessions';
  const STORAGE_KEY_SETTINGS = 'nexus_ai_settings';
  const STORAGE_KEY_THEME = 'nexus_ai_theme';

  const PERSONA_PRESETS = {
    default: 'You are Nexus AI, a brilliant, friendly, and concise assistant. Format responses using clean markdown, bullet points, and code blocks where helpful.',
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
    modalTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        modalTabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const content = document.getElementById(targetTab);
        if (content) content.classList.add('active');
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
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    updateModelButtonUI();
  }

  async function persistSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode === 'cloud') {
        await puter.kv.set(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      }
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  }

  async function loadCloudSettings() {
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode === 'cloud') {
      try {
        const cloudSettings = await puter.kv.get(STORAGE_KEY_SETTINGS);
        if (cloudSettings) {
          const parsed = typeof cloudSettings === 'string' ? JSON.parse(cloudSettings) : cloudSettings;
          settings = { ...settings, ...parsed };
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
    // Switch directly to profile tab
    modalTabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="tab-profile"]').classList.add('active');
    document.getElementById('tab-profile').classList.add('active');
    openModal(settingsModal);
  });

  btnSaveSettings.addEventListener('click', saveSettings);
  btnCancelSettings.addEventListener('click', () => closeModal(settingsModal));
  btnCloseSettingsModal.addEventListener('click', () => closeModal(settingsModal));

  // --- Puter Authentication & Cloud KV Storage ---
  async function initPuter() {
    if (typeof puter === 'undefined') {
      console.warn('Puter.js SDK not yet loaded.');
      return;
    }

    try {
      await loadCloudSettings();
      await updateAuthUI();
      fetchPuterModels();
      await loadSessions();
    } catch (err) {
      console.error('Puter init error:', err);
      loadSessionsFromLocal();
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
        statSyncStatus.textContent = 'Synced (Puter KV)';
        statSyncStatus.style.color = 'var(--success-color)';

        if (linkManagePuter) linkManagePuter.style.display = 'inline-flex';
      } catch (e) {
        console.warn('Failed to get user:', e);
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
      statSyncStatus.textContent = 'Local Storage Only';
      statSyncStatus.style.color = 'var(--text-muted)';

      if (linkManagePuter) linkManagePuter.style.display = 'none';
    }

    const welcomeUsername = document.getElementById('welcome-username');
    if (welcomeUsername) {
      const displayName = getEffectiveDisplayName();
      welcomeUsername.textContent = (displayName !== 'Guest User') ? displayName : 'human';
    }

    statChatCount.textContent = sessions.length;
  }

  btnModalAuth.addEventListener('click', async () => {
    if (typeof puter === 'undefined') {
      showToast('Puter.js SDK not ready');
      return;
    }

    if (puter.auth.isSignedIn()) {
      await puter.auth.signOut();
      updateAuthUI();
      showToast('Signed out from Puter');
      loadSessionsFromLocal();
    } else {
      try {
        await puter.auth.signIn();
        if (puter.auth.isSignedIn()) {
          const user = await puter.auth.getUser();
          updateAuthUI();
          showToast(`Welcome back, ${user.username || 'friend'}!`);
          await syncSessionsToPuterKV();
          await loadSessions();
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

  // --- Session & History Management ---
  async function loadSessions() {
    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode === 'cloud') {
      try {
        const cloudData = await puter.kv.get(STORAGE_KEY_SESSIONS);
        if (cloudData) {
          sessions = typeof cloudData === 'string' ? JSON.parse(cloudData) : cloudData;
          renderSessionList();
          restoreActiveSession();
          return;
        }
      } catch (err) {
        console.warn('Failed to load from Puter KV:', err);
      }
    }
    loadSessionsFromLocal();
  }

  function loadSessionsFromLocal() {
    try {
      const local = localStorage.getItem(STORAGE_KEY_SESSIONS);
      sessions = local ? JSON.parse(local) : [];
    } catch (e) {
      sessions = [];
    }
    renderSessionList();
    restoreActiveSession();
  }

  async function persistSessions() {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));

    if (typeof puter !== 'undefined' && puter.auth && puter.auth.isSignedIn() && settings.storageMode === 'cloud') {
      try {
        await puter.kv.set(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      } catch (e) {
        console.warn('Failed to persist to Puter KV:', e);
      }
    }
    statChatCount.textContent = sessions.length;
  }

  async function syncSessionsToPuterKV() {
    try {
      const local = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (local && typeof puter !== 'undefined' && puter.kv) {
        await puter.kv.set(STORAGE_KEY_SESSIONS, local);
      }
    } catch (e) {
      console.warn('Sync to KV error:', e);
    }
  }

  function createNewSession() {
    const newSession = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: 'New Conversation',
      createdAt: Date.now(),
      model: settings.selectedModel,
      messages: []
    };
    sessions.unshift(newSession);
    currentSessionId = newSession.id;
    persistSessions();
    renderSessionList();
    renderActiveSession();
    chatTextarea.focus();
  }

  function restoreActiveSession() {
    if (sessions.length > 0) {
      currentSessionId = sessions[0].id;
    } else {
      createNewSession();
      return;
    }
    renderActiveSession();
  }

  function switchSession(id) {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    currentSessionId = id;
    renderSessionList();
    renderActiveSession();
  }

  function deleteSession(id, e) {
    if (e) e.stopPropagation();
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
      currentSessionId = sessions.length > 0 ? sessions[0].id : null;
    }
    persistSessions();
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

    sessions = [];
    currentSessionId = null;
    persistSessions();
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
    dlAnchor.setAttribute('download', `nexus_ai_backup_${new Date().toISOString().slice(0, 10)}.json`);
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

    if (sessions.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 0.75rem 0.5rem; font-size: 0.8rem; color: var(--text-muted);';
      empty.textContent = 'No past conversations';
      chatHistoryList.appendChild(empty);
      return;
    }

    sessions.forEach(s => {
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
    // If another item is currently being edited, reset by re-rendering
    const alreadyEditing = chatHistoryList.querySelector('.chat-item.editing');
    if (alreadyEditing && alreadyEditing !== item) {
      renderSessionList();
      item = chatHistoryList.querySelector(`[data-id="${session.id}"]`);
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
        await persistSessions();
        if (session.id === currentSessionId && topbarChatTitle) {
          topbarChatTitle.textContent = session.title;
        }
        showToast('Conversation renamed');
      }
      renderSessionList();
    };

    const cancelRename = (e) => {
      if (e) e.stopPropagation();
      renderSessionList();
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
      await persistSessions();
      if (topbarChatTitle) {
        topbarChatTitle.textContent = session.title;
      }
      renderSessionList();
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

    // Meta & Action Bar for Assistant Messages
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

  // --- Regenerate from Assistant message index ---
  function regenerateFromIndex(msgIndex) {
    const session = getActiveSession();
    if (!session || activeAbortController) return;

    // Truncate to before this message
    session.messages = session.messages.slice(0, msgIndex);
    renderActiveSession();
    triggerAssistantResponse(session);
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
        session.title = text.slice(0, 36) || 'Image Chat';
        if (topbarChatTitle) topbarChatTitle.textContent = session.title;
      }
      renderSessionList();
    }

    welcomeContainer.style.display = 'none';

    // Add user message
    const userMsg = {
      role: 'user',
      content: text,
      attachment: currentAttachment ? currentAttachment.dataUrl : null,
      timestamp: Date.now()
    };
    session.messages.push(userMsg);

    clearAttachment();
    chatTextarea.value = '';
    chatTextarea.style.height = 'auto';
    btnSend.disabled = true;

    const userEl = createMessageDOM(userMsg, session.messages.length - 1);
    messagesInner.appendChild(userEl);
    scrollToBottom();

    await triggerAssistantResponse(session);
  }

  async function triggerAssistantResponse(session) {
    const assistantMsg = {
      role: 'assistant',
      content: '',
      reasoning: '',
      model: settings.selectedModel,
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

      // Prepare conversation payload
      const conversationPayload = [
        { role: 'system', content: settings.systemPrompt }
      ];

      session.messages.forEach(m => {
        if (m.attachment) {
          conversationPayload.push({
            role: m.role,
            content: [
              { type: 'text', text: m.content || 'Analyze this image.' },
              { type: 'file', puter_path: m.attachment }
            ]
          });
        } else {
          conversationPayload.push({
            role: m.role,
            content: m.content
          });
        }
      });

      const isReasoning = (settings.selectedModel || '').toLowerCase().includes('reason') ||
                          (settings.selectedModel || '').toLowerCase().includes('r1') ||
                          (settings.selectedModel || '').toLowerCase().includes('argon') ||
                          (settings.selectedModel || '').toLowerCase().startsWith('o1') ||
                          (settings.selectedModel || '').toLowerCase().startsWith('o3');

      const chatOptions = {
        model: settings.selectedModel,
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
      session.messages.push(assistantMsg);
      await persistSessions();

      // Render action buttons
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
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      showToast('Please drop an image file');
    }
  });

  btnAttach.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      currentAttachment = {
        name: file.name,
        dataUrl: event.target.result,
        type: file.type
      };
      attachmentImgPreview.src = currentAttachment.dataUrl;
      attachmentFilename.textContent = file.name;
      attachmentPreviewBar.style.display = 'flex';
      btnSend.disabled = false;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  function clearAttachment() {
    currentAttachment = null;
    attachmentPreviewBar.style.display = 'none';
    attachmentImgPreview.src = '';
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

  [modelModal, settingsModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
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
  loadLocalSettings();
  initPuter();

})();
