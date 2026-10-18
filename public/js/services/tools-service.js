/**
 * Omni Chat - Tools Execution Service
 * Handles live web search, JS code execution sandbox, and search intent detection.
 */

import { escapeHtml, showToast } from '../utils/helpers.js';

export function detectSearchIntent(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase();
  const triggers = [
    'search for', 'latest news', 'current price', 'today news',
    'who won', 'stock price', 'weather in', 'recent update',
    'current events', 'what happened to', 'what is the latest'
  ];
  return triggers.some(tr => t.includes(tr));
}

export async function fetchLiveWebSearchResults(query) {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  // 1. Worker API search endpoint
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

  // 2. Puter.net.fetch DuckDuckGo client fallback
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

  // 3. Wikipedia API fallback
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

export function createSearchSourcesCard(sources, query) {
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

export function executeClientSideJs(code, targetWrapper) {
  const existingOutput = targetWrapper.querySelector('.tool-code-card');
  if (existingOutput) existingOutput.remove();

  const startTime = performance.now();
  const logs = [];
  let result;
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

