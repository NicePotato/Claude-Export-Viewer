// Formatting helpers. Pure functions, no DOM.

import { t, locale } from './i18n.js';

// Formatters follow the interface language, so they are built once per locale.
const formatters = new Map();
function fmt() {
  const tag = locale();
  let f = formatters.get(tag);
  if (!f) {
    f = {
      date: new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'short', day: 'numeric' }),
      dateTime: new Intl.DateTimeFormat(tag, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      month: new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }),
    };
    formatters.set(tag, f);
  }
  return f;
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmt().date.format(d);
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmt().dateTime.format(d);
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
  return first ? clip(first.text, 60) : t('untitledChat');
}

/** Milliseconds since the epoch for an ISO string; unparseable dates sort as oldest. */
const stamp = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? -Infinity : t;
};

/**
 * Comparator: most recently updated first. Compares real instants (year, date, time, time zone,
 * fractional seconds), not the raw strings, which only order correctly when every timestamp
 * has exactly the same format. Items need an ISO `updated_at`.
 */
export function newestFirst(a, b) {
  const x = stamp(a.updated_at);
  const y = stamp(b.updated_at);
  return x === y ? 0 : x < y ? 1 : -1;
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
    if (Number.isNaN(d.getTime())) { push(t('undated'), item); continue; }
    const diff = Math.floor((today - startOfDay(d)) / DAY);
    if (diff <= 0) push(t('time.today'), item);
    else if (diff === 1) push(t('time.yesterday'), item);
    else if (diff <= 7) push(t('time.prev7'), item);
    else if (diff <= 30) push(t('time.prev30'), item);
    else push(fmt().month.format(d), item);
  }
  return groups;
}

/**
 * Flip recency groups to oldest first. Input is the newest-first output of groupByRecency();
 * both the groups and the items inside each group are reversed. 'new' returns the input as is.
 */
export function orderGroups(groups, order) {
  if (order !== 'old') return groups;
  return groups.toReversed().map((g) => ({ ...g, items: g.items.toReversed() }));
}

export function humanize(key) {
  return String(key).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
