import { html } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { Markdown } from './Markdown.js';
import { CopyButton } from './CopyButton.js';
import { fmtDateTime, fmtBytes, hostname } from '../lib/format.js';
import { toolBrief, toolLabel } from '../lib/tools.js';
import { t, tn } from '../lib/i18n.js';

export { toolBrief, toolLabel };

const STEP_TYPES = new Set(['thinking', 'tool_use', 'tool_result']);
const RESULT_LIMIT = 6000;
const FILE_LIMIT = 20000;

function truncate(text, limit) {
  const s = String(text ?? '');
  return s.length > limit ? { text: s.slice(0, limit), cut: s.length - limit } : { text: s, cut: 0 };
}

function resultText(result) {
  if (!result) return '';
  const c = result.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c.map((p) => (p && p.type === 'text' ? p.text : p && p.type ? `[${p.type}]` : '')).join('\n');
  }
  return '';
}

/** Group consecutive thinking/tool blocks into "steps"; everything else stays as is. */
export function groupBlocks(blocks) {
  const groups = [];
  for (const b of blocks) {
    if (STEP_TYPES.has(b.type)) {
      const last = groups[groups.length - 1];
      if (last && last.kind === 'steps') last.items.push(b);
      else groups.push({ kind: 'steps', items: [b] });
    } else {
      groups.push({ kind: 'block', block: b });
    }
  }
  return groups;
}

function more(cut) {
  return cut ? `\n${t('msg.more', { n: cut })}` : '';
}

function Steps({ items, results }) {
  const thinking = items.filter((i) => i.type === 'thinking').length;
  const tools = items.filter((i) => i.type === 'tool_use').length;
  let label = t('msg.steps');
  if (thinking && tools) label = t('msg.thinkingAnd', { tools: tn('toolCall', tools) });
  else if (thinking) label = t('msg.thinking');
  else if (tools) label = tn('toolCall', tools);
  const rows = items.filter((i) => i.type !== 'tool_result' || !results.pairedIds.has(i.tool_use_id));

  return html`<details class="steps">
    <summary>
      <${Icon} name=${tools ? 'wrench' : 'brain'} size=${14} />
      <span>${label}</span>
      <${Icon} name="caretRight" size=${12} class="chev" />
    </summary>
    <div class="steps-body">
      ${rows.map((b, i) => {
        if (b.type === 'thinking') {
          const text = b.thinking || b.summaries?.[0]?.summary || '';
          return html`<div class="step step-think" key=${i}><${Markdown} text=${text || t('msg.emptyBlock')} /></div>`;
        }
        if (b.type === 'tool_use') {
          const res = results.byUse.get(b.id);
          const out = truncate(resultText(res), RESULT_LIMIT);
          const input = truncate(JSON.stringify(b.input ?? {}, null, 2), RESULT_LIMIT);
          return html`<details class=${`step step-tool${res?.is_error ? ' is-error' : ''}`} key=${i}>
            <summary>
              <span class="tool-name" title=${toolLabel(b.name).full}>${toolLabel(b.name).short}</span>
              <span class="tool-brief">${toolBrief(b)}</span>
              <${Icon} name="caretRight" size=${12} class="chev" />
            </summary>
            <div class="tool-io">
              <div class="io-label">${t('msg.input')}</div>
              <pre>${input.text + more(input.cut)}</pre>
              ${res && html`<div class="io-label">${res.is_error ? t('msg.error') : t('msg.result')}</div>
                <pre>${(out.text || t('msg.emptyBlock')) + more(out.cut)}</pre>`}
            </div>
          </details>`;
        }
        const out = truncate(resultText(b), RESULT_LIMIT);
        return html`<details class="step step-tool" key=${i}>
          <summary><span class="tool-name">${t('msg.resultLower')}</span><${Icon} name="caretRight" size=${12} class="chev" /></summary>
          <div class="tool-io"><pre>${(out.text || t('msg.emptyBlock')) + more(out.cut)}</pre></div>
        </details>`;
      })}
    </div>
  </details>`;
}

function Sources({ citations }) {
  const urls = [];
  for (const c of citations || []) {
    const u = c?.details?.url || c?.url;
    if (u && !urls.includes(u)) urls.push(u);
  }
  if (!urls.length) return null;
  return html`<div class="sources">
    ${urls.map((u) => html`<a class="chip" key=${u} href=${u} target="_blank" rel="noopener noreferrer nofollow" title=${u}>
      <${Icon} name="arrowSquareOut" size=${12} />${hostname(u)}
    </a>`)}
  </div>`;
}

function StaticFile({ icon, name, note }) {
  return html`<div class="file file-static">
    <${Icon} name=${icon} size=${14} /><span class="file-name">${name}</span><span class="file-meta">${note}</span>
  </div>`;
}

