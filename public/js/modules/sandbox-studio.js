/**
 * Omni Chat - Dedicated Web App Sandbox Studio Module (VS Code IDE & Live Preview)
 * Provides VS Code file tree, tabbed editor, live visualizer progress overlay,
 * multi-file code decomposition & bundling, Save & Run (Ctrl+S), Puter cloud hosting & export.
 */

import { prepareExecutableHtml, escapeHtml, showToast, openImageLightbox } from '../utils/helpers.js';
import { formatMarkdown } from '../utils/markdown.js';
import { STARTER_TEMPLATES } from '../config/constants.js';
import { appState } from '../state/app-state.js';

const SANDBOX_HISTORY_STORAGE_KEY = 'omni_sandbox_history';

export const currentSandboxApp = {
  id: '',
  title: '',
  prompt: '',
  code: '',
  activeFileTab: 'index.html',
  turns: [],
  publishedUrl: null
};

export let currentSandboxFiles = {
  'index.html': '',
  'style.css': '',
  'script.js': '',
  'README.md': ''
};

export let currentActiveFile = 'index.html';
export let sandboxOriginalAiFiles = {};
export const sandboxFileDirty = {
  'index.html': false,
  'style.css': false,
  'script.js': false,
  'README.md': false
};

export let currentSandboxRevisions = [];
export let currentSandboxAttachment = null;

/**
 * Attaches a pasted/uploaded image to Sandbox Studio.
 */
export function attachSandboxImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentSandboxAttachment = {
      name: file.name || 'Pasted Image',
      dataUrl: reader.result,
      type: file.type || 'image/png',
      size: file.size || 0
    };
    renderSandboxAttachmentPreview();
    showToast(`📸 Attached image: ${currentSandboxAttachment.name}`);
  };
  reader.readAsDataURL(file);
}

/**
 * Clears current Sandbox Studio attachment.
 */
export function removeSandboxAttachment() {
  currentSandboxAttachment = null;
  renderSandboxAttachmentPreview();
}

/**
 * Renders thumbnail in Sandbox initial or iteration attachment bar.
 */
export function renderSandboxAttachmentPreview() {
  const initBar = document.getElementById('sandbox-initial-attachment-bar');
  const initThumb = document.getElementById('sandbox-initial-attachment-thumb');
  const initName = document.getElementById('sandbox-initial-attachment-name');

  const iterBar = document.getElementById('sandbox-iter-attachment-bar');
  const iterThumb = document.getElementById('sandbox-iter-attachment-thumb');
  const iterName = document.getElementById('sandbox-iter-attachment-name');

  const show = !!(currentSandboxAttachment && currentSandboxAttachment.dataUrl);

  if (initBar) initBar.style.display = show ? 'flex' : 'none';
  if (initThumb && show) initThumb.src = currentSandboxAttachment.dataUrl;
  if (initName && show) initName.textContent = currentSandboxAttachment.name;

  if (iterBar) iterBar.style.display = show ? 'flex' : 'none';
  if (iterThumb && show) iterThumb.src = currentSandboxAttachment.dataUrl;
  if (iterName && show) iterName.textContent = currentSandboxAttachment.name;
}

/**
 * Pushes a rollback revision snapshot before modifications are applied.
 */
export function pushSandboxRevision(reason = 'Iteration') {
  if (!currentSandboxApp.code) return;
  const rev = {
    timestamp: Date.now(),
    reason: reason ? String(reason).slice(0, 60) : 'Revision',
    code: currentSandboxApp.code,
    files: { ...currentSandboxFiles }
  };
  currentSandboxRevisions.push(rev);
  if (currentSandboxRevisions.length > 20) {
    currentSandboxRevisions.shift();
  }
  updateUndoRevisionButton();
}

/**
 * Rolls back codebase to the prior revision.
 */
export function rollbackSandboxRevision(targetIndex = -1) {
  if (currentSandboxRevisions.length === 0) {
    showToast('No prior revisions available to rollback.');
    return;
  }

  let restoredRev;
  if (targetIndex >= 0 && targetIndex < currentSandboxRevisions.length) {
    restoredRev = currentSandboxRevisions[targetIndex];
    currentSandboxRevisions = currentSandboxRevisions.slice(0, targetIndex);
  } else {
    restoredRev = currentSandboxRevisions.pop();
  }

  if (!restoredRev) return;

  currentSandboxApp.code = restoredRev.code;
  currentSandboxFiles = { ...restoredRev.files };
  sandboxOriginalAiFiles = { ...restoredRev.files };
  Object.keys(sandboxFileDirty).forEach(k => sandboxFileDirty[k] = false);

  updateSandboxIframe(currentSandboxApp.code);
  selectVsCodeFile(currentActiveFile || 'index.html');

  currentSandboxApp.turns.push({
    sender: 'ai',
    text: `↺ **Rolled back** to previous application state (*${escapeHtml(restoredRev.reason || 'prior revision')}*).`
  });

  saveSandboxAppToHistory(currentSandboxApp);
  renderSandboxMessages();
  updateUndoRevisionButton();
  showToast('↺ Restored application to prior working version!');
}

/**
 * Updates visibility and tooltip of the Rollback Last Change button.
 */
export function updateUndoRevisionButton() {
  const btn = document.getElementById('btn-sandbox-undo-revision');
  if (btn) {
    btn.style.display = currentSandboxRevisions.length > 0 ? 'inline-flex' : 'none';
    if (currentSandboxRevisions.length > 0) {
      const last = currentSandboxRevisions[currentSandboxRevisions.length - 1];
      btn.title = `Rollback changes before: ${last.reason}`;
    }
  }
}

let activeExportApp = null;
const expandedSandboxIds = new Set();

/**
 * Decomposes a monolithic HTML web application string into separate clean files:
 * index.html, style.css, script.js, and README.md.
 */
