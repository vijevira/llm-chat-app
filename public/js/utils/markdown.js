/**
 * Omni Chat - Markdown & Syntax Highlighting Utility
 */

import { escapeHtml } from './helpers.js';

export function initMarkdownRenderer() {
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
}

export function formatMarkdown(content) {
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

export function isRunnableWebCode(lang, codeText) {
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

