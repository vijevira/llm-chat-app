/**
 * Omni Chat - Artifacts Preview Pane Module
 * Provides split-screen interactive HTML/SVG live preview, viewport toggling,
 * 1-click Puter cloud publishing, and template loading.
 */

import { prepareExecutableHtml, showToast, escapeHtml } from '../utils/helpers.js';
import { STARTER_TEMPLATES } from '../config/constants.js';

export const currentArtifact = {
  title: 'Interactive Web Application',
  code: '',
  lang: 'html',
  publishedUrl: null
};

export function initArtifactsPane() {
  const artifactsPane = document.getElementById('artifacts-pane');
  const btnClose = document.getElementById('btn-close-artifacts');
  const btnPublish = document.getElementById('btn-publish-artifact');
  const btnCopy = document.getElementById('btn-copy-artifact');
  const btnOpenNewTab = document.getElementById('btn-open-artifact-newtab');
  const btnVpDesktop = document.getElementById('btn-artifact-vp-desktop');
  const btnVpMobile = document.getElementById('btn-artifact-vp-mobile');
  const frame = document.getElementById('artifacts-sandbox-frame');
  const btnGithub = document.getElementById('btn-artifact-github');
  const githubPanel = document.getElementById('artifacts-github-panel');
  const btnCloseGithub = document.getElementById('btn-close-github-panel');
  const btnFetchGithub = document.getElementById('btn-fetch-github-repo');
  const githubInput = document.getElementById('github-repo-input');

  if (btnClose) btnClose.addEventListener('click', closeArtifact);
  if (btnPublish) btnPublish.addEventListener('click', publishCurrentArtifact);

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (!currentArtifact.code) return;
      navigator.clipboard.writeText(currentArtifact.code);
      showToast('Code copied to clipboard');
    });
  }

  if (btnOpenNewTab) {
    btnOpenNewTab.addEventListener('click', () => {
      if (!currentArtifact.code) return;
      const blob = new Blob([prepareExecutableHtml(currentArtifact.code, currentArtifact.lang)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  if (btnVpDesktop && btnVpMobile && frame) {
    btnVpDesktop.addEventListener('click', () => {
      btnVpDesktop.classList.add('active');
      btnVpMobile.classList.remove('active');
      frame.classList.remove('mobile-viewport');
    });
    btnVpMobile.addEventListener('click', () => {
      btnVpMobile.classList.add('active');
      btnVpDesktop.classList.remove('active');
      frame.classList.add('mobile-viewport');
    });
  }

  // GitHub Panel wiring
  if (btnGithub && githubPanel) {
    btnGithub.addEventListener('click', () => {
      githubPanel.style.display = (githubPanel.style.display === 'none' || !githubPanel.style.display) ? 'block' : 'none';
    });
  }

  if (btnCloseGithub && githubPanel) {
    btnCloseGithub.addEventListener('click', () => {
      githubPanel.style.display = 'none';
    });
  }

  if (btnFetchGithub) {
    btnFetchGithub.addEventListener('click', async () => {
      const url = githubInput ? githubInput.value.trim() : '';
      if (!url) {
        showToast('Please enter a GitHub repository or raw file URL.');
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
          openArtifact(title, code, 'html');
          if (githubPanel) githubPanel.style.display = 'none';
          showToast('Imported from GitHub successfully!');
        } else {
          showToast('Could not find index.html in repository. Check URL.');
        }
      } catch (err) {
        showToast('Failed to import: ' + err.message);
      }
    });
  }

  // Starter template chips
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('#artifacts-github-panel .starter-chip');
    if (!chip) return;
    const tplKey = chip.getAttribute('data-template');
    if (tplKey && STARTER_TEMPLATES[tplKey]) {
      const titles = {
        arcade: '🎮 Retro Arcade (Breakout)',
        dashboard: '📊 SaaS Executive Dashboard',
        kanban: '📋 Kanban Workspace',
        pomodoro: '⏱️ Focus Pomodoro'
      };
      openArtifact(titles[tplKey] || 'Template App', STARTER_TEMPLATES[tplKey], 'html');
      if (githubPanel) githubPanel.style.display = 'none';
      showToast(`Loaded ${titles[tplKey]} into preview!`);
    }
  });
}

export function openArtifact(title, code, lang) {
  const artifactsPane = document.getElementById('artifacts-pane');
  const artifactsSandboxFrame = document.getElementById('artifacts-sandbox-frame');
  const artifactsTitle = document.getElementById('artifacts-title');
  const artifactsPublishedBanner = document.getElementById('artifacts-published-banner');
  const mainChat = document.querySelector('.main-chat');

  if (!artifactsPane || !artifactsSandboxFrame) return;

  currentArtifact.title = title || 'Interactive Web Application';
  currentArtifact.code = code;
  currentArtifact.lang = lang || 'html';
  currentArtifact.publishedUrl = null;

  if (artifactsTitle) artifactsTitle.textContent = currentArtifact.title;
  if (artifactsPublishedBanner) artifactsPublishedBanner.style.display = 'none';

  artifactsPane.style.display = 'flex';
  if (mainChat) mainChat.classList.add('has-artifact-open');

  artifactsSandboxFrame.srcdoc = prepareExecutableHtml(code, lang);
}

export function closeArtifact() {
  const artifactsPane = document.getElementById('artifacts-pane');
  const artifactsSandboxFrame = document.getElementById('artifacts-sandbox-frame');
  const mainChat = document.querySelector('.main-chat');

  if (!artifactsPane) return;
  artifactsPane.style.display = 'none';
  if (mainChat) mainChat.classList.remove('has-artifact-open');
  if (artifactsSandboxFrame) artifactsSandboxFrame.srcdoc = '';

  currentArtifact.title = '';
  currentArtifact.code = '';
  currentArtifact.lang = '';
  currentArtifact.publishedUrl = null;
}

export async function publishCurrentArtifact() {
  if (!currentArtifact.code) {
    showToast('No active application to publish.');
    return;
  }

  if (typeof puter === 'undefined') {
    showToast('Puter SDK not loaded');
    return;
  }

  const btnPublish = document.getElementById('btn-publish-artifact');
  const banner = document.getElementById('artifacts-published-banner');
  const link = document.getElementById('artifacts-published-link');

  try {
    if (!puter.auth.isSignedIn()) {
      showToast('Please sign in with Puter to publish your app.');
      const signedIn = await puter.auth.signIn();
      if (!signedIn || !puter.auth.isSignedIn()) {
        showToast('Publishing cancelled (sign-in required).');
        return;
      }
    }

    const origBtnHtml = btnPublish ? btnPublish.innerHTML : '';
    if (btnPublish) {
      btnPublish.disabled = true;
      btnPublish.innerHTML = `<span class="spinner-small" style="width:12px;height:12px;display:inline-block;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Publishing...`;
    }

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

    if (banner && link) {
      link.href = publishedUrl;
      link.textContent = publishedUrl;
      banner.style.display = 'flex';
    }

    showToast(`🎉 App live at ${publishedUrl}!`, 5000);

    if (btnPublish) {
      btnPublish.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Published`;
      setTimeout(() => {
        btnPublish.disabled = false;
        btnPublish.innerHTML = origBtnHtml;
      }, 3000);
    }
  } catch (err) {
    console.error('Failed to publish artifact:', err);
    showToast('Failed to publish app: ' + (err.message || 'Unknown error'));
    if (btnPublish) {
      btnPublish.disabled = false;
      btnPublish.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
        <span>Publish</span>
      `;
    }
  }
}