export function decomposeHtmlCode(fullHtml, title = 'Web Application') {
  if (!fullHtml || typeof fullHtml !== 'string') {
    return {
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>' + escapeHtml(title) + '</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>' + escapeHtml(title) + '</h1>\n  <script src="script.js"></script>\n</body>\n</html>',
      'style.css': '/* Base styles */\nbody {\n  font-family: system-ui, sans-serif;\n  padding: 2rem;\n}',
      'script.js': '// Application interactive logic\nconsole.log("App ready");',
      'README.md': `# ${title}\n\nGenerated with Omni Chat Web App Sandbox Studio.`
    };
  }

  // 1. Extract CSS inside <style> tags
  const styleMatches = [...fullHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  let extractedCss = styleMatches.map(m => m[1].trim()).filter(Boolean).join('\n\n/* ----------------------------- */\n\n');
  if (!extractedCss) {
    extractedCss = '/* Application Stylesheet */\n* {\n  box-sizing: border-box;\n}\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}';
  }

  // 2. Extract JS inside <script> tags (ignoring tags with src="..." attribute)
  const scriptRegex = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  const scriptMatches = [...fullHtml.matchAll(scriptRegex)];
  let extractedJs = scriptMatches.map(m => m[1].trim()).filter(Boolean).join('\n\n// -----------------------------\n\n');
  if (!extractedJs) {
    extractedJs = '// Interactive Application Logic\ndocument.addEventListener("DOMContentLoaded", () => {\n  console.log("Web app running live!");\n});';
  }

  // 3. Clean HTML: Remove inline <style>...</style> and inline <script>...</script>
  let cleanHtml = fullHtml;
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleanHtml = cleanHtml.replace(/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/gi, '');

  // Ensure <link rel="stylesheet" href="style.css"> is present in head
  if (!cleanHtml.includes('style.css')) {
    if (cleanHtml.includes('</head>')) {
      cleanHtml = cleanHtml.replace('</head>', '  <link rel="stylesheet" href="style.css">\n</head>');
    } else {
      cleanHtml = '<link rel="stylesheet" href="style.css">\n' + cleanHtml;
    }
  }

  // Ensure <script src="script.js"></script> is present
  if (!cleanHtml.includes('script.js')) {
    if (cleanHtml.includes('</body>')) {
      cleanHtml = cleanHtml.replace('</body>', '  <script src="script.js"></script>\n</body>');
    } else {
      cleanHtml = cleanHtml + '\n<script src="script.js"></script>';
    }
  }

  cleanHtml = cleanHtml.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  // 4. Generate README.md
  const readme = `# ${title}

An interactive, responsive single-page application crafted with **Omni Chat Web App Sandbox Studio**.

## 📁 Codebase Architecture
- \`src/index.html\`: Semantic markup skeleton, meta tags, and component DOM tree
- \`src/style.css\`: Design tokens, layout grids, responsive media queries, and visual animations
- \`src/script.js\`: Reactive state store, event listeners, dynamic DOM updates, and interactivity
- \`README.md\`: Project documentation and architecture guide

## ⚡ Live Editing & Controls
- **Edit & Save**: Modify any file in the VS Code editor tabs and hit **Ctrl+S** or click **Save & Run** to hot-reload the live preview instantly.
- **View Modes**: Switch between **Split View**, **Code Focus** (100% editor), or **Live Preview Focus** (100% preview) using the top bar switcher.
- **Exporting**: Download the project as a full multi-file **ZIP** bundle or standalone **HTML** via the Export button.
- **Cloud Hosting**: Click **Publish App** to deploy live to Puter web hosting with a public shareable URL.
`;

  return {
    'index.html': cleanHtml,
    'style.css': extractedCss,
    'script.js': extractedJs,
    'README.md': readme
  };
}

/**
 * Re-bundles decomposed files into a single unified HTML document for iframe execution.
 */
export function bundleCodebase(files) {
  if (!files) return '';
  let indexHtml = files['index.html'] || '<!DOCTYPE html><html><head><title>App</title></head><body></body></html>';
  const css = files['style.css'] || '';
  const js = files['script.js'] || '';

  // Inject CSS
  const styleBlock = `\n<style>\n${css}\n</style>\n`;
  if (indexHtml.includes('<link rel="stylesheet" href="style.css">')) {
    indexHtml = indexHtml.replace('<link rel="stylesheet" href="style.css">', styleBlock);
  } else if (indexHtml.includes('</head>')) {
    indexHtml = indexHtml.replace('</head>', `${styleBlock}</head>`);
  } else {
    indexHtml = `${styleBlock}\n${indexHtml}`;
  }

  // Inject JS
  const scriptBlock = `\n<script>\n${js}\n</script>\n`;
  if (indexHtml.includes('<script src="script.js"></script>')) {
    indexHtml = indexHtml.replace('<script src="script.js"></script>', scriptBlock);
  } else if (indexHtml.includes('</body>')) {
    indexHtml = indexHtml.replace('</body>', `${scriptBlock}</body>`);
  } else {
    indexHtml = `${indexHtml}\n${scriptBlock}`;
  }

  return indexHtml;
}

export function initSandboxStudio() {
  const btnTopbarSandbox = document.getElementById('btn-topbar-sandbox');
  const btnSidebarCreateSandbox = document.getElementById('btn-sidebar-create-sandbox');
  const btnSandboxStudioBack = document.getElementById('btn-sandbox-studio-back');
  const btnSandboxNew = document.getElementById('btn-sandbox-new');
  const btnSandboxReload = document.getElementById('btn-sandbox-reload');
  const btnBrowserReload = document.getElementById('btn-browser-reload');
  const btnBrowserNewtab = document.getElementById('btn-browser-newtab');
  const btnSandboxPublish = document.getElementById('btn-sandbox-publish');
  const btnSandboxGenerate = document.getElementById('btn-sandbox-generate');
  const btnSandboxIterationSubmit = document.getElementById('btn-sandbox-iteration-submit');
  const tabBtnSandboxChat = document.getElementById('tab-btn-sandbox-chat');
  const tabBtnSandboxCode = document.getElementById('tab-btn-sandbox-code');
  const btnSandboxVpDesktop = document.getElementById('btn-sandbox-vp-desktop');
  const btnSandboxVpMobile = document.getElementById('btn-sandbox-vp-mobile');
  const btnSandboxRunCode = document.getElementById('btn-sandbox-run-code');
  const btnSandboxRevertCode = document.getElementById('btn-sandbox-revert-code');
  const btnSandboxCopyCode = document.getElementById('btn-sandbox-copy-code');
  const btnSandboxCodeExport = document.getElementById('btn-sandbox-code-export');
  const btnSandboxExportToggle = document.getElementById('btn-sandbox-export-toggle');
  const btnSandboxDownload = document.getElementById('btn-sandbox-download');
  const btnSandboxHistoryToggle = document.getElementById('btn-sandbox-history-toggle');
  const btnCloseSandboxHistory = document.getElementById('btn-close-sandbox-history');
  const btnClearSandboxHistory = document.getElementById('btn-clear-sandbox-history');
  const btnCloseExportModal = document.getElementById('btn-close-export-modal');
  const btnCancelExportModal = document.getElementById('btn-cancel-export-modal');
  const btnExportZip = document.getElementById('btn-export-zip');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnCopySandboxPublishedLink = document.getElementById('btn-copy-sandbox-published-link');
  const btnGithubToggle = document.getElementById('btn-sandbox-github-toggle');
  const btnCloseGithub = document.getElementById('btn-close-sandbox-github');
  const btnFetchGithub = document.getElementById('btn-sandbox-github-fetch');
  const githubDrawer = document.getElementById('sandbox-github-drawer');
  const folderSrc = document.getElementById('vscode-folder-src');
  const btnToggleSidebar = document.getElementById('btn-vscode-toggle-sidebar');

  const openStudio = () => openSandboxStudio();

  if (btnTopbarSandbox) btnTopbarSandbox.addEventListener('click', openStudio);
  if (btnSidebarCreateSandbox) btnSidebarCreateSandbox.addEventListener('click', () => openSandboxStudio());
  if (btnSandboxStudioBack) btnSandboxStudioBack.addEventListener('click', closeSandboxStudio);
  if (btnSandboxNew) btnSandboxNew.addEventListener('click', resetSandboxStudio);

  // Reload buttons
  const reloadPreview = () => {
    if (currentSandboxApp.code) {
      updateSandboxIframe(currentSandboxApp.code);
      showToast('Live preview refreshed');
    }
  };
  if (btnSandboxReload) btnSandboxReload.addEventListener('click', reloadPreview);
  if (btnBrowserReload) btnBrowserReload.addEventListener('click', reloadPreview);

  if (btnBrowserNewtab) {
    btnBrowserNewtab.addEventListener('click', () => {
      if (!currentSandboxApp.code) return;
      const blob = new Blob([prepareExecutableHtml(currentSandboxApp.code, 'html')], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  // View Mode Switcher buttons
  const btnVmSplit = document.getElementById('btn-sandbox-vm-split');
  const btnVmCode = document.getElementById('btn-sandbox-vm-code');
  const btnVmPreview = document.getElementById('btn-sandbox-vm-preview');
  if (btnVmSplit) btnVmSplit.addEventListener('click', () => setSandboxViewMode('split'));
  if (btnVmCode) btnVmCode.addEventListener('click', () => setSandboxViewMode('code'));
  if (btnVmPreview) btnVmPreview.addEventListener('click', () => setSandboxViewMode('preview'));

  // Mobile drawer toggle
  const mobileToggle = document.getElementById('sandbox-mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.sandbox-toggle-pill');
      if (!btn) return;
      const pane = btn.getAttribute('data-pane');
      mobileToggle.querySelectorAll('.sandbox-toggle-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = document.getElementById('sandbox-studio-view');
      if (view) {
        view.classList.toggle('mobile-pane-right', pane === 'right');
        view.classList.toggle('mobile-pane-left', pane === 'left');
      }
    });
  }

  if (btnSandboxPublish) btnSandboxPublish.addEventListener('click', publishSandboxApp);
  if (btnSandboxGenerate) btnSandboxGenerate.addEventListener('click', () => handleSandboxInitialGenerate());
  if (btnSandboxIterationSubmit) btnSandboxIterationSubmit.addEventListener('click', handleSandboxIterate);

  // Suggestion prompt chips in initial state & starter chips in github panel
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.sandbox-prompt-chip, #sandbox-github-drawer .starter-chip');
    if (!chip) return;
    const tplKey = chip.getAttribute('data-template');
    const prompt = chip.getAttribute('data-prompt') || chip.textContent.trim();
    const chipLabel = chip.textContent.trim().replace(/^[\p{Emoji}\s]+/u, '').trim() || chip.textContent.trim();

    if (tplKey && STARTER_TEMPLATES[tplKey]) {
      const code = STARTER_TEMPLATES[tplKey];
      showSandboxBuilderOverlay(`Loading ${chipLabel}...`, prompt);
      setTimeout(() => {
        updateSandboxBuilderStep(2, 'Generated semantic HTML layout', '<!DOCTYPE html>\n<html>');
      }, 150);
      setTimeout(() => {
        updateSandboxBuilderStep(3, 'Applied responsive styling & theme', '/* Application styles */');
      }, 300);
      setTimeout(() => {
        updateSandboxBuilderStep(4, 'Initialized state & event handlers', '// Interactive logic');
      }, 450);
      setTimeout(() => {
        loadSandboxApp(chipLabel, code, prompt);
        hideSandboxBuilderOverlay();
        showToast(`✨ Loaded ${chipLabel} live!`);
        if (githubDrawer) githubDrawer.style.display = 'none';
      }, 650);
      return;
    }

    if (prompt) {
      const initialPrompt = document.getElementById('sandbox-initial-prompt');
      if (initialPrompt) initialPrompt.value = prompt;
      handleSandboxInitialGenerate(prompt, chipLabel);
    }
  });

  const sandboxInitialPrompt = document.getElementById('sandbox-initial-prompt');
  if (sandboxInitialPrompt) {
    const resizeInitialPrompt = () => {
      sandboxInitialPrompt.style.height = 'auto';
      sandboxInitialPrompt.style.height = Math.min(sandboxInitialPrompt.scrollHeight, 260) + 'px';
    };
    sandboxInitialPrompt.addEventListener('input', resizeInitialPrompt);
    sandboxInitialPrompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSandboxInitialGenerate();
      }
    });

    sandboxInitialPrompt.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) attachSandboxImage(file);
          return;
        }
      }
    });
  }

  const sandboxIterationInput = document.getElementById('sandbox-iteration-input');
  if (sandboxIterationInput) {
    const resizeIterationInput = () => {
      sandboxIterationInput.style.height = 'auto';
      sandboxIterationInput.style.height = Math.min(sandboxIterationInput.scrollHeight, 180) + 'px';
    };
    sandboxIterationInput.addEventListener('input', resizeIterationInput);

    sandboxIterationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSandboxIterate();
      }
    });

    sandboxIterationInput.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) attachSandboxImage(file);
          return;
        }
      }
    });
  }

  const btnRemoveInitAttachment = document.getElementById('btn-remove-sandbox-initial-attachment');
  if (btnRemoveInitAttachment) btnRemoveInitAttachment.addEventListener('click', removeSandboxAttachment);

  const btnRemoveIterAttachment = document.getElementById('btn-remove-sandbox-iter-attachment');
  if (btnRemoveIterAttachment) btnRemoveIterAttachment.addEventListener('click', removeSandboxAttachment);

  const btnSandboxUndoRevision = document.getElementById('btn-sandbox-undo-revision');
  if (btnSandboxUndoRevision) {
    btnSandboxUndoRevision.addEventListener('click', () => {
      rollbackSandboxRevision();
    });
  }

  const btnInitialViewAllHistory = document.getElementById('btn-initial-view-all-history');
  if (btnInitialViewAllHistory) {
    btnInitialViewAllHistory.addEventListener('click', toggleSandboxHistoryDrawer);
  }

  if (tabBtnSandboxChat) tabBtnSandboxChat.addEventListener('click', () => switchSandboxSubTab('chat'));
  if (tabBtnSandboxCode) tabBtnSandboxCode.addEventListener('click', () => switchSandboxSubTab('code'));

  const iframe = document.getElementById('sandbox-studio-iframe');
  if (btnSandboxVpDesktop && btnSandboxVpMobile && iframe) {
    btnSandboxVpDesktop.addEventListener('click', () => {
      btnSandboxVpDesktop.classList.add('active');
      btnSandboxVpMobile.classList.remove('active');
      iframe.classList.remove('mobile-viewport');
    });
    btnSandboxVpMobile.addEventListener('click', () => {
      btnSandboxVpMobile.classList.add('active');
      btnSandboxVpDesktop.classList.remove('active');
      iframe.classList.add('mobile-viewport');
    });
  }

  // VS Code File Tabs and File Tree wiring
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.vscode-tab');
    if (tab) {
      const file = tab.getAttribute('data-file');
      if (file) selectVsCodeFile(file);
      return;
    }
    const treeItem = e.target.closest('.vscode-tree-item');
    if (treeItem) {
      const file = treeItem.getAttribute('data-file');
      if (file) selectVsCodeFile(file);
      return;
    }
  });

  // VS Code Folder toggle
  if (folderSrc) {
    folderSrc.addEventListener('click', () => {
      folderSrc.classList.toggle('open');
    });
  }

  // VS Code Sidebar toggle
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      const sidebar = document.getElementById('vscode-sidebar');
      if (sidebar) sidebar.classList.toggle('collapsed');
    });
  }

  // Code editor listeners
  const editor = document.getElementById('sandbox-code-editor');
  if (editor) {
    editor.addEventListener('input', () => {
      updateEditorLineNumbers();
      sandboxFileDirty[currentActiveFile] = true;
      updateDirtyIndicators();
    });
    editor.addEventListener('scroll', syncEditorScroll);
    editor.addEventListener('click', updateCursorStatus);
    editor.addEventListener('keyup', updateCursorStatus);

    // Support Tab & Shift-Tab for code indentation
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        if (e.shiftKey) {
          // Outdent
          if (editor.value.substring(start - 2, start) === '  ') {
            editor.value = editor.value.substring(0, start - 2) + editor.value.substring(start);
            editor.selectionStart = editor.selectionEnd = start - 2;
          }
        } else {
          // Indent 2 spaces
          editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 2;
        }
        updateEditorLineNumbers();
        sandboxFileDirty[currentActiveFile] = true;
        updateDirtyIndicators();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAndRunCodebase();
      }
    });
  }

  // Global Ctrl+S handler inside Sandbox view
  window.addEventListener('keydown', (e) => {
    const sandboxView = document.getElementById('sandbox-studio-view');
    if (sandboxView && sandboxView.style.display !== 'none') {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAndRunCodebase();
      }
    }
  });

  if (btnSandboxRunCode) {
    btnSandboxRunCode.addEventListener('click', saveAndRunCodebase);
  }

  if (btnSandboxRevertCode) {
    btnSandboxRevertCode.addEventListener('click', () => {
      if (sandboxOriginalAiFiles[currentActiveFile] !== undefined) {
        currentSandboxFiles[currentActiveFile] = sandboxOriginalAiFiles[currentActiveFile];
        if (editor) editor.value = currentSandboxFiles[currentActiveFile];
        sandboxFileDirty[currentActiveFile] = false;
        updateEditorLineNumbers();
        updateDirtyIndicators();
        showToast(`Reverted ${currentActiveFile} to AI version`);
      }
    });
  }

  if (btnSandboxCopyCode) {
    btnSandboxCopyCode.addEventListener('click', () => {
      if (!currentSandboxFiles[currentActiveFile]) return;
      navigator.clipboard.writeText(currentSandboxFiles[currentActiveFile]);
      showToast(`Copied ${currentActiveFile} to clipboard`);
    });
  }

  const openExportHandler = () => openSandboxExportModal(currentSandboxApp);
  if (btnSandboxExportToggle) btnSandboxExportToggle.addEventListener('click', openExportHandler);
  if (btnSandboxCodeExport) btnSandboxCodeExport.addEventListener('click', openExportHandler);
  if (btnSandboxDownload) btnSandboxDownload.addEventListener('click', openExportHandler);

  if (btnCloseExportModal) btnCloseExportModal.addEventListener('click', closeSandboxExportModal);
  if (btnCancelExportModal) btnCancelExportModal.addEventListener('click', closeSandboxExportModal);
  if (btnExportZip) btnExportZip.addEventListener('click', () => exportSandboxZip(activeExportApp || currentSandboxApp));
  if (btnExportHtml) btnExportHtml.addEventListener('click', () => exportSandboxHtml(activeExportApp || currentSandboxApp));

  // GitHub Drawer wiring
  if (btnGithubToggle && githubDrawer) {
    btnGithubToggle.addEventListener('click', () => {
      githubDrawer.style.display = (githubDrawer.style.display === 'none' || !githubDrawer.style.display) ? 'flex' : 'none';
    });
  }
  if (btnCloseGithub && githubDrawer) {
    btnCloseGithub.addEventListener('click', () => {
      githubDrawer.style.display = 'none';
    });
  }

  if (btnFetchGithub) {
    btnFetchGithub.addEventListener('click', async () => {
      const input = document.getElementById('sandbox-github-input');
      const url = input ? input.value.trim() : '';
      if (!url) {
        showToast('Please enter a GitHub repository or raw HTML link.');
        return;
      }
      try {
        let rawUrl = url;
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match && !url.includes('raw.githubusercontent.com')) {
          rawUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/index.html`;
        }
        showToast('Fetching code from GitHub...');
        let res = await fetch(rawUrl);
        if (!res.ok && match) {
          res = await fetch(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/master/index.html`);
        }
        if (res.ok) {
          const code = await res.text();
          const title = match ? `${match[1]}/${match[2]}` : 'GitHub App';
          loadSandboxApp(title, code, `Imported from ${url}`);
          if (githubDrawer) githubDrawer.style.display = 'none';
          showToast('Imported from GitHub successfully!');
        } else {
          showToast('Could not find index.html in repository. Check URL.');
        }
      } catch (err) {
        showToast('Failed to import: ' + err.message);
      }
    });
  }

  // History Drawer
  if (btnSandboxHistoryToggle) {
    btnSandboxHistoryToggle.addEventListener('click', toggleSandboxHistoryDrawer);
  }
  if (btnCloseSandboxHistory) {
    btnCloseSandboxHistory.addEventListener('click', closeSandboxHistoryDrawer);
  }
  if (btnClearSandboxHistory) {
    btnClearSandboxHistory.addEventListener('click', clearSandboxHistory);
  }

  if (btnCopySandboxPublishedLink) {
    btnCopySandboxPublishedLink.addEventListener('click', () => {
      if (currentSandboxApp.publishedUrl) {
        navigator.clipboard.writeText(currentSandboxApp.publishedUrl);
        showToast('Published link copied!');
      }
    });
  }

  renderSidebarSandboxAppsList();
  renderSandboxHistoryBadge();
}

