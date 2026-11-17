// Optional "keep in this browser" storage (IndexedDB). Off unless the user opts in.
const DB = 'claude-export-viewer';
const STORE = 'kv';
const KEY = 'export-data';

function open(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(name, mode, fn) {
  const db = await open(name);
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  });
}

// The download list holds time-limited links, so it is never written to storage.
// The database name is a parameter only so the tests can use a throwaway one.
export function createStore(name = DB) {
  return {
    saveData: (data) => tx(name, 'readwrite', (s) => s.put({ ...data, manifest: null }, KEY)),
    loadData: () => tx(name, 'readonly', (s) => s.get(KEY)).catch(() => undefined),
    clearData: () => tx(name, 'readwrite', (s) => s.delete(KEY)),
  };
}

export const { saveData, loadData, clearData } = createStore();
