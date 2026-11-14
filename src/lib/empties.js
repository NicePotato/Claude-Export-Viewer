// Some chats are listed in the export but have nothing readable in them. This module finds
// those chats and says what the export file actually contains for them, without guessing why.
import { buildTree, resolvePath, toViewList } from './tree.js';
import { fmtDateTime } from './format.js';

const cache = new WeakMap();

/** How many messages the chat view lists on its default (latest) branch. */
export function shownCount(chat) {
  let n = cache.get(chat);
  if (n === undefined) {
    n = toViewList(resolvePath(buildTree(chat.messages))).length;
    cache.set(chat, n);
  }
  return n;
}

/** True when opening the chat would show no messages at all. */
export const showsNothing = (chat) => shownCount(chat) === 0;

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function facts(chat) {
  const msgs = chat.messages;
  const times = msgs.map((m) => m.created_at).filter(Boolean).sort();
  return {
    total: msgs.length,
    human: msgs.filter((m) => m.sender === 'human').length,
    assistant: msgs.filter((m) => m.sender !== 'human').length,
    first: times[0] ? fmtDateTime(times[0]) : '',
    last: times.length ? fmtDateTime(times[times.length - 1]) : '',
  };
}

/**
 * Explain an empty chat, or return null when the chat has something to show.
 * The reasons are limited to what can be read from the file:
 *   no-messages       the chat has no messages in the export
 *   blank-bodies      messages exist (sender, time) but every body is empty in the file
 *   unsupported-only  the only text is Claude's "not supported on your current device" stand-in
 *   no-content        anything else: all messages are empty or only hold system notes
 * @returns {{code: string, short: string, title: string, detail: string, facts: object}|null}
 */
export function diagnoseEmpty(chat) {
  if (!showsNothing(chat)) return null;
  const f = facts(chat);
  const msgs = chat.messages;

  if (!msgs.length) {
    return {
      code: 'no-messages', short: 'No messages in export', facts: f,
      title: 'The export has no messages for this chat',
      detail: 'The chat is listed with its dates, but its message list is empty in the file.',
    };
  }

  const known = msgs.every((m) => m.raw);
  if (known && msgs.every((m) => m.raw.blocks === 0 && !m.raw.flatText)) {
    return {
      code: 'blank-bodies', short: 'Message text missing in export', facts: f,
      title: 'The messages were exported without their text',
      detail: `The file records ${plural(f.total, 'message')} (${f.human} from you, ${f.assistant} from Claude) with their senders and times, `
        + 'but every message body is empty. The text is not in the export, so it cannot be shown here. '
        + 'If the chat still exists on claude.ai, the text can only be read there.',
    };
  }
  if (known && msgs.some((m) => m.raw.unsupported > 0)) {
    return {
      code: 'unsupported-only', short: 'Only unsupported content', facts: f,
      title: 'Only content the export cannot represent',
      detail: 'The only text in this chat is the stand-in Claude writes for blocks it cannot export '
        + '("This block is not supported on your current device yet"), for example interactive content.',
    };
  }
  return {
    code: 'no-content', short: 'No readable content', facts: f,
    title: 'Nothing readable in this chat',
    detail: `None of its ${plural(f.total, 'message')} carries text, attachments or tool activity that can be displayed.`,
  };
}
