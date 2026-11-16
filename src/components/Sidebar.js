import { html, useState, useEffect } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { t, getLang } from '../lib/i18n.js';

// `label` is the translation key; use viewLabel() to show it.
export const VIEWS = [
  { id: 'chats', label: 'view.chats', icon: 'chatsCircle' },
  { id: 'projects', label: 'view.projects', icon: 'folderSimple' },
  { id: 'memory', label: 'view.memory', icon: 'brain' },
  { id: 'artifacts', label: 'view.artifacts', icon: 'cube' },
  { id: 'reflections', label: 'view.reflections', icon: 'lightbulb' },
];

/** One rail entry. The label is always in the DOM for screen readers; CSS hides it when collapsed. */
function RailItem({ icon, glyph, label, count, title, empty, attrs }) {
  const Tag = attrs.href ? 'a' : 'button';
  return html`<${Tag} class=${`rail-btn ${empty ? 'is-empty' : ''}`} title=${title || label} ...${attrs}>
    ${glyph ? html`<span class="rail-glyph" aria-hidden="true">${glyph}</span>` : html`<${Icon} name=${icon} size=${20} />`}
    <span class="rail-label">${label}</span>
    ${count !== undefined && html`<span class="rail-count">${count}</span>`}
  <//>`;
}

export function Rail({ view, counts, onAdd, onLog, onForget, onLanguage, canForget, open, onToggle }) {
  return html`<nav class=${`rail ${open ? 'is-open' : ''}`} aria-label=${t('rail.sections')}>
    <div class="rail-top">
      <button
        type="button" class="rail-btn rail-toggle" onClick=${onToggle}
        aria-expanded=${open ? 'true' : 'false'}
        title=${open ? t('rail.collapseSidebar') : t('rail.expandSidebar')}
      >
        <${Icon} name="sidebarSimple" size=${20} />
        <span class="rail-label">${open ? t('rail.collapse') : t('rail.expand')}</span>
      </button>
      <${RailItem}
        icon="house" label=${t('rail.start')} title=${t('rail.start')}
        attrs=${{ href: '#/home', 'aria-current': view === 'home' ? 'page' : undefined }}
      />
      ${VIEWS.map((v) => html`<${RailItem}
        key=${v.id} icon=${v.icon} label=${t(v.label)} count=${counts[v.id] || 0}
        empty=${!counts[v.id]} title=${`${t(v.label)} (${counts[v.id] || 0})`}
        attrs=${{ href: `#/${v.id}`, 'aria-current': view === v.id ? 'page' : undefined }}
      />`)}
    </div>
    <div class="rail-bottom">
      <${RailItem} icon="plus" label=${t('rail.add')} attrs=${{ type: 'button', onClick: onAdd }} />
      <${RailItem} icon="fileText" label=${t('rail.log')} attrs=${{ type: 'button', onClick: onLog }} />
      <${RailItem} glyph=${getLang().toUpperCase()} label=${t('rail.language')} attrs=${{ type: 'button', onClick: onLanguage }} />
      ${canForget && html`<${RailItem} icon="trash" label=${t('rail.forget')} attrs=${{ type: 'button', onClick: onForget }} />`}
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
export function ListPane({ title, count, groups, selectedId, view, query, onQuery, searchable, footer, emptyText, order, onOrder, groupBy, onGroupBy }) {
  const [draft, setDraft] = useState(query || '');
  const debounced = useDebounced(draft, 140);
  useEffect(() => { onQuery?.(debounced); }, [debounced]);
  useEffect(() => { setDraft(query || ''); }, [view]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return html`<aside class="list">
    <header class="list-head">
      <h2>${title}</h2>
      <span class="count">${count}</span>
      ${onOrder && html`<button
        type="button" class="icon-btn sort-btn" onClick=${() => onOrder(order === 'old' ? 'new' : 'old')}
        aria-label=${order === 'old' ? t('list.switchToNewest') : t('list.switchToOldest')}
        title=${order === 'old' ? t('list.oldestFirst') : t('list.newestFirst')}
      ><${Icon} name=${order === 'old' ? 'sortAscending' : 'sortDescending'} size=${16} /></button>`}
    </header>
    ${searchable && html`<div class="search">
      <${Icon} name="magnifyingGlass" size=${14} />
      <input
        type="search"
        value=${draft}
        onInput=${(e) => setDraft(e.target.value)}
        placeholder=${t('list.search')}
        aria-label=${t('list.searchLabel')}
        spellcheck="false"
      />
      ${draft && html`<button type="button" class="icon-btn" aria-label=${t('list.clearSearch')} onClick=${() => setDraft('')}><${Icon} name="x" size=${12} /></button>`}
    </div>`}
    ${onGroupBy && html`<div class="seg" role="group" aria-label=${t('list.groupBy')}>
      <button type="button" aria-pressed=${groupBy !== 'project'} onClick=${() => onGroupBy('date')}>${t('list.byDate')}</button>
      <button type="button" aria-pressed=${groupBy === 'project'} onClick=${() => onGroupBy('project')}>${t('list.byProject')}</button>
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
      ${total === 0 && html`<div class="list-empty">${emptyText || t('list.nothing')}</div>`}
    </div>
    ${footer && html`<footer class="list-foot">${footer}</footer>`}
  </aside>`;
}
