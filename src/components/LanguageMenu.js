// Language switching: a compact <select> for the start page and a dialog opened from the sidebar.
// Both only report the choice; App owns the state and the saved preference.
import { html } from '../lib/ui.js';
import { Modal } from './Modal.js';
import { LANGS, getLang, t } from '../lib/i18n.js';

export function LanguageSelect({ onChange }) {
  const current = getLang();
  return html`<select
    class="lang-select" aria-label=${t('lang.title')} title=${t('lang.title')}
    onChange=${(e) => onChange(e.target.value)}
  >
    ${LANGS.map((l) => html`<option key=${l.code} value=${l.code} lang=${l.code} selected=${l.code === current}>${l.name}</option>`)}
  </select>`;
}

export function LanguageDialog({ onChange, onClose }) {
  const current = getLang();
  return html`<${Modal} title=${t('lang.title')} onClose=${onClose}>
    <p class="fine">${t('lang.hint')}</p>
    <div class="lang-list" role="radiogroup" aria-label=${t('lang.title')}>
      ${LANGS.map((l) => html`<button
        key=${l.code} type="button" role="radio" lang=${l.code}
        aria-checked=${l.code === current} class=${`btn ${l.code === current ? 'btn-primary' : ''}`}
        onClick=${() => onChange(l.code)}
      >${l.name}</button>`)}
    </div>
  <//>`;
}
