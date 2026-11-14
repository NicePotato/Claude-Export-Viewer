// Collect files from drag-and-drop (including folders) and from <input type=file>.

async function readAllEntries(reader) {
  const all = [];
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

async function walk(entry, out, prefix = '') {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ path: prefix + entry.name, file });
  } else if (entry.isDirectory) {
    const kids = await readAllEntries(entry.createReader());
    for (const k of kids) await walk(k, out, `${prefix}${entry.name}/`);
  }
}

/** @returns {Promise<{path: string, file: File}[]>} */
export async function collectDropped(dataTransfer) {
  const out = [];
  const items = [...(dataTransfer.items || [])];
  // Entries must be grabbed synchronously, before the first await.
  const entries = items.map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null));
  if (entries.some(Boolean)) {
    for (const e of entries) if (e) await walk(e, out);
    return out;
  }
  for (const f of dataTransfer.files || []) out.push({ path: f.name, file: f });
  return out;
}

export function fromInput(fileList) {
  return [...fileList].map((f) => ({ path: f.webkitRelativePath || f.name, file: f }));
}
