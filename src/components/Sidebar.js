import { html, useState, useEffect } from '../lib/ui.js';
import { Icon } from './Icon.js';

export const VIEWS = [
  { id: 'chats', label: 'Chats', icon: 'chatsCircle' },
  { id: 'projects', label: 'Projects', icon: 'folderSimple' },
  { id: 'memory', label: 'Memory', icon: 'brain' },
  { id: 'artifacts', label: 'Artifacts', icon: 'cube' },
  { id: 'reflections', label: 'Reflections', icon: 'lightbulb' },
];

export function Rail({ view, counts, onAdd, onLog, onForget, canForget }) {
  return html`<nav class="rail" aria-label="Sections">
    <div class="rail-top">
      ${VIEWS.map((v) => html`<a
        key=${v.id}
        class=${`rail-btn ${counts[v.id] ? '' : 'is-empty'}`}
        href=${`#/${v.id}`}
        aria-current=${view === v.id ? 'page' : undefined}
        aria-label=${`${v.label}, ${counts[v.id] || 0}`}
        title=${`${v.label} (${counts[v.id] || 0})`}
      ><${Icon} name=${v.icon} size=${20} /></a>`)}
    </div>
    <div class="rail-bottom">
      <button type="button" class="rail-btn" onClick=${onAdd} aria-label="Add files" title="Add files"><${Icon} name="plus" size=${20} /></button>
      <button type="button" class="rail-btn" onClick=${onLog} aria-label="Import log" title="Import log"><${Icon} name="fileText" size=${20} /></button>
      ${canForget && html`<button type="button" class="rail-btn" onClick=${onForget} aria-label="Forget stored data" title="Forget stored data"><${Icon} name="trash" size=${20} /></button>`}
    </div>
  </nav>`;
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Generic list column. `groups` is [{label, items:[{id, title, meta?, snippet?}]}].
 * Search is owned by the parent so the chat view can run full-text search.
 */
export function ListPane({ title, count, groups, selectedId, view, query, onQuery, searchable, footer, emptyText }) {
  const [draft, setDraft] = useState(query || '');
  const debounced = useDebounced(draft, 140);
  useEffect(() => { onQuery?.(debounced); }, [debounced]);
  useEffect(() => { setDraft(query || ''); }, [view]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return html`<aside class="list">
    <header class="list-head">
      <h2>${title}</h2>
      <span class="count">${count}</span>
    </header>
    ${searchable && html`<div class="search">
      <${Icon} name="magnifyingGlass" size=${14} />
      <input
        type="search"
        value=${draft}
        onInput=${(e) => setDraft(e.target.value)}
        placeholder="Search titles and messages"
        aria-label="Search chats"
        spellcheck="false"
      />
      ${draft && html`<button type="button" class="icon-btn" aria-label="Clear search" onClick=${() => setDraft('')}><${Icon} name="x" size=${12} /></button>`}
    </div>`}
    <div class="items">
      ${groups.map((g) => html`<section class="group" key=${g.label}>
        ${g.label && html`<h3>${g.label}</h3>`}
        ${g.items.map((it, i) => html`<a
          key=${it.id}
          class="item"
          style=${`--i:${Math.min(i, 12)}`}
          href=${`#/${view}/${encodeURIComponent(it.id)}`}
          aria-current=${selectedId === it.id ? 'page' : undefined}
        >
          <span class="item-title">${it.title}</span>
          ${it.snippet
            ? html`<span class="item-snippet">${it.snippet.before}<mark>${it.snippet.match}</mark>${it.snippet.after}</span>`
            : it.meta && html`<span class="item-meta">${it.meta}</span>`}
        </a>`)}
      </section>`)}
      ${total === 0 && html`<div class="list-empty">${emptyText || 'Nothing here.'}</div>`}
    </div>
    ${footer && html`<footer class="list-foot">${footer}</footer>`}
  </aside>`;
}
