import { html, useState, useEffect, useMemo, useRef, useCallback } from './lib/ui.js';
import { Icon } from './components/Icon.js';
import { Landing } from './components/Landing.js';
import { Rail, ListPane, VIEWS } from './components/Sidebar.js';
import { ChatView } from './components/ChatView.js';
import { ProjectView, MemoryView, ArtifactView, ReflectionView, NoSelection } from './components/Views.js';
import { emptyData, importFiles, hasContent, summarize } from './lib/importer.js';
import { collectDropped } from './lib/files.js';
import { saveData, loadData, clearData } from './lib/persist.js';
import { searchChats } from './lib/search.js';
import { chatTitle, fmtDate, groupByRecency } from './lib/format.js';

const VIEW_IDS = VIEWS.map((v) => v.id);

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const view = VIEW_IDS.includes(parts[0]) ? parts[0] : 'chats';
  let id = null;
  if (parts[1]) {
    try { id = decodeURIComponent(parts[1]); } catch { id = parts[1]; }
  }
  return { view, id };
}

const byRecent = (a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0);

function LogDialog({ data, onClose }) {
  return html`<div class="modal-backdrop" onClick=${onClose}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Import log" onClick=${(e) => e.stopPropagation()}>
      <header>
        <h2>Import log</h2>
        <button type="button" class="icon-btn" onClick=${onClose} aria-label="Close"><${Icon} name="x" size=${14} /></button>
      </header>
      <p class="fine">Loaded: ${summarize(data)}.</p>
      <ul class="log">
        ${data.log.map((l, i) => html`<li key=${i} class=${`log-${l.kind === 'error' ? 'error' : ''}`}>
          <span class="log-path">${l.path}</span>
          <span class="log-kind">${l.kind}${l.count ? ` ${l.count}` : ''}</span>
          ${l.note && html`<span class="log-note">${l.note}</span>`}
        </li>`)}
        ${!data.log.length && html`<li class="muted">Nothing imported in this session.</li>`}
      </ul>
    </div>
  </div>`;
}