export function openSandboxStudio(initialApp = null) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('mobile-open');
  }

  const chatTopbar = document.getElementById('chat-topbar');
  const messagesContainer = document.getElementById('messages-container');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');
  const artifactsPane = document.getElementById('artifacts-pane');
  const projectStudioView = document.getElementById('project-studio-view');
  const sandboxStudioView = document.getElementById('sandbox-studio-view');

  if (chatTopbar) chatTopbar.style.display = 'none';
  if (messagesContainer) messagesContainer.style.display = 'none';
  if (inputAreaWrapper) inputAreaWrapper.style.display = 'none';
  if (btnScrollBottom) btnScrollBottom.style.display = 'none';
  if (artifactsPane) artifactsPane.style.display = 'none';
  if (projectStudioView) projectStudioView.style.display = 'none';

  if (sandboxStudioView) {
    sandboxStudioView.style.display = 'flex';
    sandboxStudioView.classList.add('mobile-pane-left');
    sandboxStudioView.classList.remove('mobile-pane-right');
  }

  renderSandboxHistoryBadge();

  if (initialApp && initialApp.code) {
    loadSandboxApp(
      initialApp.title || 'Web Application',
      initialApp.code,
      initialApp.prompt || '',
      initialApp.id || null,
      initialApp.turns || null,
      initialApp.revisions || null
    );
  } else if (currentSandboxApp && currentSandboxApp.code) {
    renderSandboxStudioState();
  } else {
    resetSandboxStudio();
  }
  renderSidebarSandboxAppsList();
}

