import { html, useState, useMemo, useRef, useCallback, useEffect } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { Message } from './Message.js';
import { Markdown } from './Markdown.js';
import { buildTree, resolvePath, countForks, toViewList } from '../lib/tree.js';
import { chatTitle, fmtDate } from '../lib/format.js';
import { chatToMarkdown, exportFileName } from '../lib/export.js';
import { diagnoseEmpty } from '../lib/empties.js';
import { downloadBlob, textBlob } from '../lib/download.js';
import { useDismissDetails } from '../lib/hooks.js';
import { ProjectMenu } from './ProjectLinks.js';

const MAX_HITS = 500;
const canHighlight = () => typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';

/** Find every occurrence of `q` in rendered text, skipping text hidden inside closed <details>. */
function findRanges(root, q) {
  const found = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node && found.length < MAX_HITS; node = walker.nextNode()) {
    const closed = node.parentElement?.closest('details:not([open])');
    if (closed && !node.parentElement.closest('summary')) continue;
    const text = node.nodeValue.toLowerCase();
    for (let i = text.indexOf(q); i !== -1 && found.length < MAX_HITS; i = text.indexOf(q, i + q.length)) {
      const r = new Range();
      r.setStart(node, i);
      r.setEnd(node, i + q.length);
      found.push(r);
    }
  }
  return found;
}

/** Shown in place of the messages when the export holds nothing readable for a chat. */
function EmptyNotice({ diagnosis: d }) {
  const f = d.facts;
  return html`<section class="empty-note" aria-label="Why this chat is empty">
    <h2><${Icon} name="eyeSlash" size=${16} />${d.title}</h2>
    <p>${d.detail}</p>
    ${f.total > 0 && html`<dl>
      <div><dt>Messages in export</dt><dd>${f.total}</dd></div>
      ${f.first && html`<div><dt>First message</dt><dd>${f.first}</dd></div>`}
      ${f.last && f.last !== f.first && html`<div><dt>Last message</dt><dd>${f.last}</dd></div>`}
    </dl>`}
  </section>`;
}

function ExportMenu({ chat, items }) {
  const [steps, setSteps] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef(null);
  const flash = (t) => { setNote(t); setTimeout(() => setNote(''), 1600); };

  const md = () => chatToMarkdown(chat, items, { steps });
  const download = () => {
    downloadBlob(textBlob(md()), exportFileName(chat));
    flash('Saved');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(md()); flash('Copied'); } catch { flash('Copy blocked'); }
  };

  useDismissDetails(ref);

  return html`<details class="menu" ref=${ref}>
    <summary class="btn">Export<${Icon} name="caretDown" size=${12} /></summary>
    <div class="menu-panel">
      <label class="check check-sm">
        <input type="checkbox" checked=${steps} onChange=${(e) => setSteps(e.target.checked)} />
        <span>Include thinking and tool calls</span>
      </label>
      <button type="button" class="btn btn-primary" onClick=${download}>Download .md</button>
      <button type="button" class="btn" onClick=${copy}>Copy as Markdown</button>
      <div class="menu-note" role="status">${note}</div>
    </div>
  </details>`;
}

export function ChatView({ chat, onBack, query = '', projects = [], projectId = null, onAssign }) {
  const tree = useMemo(() => buildTree(chat.messages), [chat]);
  const [choice, setChoice] = useState({});
  const path = useMemo(() => resolvePath(tree, choice), [tree, choice]);
  const items = useMemo(() => toViewList(path), [path]);
  const forks = useMemo(() => countForks(tree), [tree]);
  const empty = useMemo(() => diagnoseEmpty(chat), [chat]);
  const scroller = useRef(null);
  const column = useRef(null);
  const ranges = useRef([]);
  const [hits, setHits] = useState(0);
  const [cur, setCur] = useState(0);

  const pick = useCallback((parentKey, uuid) => setChoice((c) => ({ ...c, [parentKey]: uuid })), []);
  const toEnd = () => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });

  const focusHit = useCallback((i) => {
    const rs = ranges.current;
    if (!rs.length) return;
    const idx = (i + rs.length) % rs.length;
    setCur(idx);
    CSS.highlights.set('hit-current', new Highlight(rs[idx]));
    rs[idx].startContainer.parentElement?.scrollIntoView({ block: 'center' });
  }, []);

  // Highlight the active search term inside the chat (CSS Custom Highlight API: no DOM changes).
  useEffect(() => {
    if (!canHighlight()) return undefined;
    const q = query.trim().toLowerCase();
    CSS.highlights.delete('hit');
    CSS.highlights.delete('hit-current');
    ranges.current = [];
    if (!q || !column.current) { setHits(0); return undefined; }
    const found = findRanges(column.current, q);
    ranges.current = found;
    setHits(found.length);
    if (found.length) {
      CSS.highlights.set('hit', new Highlight(...found));
      focusHit(0);
    }
    return () => { CSS.highlights.delete('hit'); CSS.highlights.delete('hit-current'); };
  }, [query, items, chat]);

  const searching = query.trim() && canHighlight();

  return html`<section class="pane">
    <header class="pane-head">
      <button type="button" class="icon-btn back" onClick=${onBack} aria-label="Back to list"><${Icon} name="caretLeft" size=${16} /></button>
      <div class="pane-title">
        <h1>${chatTitle(chat)}</h1>
        <div class="pane-meta">
          ${empty
            ? html`<span class="tag"><${Icon} name="eyeSlash" size=${12} />Empty chat</span>`
            : html`<span>${items.length} ${items.length === 1 ? 'message' : 'messages'}</span>`}
          <span>${fmtDate(chat.created_at)}</span>
          ${forks > 0 && html`<span class="tag"><${Icon} name="gitBranch" size=${12} />${forks} ${forks === 1 ? 'branch point' : 'branch points'}</span>`}
        </div>
      </div>
      ${searching && html`<div class="hit-nav" role="group" aria-label="Search matches in this chat">
        <span class="hit-count">${hits ? `${cur + 1} / ${hits}${hits >= MAX_HITS ? '+' : ''}` : 'no matches here'}</span>
        <button type="button" class="icon-btn" disabled=${!hits} onClick=${() => focusHit(cur - 1)} aria-label="Previous match"><${Icon} name="caretLeft" size=${14} /></button>
        <button type="button" class="icon-btn" disabled=${!hits} onClick=${() => focusHit(cur + 1)} aria-label="Next match"><${Icon} name="caretRight" size=${14} /></button>
      </div>`}
      ${!empty && items.length > 12 && html`<button type="button" class="btn" onClick=${toEnd}>Latest</button>`}
      ${!empty && projects.length > 0 && onAssign && html`<${ProjectMenu} projects=${projects} value=${projectId} onChange=${(id) => onAssign(chat.uuid, id)} />`}
      ${!empty && html`<${ExportMenu} chat=${chat} items=${items} />`}
    </header>
    <div class="scroll" ref=${scroller}>
      <div class="column" ref=${column}>
        ${chat.summary && html`<details class="summary">
          <summary>Summary<${Icon} name="caretRight" size=${12} class="chev" /></summary>
          <${Markdown} text=${chat.summary} />
        </details>`}
        ${items.map((item) => html`<${Message} key=${item.entry.msg.uuid} item=${item} onPick=${pick} />`)}
        ${empty && html`<${EmptyNotice} diagnosis=${empty} />`}
      </div>
    </div>
  </section>`;
}
