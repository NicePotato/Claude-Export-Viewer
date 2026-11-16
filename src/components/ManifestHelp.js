// Shown when the user drops the small "download list" file Claude sometimes sends first.
// It holds links to the real zips, not the data, so this explains how to get everything.
import { html } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { fmtDateTime } from '../lib/format.js';

// Most useful first; anything unknown goes last.
const ORDER = ['conversations', 'projects', 'memories', 'frames', 'feedback', 'design_chats', 'light_metadata'];
const rank = (c) => (ORDER.includes(c) ? ORDER.indexOf(c) : ORDER.length);

const LABELS = {
  conversations: 'Chats',
  projects: 'Projects and documents',
  memories: 'Memory',
  frames: 'Artifacts',
  feedback: 'Reflections',
  design_chats: 'Design chats',
  light_metadata: 'Account details (the viewer ignores these)',
};

export function ManifestHelp({ manifest, now = Date.now() }) {
  const expired = manifest.expires_at !== null && manifest.expires_at < now;
  const chats = manifest.files.find((f) => f.category === 'conversations');

  return html`<section class="manifest" aria-label="This is a download list">
    <h2><${Icon} name="warningCircle" size=${16} />That file is a download list, not your export</h2>
    <p>
      Claude sometimes sends this small file first. It only holds links to the real files,
      so there is nothing to read in it yet. Here is how to get everything:
    </p>
    <ol>
      ${expired
        ? html`<li>
            <strong>These links have expired${manifest.expires_at ? ` (${fmtDateTime(new Date(manifest.expires_at).toISOString())})` : ''}.</strong>
            In Claude.ai open Settings, then Privacy, and choose Export data. Claude emails you a new link,
            and the new export may again start with a list like this one.
          </li>`
        : html`<li>
            Open each link below while signed in to Claude.ai and let the download finish.
            ${' '}${manifest.expires_at ? `They expire ${fmtDateTime(new Date(manifest.expires_at).toISOString())}, and a link may stop working once it has been used.` : 'They expire after 24 hours.'}
          </li>`}
      <li>Save all ${manifest.files.length} files into one folder and leave them zipped.</li>
      <li>Drop that folder, or the zip files, onto this page.${chats ? html` <code>${chats.filename}</code> alone is enough to read your chats.` : ''}</li>
    </ol>
    <ul class="manifest-files">
      ${manifest.files.toSorted((a, b) => rank(a.category) - rank(b.category)).map((f) => html`<li key=${f.filename}>
        <span class="manifest-name">${f.filename}</span>
        <span class="manifest-what">${LABELS[f.category] || f.category}</span>
        ${f.url && !expired
          ? html`<a class="btn" href=${f.url} target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><${Icon} name="downloadSimple" size=${14} />Download</a>`
          : html`<span class="manifest-na">${expired ? 'expired' : 'no link'}</span>`}
      </li>`)}
    </ul>
    <p class="fine">This page only shows the links. It never opens them itself, and the list is not kept in your browser.</p>
  </section>`;
}