export function closeSandboxStudio() {
  const sandboxStudioView = document.getElementById('sandbox-studio-view');
  const chatTopbar = document.getElementById('chat-topbar');
  const messagesContainer = document.getElementById('messages-container');
  const inputAreaWrapper = document.getElementById('input-area-wrapper');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');

  if (sandboxStudioView) sandboxStudioView.style.display = 'none';
  if (chatTopbar) chatTopbar.style.display = '';
  if (messagesContainer) messagesContainer.style.display = '';
  if (inputAreaWrapper) inputAreaWrapper.style.display = '';
  if (btnScrollBottom) btnScrollBottom.style.display = '';

  renderSidebarSandboxAppsList();
}

export function resetSandboxStudio() {
  currentSandboxApp.id = '';
  currentSandboxApp.title = '';
  currentSandboxApp.prompt = '';
  currentSandboxApp.code = '';
  currentSandboxApp.activeFileTab = 'index.html';
  currentSandboxApp.turns = [];
  currentSandboxApp.publishedUrl = null;

  currentSandboxFiles = {
    'index.html': '',
    'style.css': '',
    'script.js': '',
    'README.md': ''
  };
  sandboxOriginalAiFiles = {};
  Object.keys(sandboxFileDirty).forEach(k => sandboxFileDirty[k] = false);

  currentSandboxRevisions = [];
  updateUndoRevisionButton();

  const iterInput = document.getElementById('sandbox-iteration-input');
  if (iterInput) {
    iterInput.value = '';
    iterInput.style.height = 'auto';
  }

  const title = document.getElementById('sandbox-header-title');
  const subtitle = document.getElementById('sandbox-header-subtitle');
  if (title) title.textContent = 'Web App Sandbox Studio';
  if (subtitle) subtitle.textContent = 'AI Codebase & Live Interactive Preview';

  const initialState = document.getElementById('sandbox-initial-state');
  const activeChat = document.getElementById('sandbox-active-chat');
  const standby = document.getElementById('sandbox-preview-standby');
  const frameWrap = document.getElementById('sandbox-preview-frame-wrap');
  const publishedBanner = document.getElementById('sandbox-published-banner');
  const iframe = document.getElementById('sandbox-studio-iframe');
  const overlay = document.getElementById('sandbox-builder-overlay');

  if (initialState) initialState.style.display = 'flex';
  if (activeChat) activeChat.style.display = 'none';
  if (standby) standby.style.display = 'flex';
  if (frameWrap) frameWrap.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (publishedBanner) publishedBanner.style.display = 'none';
  if (iframe) iframe.srcdoc = '';

  const initialPrompt = document.getElementById('sandbox-initial-prompt');
  if (initialPrompt) {
    initialPrompt.value = '';
    initialPrompt.style.height = 'auto';
  }

  removeSandboxAttachment();

  renderSidebarSandboxAppsList();
  renderSandboxRecentBuilds();
  switchSandboxSubTab('chat');
}

export function switchSandboxSubTab(tab) {
  const tabBtnChat = document.getElementById('tab-btn-sandbox-chat');
  const tabBtnCode = document.getElementById('tab-btn-sandbox-code');
  const paneChat = document.getElementById('sandbox-pane-chat');
  const paneCode = document.getElementById('sandbox-pane-code');

  if (tab === 'chat') {
    tabBtnChat?.classList.add('active');
    tabBtnCode?.classList.remove('active');
    if (paneChat) paneChat.style.display = 'flex';
    if (paneCode) paneCode.style.display = 'none';
  } else {
    tabBtnCode?.classList.add('active');
    tabBtnChat?.classList.remove('active');
    if (paneChat) paneChat.style.display = 'none';
    if (paneCode) paneCode.style.display = 'flex';
    selectVsCodeFile(currentActiveFile || 'index.html');
  }
}

export function setSandboxViewMode(mode) {
  const grid = document.getElementById('sandbox-content-grid');
  const btnSplit = document.getElementById('btn-sandbox-vm-split');
  const btnCode = document.getElementById('btn-sandbox-vm-code');
  const btnPreview = document.getElementById('btn-sandbox-vm-preview');

  if (!grid) return;
  grid.classList.remove('view-code-only', 'view-preview-only');
  btnSplit?.classList.remove('active');
  btnCode?.classList.remove('active');
  btnPreview?.classList.remove('active');

  if (mode === 'code') {
    grid.classList.add('view-code-only');
    btnCode?.classList.add('active');
  } else if (mode === 'preview') {
    grid.classList.add('view-preview-only');
    btnPreview?.classList.add('active');
  } else {
    btnSplit?.classList.add('active');
  }
}