export function App() {
  const dataRef = useRef(emptyData());
  const [rev, setRev] = useState(0);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [route, setRoute] = useState(parseHash());
  const [query, setQuery] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const addInput = useRef(null);

  const data = dataRef.current;
  const loaded = hasContent(data);

  // Restore a previously kept export, if the user opted in earlier.
  useEffect(() => {
    let alive = true;
    loadData().then((d) => {
      if (alive && d && hasContent(d)) {
        dataRef.current = d;
        setRemember(true);
        setRev((r) => r + 1);
      }
    }).finally(() => alive && setRestoring(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const on = () => setRoute(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  // "/" jumps to the search box, like most web apps.
  useEffect(() => {
    const on = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      const box = document.querySelector('.search input');
      if (box) { e.preventDefault(); box.focus(); box.select(); }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);

  // Reset search when switching sections.
  useEffect(() => { setQuery(''); }, [route.view]);

  const handleEntries = useCallback(async (entries) => {
    setBusy(true);
    setError('');
    const logStart = dataRef.current.log.length;
    try {
      await importFiles(entries, dataRef.current, setProgress);
      const d = dataRef.current;
      d.chats.sort((a, b) => -byRecent(a, b));
      if (!hasContent(d)) {
        const notes = d.log.slice(logStart).map((l) => `${l.path.split('/').pop()}: ${l.note || l.kind}`);
        setError(`No Claude export data found. ${notes.slice(0, 3).join('; ')}`);
      } else if (remember) {
        await saveData(d).catch(() => {});
      }
      setRev((r) => r + 1);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
      setProgress('');
    }
  }, [remember]);

  // Window-wide drag and drop, so files can be added at any time.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    const enter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth += 1; setDragging(true); };
    const over = (e) => { if (hasFiles(e)) e.preventDefault(); };
    const leave = (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const entries = await collectDropped(e.dataTransfer);
      if (entries.length) handleEntries(entries);
    };
    addEventListener('dragenter', enter);
    addEventListener('dragover', over);
    addEventListener('dragleave', leave);
    addEventListener('drop', drop);
    return () => {
      removeEventListener('dragenter', enter);
      removeEventListener('dragover', over);
      removeEventListener('dragleave', leave);
      removeEventListener('drop', drop);
    };
  }, [handleEntries]);

  const forget = async () => {
    if (!confirm('Remove the stored export from this browser? Your original files are not touched.')) return;
    await clearData().catch(() => {});
    dataRef.current = emptyData();
    setRemember(false);
    location.hash = '';
    setRev((r) => r + 1);
  };

  // ---- derived data -------------------------------------------------------
  const { view, id } = route;
  const nonEmptyChats = useMemo(() => data.chats.filter((c) => c.messages.length), [rev]);
  const emptyCount = data.chats.length - nonEmptyChats.length;
  const visibleChats = showEmpty ? data.chats : nonEmptyChats;
  const projectName = useMemo(() => new Map(data.projects.map((p) => [p.uuid, p.name || 'Untitled project'])), [rev]);
  const projects = useMemo(
    () => data.projects.filter((p) => p.name || p.prompt || p.docs.length).sort((a, b) => -byRecent(a, b)),
    [rev],
  );
  // Artifacts with a readable page come first; the rest only have metadata in the export.
  const artifacts = useMemo(
    () => [...data.artifacts].sort((a, b) => (Boolean(b.page) - Boolean(a.page)) || -byRecent(a, b)),
    [rev],
  );

  const memoryItems = useMemo(() => {
    const groups = [];
    const mem = data.memory;
    if (mem.global) groups.push({ label: '', items: [{ id: 'global', title: 'About you', meta: 'Memory across chats' }] });
    const perProject = Object.keys(mem.perProject).map((uuid) => ({
      id: `project:${uuid}`, title: projectName.get(uuid) || 'Project memory', meta: 'Project memory',
    }));
    if (perProject.length) groups.push({ label: 'Projects', items: perProject });
    const files = mem.files.map((f) => ({ id: `file:${f.path}`, title: f.path, meta: 'Memory file' }));
    if (files.length) groups.push({ label: 'Files', items: files });
    return groups;
  }, [rev, projectName]);

  const counts = {
    chats: nonEmptyChats.length,
    projects: projects.length,
    memory: (data.memory.global ? 1 : 0) + Object.keys(data.memory.perProject).length + data.memory.files.length,
    artifacts: artifacts.length,
    reflections: data.reflections.length,
  };

  // ---- list column --------------------------------------------------------
  const list = useMemo(() => {
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    switch (view) {
      case 'projects':
        return {
          title: 'Projects', count: projects.length, emptyText: 'No projects loaded. Add projects-000.zip.',
          groups: [{ label: '', items: projects.map((p) => ({ id: p.uuid, title: p.name || 'Untitled project', meta: plural(p.docs.length, 'document') })) }],
        };
      case 'memory':
        return { title: 'Memory', count: counts.memory, groups: memoryItems, emptyText: 'No memory loaded. Add memories-000.zip.' };
      case 'artifacts':
        return {
          title: 'Artifacts', count: artifacts.length, emptyText: 'No artifacts loaded. Add frames-000.zip.',
          groups: [{ label: '', items: artifacts.map((a) => ({ id: a.id, title: a.title, meta: `${a.page ? 'page' : 'metadata only'}  ${fmtDate(a.updated_at)}` })) }],
        };
      case 'reflections':
        return {
          title: 'Reflections', count: data.reflections.length, emptyText: 'No reflections loaded. Add feedback-000.zip.',
          groups: [{ label: '', items: data.reflections.map((r) => ({ id: r.period, title: r.period, meta: 'Monthly reflection' })) }],
        };
      default: {
        let groups;
        if (query.trim()) {
          const hits = searchChats(visibleChats, query);
          groups = [{
            label: `${plural(hits.length, 'result')}`,
            items: hits.map((h) => ({ id: h.chat.uuid, title: chatTitle(h.chat), snippet: h.snippet })),
          }];
        } else {
          groups = groupByRecency(visibleChats, (c) => c.updated_at).map((g) => ({
            label: g.label,
            items: g.items.map((c) => ({
              id: c.uuid, title: chatTitle(c), meta: `${fmtDate(c.updated_at)}  ${plural(c.messages.length, 'message')}`,
            })),
          }));
        }
        return { title: 'Chats', count: nonEmptyChats.length, groups, searchable: true, emptyText: query ? 'No chats match.' : 'No chats loaded.' };
      }
    }
  }, [view, rev, query, showEmpty, projectName, memoryItems]);

  // ---- detail pane --------------------------------------------------------
  const goBack = () => { location.hash = `#/${view}`; };
  let detail = null;
  let hasSelection = false;
  if (id) {
    if (view === 'chats') {
      const chat = data.chats.find((c) => c.uuid === id);
      if (chat) { hasSelection = true; detail = html`<${ChatView} key=${chat.uuid} chat=${chat} onBack=${goBack} query=${query} />`; }
    } else if (view === 'projects') {
      const p = data.projects.find((x) => x.uuid === id);
      if (p) { hasSelection = true; detail = html`<${ProjectView} key=${p.uuid} project=${p} memory=${data.memory.perProject[p.uuid]} onBack=${goBack} />`; }
    } else if (view === 'memory') {
      let title = '';
      let text = '';
      if (id === 'global') { title = 'About you'; text = data.memory.global; }
      else if (id.startsWith('project:')) { const u = id.slice(8); title = projectName.get(u) || 'Project memory'; text = data.memory.perProject[u]; }
      else if (id.startsWith('file:')) { const f = data.memory.files.find((x) => x.path === id.slice(5)); title = f?.path || ''; text = f?.content || ''; }
      if (title) { hasSelection = true; detail = html`<${MemoryView} key=${id} title=${title} text=${text} onBack=${goBack} />`; }
    } else if (view === 'artifacts') {
      const a = data.artifacts.find((x) => x.id === id);
      if (a) { hasSelection = true; detail = html`<${ArtifactView} key=${a.id} artifact=${a} onBack=${goBack} />`; }
    } else if (view === 'reflections') {
      const r = data.reflections.find((x) => x.period === id);
      if (r) { hasSelection = true; detail = html`<${ReflectionView} key=${r.period} reflection=${r} onBack=${goBack} />`; }
    }
  }
  if (!detail) detail = html`<${NoSelection} text=${counts[view] ? 'Pick something from the list.' : 'Nothing loaded for this section yet.'} />`;

  // ---- render -------------------------------------------------------------
  if (restoring) return html`<div class="boot" aria-busy="true"><span class="spinner" aria-hidden="true"></span></div>`;

  if (!loaded) {
    return html`<${Landing}
      onEntries=${handleEntries} busy=${busy} progress=${progress} error=${error}
      remember=${remember} setRemember=${setRemember}
    />${dragging && html`<div class="drop-overlay">Drop to import</div>`}`;
  }

  const footer = view === 'chats' && emptyCount > 0 && !query
    ? html`<button type="button" class="link-btn" onClick=${() => setShowEmpty((v) => !v)}>
        ${showEmpty ? 'Hide' : 'Show'} ${emptyCount} empty ${emptyCount === 1 ? 'chat' : 'chats'}
      </button>`
    : null;

  return html`<div class=${`app ${hasSelection ? 'has-selection' : ''}`}>
    <${Rail}
      view=${view} counts=${counts} canForget=${remember}
      onAdd=${() => addInput.current.click()} onLog=${() => setLogOpen(true)} onForget=${forget}
    />
    <${ListPane}
      title=${list.title} count=${list.count} groups=${list.groups} selectedId=${id} view=${view}
      query=${query} onQuery=${setQuery} searchable=${list.searchable} footer=${footer} emptyText=${list.emptyText}
    />
    <main class="main">${detail}</main>
    ${busy && html`<div class="toast" role="status"><span class="spinner" aria-hidden="true"></span>${progress || 'Working'}</div>`}
    ${error && html`<div class="toast toast-error" role="alert">${error}</div>`}
    ${dragging && html`<div class="drop-overlay">Drop to add to this export</div>`}
    ${logOpen && html`<${LogDialog} data=${data} onClose=${() => setLogOpen(false)} />`}
    <input ref=${addInput} type="file" multiple accept=".json,.zip,application/json,application/zip" hidden
      onChange=${(e) => { const f = [...e.target.files].map((file) => ({ path: file.name, file })); e.target.value = ''; if (f.length) handleEntries(f); }} />
  </div>`;
}
