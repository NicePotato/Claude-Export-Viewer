// Controls for filing chats into projects: a menu on the chat and a picker on the project.
import { html, useState, useRef, useEffect, useMemo } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { Modal } from './Modal.js';
import { useDismissDetails } from '../lib/hooks.js';
import { chatTitle, fmtDate } from '../lib/format.js';
import { t } from '../lib/i18n.js';

const projectLabel = (p) => p.name || t('untitledProject');

/** Header menu on a chat: pick the project it belongs to. */
export function ProjectMenu({ projects, value, onChange }) {
  const ref = useRef(null);
  useDismissDetails(ref);
  const current = projects.find((p) => p.uuid === value);
  const pick = (id) => { onChange(id); if (ref.current) ref.current.open = false; };

  return html`<details class="menu" ref=${ref}>
    <summary class="btn" title=${t('pl.fileTitle')}>
      <${Icon} name="folderSimple" size=${14} />
      <span class="btn-label">${current ? projectLabel(current) : t('pl.project')}</span>
      <${Icon} name="caretDown" size=${12} />
    </summary>
    <div class="menu-panel menu-list" role="menu">
      <button type="button" role="menuitemradio" aria-checked=${!current} class=${`menu-item ${!current ? 'is-on' : ''}`} onClick=${() => pick(null)}>${t('noProject')}</button>
      ${projects.map((p) => html`<button
        key=${p.uuid} type="button" role="menuitemradio" aria-checked=${p.uuid === value}
        class=${`menu-item ${p.uuid === value ? 'is-on' : ''}`} onClick=${() => pick(p.uuid)}
      >${projectLabel(p)}</button>`)}
      <p class="menu-fine">${t('pl.fine')}</p>
    </div>
  </details>`;
}

const MAX_ROWS = 300;

/** Dialog on a project: tick the chats that belong to it. */
export function ChatPicker({ project, chats, assignments, projects, onToggle, onClose }) {
  const [q, setQ] = useState('');
  const box = useRef(null);
  useEffect(() => { box.current?.focus(); }, []);
  const nameOf = useMemo(() => new Map(projects.map((p) => [p.uuid, projectLabel(p)])), [projects]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = needle ? chats.filter((c) => chatTitle(c).toLowerCase().includes(needle)) : chats;
    return all.slice(0, MAX_ROWS);
  }, [chats, q]);
  const inProject = chats.filter((c) => assignments[c.uuid] === project.uuid).length;

  return html`<${Modal} title=${t('pl.chatsIn', { name: projectLabel(project) })} onClose=${onClose}>
      <p class="fine">${t('pl.selected', { n: inProject })}</p>
      <div class="search picker-search">
        <${Icon} name="magnifyingGlass" size=${14} />
        <input type="search" value=${q} onInput=${(e) => setQ(e.target.value)} placeholder=${t('pl.filter')} aria-label=${t('pl.filter')} spellcheck="false" ref=${box} />
      </div>
      <ul class="picker">
        ${rows.map((c) => {
          const at = assignments[c.uuid];
          return html`<li key=${c.uuid}><label class="picker-row">
            <input type="checkbox" checked=${at === project.uuid} onChange=${() => onToggle(c.uuid, at === project.uuid ? null : project.uuid)} />
            <span class="picker-title">${chatTitle(c)}</span>
            <span class="picker-meta">${at && at !== project.uuid ? nameOf.get(at) || '' : fmtDate(c.updated_at)}</span>
          </label></li>`;
        })}
        ${!rows.length && html`<li class="muted picker-none">${t('empty.chatsNoMatch')}</li>`}
      </ul>
  <//>`;
}
