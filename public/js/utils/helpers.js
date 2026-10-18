/**
 * Omni Chat - General Utility Functions
 */

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function debounce(fn, delayMs = 250) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delayMs);
  };
}

export function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

export function isArtifactCode(code, lang) {
  if (!code) return false;
  const l = (lang || '').toLowerCase().trim();
  if (['html', 'svg', 'xml', 'jsx', 'tsx'].includes(l)) return true;
  const trimmed = code.trim();
  if (/^<!DOCTYPE\s+html/i.test(trimmed)) return true;
  if (/<html[\s>]/i.test(trimmed) && /<\/html>/i.test(trimmed)) return true;
  if (/<svg[\s>]/i.test(trimmed) && /<\/svg>/i.test(trimmed)) return true;
  return false;
}

export function prepareExecutableHtml(code, lang) {
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

  if (!/<meta[^>]+viewport/i.test(processed)) {
    if (/<head[\s>]/i.test(processed)) {
      processed = processed.replace(/<head[\s>]/i, '$&\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    } else if (/<html[\s>]/i.test(processed)) {
      processed = processed.replace(/<html[\s>]/i, '$&\n<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>');
    }
  }

  if (/<head[\s>]/i.test(processed)) {
    processed = processed.replace(/<head[\s>]/i, '$&\n  ' + runtimeShims);
  } else if (/<body[\s>]/i.test(processed)) {
    processed = processed.replace(/<body[\s>]/i, runtimeShims + '\n$&');
  } else {
    processed = runtimeShims + '\n' + processed;
  }

  return processed;
}

/**
 * Opens full-resolution image lightbox modal.
 */
export function openImageLightbox(src, caption = '') {
  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-image');
  const cap = document.getElementById('lightbox-caption');
  if (!modal || !img) {
    window.open(src, '_blank');
    return;
  }
  img.src = src;
  if (cap) cap.textContent = caption || '';
  modal.style.display = 'flex';
}

/**
 * Closes the image lightbox modal.
 */
export function closeImageLightbox() {
  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-image');
  if (modal) modal.style.display = 'none';
  if (img) img.src = '';
}

/**
 * Initializes listeners for closing the image lightbox modal.
 */
export function initImageLightbox() {
  const modal = document.getElementById('image-lightbox-modal');
  const closeBtn = document.getElementById('btn-close-lightbox');
  const backdrop = document.getElementById('lightbox-backdrop');

  if (closeBtn) closeBtn.addEventListener('click', closeImageLightbox);
  if (backdrop) backdrop.addEventListener('click', closeImageLightbox);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('image-lightbox-modal');
      if (modal && modal.style.display !== 'none') {
        closeImageLightbox();
      }
    }
  });
}

/**
 * Extracts pasted image files from clipboard data event.
 */
export function handleClipboardImagePaste(e, callback) {
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData || !clipboardData.items) return false;

  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item.type && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        const ext = file.type.split('/')[1] || 'png';
        const namedFile = (file.name && file.name !== 'image.png')
          ? file
          : new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type });
        callback(namedFile);
        return true;
      }
    }
  }
  return false;
}


