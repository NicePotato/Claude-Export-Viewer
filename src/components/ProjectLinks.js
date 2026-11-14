// Controls for filing chats into projects: a menu on the chat and a picker on the project.
import { html, useState, useRef, useEffect, useMemo } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { chatTitle, fmtDate } from '../lib/format.js';

const projectLabel = (p) => p.name || 'Untitled project';

/** Close a <details> menu when the user clicks elsewhere. */
function useDismiss(ref) {
  useEffect(() => {
    const onDown = (e) => { if (ref.current?.open && !ref.current.contains(e.target)) ref.current.open = false; };
    addEventListener('pointerdown', onDown);
    return () => removeEventListener('pointerdown', onDown);
  }, []);
}

/** Header menu on a chat: pick the project it belongs to. */
export function ProjectMenu({ projects, value, onChange }) {
  const ref = useRef(null);
  useDismiss(ref);
  const current = projects.find((p) => p.uuid === value);
  const pick = (id) => { onChange(id); if (ref.current) ref.current.open = false; };

  return html`<details class="menu" ref=${ref}>
    <summary class="btn" title="File this chat in a project">
      <${Icon} name="folderSimple" size=${14} />
      <span class="btn-label">${current ? projectLabel(current) : 'Project'}</span>
      <${Icon} name="caretDown" size=${12} />
    </summary>
    <div class="menu-panel menu-list" role="menu">
      <button type="button" role="menuitemradio" aria-checked=${!current} class=${`menu-item ${!current ? 'is-on' : ''}`} onClick=${() => pick(null)}>No project</button>
      ${projects.map((p) => html`<button
        key=${p.uuid} type="button" role="menuitemradio" aria-checked=${p.uuid === value}
        class=${`menu-item ${p.uuid === value ? 'is-on' : ''}`} onClick=${() => pick(p.uuid)}
      >${projectLabel(p)}</button>`)}
      <p class="menu-fine">The export does not say which project a chat was in, so you choose. Saved in this browser only.</p>
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

  useEffect(() => {
    const on = (e) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose]);

  return html`<div class="modal-backdrop" onClick=${onClose}>
    <div class="modal" role="dialog" aria-modal="true" aria-label=${`Chats in ${projectLabel(project)}`} onClick=${(e) => e.stopPropagation()}>
      <header>
        <h2>Chats in ${projectLabel(project)}</h2>
        <button type="button" class="icon-btn" onClick=${onClose} aria-label="Close"><${Icon} name="x" size=${14} /></button>
      </header>
      <p class="fine">${inProject} selected. The export does not link chats to projects, so tick the ones that belong here.</p>
      <div class="search picker-search">
        <${Icon} name="magnifyingGlass" size=${14} />
        <input type="search" value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Filter chats" aria-label="Filter chats" spellcheck="false" ref=${box} />
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
        ${!rows.length && html`<li class="muted picker-none">No chats match.</li>`}
      </ul>
    </div>
  </div>`;
}
