// Optional "keep in this browser" storage (IndexedDB). Off unless the user opts in.
const DB = 'claude-export-viewer';
const STORE = 'kv';
const KEY = 'export-data';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  });
}

// The download list holds time-limited links, so it is never written to storage.
export const saveData = (data) => tx('readwrite', (s) => s.put({ ...data, manifest: null }, KEY));
export const loadData = () => tx('readonly', (s) => s.get(KEY)).catch(() => undefined);
export const clearData = () => tx('readwrite', (s) => s.delete(KEY));
