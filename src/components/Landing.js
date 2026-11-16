import { html, useRef } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { fromInput } from '../lib/files.js';
import { ManifestHelp } from './ManifestHelp.js';
import { LanguageSelect } from './LanguageMenu.js';
import { t } from '../lib/i18n.js';

const ACCEPTED = [
  ['conversations.json', 'acc.conversations'],
  ['conversations-XXX.zip', 'acc.conversationsZip'],
  ['projects-XXX.zip', 'acc.projects'],
  ['memories-XXX.zip', 'acc.memories'],
  ['frames-XXX.zip', 'acc.frames'],
  ['feedback-XXX.zip', 'acc.feedback'],
  ['design_chats-XXX.zip', 'acc.design'],
];

/**
 * First page. Before anything is loaded it is the only page. Afterwards it stays reachable from the
 * sidebar (`loaded` is a summary string then) to add more files, open the viewer or clear the data.
 */
export function Landing({ onEntries, busy, progress, error, remember, setRemember, loaded, onOpen, onClear, manifest, onLang }) {
  const fileInput = useRef(null);
  const folderInput = useRef(null);

  const onPick = (e) => {
    const entries = fromInput(e.target.files);
    e.target.value = '';
    if (entries.length) onEntries(entries);
  };

  return html`<main class="landing">
    <div class="landing-inner">
      <div class="landing-lang"><${LanguageSelect} onChange=${onLang} /></div>
      <h1>${t('land.title')}</h1>
      <p class="lede">${t('land.lede')}</p>

      ${loaded && html`<div class="loaded-card">
        <div>
          <p class="loaded-label">${t('land.loadedNow')}</p>
          <p class="loaded-sum">${loaded}</p>
        </div>
        <div class="loaded-actions">
          <button type="button" class="btn btn-primary" onClick=${onOpen}>${t('land.open')}</button>
          <button type="button" class="btn" onClick=${onClear}>${t('land.clear')}</button>
        </div>
      </div>`}

      <div class=${`drop ${busy ? 'is-busy' : ''}`} aria-live="polite">
        ${busy
          ? html`<div class="drop-busy"><span class="spinner" aria-hidden="true"></span><span>${progress || t('working')}</span></div>`
          : html`
            <${Icon} name="uploadSimple" size=${22} />
            <p class="drop-title">${loaded ? t('land.dropMore') : t('land.drop')}</p>
            <p class="drop-sub">${loaded ? t('land.mergeNote') : t('land.dropSub')}</p>
            <div class="drop-actions">
              <button type="button" class="btn btn-primary" onClick=${() => fileInput.current.click()}>${t('land.chooseFiles')}</button>
              <button type="button" class="btn" onClick=${() => folderInput.current.click()}>${t('land.chooseFolder')}</button>
            </div>`}
      </div>

      ${manifest && !loaded && html`<${ManifestHelp} manifest=${manifest} />`}

      ${error && html`<div class="notice notice-error" role="alert"><${Icon} name="warningCircle" size=${16} /><span>${error}</span></div>`}

      <label class="check">
        <input type="checkbox" checked=${remember} onChange=${(e) => setRemember(e.target.checked)} />
        <span>${t('land.keep')}</span>
      </label>

      <section class="accepts">
        <h2>${t('land.accepted')}</h2>
        <ul>
          ${ACCEPTED.map(([name, what]) => html`<li key=${name}><code>${name}</code><span>${t(what)}</span></li>`)}
        </ul>
        <p class="fine">${t('land.ignored')}</p>
      </section>

      <input ref=${fileInput} type="file" multiple accept=".json,.zip,application/json,application/zip" hidden onChange=${onPick} />
      <input ref=${folderInput} type="file" webkitdirectory directory multiple hidden onChange=${onPick} />
    </div>
  </main>`;
}