export function loadSandboxApp(title, code, prompt = '', existingId = null, existingTurns = null, existingRevisions = null) {
  currentSandboxApp.id = existingId || ('sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  expandedSandboxIds.add(currentSandboxApp.id);
  currentSandboxApp.title = title || 'Interactive Web Application';
  currentSandboxApp.prompt = prompt || (existingTurns && existingTurns[0]?.text) || '';
  currentSandboxApp.code = code;
  currentSandboxApp.publishedUrl = null;

  // Decompose into multi-file codebase
  const decomposed = decomposeHtmlCode(code, currentSandboxApp.title);
  currentSandboxFiles = decomposed;
  sandboxOriginalAiFiles = { ...decomposed };
  Object.keys(sandboxFileDirty).forEach(k => sandboxFileDirty[k] = false);

  if (existingTurns && existingTurns.length > 0) {
    currentSandboxApp.turns = existingTurns;
  } else if (prompt) {
    currentSandboxApp.turns = [
      { sender: 'user', text: prompt },
      { sender: 'ai', text: `Generated **${currentSandboxApp.title}** with full responsive layout and interactivity.` }
    ];
  } else {
    currentSandboxApp.turns = [
      { sender: 'ai', text: `Loaded **${currentSandboxApp.title}** into Sandbox Studio.` }
    ];
  }

  currentSandboxRevisions = (existingRevisions && Array.isArray(existingRevisions)) ? [...existingRevisions] : [];
  updateUndoRevisionButton();

  saveSandboxAppToHistory(currentSandboxApp);
  renderSandboxStudioState();
}

export function updateSandboxIframe(code) {
  const iframe = document.getElementById('sandbox-studio-iframe');
  if (!iframe) return;
  iframe.srcdoc = prepareExecutableHtml(code, 'html');
}

export function renderSandboxStudioState() {
  if (!currentSandboxApp.code) {
    resetSandboxStudio();
    return;
  }

  const title = document.getElementById('sandbox-header-title');
  const subtitle = document.getElementById('sandbox-header-subtitle');
  if (title) title.textContent = currentSandboxApp.title;
  if (subtitle) subtitle.textContent = 'Live Interactive Preview Active';

  const initialState = document.getElementById('sandbox-initial-state');
  const activeChat = document.getElementById('sandbox-active-chat');
  const standby = document.getElementById('sandbox-preview-standby');
  const frameWrap = document.getElementById('sandbox-preview-frame-wrap');

  if (initialState) initialState.style.display = 'none';
  if (activeChat) activeChat.style.display = 'flex';
  if (standby) standby.style.display = 'none';
  if (frameWrap) frameWrap.style.display = 'flex';

  // Ensure files are decomposed
  if (!currentSandboxFiles['index.html']) {
    currentSandboxFiles = decomposeHtmlCode(currentSandboxApp.code, currentSandboxApp.title);
    sandboxOriginalAiFiles = { ...currentSandboxFiles };
  }

  updateSandboxIframe(currentSandboxApp.code);
  renderSandboxMessages();
  selectVsCodeFile(currentActiveFile || 'index.html');
}

export function renderSandboxMessages() {
  const thread = document.getElementById('sandbox-messages-thread');
  if (!thread) return;
  thread.innerHTML = '';

  currentSandboxApp.turns.forEach((turn, idx) => {
    const bubble = document.createElement('div');
    bubble.className = `sandbox-chat-bubble ${turn.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;

    if (turn.sender === 'user') {
      if (turn.attachment && turn.attachment.dataUrl) {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'chat-message-image-wrap';
        imgWrap.style.marginBottom = '0.45rem';
        const img = document.createElement('img');
        img.src = turn.attachment.dataUrl;
        img.alt = turn.attachment.name || 'Attached image';
        img.className = 'chat-message-image-thumb';
        img.title = 'Click to enlarge image';
        img.addEventListener('click', () => {
          openImageLightbox(turn.attachment.dataUrl, turn.attachment.name);
        });
        imgWrap.appendChild(img);
        bubble.appendChild(imgWrap);
      }
      if (turn.text) {
        const textSpan = document.createElement('div');
        textSpan.textContent = turn.text;
        bubble.appendChild(textSpan);
      }
    } else {
      const header = document.createElement('div');
      header.className = 'sandbox-building-header';
      header.style.marginBottom = '0.5rem';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';

      const isFirstAi = idx <= 1;
      const turnLabel = isFirstAi ? (currentSandboxApp.title || 'AI Web App Architect') : `Revision #${Math.floor(idx / 2)}`;

      const leftWrap = document.createElement('div');
      leftWrap.style.display = 'flex';
      leftWrap.style.alignItems = 'center';
      leftWrap.style.gap = '0.4rem';
      leftWrap.innerHTML = `
        <div class="sandbox-building-icon-wrap" style="width:24px;height:24px;font-size:0.75rem;background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.3);animation:none;color:#10b981;">✓</div>
        <div class="sandbox-building-title" style="font-size:0.85rem;color:var(--text-primary);font-weight:600;">${escapeHtml(turnLabel)}</div>
      `;
      header.appendChild(leftWrap);

      if (!isFirstAi && currentSandboxRevisions.length > 0) {
        const btnRollbackTurn = document.createElement('button');
        btnRollbackTurn.className = 'btn-link-xs';
        btnRollbackTurn.style.fontSize = '0.72rem';
        btnRollbackTurn.textContent = '↺ Rollback';
        btnRollbackTurn.title = 'Revert codebase to previous revision';
        btnRollbackTurn.addEventListener('click', () => {
          rollbackSandboxRevision();
        });
        header.appendChild(btnRollbackTurn);
      }

      bubble.appendChild(header);

      const textSpan = document.createElement('div');
      textSpan.innerHTML = formatMarkdown(turn.text);
      bubble.appendChild(textSpan);

      const fileBadge = document.createElement('div');
      fileBadge.className = 'sandbox-card-files';
      fileBadge.style.marginTop = '0.5rem';
      fileBadge.innerHTML = `
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <span class="sandbox-file-generation-badge">📄 src/index.html</span>
          <span class="sandbox-file-generation-badge">🎨 src/style.css</span>
          <span class="sandbox-file-generation-badge">⚡ src/script.js</span>
          <span class="sandbox-file-generation-badge">📝 README.md</span>
        </div>
      `;
      bubble.appendChild(fileBadge);
    }

    thread.appendChild(bubble);
  });

  thread.scrollTop = thread.scrollHeight;
}

export function selectVsCodeFile(filename) {
  if (!currentSandboxFiles[filename] && filename !== 'README.md' && filename !== 'index.html' && filename !== 'style.css' && filename !== 'script.js') {
    filename = 'index.html';
  }

  const editor = document.getElementById('sandbox-code-editor');
  // Save current active file buffer from editor if modified
  if (editor && currentActiveFile && currentSandboxFiles[currentActiveFile] !== undefined) {
    currentSandboxFiles[currentActiveFile] = editor.value;
  }

  currentActiveFile = filename;

  // Update tabs active state
  document.querySelectorAll('.vscode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-file') === filename);
  });

  // Update tree items active state
  document.querySelectorAll('.vscode-tree-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-file') === filename);
  });

  // Update breadcrumb
  const bcCurrent = document.getElementById('vscode-bc-current-file');
  if (bcCurrent) bcCurrent.textContent = filename;

  // Update status bar language
  const statusLang = document.getElementById('vscode-status-lang');
  if (statusLang) {
    if (filename.endsWith('.html')) statusLang.textContent = 'HTML';
    else if (filename.endsWith('.css')) statusLang.textContent = 'CSS';
    else if (filename.endsWith('.js')) statusLang.textContent = 'JavaScript';
    else if (filename.endsWith('.md')) statusLang.textContent = 'Markdown';
    else statusLang.textContent = 'Plain Text';
  }

  // Update editor value
  if (editor) {
    editor.value = currentSandboxFiles[filename] || '';
    updateEditorLineNumbers();
    editor.scrollTop = 0;
  }

  updateDirtyIndicators();
  updateCursorStatus();
}

function updateDirtyIndicators() {
  const isAnyDirty = Object.values(sandboxFileDirty).some(Boolean);
  const editorStatus = document.getElementById('sandbox-editor-status');
  if (editorStatus) {
    if (isAnyDirty) {
      editorStatus.textContent = '● Unsaved changes (Ctrl+S)';
      editorStatus.style.color = '#38bdf8';
    } else {
      editorStatus.textContent = '✓ Saved';
      editorStatus.style.color = '#10b981';
    }
  }

  ['index.html', 'style.css', 'script.js', 'README.md'].forEach(file => {
    const dirty = !!sandboxFileDirty[file];
    const tabDirty = document.querySelector(`.vscode-tab-dirty[data-file="${file}"]`);
    const treeDirty = document.querySelector(`.vscode-dirty-dot[data-file="${file}"]`);
    if (tabDirty) tabDirty.style.display = dirty ? 'inline' : 'none';
    if (treeDirty) treeDirty.style.display = dirty ? 'inline' : 'none';
  });
}

function updateCursorStatus() {
  const editor = document.getElementById('sandbox-code-editor');
  const cursorStatus = document.getElementById('vscode-status-cursor');
  if (!editor || !cursorStatus) return;

  const selStart = editor.selectionStart || 0;
  const textBefore = editor.value.substring(0, selStart);
  const lines = textBefore.split('\n');
  const currentLine = lines.length;
  const currentCol = lines[lines.length - 1].length + 1;
  cursorStatus.textContent = `Ln ${currentLine}, Col ${currentCol}`;
}

export function saveAndRunCodebase() {
  const editor = document.getElementById('sandbox-code-editor');
  if (editor && currentActiveFile) {
    currentSandboxFiles[currentActiveFile] = editor.value;
  }

  // Re-bundle into single executable HTML
  const bundledHtml = bundleCodebase(currentSandboxFiles);
  currentSandboxApp.code = bundledHtml;

  // Clear all dirty flags
  Object.keys(sandboxFileDirty).forEach(k => sandboxFileDirty[k] = false);
  updateDirtyIndicators();

  // Reload iframe live preview
  updateSandboxIframe(bundledHtml);
  saveSandboxAppToHistory(currentSandboxApp);

  const editorStatus = document.getElementById('sandbox-editor-status');
  if (editorStatus) {
    editorStatus.textContent = '✓ Saved & Live';
    editorStatus.style.color = '#10b981';
  }

  showToast('⚡ Live preview updated with your code changes!');
}

export function renderSandboxCodeView() {
  selectVsCodeFile(currentActiveFile || 'index.html');
}

function updateEditorLineNumbers() {
  const editor = document.getElementById('sandbox-code-editor');
  const gutter = document.getElementById('sandbox-editor-gutter');
  const stats = document.getElementById('sandbox-code-stats');
  if (!editor || !gutter) return;

  const linesCount = (editor.value.match(/\n/g) || []).length + 1;
  const numbers = [];
  for (let i = 1; i <= linesCount; i++) {
    numbers.push(i);
  }
  gutter.textContent = numbers.join('\n');
  if (stats) stats.textContent = `${linesCount} lines`;
}

function syncEditorScroll() {
  const editor = document.getElementById('sandbox-code-editor');
  const gutter = document.getElementById('sandbox-editor-gutter');
  if (editor && gutter) {
    gutter.scrollTop = editor.scrollTop;
  }
}

