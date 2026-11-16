// Shown when the user drops the small "download list" file Claude sometimes sends first.
// It holds links to the real zips, not the data, so this explains how to get everything.
import { html } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { fmtDateTime } from '../lib/format.js';
import { t } from '../lib/i18n.js';

// Most useful first; anything unknown goes last.
const ORDER = ['conversations', 'projects', 'memories', 'frames', 'feedback', 'design_chats', 'light_metadata'];
const rank = (c) => (ORDER.includes(c) ? ORDER.indexOf(c) : ORDER.length);

// Label for a file category; unknown categories show their raw name.
const label = (category) => (ORDER.includes(category) ? t(`man.l.${category}`) : category);

/** Put `file` in <code> wherever the translation has a {file} placeholder, so word order stays free. */
function withCode(text, file) {
  const [before, ...rest] = text.split('{file}');
  return html`${before}${rest.map((part, i) => html`<code key=${i}>${file}</code>${part}`)}`;
}

export function ManifestHelp({ manifest, now = Date.now() }) {
  const expired = manifest.expires_at !== null && manifest.expires_at < now;
  const chats = manifest.files.find((f) => f.category === 'conversations');
  const when = manifest.expires_at ? fmtDateTime(new Date(manifest.expires_at).toISOString()) : '';

  return html`<section class="manifest" aria-label=${t('man.label')}>
    <h2><${Icon} name="warningCircle" size=${16} />${t('man.title')}</h2>
    <p>${t('man.p1')}</p>
    <ol>
      ${expired
        ? html`<li>
            <strong>${t('man.expiredStrong', { when: when ? ` (${when})` : '' })}</strong>
            ${' '}${t('man.expiredRest')}
          </li>`
        : html`<li>
            ${t('man.open')}
            ${' '}${when ? t('man.expiresAt', { date: when }) : t('man.expires24')}
          </li>`}
      <li>${t('man.save', { n: manifest.files.length })}</li>
      <li>${t('man.drop')}${chats ? html` ${withCode(t('man.alone'), chats.filename)}` : ''}</li>
    </ol>
    <ul class="manifest-files">
      ${manifest.files.toSorted((a, b) => rank(a.category) - rank(b.category)).map((f) => html`<li key=${f.filename}>
        <span class="manifest-name">${f.filename}</span>
        <span class="manifest-what">${label(f.category)}</span>
        ${f.url && !expired
          ? html`<a class="btn" href=${f.url} target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><${Icon} name="downloadSimple" size=${14} />${t('man.download')}</a>`
          : html`<span class="manifest-na">${expired ? t('man.expired') : t('man.noLink')}</span>`}
      </li>`)}
    </ul>
    <p class="fine">${t('man.fine')}</p>
  </section>`;
}
