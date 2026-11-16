// Some chats are listed in the export but have nothing readable in them. This module finds
// those chats and says what the export file actually contains for them, without guessing why.
import { buildTree, resolvePath, toViewList } from './tree.js';
import { fmtDateTime } from './format.js';
import { t, tn } from './i18n.js';

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
      code: 'no-messages', short: t('emp.noMsgs.short'), facts: f,
      title: t('emp.noMsgs.title'),
      detail: t('emp.noMsgs.detail'),
    };
  }

  const known = msgs.every((m) => m.raw);
  if (known && msgs.every((m) => m.raw.blocks === 0 && !m.raw.flatText)) {
    return {
      code: 'blank-bodies', short: t('emp.blank.short'), facts: f,
      title: t('emp.blank.title'),
      detail: t('emp.blank.detail', { messages: tn('message', f.total), human: f.human, assistant: f.assistant }),
    };
  }
  if (known && msgs.some((m) => m.raw.unsupported > 0)) {
    return {
      code: 'unsupported-only', short: t('emp.unsup.short'), facts: f,
      title: t('emp.unsup.title'),
      detail: t('emp.unsup.detail'),
    };
  }
  return {
    code: 'no-content', short: t('emp.none.short'), facts: f,
    title: t('emp.none.title'),
    detail: t('emp.none.detail', { messages: tn('message', f.total) }),
  };
}
