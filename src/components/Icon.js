import { html } from '../lib/ui.js';
import { ICONS } from '../lib/icons.js';

export function Icon({ name, size = 16, class: cls = '' }) {
  return html`<svg
    class=${`icon ${cls}`}
    width=${size}
    height=${size}
    viewBox="0 0 256 256"
    fill="currentColor"
    aria-hidden="true"
    dangerouslySetInnerHTML=${{ __html: ICONS[name] || '' }}
  />`;
}
