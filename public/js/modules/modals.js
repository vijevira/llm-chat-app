/**
 * Omni Chat - Modals Management & Accessibility Module
 * Handles opening, closing, backdrop dismissals, tab switching, and keyboard Escape stacking.
 */

export function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  void modal.offsetWidth; // Force layout reflow
  modal.classList.add('active');
}

export function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    if (!modal.classList.contains('active')) {
      modal.style.display = 'none';
    }
  }, 200);
}

export function initModalTabs() {
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

export function initModalGlobalDismissal(handlers = {}) {
  // Backdrop overlay click
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      if (e.target.id === 'sandbox-export-modal' && typeof handlers.closeSandboxExport === 'function') {
        handlers.closeSandboxExport();
      } else {
        closeModal(e.target);
      }
    }
  });

  // Hierarchical Escape key dismiss
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sandboxExport = document.getElementById('sandbox-export-modal');
      if (sandboxExport && sandboxExport.style.display !== 'none') {
        if (typeof handlers.closeSandboxExport === 'function') handlers.closeSandboxExport();
        else closeModal(sandboxExport);
        return;
      }

      const sandboxHistory = document.getElementById('sandbox-history-drawer');
      if (sandboxHistory && sandboxHistory.style.display !== 'none') {
        if (typeof handlers.closeSandboxHistory === 'function') handlers.closeSandboxHistory();
        else sandboxHistory.style.display = 'none';
        return;
      }

      const sandboxGithub = document.getElementById('sandbox-github-drawer');
      if (sandboxGithub && sandboxGithub.style.display !== 'none') {
        sandboxGithub.style.display = 'none';
        return;
      }

      const artifactsGithub = document.getElementById('artifacts-github-panel');
      if (artifactsGithub && artifactsGithub.style.display !== 'none') {
        artifactsGithub.style.display = 'none';
        return;
      }

      const pluginsModal = document.getElementById('plugins-modal');
      if (pluginsModal && pluginsModal.classList.contains('active')) {
        closeModal(pluginsModal);
        return;
      }

      const exploreAppsModal = document.getElementById('explore-apps-modal');
      if (exploreAppsModal && exploreAppsModal.classList.contains('active')) {
        closeModal(exploreAppsModal);
        return;
      }

      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal && settingsModal.classList.contains('active')) {
        closeModal(settingsModal);
        return;
      }

      const modelModal = document.getElementById('model-modal');
      if (modelModal && modelModal.classList.contains('active')) {
        closeModal(modelModal);
        return;
      }

      const toolsPopover = document.getElementById('chat-tools-popover');
      if (toolsPopover && toolsPopover.style.display !== 'none') {
        toolsPopover.style.display = 'none';
        return;
      }

      const artifactsPane = document.getElementById('artifacts-pane');
      if (artifactsPane && artifactsPane.style.display !== 'none' && typeof handlers.closeArtifact === 'function') {
        handlers.closeArtifact();
      }
    }
  });
}

