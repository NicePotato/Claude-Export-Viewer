// Detail panes for everything that is not a chat.
import { html } from '../lib/ui.js';
import { Icon } from './Icon.js';
import { Markdown } from './Markdown.js';
import { ProjectExportMenu } from './ProjectExport.js';
import { fmtDate, humanize, chatTitle } from '../lib/format.js';
import { t, tn } from '../lib/i18n.js';

function Pane({ title, meta, onBack, actions, children }) {
  return html`<section class="pane">
    <header class="pane-head">
      <button type="button" class="icon-btn back" onClick=${onBack} aria-label=${t('chat.back')}><${Icon} name="caretLeft" size=${16} /></button>
      <div class="pane-title">
        <h1>${title}</h1>
        ${meta && html`<div class="pane-meta">${meta}</div>`}
      </div>
      ${actions}
    </header>
    <div class="scroll"><div class="column">${children}</div></div>
  </section>`;
}

export function NoSelection({ text }) {
  return html`<section class="pane pane-empty"><div class="empty">${text}</div></section>`;
}

/** Markdown for .md files, a plain block for anything else. */
function DocBody({ filename, content }) {
  const isMd = /\.(md|markdown)$/i.test(filename);
  if (!content) return html`<div class="file-empty">${t('view.docEmpty')}</div>`;
  const shown = content.length > 60000 ? content.slice(0, 60000) : content;
  const cut = content.length - shown.length;
  return html`${isMd ? html`<${Markdown} text=${shown} />` : html`<pre class="file-body">${shown}</pre>`}
    ${cut > 0 && html`<div class="file-empty">${t('view.moreChars', { n: cut })}</div>`}`;
}

export function ProjectView({ project, memory, chats = [], onPickChats, onBack }) {
  return html`<${Pane}
    title=${project.name || t('untitledProject')}
    onBack=${onBack}
    actions=${html`<${ProjectExportMenu} project=${project} memory=${memory || ''} chats=${chats} />`}
    meta=${html`<span>${tn('document', project.docs.length)}</span><span>${tn('chat', chats.length)}</span><span>${fmtDate(project.created_at)}</span>`}
  >
    ${project.description && html`<p class="lede-sm">${project.description}</p>`}
    ${project.prompt && html`<details class="block" open>
      <summary>${t('view.instructions')}<${Icon} name="caretRight" size=${12} class="chev" /></summary>
      <${Markdown} text=${project.prompt} />
    </details>`}
    ${memory && html`<details class="block">
      <summary>${t('view.projMemory')}<${Icon} name="caretRight" size=${12} class="chev" /></summary>
      <${Markdown} text=${memory} />
    </details>`}
    ${project.docs.map((d) => html`<details class="block" key=${d.uuid || d.filename}>
      <summary><${Icon} name="fileText" size=${14} /><span class="grow">${d.filename}</span><${Icon} name="caretRight" size=${12} class="chev" /></summary>
      <${DocBody} filename=${d.filename} content=${d.content} />
    </details>`)}
    ${onPickChats && html`<section class="proj-chats">
      <div class="proj-chats-head">
        <h2>${t('view.chatsHead')}</h2>
        <button type="button" class="btn" onClick=${onPickChats}>${chats.length ? t('view.editChats') : t('view.addChats')}</button>
      </div>
      ${chats.map((c) => html`<a key=${c.uuid} class="row-link" href=${`#/chats/${encodeURIComponent(c.uuid)}`}>
        <span class="row-title">${chatTitle(c)}</span><span class="row-meta">${fmtDate(c.updated_at)}</span>
      </a>`)}
      ${!chats.length && html`<p class="fine">${t('view.noneFiled')}</p>`}
    </section>`}
    ${!project.prompt && !memory && !project.docs.length && !chats.length && html`<div class="empty">${t('view.projEmpty')}</div>`}
  <//>`;
}

export function MemoryView({ title, text, onBack }) {
  // Memory files start with a small frontmatter block; show it as-is, it carries the aliases.
  return html`<${Pane} title=${title} onBack=${onBack}>
    ${text ? html`<${Markdown} text=${text} />` : html`<div class="empty">${t('view.memEmpty')}</div>`}
  <//>`;
}

export function ArtifactView({ artifact, onBack }) {
  return html`<${Pane}
    title=${artifact.title}
    onBack=${onBack}
    meta=${html`<span>${artifact.kind}</span><span>${tn('version', artifact.versions)}</span><span>${fmtDate(artifact.updated_at)}</span>`}
  >
    ${artifact.page
      ? html`<${Markdown} text=${artifact.page} />`
      : html`<div class="empty">${t('view.artNoPage')}</div>`}
  <//>`;
}

function ReflectionBlock({ name, value }) {
  if (Array.isArray(value)) {
    return html`<section class="refl-section">
      <h2>${humanize(name)}</h2>
      ${value.map((v, i) => typeof v === 'string'
        ? html`<p key=${i}>${v}</p>`
        : html`<div class="refl-item" key=${i}>
            ${v.title && html`<h3>${v.title}</h3>`}
            ${v.body && html`<p>${v.body}</p>`}
          </div>`)}
    </section>`;
  }
  if (typeof value === 'string') return html`<section class="refl-section"><h2>${humanize(name)}</h2><p>${value}</p></section>`;
  return null;
}

export function ReflectionView({ reflection, onBack }) {
  const content = reflection.content || {};
  return html`<${Pane} title=${reflection.period} onBack=${onBack}>
    ${Object.entries(content).map(([k, v]) => html`<${ReflectionBlock} key=${k} name=${k} value=${v} />`)}
  <//>`;
}
