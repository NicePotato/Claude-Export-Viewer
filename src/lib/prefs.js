// Small per-browser preferences (sidebar width, sort order). Storage can be blocked, so every
// access is guarded and the app works the same without it.
const PREFIX = 'cev:';

export function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore: preferences are a convenience */
  }
}