// Live Builder Progress Overlay & Terminal Functions
function showSandboxBuilderOverlay(title, prompt) {
  const overlay = document.getElementById('sandbox-builder-overlay');
  const titleEl = document.getElementById('sandbox-builder-title');
  const promptEl = document.getElementById('sandbox-builder-prompt');
  const standby = document.getElementById('sandbox-preview-standby');
  const frameWrap = document.getElementById('sandbox-preview-frame-wrap');

  if (standby) standby.style.display = 'none';
  if (frameWrap) frameWrap.style.display = 'flex';
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
  }
  if (titleEl) titleEl.textContent = title || 'Architecting Web Application...';
  if (promptEl) promptEl.textContent = prompt ? `"${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"` : '';

  // Reset steps
  for (let i = 1; i <= 5; i++) {
    const row = document.getElementById(`bstep-${i}`);
    if (row) {
      row.classList.remove('active', 'done');
      if (i === 1) row.classList.add('active');
    }
  }

  const termStats = document.getElementById('builder-terminal-stats');
  const termBody = document.getElementById('builder-terminal-body');
  if (termStats) termStats.textContent = 'Stream initializing...';
  if (termBody) termBody.textContent = '// Connecting to LLM model and streaming compiler...';
}

function updateSandboxBuilderStep(stepNumber, statsText, codeSnippet) {
  for (let i = 1; i <= 5; i++) {
    const row = document.getElementById(`bstep-${i}`);
    if (!row) continue;
    if (i < stepNumber) {
      row.classList.remove('active');
      row.classList.add('done');
    } else if (i === stepNumber) {
      row.classList.remove('done');
      row.classList.add('active');
    } else {
      row.classList.remove('active', 'done');
    }
  }

  const termStats = document.getElementById('builder-terminal-stats');
  const termBody = document.getElementById('builder-terminal-body');
  if (termStats && statsText) termStats.textContent = statsText;
  if (termBody && codeSnippet) {
    termBody.textContent = codeSnippet.slice(-250);
  }
}

function hideSandboxBuilderOverlay() {
  const overlay = document.getElementById('sandbox-builder-overlay');
  if (!overlay) return;
  const step5 = document.getElementById('bstep-5');
  if (step5) {
    step5.classList.remove('active');
    step5.classList.add('done');
  }
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.25s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '1';
    }, 260);
  }, 400);
}

export async function handleSandboxInitialGenerate(overridePrompt = null, customTitle = null) {
  const promptInput = document.getElementById('sandbox-initial-prompt');
  const prompt = (typeof overridePrompt === 'string' && overridePrompt.trim())
    ? overridePrompt.trim()
    : (promptInput ? promptInput.value.trim() : '');
  if (!prompt) {
    showToast('Please describe the application you want to build.');
    return;
  }

  await executeSandboxAiGeneration(prompt, true, customTitle);
}

export async function handleSandboxIterate() {
  const input = document.getElementById('sandbox-iteration-input');
  const prompt = input ? input.value.trim() : '';
  if (!prompt) return;

  if (input) {
    input.value = '';
    input.style.height = 'auto';
  }

  await executeSandboxAiGeneration(prompt, false);
}