function FileChips({ msg }) {
  const seen = new Set();
  const chips = [];

  for (const a of msg.attachments) {
    const body = truncate(a.extracted_content || '', FILE_LIMIT);
    seen.add((a.file_name || '').toLowerCase());
    chips.push(html`<details class="file" key=${`a-${chips.length}`}>
      <summary>
        <${Icon} name="fileText" size=${14} />
        <span class="file-name">${a.file_name || t('msg.attachment')}</span>
        <span class="file-meta">${a.file_size ? fmtBytes(a.file_size) : ''}</span>
        <${Icon} name="caretRight" size=${12} class="chev" />
      </summary>
      ${body.text
        ? html`<pre class="file-body">${body.text + more(body.cut)}</pre>`
        : html`<div class="file-empty">${t('msg.noText')}</div>`}
    </details>`);
  }

  const imageIds = new Set();
  for (const b of msg.blocks) {
    if (b.type === 'document' && b.title && !seen.has(b.title.toLowerCase())) {
      seen.add(b.title.toLowerCase());
      chips.push(html`<${StaticFile} key=${`d-${chips.length}`} icon="paperclip" name=${b.title} note=${t('msg.notInExport')} />`);
    }
    if (b.type === 'image' && b.file_uuid) imageIds.add(b.file_uuid);
  }
  for (const f of msg.files) {
    if (f.file_name && !seen.has(f.file_name.toLowerCase())) {
      seen.add(f.file_name.toLowerCase());
      chips.push(html`<${StaticFile} key=${`f-${chips.length}`} icon="paperclip" name=${f.file_name} note=${t('msg.notInExport')} />`);
    } else if (!f.file_name && f.file_uuid) {
      imageIds.add(f.file_uuid);
    }
  }
  for (const id of imageIds) {
    chips.push(html`<${StaticFile} key=${`i-${id}`} icon="image" name=${t('msg.image')} note=${t('msg.imageNot')} />`);
  }
  return chips.length ? html`<div class="files">${chips}</div>` : null;
}

function BranchNav({ entry, onPick }) {
  const { siblings, index, parentKey } = entry;
  if (siblings.length < 2) return null;
  const go = (d) => onPick(parentKey, siblings[(index + d + siblings.length) % siblings.length].uuid);
  return html`<div class="branch" role="group" aria-label=${t('msg.branchGroup')}>
    <button type="button" class="icon-btn" onClick=${() => go(-1)} aria-label=${t('msg.prevVersion')}><${Icon} name="caretLeft" size=${12} /></button>
    <span class="branch-count">${index + 1} / ${siblings.length}</span>
    <button type="button" class="icon-btn" onClick=${() => go(1)} aria-label=${t('msg.nextVersion')}><${Icon} name="caretRight" size=${12} /></button>
  </div>`;
}

function Meta({ entry, onPick, time, text }) {
  return html`<div class="msg-meta">
    <${BranchNav} entry=${entry} onPick=${onPick} />
    <span class="msg-time">${time}</span>
    <${CopyButton} text=${text} />
  </div>`;
}

export function Message({ item, onPick }) {
  const { entry, extra } = item;
  const msg = entry.msg;
  const time = fmtDateTime(msg.created_at);

  if (msg.sender === 'human') {
    const bare = !msg.text && !msg.attachments.length && !msg.files.length;
    return html`<article class="msg human" id=${`m-${msg.uuid}`}>
      <div class="bubble">
        <${FileChips} msg=${msg} />
        ${msg.text && html`<div class="human-text">${msg.text}</div>`}
        ${bare && html`<div class="human-text muted">${t('msg.emptyMessage')}</div>`}
      </div>
      <${Meta} entry=${entry} onPick=${onPick} time=${time} text=${msg.text} />
    </article>`;
  }

  const results = { byUse: new Map(), pairedIds: new Set() };
  const useIds = new Set(msg.blocks.filter((b) => b.type === 'tool_use').map((b) => b.id));
  for (const b of msg.blocks) {
    if (b.type === 'tool_result' && useIds.has(b.tool_use_id)) {
      results.byUse.set(b.tool_use_id, b);
      results.pairedIds.add(b.tool_use_id);
    }
  }
  // Results delivered in the following textless message.
  if (extra) {
    for (const [id, b] of extra) {
      if (useIds.has(id) && !results.byUse.has(id)) {
        results.byUse.set(id, b);
        results.pairedIds.add(id);
      }
    }
  }
  const groups = groupBlocks(msg.blocks);

  return html`<article class="msg assistant" id=${`m-${msg.uuid}`}>
    ${groups.map((g, i) => {
      if (g.kind === 'steps') return html`<${Steps} key=${i} items=${g.items} results=${results} />`;
      if (g.block.type === 'text') {
        return html`<div key=${i}><${Markdown} text=${g.block.text || ''} /><${Sources} citations=${g.block.citations} /></div>`;
      }
      return null;
    })}
    ${!groups.length && html`<div class="muted">${t('msg.emptyReply')}</div>`}
    <${Meta} entry=${entry} onPick=${onPick} time=${time} text=${msg.text} />
  </article>`;
}
