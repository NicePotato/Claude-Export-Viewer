// Markdown -> safe HTML. Raw HTML in the source is escaped, remote images are never
// fetched (the viewer is local-only), links are limited to safe protocols.
import { Marked } from '../../vendor/marked.js';
import { t, getLang } from './i18n.js';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function safeHref(href) {
  try {
    const u = new URL(href, 'https://placeholder.invalid');
    if (['http:', 'https:', 'mailto:'].includes(u.protocol)) return href;
  } catch { /* fall through */ }
  return null;
}

function highlight(code, lang) {
  const hljs = globalThis.hljs;
  if (!hljs) return { html: esc(code), lang: lang || '' };
  try {
    if (lang && hljs.getLanguage(lang)) {
      return { html: hljs.highlight(code, { language: lang, ignoreIllegals: true }).value, lang };
    }
    // Unlabelled fences are left plain: auto-detection guesses wrong too often on short snippets.
  } catch { /* fall through */ }
  return { html: esc(code), lang: lang || '' };
}

export const COPY_ICON_ATTR = 'data-copy';

const renderer = {
  html(raw) {
    return esc(typeof raw === 'string' ? raw : raw?.text ?? '');
  },
  code(code, infostring) {
    const lang = (infostring || '').trim().split(/\s+/)[0].toLowerCase();
    const { html, lang: used } = highlight(code, lang);
    return (
      `<div class="code"><div class="code-head"><span class="code-lang">${esc(used || 'text')}</span>` +
      `<button type="button" class="code-copy" ${COPY_ICON_ATTR}>${esc(t('md.copy'))}</button></div>` +
      `<pre><code class="hljs">${html}</code></pre></div>`
    );
  },
  link(href, title, text) {
    const safe = safeHref(href);
    if (!safe) return text;
    const t = title ? ` title="${esc(title)}"` : '';
    return `<a href="${esc(safe)}"${t} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
  },
  image(href, title, text) {
    // Never load remote images. Show the alt text and let the user open the link if they want.
    const safe = safeHref(href);
    const label = esc(text || t('md.image'));
    const word = esc(t('md.image'));
    return safe
      ? `<a class="md-image" href="${esc(safe)}" target="_blank" rel="noopener noreferrer nofollow">[${word}: ${label}]</a>`
      : `<span class="md-image">[${word}: ${label}]</span>`;
  },
};

const marked = new Marked({ gfm: true, breaks: false });
marked.use({ renderer });

const cache = new Map();
const CACHE_MAX = 400;

export function renderMarkdown(src) {
  // The language is part of the key: the rendered HTML contains translated button labels.
  const key = `${getLang()}\u0000${String(src ?? '')}`;
  let out = cache.get(key);
  if (out === undefined) {
    const text = String(src ?? '');
    try { out = marked.parse(text); } catch { out = `<pre>${esc(text)}</pre>`; }
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, out);
  }
  return out;
}

export { esc as escapeHtml };
