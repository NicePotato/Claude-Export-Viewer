// Export menu for anything that is one Markdown file: memory, an artifact, a reflection.
// Chats and projects have their own menus because they offer extra options.
import { html, useState, useRef } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { useDismissDetails } from '../lib/hooks.js';
import { downloadBlob, textBlob } from '../lib/download.js';
import { t } from '../lib/i18n.js';

/** @param getText  returns the Markdown, built only when the user clicks */
export function TextExportMenu({ getText, fileName }) {
  const [note, setNote] = useState('');
  const ref = useRef(null);
  const flash = (text) => { setNote(text); setTimeout(() => setNote(''), 1600); };

  const download = () => {
    downloadBlob(textBlob(getText()), fileName);
    flash(t('chat.saved'));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(getText()); flash(t('chat.copied')); } catch { flash(t('chat.copyBlocked')); }
  };

  useDismissDetails(ref);

  return html`<details class="menu" ref=${ref}>
    <summary class="btn">${t('chat.export')}<${Icon} name="caretDown" size=${12} /></summary>
    <div class="menu-panel">
      <button type="button" class="btn btn-primary" onClick=${download}>${t('chat.downloadMd')}</button>
      <button type="button" class="btn" onClick=${copy}>${t('chat.copyMd')}</button>
      <div class="menu-note" role="status">${note}</div>
    </div>
  </details>`;
}