export async function executeSandboxAiGeneration(prompt, isInitial = false, customTitle = null) {
  let appTitle = customTitle || prompt;
  if (!customTitle && appTitle.length > 32) {
    const m = prompt.match(/^Build\s+(?:an?\s+)?(?:sleek\s+|modern\s+|complete\s+|interactive\s+|retro\s+|SaaS\s+)?([^,]+?)(?:\s+with|\s+and|$)/i);
    if (m && m[1] && m[1].trim().length <= 32) {
      appTitle = m[1].trim();
    } else {
      appTitle = prompt.slice(0, 30) + '...';
    }
  }

  // If this is an iteration, sync any unsaved editor edits into code buffer and push a revision snapshot
  if (!isInitial) {
    const editor = document.getElementById('sandbox-code-editor');
    if (editor && currentActiveFile && currentSandboxFiles[currentActiveFile] !== undefined) {
      currentSandboxFiles[currentActiveFile] = editor.value;
    }
    const currentBundled = bundleCodebase(currentSandboxFiles);
    if (currentBundled) {
      currentSandboxApp.code = currentBundled;
    }
    pushSandboxRevision(prompt);
  }

  // Check if prompt matches a pre-configured template key (ONLY on initial creation, NEVER on iteration!)
  let matchedTplKey = null;
  if (isInitial) {
    const templateKeyMap = {
      'breakout': 'arcade',
      'arcade': 'arcade',
      'pomodoro': 'pomodoro',
      'timer': 'pomodoro',
      'kanban': 'kanban',
      'dashboard': 'dashboard',
      'financial': 'dashboard',
      'markdown': 'markdown',
      'drum': 'drum',
      'synth': 'drum'
    };

    const lowerPrompt = prompt.toLowerCase();
    for (const [kw, tpl] of Object.entries(templateKeyMap)) {
      if (lowerPrompt.includes(kw) && STARTER_TEMPLATES[tpl]) {
        matchedTplKey = tpl;
        break;
      }
    }
  }

  showSandboxBuilderOverlay(
    isInitial ? `Building ${appTitle}...` : `Updating ${currentSandboxApp.title}...`,
    prompt
  );

  const indicator = document.getElementById('sandbox-status-indicator');
  const statusText = document.getElementById('sandbox-status-text');
  if (indicator) indicator.style.display = 'flex';
  if (statusText) statusText.textContent = isInitial ? 'Architecting application files...' : 'Applying surgical code modifications...';

  let raw = '';
  let apiError = null;

  try {
    if (typeof puter !== 'undefined' && puter.ai && puter.ai.chat) {
      let systemPrompt = '';
      let userMessage = '';

      if (isInitial) {
        systemPrompt = `You are an elite principal web application engineer.
Create a complete, fully functional, standalone single-file HTML web application with embedded <style> and <script>.
Requirements:
1. Deliver ONLY a single contiguous \`\`\`html code block.
2. Full interactivity, responsive layout, modern aesthetic styling, and accessible controls.
3. No external backend dependencies. Include mock data and sound effects if applicable.
4. Output the complete source code without omitting anything.`;
        userMessage = prompt;
      } else {
        systemPrompt = `You are an expert senior software engineer specializing in surgical code refactoring, bug fixing, and feature additions for existing single-page web applications.

CRITICAL INSTRUCTIONS:
1. PRESERVE EXISTING FUNCTIONALITY: The user already has a working application. You MUST retain all existing working features, markup, variables, state, animations, and event listeners. Do NOT wipe out or start over from scratch.
2. ZERO LAZY PLACEHOLDERS: NEVER emit placeholders like "/* existing styles remain unchanged */", "// ... rest of code stays here ...", "<!-- ... existing html ... -->", or "// same as before". The output MUST be the COMPLETE, runnable application. Any placeholder will break the user's application completely.
3. SURGICAL PRECISION: Carefully identify the bug or requested feature, fix the logic cleanly, and test for edge cases.
4. OUTPUT FORMAT: Deliver the complete updated single-file HTML app in a single \`\`\`html code block with <style> and <script> embedded.`;

        userMessage = `Current working application code:
\`\`\`html
${currentSandboxApp.code}
\`\`\`

USER REQUESTED FIX / ENHANCEMENT:
${prompt}

Instructions: Apply the requested modification surgically while keeping all other existing functionality, styling, and logic working. Return the complete updated single-file HTML app in a \`\`\`html code block with NO placeholders.`;
      }

      let userPayloadContent;
      if (currentSandboxAttachment && currentSandboxAttachment.dataUrl) {
        userPayloadContent = [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: currentSandboxAttachment.dataUrl } }
        ];
      } else {
        userPayloadContent = userMessage;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayloadContent }
      ];

      const modelToUse = appState?.settings?.selectedModel || 'gemini-2.5-flash';
      const isReasoning = (modelToUse || '').includes('r1') ||
                          (modelToUse || '').toLowerCase().startsWith('o1') ||
                          (modelToUse || '').toLowerCase().startsWith('o3');

      const chatOptions = { model: modelToUse, stream: true };
      if (!isReasoning) {
        chatOptions.temperature = 0.7;
      }

      let response;
      try {
        updateSandboxBuilderStep(1, `Connecting model (${modelToUse})...`, `// Initiating connection to Puter AI...\n// Model: ${modelToUse}\n// Mode: ${isInitial ? 'Initial Generation' : 'Surgical Refactor'}\n// Request: ${prompt.slice(0, 80)}`);
        response = await puter.ai.chat(messages, chatOptions);
      } catch (e) {
        console.warn('Selected model stream failed, trying gpt-4o-mini:', e);
        try {
          response = await puter.ai.chat(messages, { model: 'gpt-4o-mini', stream: true, temperature: 0.7 });
        } catch (fallbackErr) {
          apiError = fallbackErr || e;
          throw fallbackErr;
        }
      }

      if (response && typeof response[Symbol.asyncIterator] === 'function') {
        let chunkCount = 0;
        for await (const chunk of response) {
          const text = chunk?.text || (typeof chunk === 'string' ? chunk : (chunk?.message?.content || ''));
          if (text) {
            raw += text;
            chunkCount++;

            // Dynamically advance builder steps based on code content & mode
            if (isInitial) {
              if (raw.includes('<script') || chunkCount > 50) {
                updateSandboxBuilderStep(4, `Stream active • ${raw.length} bytes • Step 4/5`, raw);
              } else if (raw.includes('<style') || chunkCount > 25) {
                updateSandboxBuilderStep(3, `Stream active • ${raw.length} bytes • Step 3/5`, raw);
              } else if (raw.includes('<html') || raw.includes('<!DOCTYPE') || chunkCount > 10) {
                updateSandboxBuilderStep(2, `Stream active • ${raw.length} bytes • Step 2/5`, raw);
              } else {
                updateSandboxBuilderStep(1, `Stream active • ${raw.length} bytes`, raw);
              }
            } else {
              if (raw.includes('<script') || chunkCount > 50) {
                updateSandboxBuilderStep(4, `Refactoring logic & state • ${raw.length} bytes`, raw);
              } else if (raw.includes('<style') || chunkCount > 25) {
                updateSandboxBuilderStep(3, `Adjusting styles & layout • ${raw.length} bytes`, raw);
              } else if (raw.includes('<html') || chunkCount > 10) {
                updateSandboxBuilderStep(2, `Surgically updating markup • ${raw.length} bytes`, raw);
              } else {
                updateSandboxBuilderStep(1, `Analyzing codebase • ${raw.length} bytes`, raw);
              }
            }
          }
          if (chunk?.type === 'error') {
            throw new Error(chunk.message || 'Stream error');
          }
        }
      } else if (typeof response === 'string') {
        raw = response;
      } else {
        raw = response?.message?.content || response?.text || response?.choices?.[0]?.message?.content || '';
      }
    }
  } catch (err) {
    console.warn('Puter AI generation encountered error:', err);
    apiError = err;
  }

  // Extract HTML code block
  let generatedCode = '';
  if (raw) {
    const match = raw.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
    if (match) {
      generatedCode = match[1].trim();
    } else if (raw.includes('<!DOCTYPE') || raw.includes('<html')) {
      const startIdx = raw.indexOf('<!DOCTYPE');
      const fallbackStart = raw.indexOf('<html');
      const actualStart = startIdx !== -1 ? startIdx : fallbackStart;
      const endIdx = raw.lastIndexOf('</html>');
      if (actualStart !== -1 && endIdx !== -1) {
        generatedCode = raw.substring(actualStart, endIdx + 7).trim();
      } else if (actualStart !== -1) {
        generatedCode = raw.substring(actualStart).trim();
      } else {
        generatedCode = raw.trim();
      }
    }
  }

  // Smart Snippet Handling for Iterations (if model returned only JS or CSS)
  if (!isInitial && (!generatedCode || (!generatedCode.includes('<!DOCTYPE') && !generatedCode.includes('<html')))) {
    const jsMatch = raw.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);
    const cssMatch = raw.match(/```(?:css)\s*([\s\S]*?)```/i);
    const lazyCheck = /(?:\/\*|\/\/)\s*(?:\.{3,}|rest of|existing|unchanged)/i;

    if (jsMatch && jsMatch[1].length > 40 && !lazyCheck.test(jsMatch[1])) {
      currentSandboxFiles['script.js'] = jsMatch[1].trim();
      generatedCode = bundleCodebase(currentSandboxFiles);
      showToast('⚡ Surgically updated script.js!');
    } else if (cssMatch && cssMatch[1].length > 40 && !lazyCheck.test(cssMatch[1])) {
      currentSandboxFiles['style.css'] = cssMatch[1].trim();
      generatedCode = bundleCodebase(currentSandboxFiles);
      showToast('🎨 Surgically updated style.css!');
    }
  }

  // Integrity Check for Iterations: Protect against destructive lazy placeholders
  if (!isInitial && generatedCode) {
    const lazyPlaceholderRegex = /(?:\/\*|\/\/|<!--)\s*(?:\.{3,}|rest of (?:the )?(?:code|styles?|scripts?|logic)|remaining (?:code|styles?|scripts?)|same as before|existing (?:code|styles?|scripts?|html)|unchanged)/i;
    if (lazyPlaceholderRegex.test(generatedCode)) {
      const isTruncated = generatedCode.length < (currentSandboxApp.code.length * 0.45);
      if (isTruncated) {
        console.warn('AI generated lazy placeholders in iteration response. Halting destructive replacement.');
        hideSandboxBuilderOverlay();
        if (indicator) indicator.style.display = 'none';
        showToast('⚠️ AI output omitted code with placeholders. Working version preserved.', 5000);
        currentSandboxApp.turns.push({ sender: 'user', text: prompt });
        currentSandboxApp.turns.push({
          sender: 'ai',
          text: `⚠️ **Update halted to protect your app**: The AI response omitted parts of your codebase with placeholders (e.g. \`/* rest of code unchanged */\`). To prevent breaking your app, the previous working version was preserved.\n\nTip: You can rephrase the prompt with more specific details, or edit directly in the **VS Code IDE** tab.`
        });
        saveSandboxAppToHistory(currentSandboxApp);
        renderSandboxMessages();
        return;
      }
    }
  }

  // Validation & Fallback Handling
  if (!generatedCode || generatedCode.length < 50) {
    if (isInitial && matchedTplKey && STARTER_TEMPLATES[matchedTplKey]) {
      console.log(`Using fallback template ${matchedTplKey} for prompt "${prompt}"`);
      updateSandboxBuilderStep(2, 'Synthesizing template files...', '<!-- Generating HTML structure -->');
      await new Promise(r => setTimeout(r, 200));
      updateSandboxBuilderStep(3, 'Compiling styles & theme...', '/* Synthesizing CSS stylesheets */');
      await new Promise(r => setTimeout(r, 200));
      updateSandboxBuilderStep(4, 'Hooking event loops & state...', '// Hooking interactive controller');
      await new Promise(r => setTimeout(r, 200));
      generatedCode = STARTER_TEMPLATES[matchedTplKey];
      appTitle = customTitle || prompt;
    } else {
      hideSandboxBuilderOverlay();
      if (indicator) indicator.style.display = 'none';

      const errStr = (apiError?.message || String(apiError || '')).toLowerCase();
      const isBalanceErr = errStr.includes('balance') || errStr.includes('funding') || errStr.includes('credit') || errStr.includes('upgrade') || errStr.includes('402');

      if (!isInitial) {
        let errorMsg = `⚠️ Could not apply requested changes without errors for: "${escapeHtml(prompt)}". Your existing application remains safe and functional.`;
        if (isBalanceErr) {
          showToast('⚠️ Puter AI balance limit reached. Free monthly quota exhausted.', 6000);
          errorMsg = `⚠️ **Puter AI Balance Limit Exceeded**: Your Puter account has run out of AI credits to complete this generation request (\`puter-chat-completion::complete\`).\n\n**Why this happens:** Puter provides free AI credits, but large codebase refactorings send full source files back and forth, consuming credits.\n\n**How to continue:**\n1. **Sign in / Register at [puter.com](https://puter.com)**: Signing in or creating a fresh free Puter account restores a free monthly credit quota.\n2. **Use the VS Code IDE Tab**: You can edit and save files directly in the built-in code editor — it runs 100% locally with live hot-reloading and requires zero AI credits.\n3. **Switch to a lighter model**: Try selecting **GPT-4o Mini** or **Gemini 2.5 Flash** in the model selector.`;
        } else {
          showToast('⚠️ AI modification could not be applied cleanly. Working version preserved.', 5000);
          if (apiError?.message) {
            errorMsg += `\n\n*Technical detail: ${escapeHtml(apiError.message)}*`;
          }
        }

        currentSandboxApp.turns.push({ sender: 'user', text: prompt });
        currentSandboxApp.turns.push({
          sender: 'ai',
          text: errorMsg
        });
        saveSandboxAppToHistory(currentSandboxApp);
        renderSandboxMessages();
      } else {
        if (isBalanceErr) {
          showToast('⚠️ Puter AI balance limit reached. Sign in at puter.com or switch model.', 6000);
        } else {
          showToast('AI could not generate app. Please try another prompt.');
        }
      }
      return;
    }
  }

  updateSandboxBuilderStep(5, `Compiling runtime preview • ${generatedCode.length} bytes`, '// Mounting application into sandbox DOM...');
  await new Promise(r => setTimeout(r, 300));

  // Decompose into multi-file codebase
  const decomposed = decomposeHtmlCode(generatedCode, appTitle);
  currentSandboxFiles = decomposed;
  sandboxOriginalAiFiles = { ...decomposed };
  Object.keys(sandboxFileDirty).forEach(k => sandboxFileDirty[k] = false);

  const attachmentSaved = currentSandboxAttachment ? { ...currentSandboxAttachment } : null;
  removeSandboxAttachment();

  if (isInitial) {
    currentSandboxApp.id = 'sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    expandedSandboxIds.add(currentSandboxApp.id);
    currentSandboxApp.title = appTitle;
    currentSandboxApp.prompt = prompt;
    currentSandboxApp.code = generatedCode;
    currentSandboxApp.turns = [
      { sender: 'user', text: prompt, attachment: attachmentSaved },
      { sender: 'ai', text: `Built **${appTitle}** with responsive design and modern controls.` }
    ];
  } else {
    currentSandboxApp.code = generatedCode;
    currentSandboxApp.turns.push({ sender: 'user', text: prompt, attachment: attachmentSaved });
    currentSandboxApp.turns.push({ sender: 'ai', text: `Updated application: **${escapeHtml(prompt)}**.\n\nChanges compiled across HTML, CSS, and JS.` });
  }

  saveSandboxAppToHistory(currentSandboxApp);
  renderSandboxStudioState();
  hideSandboxBuilderOverlay();
  updateUndoRevisionButton();
  showToast(isInitial ? '✨ Web application compiled and running live!' : '✨ Updated application running live!');

  if (indicator) indicator.style.display = 'none';
}

