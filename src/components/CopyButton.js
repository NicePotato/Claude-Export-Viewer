import { html, useState, useRef, useEffect } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { t } from '../lib/i18n.js';

export function CopyButton({ text, label = t('msg.copy') }) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      timer.current = setTimeout(() => setDone(false), 1200);
    } catch { /* clipboard blocked: nothing useful to do */ }
  };
  return html`<button type="button" class="icon-btn" onClick=${copy} aria-label=${label} title=${label}>
    <${Icon} name=${done ? 'check' : 'copy'} size=${14} />
  </button>`;
}
