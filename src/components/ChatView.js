import { html, useState, useMemo, useRef, useCallback } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { Message } from './Message.js';
import { Markdown } from './Markdown.js';
import { buildTree, resolvePath, countForks, toViewList } from '../lib/tree.js';
import { chatTitle, fmtDate } from '../lib/format.js';

export function ChatView({ chat, onBack }) {
  const tree = useMemo(() => buildTree(chat.messages), [chat]);
  const [choice, setChoice] = useState({});
  const path = useMemo(() => resolvePath(tree, choice), [tree, choice]);
  const items = useMemo(() => toViewList(path), [path]);
  const forks = useMemo(() => countForks(tree), [tree]);
  const scroller = useRef(null);

  const pick = useCallback((parentKey, uuid) => setChoice((c) => ({ ...c, [parentKey]: uuid })), []);
  const toEnd = () => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });

  return html`<section class="pane">
    <header class="pane-head">
      <button type="button" class="icon-btn back" onClick=${onBack} aria-label="Back to list"><${Icon} name="caretLeft" size=${16} /></button>
      <div class="pane-title">
        <h1>${chatTitle(chat)}</h1>
        <div class="pane-meta">
          <span>${items.length} ${items.length === 1 ? 'message' : 'messages'}</span>
          <span>${fmtDate(chat.created_at)}</span>
          ${forks > 0 && html`<span class="tag"><${Icon} name="gitBranch" size=${12} />${forks} ${forks === 1 ? 'branch point' : 'branch points'}</span>`}
        </div>
      </div>
      ${items.length > 12 && html`<button type="button" class="btn" onClick=${toEnd}>Jump to latest</button>`}
    </header>
    <div class="scroll" ref=${scroller}>
      <div class="column">
        ${chat.summary && html`<details class="summary">
          <summary>Summary<${Icon} name="caretRight" size=${12} class="chev" /></summary>
          <${Markdown} text=${chat.summary} />
        </details>`}
        ${items.map((item) => html`<${Message} key=${item.entry.msg.uuid} item=${item} onPick=${pick} />`)}
        ${!items.length && html`<div class="empty">This chat has no messages.</div>`}
      </div>
    </div>
  </section>`;
}