export function saveSandboxAppToHistory(appData) {
  if (!appData || !appData.code) return;
  const history = getSandboxHistory();
  const id = appData.id || ('sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  appData.id = id;

  const existingIdx = history.findIndex(h => h.id === id);
  const entry = {
    id,
    title: appData.title || 'Web Application',
    prompt: appData.prompt || (appData.turns && appData.turns[0]?.text) || 'Application',
    code: appData.code,
    createdAt: existingIdx !== -1 ? (history[existingIdx].createdAt || Date.now()) : Date.now(),
    updatedAt: Date.now(),
    turns: appData.turns || [],
    revisions: currentSandboxRevisions.slice(-10),
    publishedUrl: appData.publishedUrl || null
  };

  if (existingIdx !== -1) history[existingIdx] = entry;
  else history.unshift(entry);

  if (history.length > 50) history.length = 50;

  try {
    localStorage.setItem(SANDBOX_HISTORY_STORAGE_KEY, JSON.stringify(history));
    if (typeof puter !== 'undefined' && puter.auth?.isSignedIn() && puter.kv) {
      puter.kv.set(SANDBOX_HISTORY_STORAGE_KEY, history).catch(() => {});
    }
  } catch (e) {
    console.warn('Failed to save sandbox history:', e);
  }

  renderSidebarSandboxAppsList();
  renderSandboxHistoryBadge();
}

export function getSandboxHistory() {
  try {
    const raw = localStorage.getItem(SANDBOX_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function renderSidebarSandboxAppsList() {
  const container = document.getElementById('sidebar-sandbox-list');
  const countBadge = document.getElementById('sidebar-sandbox-count-badge');
  if (!container) return;

  const history = getSandboxHistory();
  if (countBadge) {
    countBadge.textContent = history.length;
    countBadge.style.display = history.length > 0 ? 'inline-block' : 'none';
  }

  container.innerHTML = '';
  if (history.length === 0) {
    container.innerHTML = `
      <div style="padding: 0.5rem 0.75rem; font-size: 0.78rem; color: var(--text-muted); font-style: italic;">
        No apps built yet.
      </div>
    `;
    return;
  }

  history.forEach(app => {
    const isActive = currentSandboxApp.id === app.id;
    const titleText = app.title || 'Web Application';
    const item = document.createElement('div');
    item.className = 'sidebar-sandbox-item' + (isActive ? ' active' : '');
    item.setAttribute('title', titleText);
    item.innerHTML = `
      <div class="sidebar-sandbox-item-row">
        <span class="sandbox-item-icon">⚡</span>
        <span class="sandbox-item-title" title="${escapeHtml(titleText)}">${escapeHtml(titleText)}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      openSandboxStudio(app);
    });

    container.appendChild(item);
  });
}

function renderSandboxHistoryBadge() {
  const badge = document.getElementById('sandbox-history-count-badge');
  if (badge) {
    badge.textContent = getSandboxHistory().length;
  }
}

function toggleSandboxHistoryDrawer() {
  const drawer = document.getElementById('sandbox-history-drawer');
  if (!drawer) return;
  drawer.style.display = (drawer.style.display === 'none' || !drawer.style.display) ? 'block' : 'none';
  renderSandboxHistoryList();
}

function closeSandboxHistoryDrawer() {
  const drawer = document.getElementById('sandbox-history-drawer');
  if (drawer) drawer.style.display = 'none';
}

function renderSandboxHistoryList(filterText = '') {
  const list = document.getElementById('sandbox-history-list');
  if (!list) return;
  list.innerHTML = '';

  const history = getSandboxHistory().filter(h => {
    if (!filterText) return true;
    return (h.title || '').toLowerCase().includes(filterText.toLowerCase());
  });

  if (history.length === 0) {
    list.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:0.82rem;text-align:center;">No build history found.</div>';
    return;
  }

  history.forEach(app => {
    const card = document.createElement('div');
    card.className = 'sandbox-history-card';
    card.innerHTML = `
      <div style="font-weight:600;font-size:0.88rem;color:var(--text-primary);margin-bottom:0.25rem;">${escapeHtml(app.title)}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);">${(app.turns || []).length} conversational iterations</div>
    `;
    card.addEventListener('click', () => {
      openSandboxStudio(app);
      closeSandboxHistoryDrawer();
    });
    list.appendChild(card);
  });
}

export function renderSandboxRecentBuilds() {
  const section = document.getElementById('sandbox-recent-builds-section');
  const grid = document.getElementById('sandbox-recent-builds-grid');
  if (!section || !grid) return;

  const history = getSandboxHistory();
  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'flex';
  grid.innerHTML = '';
  const recent = history.slice(0, 4);

  recent.forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'recent-build-chip';
    chip.innerHTML = `
      <div class="recent-build-chip-title">⚡ ${escapeHtml(item.title || 'Web App')}</div>
      <div class="recent-build-chip-time">${(item.code || '').split('\n').length} lines • ${(item.turns || []).length} revisions</div>
    `;
    chip.addEventListener('click', () => {
      openSandboxStudio(item);
    });
    grid.appendChild(chip);
  });
}

function clearSandboxHistory() {
  if (!confirm('Clear all web app build history?')) return;
  localStorage.removeItem(SANDBOX_HISTORY_STORAGE_KEY);
  resetSandboxStudio();
  renderSidebarSandboxAppsList();
  renderSandboxHistoryBadge();
  closeSandboxHistoryDrawer();
  showToast('Build history cleared');
}

export async function publishSandboxApp() {
  if (!currentSandboxApp.code) {
    showToast('No code to publish.');
    return;
  }

  if (typeof puter === 'undefined') {
    showToast('Puter SDK not loaded.');
    return;
  }

  const btnPublish = document.getElementById('btn-sandbox-publish');
  const banner = document.getElementById('sandbox-published-banner');
  const link = document.getElementById('sandbox-published-link');

  try {
    if (!puter.auth.isSignedIn()) {
      showToast('Please sign in with Puter to publish your app.');
      const signedIn = await puter.auth.signIn();
      if (!signedIn || !puter.auth.isSignedIn()) return;
    }

    if (btnPublish) btnPublish.disabled = true;
    showToast('Publishing app live to Puter Cloud...');

    const baseSlug = (currentSandboxApp.title || 'app')
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
    saveSandboxAppToHistory(currentSandboxApp);

    if (banner && link) {
      link.href = publishedUrl;
      link.textContent = publishedUrl;
      banner.style.display = 'flex';
    }

    showToast(`🎉 Live at ${publishedUrl}!`, 5000);
  } catch (err) {
    console.error('Failed to publish app:', err);
    showToast('Publishing failed: ' + (err.message || 'Unknown error'));
  } finally {
    if (btnPublish) btnPublish.disabled = false;
  }
}

export function openSandboxExportModal(app) {
  activeExportApp = app || currentSandboxApp;
  const modal = document.getElementById('sandbox-export-modal');
  const title = document.getElementById('export-app-title');
  if (modal) {
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('active');
  }
  if (title) title.textContent = activeExportApp.title || 'Web Application';
}

export function closeSandboxExportModal() {
  const modal = document.getElementById('sandbox-export-modal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    if (!modal.classList.contains('active')) modal.style.display = 'none';
  }, 200);
}

export function exportSandboxHtml(app) {
  const targetApp = app || currentSandboxApp;
  if (!targetApp || !targetApp.code) return;
  const blob = new Blob([prepareExecutableHtml(targetApp.code, 'html')], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(targetApp.title || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
  closeSandboxExportModal();
  showToast('Downloaded standalone HTML file');
}

export function exportSandboxZip(app) {
  const targetApp = app || currentSandboxApp;
  if (!targetApp || !targetApp.code) return;
  const files = (targetApp.id === currentSandboxApp.id && currentSandboxFiles['index.html'])
    ? currentSandboxFiles
    : decomposeHtmlCode(targetApp.code, targetApp.title);

  if (typeof JSZip === 'undefined') {
    exportSandboxHtml(targetApp);
    return;
  }

  const zip = new JSZip();
  const src = zip.folder('src');
  src.file('index.html', files['index.html']);
  src.file('style.css', files['style.css']);
  src.file('script.js', files['script.js']);
  zip.file('README.md', files['README.md']);
  zip.file('bundle.html', prepareExecutableHtml(targetApp.code, 'html'));

  zip.generateAsync({ type: 'blob' }).then(content => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(targetApp.title || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    closeSandboxExportModal();
    showToast('Downloaded full project ZIP bundle');
  });
}
