// A modal dialog built on the native <dialog> element. showModal() already provides the inert
// page, focus containment, top layer, Escape and back-gesture dismissal and focus return to the
// invoker, so none of that is written by hand here.
import { html, useRef, useEffect } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { t } from '../lib/i18n.js';

// Press and release both outside the dialog box: a text-selection drag that ends on the
// backdrop must not dismiss it. Position is tested, not event.target, because the <dialog> is
// also the target for its own padding.
const outside = (e, dialog) => {
  const r = dialog.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};

/**
 * @param title    visible heading, also the accessible name
 * @param onClose  called once, whichever way the dialog closes (button, Escape, backdrop click)
 */
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();

    // closedby="any" gives light dismiss natively (Chrome 134, Firefox 141). Elsewhere the modal
    // still closes on Escape, and this adds the backdrop click.
    if ('closedBy' in HTMLDialogElement.prototype) return undefined;
    let pressedOutside = false;
    const down = (e) => { pressedOutside = outside(e, dialog); };
    const up = (e) => { if (pressedOutside && outside(e, dialog)) dialog.close(); };
    dialog.addEventListener('pointerdown', down);
    dialog.addEventListener('pointerup', up);
    return () => {
      dialog.removeEventListener('pointerdown', down);
      dialog.removeEventListener('pointerup', up);
    };
  }, []);

  return html`<dialog class="modal" ref=${ref} closedby="any" aria-label=${title} onClose=${onClose}>
    <header>
      <h2>${title}</h2>
      <button type="button" class="icon-btn" onClick=${() => ref.current.close()} aria-label=${t('modal.close')}><${Icon} name="x" size=${14} /></button>
    </header>
    ${children}
  </dialog>`;
}
