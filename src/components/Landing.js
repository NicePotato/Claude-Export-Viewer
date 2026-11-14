import { html, useRef } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { fromInput } from '../lib/files.js';

const ACCEPTED = [
  ['conversations.json', 'Chats'],
  ['conversations-000.zip', 'Chats, zipped'],
  ['projects-000.zip', 'Projects and their documents'],
  ['memories-000.zip', 'Memory'],
  ['frames-000.zip', 'Artifacts and pages'],
  ['feedback-000.zip', 'Reflections'],
  ['design_chats-000.zip', 'Design chats'],
];

/**
 * First page. Before anything is loaded it is the only page. Afterwards it stays reachable from the
 * sidebar (`loaded` is a summary string then) to add more files, open the viewer or clear the data.
 */
export function Landing({ onEntries, busy, progress, error, remember, setRemember, loaded, onOpen, onClear }) {
  const fileInput = useRef(null);
  const folderInput = useRef(null);

  const onPick = (e) => {
    const entries = fromInput(e.target.files);
    e.target.value = '';
    if (entries.length) onEntries(entries);
  };

  return html`<main class="landing">
    <div class="landing-inner">
      <h1>Claude export viewer</h1>
      <p class="lede">Read your exported chats the way you wrote them. Everything stays in this browser tab. Nothing is uploaded.</p>

      ${loaded && html`<div class="loaded-card">
        <div>
          <p class="loaded-label">Loaded now</p>
          <p class="loaded-sum">${loaded}</p>
        </div>
        <div class="loaded-actions">
          <button type="button" class="btn btn-primary" onClick=${onOpen}>Open viewer</button>
          <button type="button" class="btn" onClick=${onClear}>Clear</button>
        </div>
      </div>`}

      <div class=${`drop ${busy ? 'is-busy' : ''}`} aria-live="polite">
        ${busy
          ? html`<div class="drop-busy"><span class="spinner" aria-hidden="true"></span><span>${progress || 'Working'}</span></div>`
          : html`
            <${Icon} name="uploadSimple" size=${22} />
            <p class="drop-title">${loaded ? 'Drop more files or a folder here' : 'Drop files or a folder here'}</p>
            <p class="drop-sub">${loaded ? 'New files are merged into what is already loaded.' : 'A single conversations.json works. So does any mix of the export zips.'}</p>
            <div class="drop-actions">
              <button type="button" class="btn btn-primary" onClick=${() => fileInput.current.click()}>Choose files</button>
              <button type="button" class="btn" onClick=${() => folderInput.current.click()}>Choose folder</button>
            </div>`}
      </div>

      ${error && html`<div class="notice notice-error" role="alert"><${Icon} name="warningCircle" size=${16} /><span>${error}</span></div>`}

      <label class="check">
        <input type="checkbox" checked=${remember} onChange=${(e) => setRemember(e.target.checked)} />
        <span>Keep the loaded export in this browser so I do not have to drop it again</span>
      </label>

      <section class="accepts">
        <h2>Accepted files</h2>
        <ul>
          ${ACCEPTED.map(([name, what]) => html`<li key=${name}><code>${name}</code><span>${what}</span></li>`)}
        </ul>
        <p class="fine">Account files (users, login history) are ignored on purpose.</p>
      </section>

      <input ref=${fileInput} type="file" multiple accept=".json,.zip,application/json,application/zip" hidden onChange=${onPick} />
      <input ref=${folderInput} type="file" webkitdirectory directory multiple hidden onChange=${onPick} />
    </div>
  </main>`;
}
