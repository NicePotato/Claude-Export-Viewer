// Formatting helpers. Pure functions, no DOM.

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function fmtDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateTimeFmt.format(d);
}

export function fmtBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function clip(text, n) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, Math.max(0, n - 3)).trimEnd() + '...' : t;
}

/** Title shown for a chat. Falls back to the first human message when the name is empty. */
export function chatTitle(chat) {
  if (chat.name && chat.name.trim()) return chat.name.trim();
  const first = chat.messages.find((m) => m.sender === 'human' && m.text && m.text.trim());
  return first ? clip(first.text, 60) : 'Untitled chat';
}

/**
 * Group items (already sorted newest first) into recency buckets like the Claude sidebar.
 * `getDate` returns an ISO string. Returns [{label, items}] preserving order.
 */
export function groupByRecency(items, getDate, now = new Date()) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const DAY = 86400000;
  const groups = [];
  const index = new Map();
  const push = (label, item) => {
    if (!index.has(label)) {
      const g = { label, items: [] };
      index.set(label, g);
      groups.push(g);
    }
    index.get(label).items.push(item);
  };
  for (const item of items) {
    const d = new Date(getDate(item));
    if (Number.isNaN(d.getTime())) { push('Undated', item); continue; }
    const diff = Math.floor((today - startOfDay(d)) / DAY);
    if (diff <= 0) push('Today', item);
    else if (diff === 1) push('Yesterday', item);
    else if (diff <= 7) push('Previous 7 days', item);
    else if (diff <= 30) push('Previous 30 days', item);
    else push(monthFmt.format(d), item);
  }
  return groups;
}

export function humanize(key) {
  return String(key).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
