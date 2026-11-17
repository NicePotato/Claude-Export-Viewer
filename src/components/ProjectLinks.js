// Controls for filing chats and artifacts into projects: a menu on the item and a picker on the project.
import { html, useState, useRef, useEffect, useMemo } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { Modal } from './Modal.js';
import { useDismissDetails } from '../lib/hooks.js';
import { chatTitle, fmtDate } from '../lib/format.js';
import { t } from '../lib/i18n.js';

const projectLabel = (p) => p.name || t('untitledProject');

/** Header menu on a chat or artifact: pick the project it belongs to. `kind` is 'chat' or 'artifact'. */
export function ProjectMenu({ projects, value, onChange, kind = 'chat' }) {
  const ref = useRef(null);
  useDismissDetails(ref);
  const current = projects.find((p) => p.uuid === value);
  const pick = (id) => { onChange(id); if (ref.current) ref.current.open = false; };

  return html`<details class="menu" ref=${ref}>
    <summary class="btn" title=${t(kind === 'artifact' ? 'pl.artFileTitle' : 'pl.fileTitle')}>
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
      <p class="menu-fine">${t(kind === 'artifact' ? 'pl.artFine' : 'pl.fine')}</p>
    </div>
  </details>`;
}

const MAX_ROWS = 300;

/**
 * Dialog on a project: tick the items that belong to it.
 * @param items  chats or artifacts; `idOf`, `titleOf` and `dateOf` read them, `labels` holds the translated texts
 */
function ItemPicker({ project, items, idOf, titleOf, dateOf, assignments, projects, onToggle, onClose, labels }) {
  const [q, setQ] = useState('');
  const box = useRef(null);
  useEffect(() => { box.current?.focus(); }, []);
  const nameOf = useMemo(() => new Map(projects.map((p) => [p.uuid, projectLabel(p)])), [projects]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = needle ? items.filter((i) => titleOf(i).toLowerCase().includes(needle)) : items;
    return all.slice(0, MAX_ROWS);
  }, [items, q]);
  const inProject = items.filter((i) => assignments[idOf(i)] === project.uuid).length;

  return html`<${Modal} title=${labels.title} onClose=${onClose}>
      <p class="fine">${labels.selected(inProject)}</p>
      <div class="search picker-search">
        <${Icon} name="magnifyingGlass" size=${14} />
        <input type="search" value=${q} onInput=${(e) => setQ(e.target.value)} placeholder=${labels.filter} aria-label=${labels.filter} spellcheck="false" ref=${box} />
      </div>
      <ul class="picker">
        ${rows.map((i) => {
          const id = idOf(i);
          const at = assignments[id];
          return html`<li key=${id}><label class="picker-row">
            <input type="checkbox" checked=${at === project.uuid} onChange=${() => onToggle(id, at === project.uuid ? null : project.uuid)} />
            <span class="picker-title">${titleOf(i)}</span>
            <span class="picker-meta">${at && at !== project.uuid ? nameOf.get(at) || '' : fmtDate(dateOf(i))}</span>
          </label></li>`;
        })}
        ${!rows.length && html`<li class="muted picker-none">${labels.none}</li>`}
      </ul>
  <//>`;
}

/** Dialog on a project: tick the chats that belong to it. */
export function ChatPicker({ chats, ...rest }) {
  return html`<${ItemPicker}
    ...${rest} items=${chats} idOf=${(c) => c.uuid} titleOf=${chatTitle} dateOf=${(c) => c.updated_at}
    labels=${{
      title: t('pl.chatsIn', { name: projectLabel(rest.project) }),
      selected: (n) => t('pl.selected', { n }),
      filter: t('pl.filter'),
      none: t('empty.chatsNoMatch'),
    }}
  />`;
}

/** Dialog on a project: tick the artifacts that belong to it. */
export function ArtifactPicker({ artifacts, ...rest }) {
  return html`<${ItemPicker}
    ...${rest} items=${artifacts} idOf=${(a) => a.id} titleOf=${(a) => a.title} dateOf=${(a) => a.updated_at}
    labels=${{
      title: t('pl.artifactsIn', { name: projectLabel(rest.project) }),
      selected: (n) => t('pl.artSelected', { n }),
      filter: t('pl.artFilter'),
      none: t('empty.artifactsNoMatch'),
    }}
  />`;
}
