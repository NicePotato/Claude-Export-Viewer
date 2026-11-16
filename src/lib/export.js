// Turn a chat (as shown in the viewer) into Markdown. Pure functions, no DOM.
import { chatTitle, fmtDateTime } from './format.js';
import { toolBrief, toolLabel } from './tools.js';
import { t } from './i18n.js';

const ILLEGAL = /[/\\:*?"<>|\x00-\x1f]/g;

/** A name that is safe on Windows and macOS: no reserved characters, no edge dots, at most 80 characters. */
export function safeName(text, fallback = 'untitled') {
  const name = String(text || '').replace(ILLEGAL, '-').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '');
  return Array.from(name).slice(0, 80).join('').trim() || fallback;
}

/** A file name that is safe on Windows and macOS, prefixed with the chat date. */
export function exportFileName(chat) {
  const date = (chat.created_at || '').slice(0, 10);
  return `${date ? `${date} ` : ''}${safeName(chatTitle(chat), 'chat')}.md`;
}

function quote(text) {
  return String(text).split('\n').map((l) => `> ${l}`.trimEnd()).join('\n');
}

function assistantMarkdown(msg, extra, steps) {
  const parts = [];
  for (const b of msg.blocks) {
    if (b.type === 'text') {
      if (b.text && b.text.trim()) parts.push(b.text.trim());
      const urls = [];
      for (const c of b.citations || []) {
        const u = c?.details?.url || c?.url;
        if (u && !urls.includes(u)) urls.push(u);
      }
      if (urls.length) parts.push(t('exp.sources', { urls: urls.join(', ') }));
    } else if (steps && b.type === 'thinking') {
      const text = b.thinking || b.summaries?.[0]?.summary || '';
      if (text.trim()) parts.push(quote(t('exp.thinking', { text: text.trim() })));
    } else if (steps && b.type === 'tool_use') {
      const brief = toolBrief(b);
      parts.push(quote(t('exp.tool', { name: `${toolLabel(b.name).short}${brief ? ` (${brief})` : ''}` })));
    }
  }
  return parts.join('\n\n');
}

/**
 * @param chat      a normalized chat
 * @param items     the view list from toViewList(): [{entry, extra}]
 * @param options   { steps: include thinking and tool calls as quoted lines }
 */
export function chatToMarkdown(chat, items, { steps = false } = {}) {
  const out = [`# ${chatTitle(chat)}`, '', t('exp.started', { date: fmtDateTime(chat.created_at) })];
  for (const { entry, extra } of items) {
    const msg = entry.msg;
    if (msg.sender === 'human') {
      out.push('', `## ${t('exp.you')}`, '');
      const names = msg.attachments.map((a) => a.file_name).filter(Boolean);
      for (const f of msg.files) if (f.file_name && !names.includes(f.file_name)) names.push(f.file_name);
      if (names.length) out.push(t('exp.attached', { files: names.join(', ') }), '');
      if (msg.text.trim()) out.push(msg.text.trim());
    } else {
      const body = assistantMarkdown(msg, extra, steps);
      if (!body) continue;
      out.push('', `## ${t('exp.claude')}`, '', body);
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
