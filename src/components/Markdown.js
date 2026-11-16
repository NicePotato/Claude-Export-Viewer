import { html, useMemo, useCallback } from '../lib/ui.js';
import { renderMarkdown } from '../lib/markdown.js';
import { t, getLang } from '../lib/i18n.js';

export function Markdown({ text, class: cls = '' }) {
  const lang = getLang();
  const rendered = useMemo(() => renderMarkdown(text), [text, lang]);

  // Event delegation: the markdown is injected HTML, so the copy buttons are plain DOM.
  const onClick = useCallback((e) => {
    const btn = e.target.closest?.('[data-copy]');
    if (!btn) return;
    const code = btn.closest('.code')?.querySelector('code');
    if (!code) return;
    navigator.clipboard?.writeText(code.textContent).then(() => {
      btn.textContent = t('md.copied');
      setTimeout(() => { btn.textContent = t('md.copy'); }, 1200);
    });
  }, []);

  return html`<div class=${`md ${cls}`} onClick=${onClick} dangerouslySetInnerHTML=${{ __html: rendered }} />`;
}
