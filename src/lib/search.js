const cache = new WeakMap();

function haystack(chat) {
  let h = cache.get(chat);
  if (h === undefined) {
    const parts = [chat.name || ''];
    for (const m of chat.messages) {
      parts.push(m.text);
      for (const a of m.attachments) parts.push(a.file_name || '');
    }
    const text = parts.join('\n');
    h = { text, lower: text.toLowerCase() };
    cache.set(chat, h);
  }
  return h;
}

const squash = (s) => s.replace(/\s+/g, ' ');

/**
 * Case-insensitive substring search over chat titles and message text.
 * Each hit carries a snippet split into before / match / after so the UI can highlight it.
 */
export function searchChats(chats, query, limit = 200) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const chat of chats) {
    const h = haystack(chat);
    const at = h.lower.indexOf(q);
    if (at === -1) continue;
    const end = at + q.length;
    const from = Math.max(0, at - 50);
    out.push({
      chat,
      snippet: {
        before: (from > 0 ? '...' : '') + squash(h.text.slice(from, at)).trimStart(),
        match: h.text.slice(at, end),
        after: squash(h.text.slice(end, end + 70)).trimEnd(),
      },
    });
    if (out.length >= limit) break;
  }
  return out;
}
