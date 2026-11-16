// Export menu for one project: a folder (zip) or a single Markdown file.
import { html, useState, useRef } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { useDismissDetails } from '../lib/hooks.js';
import { downloadBlob, textBlob } from '../lib/download.js';
import {
  projectToMarkdown, projectsToZip, projectFileName, projectZipName,
} from '../lib/projectExport.js';

import { t, tn } from '../lib/i18n.js';

export function ProjectExportMenu({ project, memory, chats }) {
  const [steps, setSteps] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef(null);
  const flash = (t) => { setNote(t); setTimeout(() => setNote(''), 1800); };

  const zip = () => {
    try {
      const bytes = projectsToZip([{ project, memory, chats }], { steps });
      downloadBlob(new Blob([bytes], { type: 'application/zip' }), projectZipName(project));
      flash(t('chat.saved'));
    } catch (e) {
      flash(t('pe.zipFail', { error: e?.message || e }));
    }
  };
  const markdown = () => {
    downloadBlob(textBlob(projectToMarkdown(project, { memory, chats })), projectFileName(project));
    flash(t('chat.saved'));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(projectToMarkdown(project, { memory, chats })); flash(t('chat.copied')); } catch { flash(t('chat.copyBlocked')); }
  };

  useDismissDetails(ref);

  return html`<details class="menu" ref=${ref}>
    <summary class="btn">${t('pe.export')}<${Icon} name="caretDown" size=${12} /></summary>
    <div class="menu-panel">
      <label class="check check-sm">
        <input type="checkbox" checked=${steps} onChange=${(e) => setSteps(e.target.checked)} />
        <span>${t('pe.include')}</span>
      </label>
      <button type="button" class="btn btn-primary" onClick=${zip}>${t('pe.zip')}</button>
      <button type="button" class="btn" onClick=${markdown}>${t('pe.md')}</button>
      <button type="button" class="btn" onClick=${copy}>${t('pe.copy')}</button>
      <p class="menu-fine">${t('pe.fine', { docs: tn('document', project.docs.length), chats: tn('filedChat', chats.length) })}</p>
      <div class="menu-note" role="status">${note}</div>
    </div>
  </details>`;
}
