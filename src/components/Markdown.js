import { html, useMemo, useCallback } from '../lib/ui.js';
import { renderMarkdown } from '../lib/markdown.js';

export function Markdown({ text, class: cls = '' }) {
  const rendered = useMemo(() => renderMarkdown(text), [text]);

  // Event delegation: the markdown is injected HTML, so the copy buttons are plain DOM.
  const onClick = useCallback((e) => {
    const btn = e.target.closest?.('[data-copy]');
    if (!btn) return;
    const code = btn.closest('.code')?.querySelector('code');
    if (!code) return;
    navigator.clipboard?.writeText(code.textContent).then(() => {
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
    });
  }, []);

  return html`<div class=${`md ${cls}`} onClick=${onClick} dangerouslySetInnerHTML=${{ __html: rendered }} />`;
}
