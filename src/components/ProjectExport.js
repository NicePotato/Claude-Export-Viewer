// Export menu for one project: a folder (zip) or a single Markdown file.
import { html, useState, useRef, useEffect } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { downloadBlob, textBlob } from '../lib/download.js';
import {
  projectToMarkdown, projectsToZip, projectFileName, projectZipName,
} from '../lib/projectExport.js';

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function ProjectExportMenu({ project, memory, chats }) {
  const [steps, setSteps] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef(null);
  const flash = (t) => { setNote(t); setTimeout(() => setNote(''), 1800); };

  const zip = () => {
    try {
      const bytes = projectsToZip([{ project, memory, chats }], { steps });
      downloadBlob(new Blob([bytes], { type: 'application/zip' }), projectZipName(project));
      flash('Saved');
    } catch (e) {
      flash(`Could not build the zip: ${e?.message || e}`);
    }
  };
  const markdown = () => {
    downloadBlob(textBlob(projectToMarkdown(project, { memory, chats })), projectFileName(project));
    flash('Saved');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(projectToMarkdown(project, { memory, chats })); flash('Copied'); } catch { flash('Copy blocked'); }
  };

  useEffect(() => {
    const onDown = (e) => { if (ref.current?.open && !ref.current.contains(e.target)) ref.current.open = false; };
    addEventListener('pointerdown', onDown);
    return () => removeEventListener('pointerdown', onDown);
  }, []);

  return html`<details class="menu" ref=${ref}>
    <summary class="btn">Export<${Icon} name="caretDown" size=${12} /></summary>
    <div class="menu-panel">
      <label class="check check-sm">
        <input type="checkbox" checked=${steps} onChange=${(e) => setSteps(e.target.checked)} />
        <span>Include thinking and tool calls in chats</span>
      </label>
      <button type="button" class="btn btn-primary" onClick=${zip}>Download folder (.zip)</button>
      <button type="button" class="btn" onClick=${markdown}>Download one .md file</button>
      <button type="button" class="btn" onClick=${copy}>Copy as Markdown</button>
      <p class="menu-fine">The folder holds the instructions, memory, ${plural(project.docs.length, 'document')} and ${plural(chats.length, 'filed chat')}.</p>
      <div class="menu-note" role="status">${note}</div>
    </div>
  </details>`;
}
