import { html, useState, useEffect, useMemo, useRef, useCallback } from './lib/ui.js';
import { Icon } from './components/Icon.js';
import { Landing } from './components/Landing.js';
import { Rail, ListPane, VIEWS } from './components/Sidebar.js';
import { ChatView } from './components/ChatView.js';
import { ProjectView, MemoryView, ArtifactView, ReflectionView, NoSelection } from './components/Views.js';
import { ChatPicker } from './components/ProjectLinks.js';
import { Modal } from './components/Modal.js';
import { projectsToZip } from './lib/projectExport.js';
import { downloadBlob } from './lib/download.js';
import { emptyData, importFiles, hasContent, summarize } from './lib/importer.js';
import { collectDropped } from './lib/files.js';
import { saveData, loadData, clearData } from './lib/persist.js';
import { searchChats } from './lib/search.js';
import { chatTitle, fmtDate, groupByRecency, orderGroups, newestFirst } from './lib/format.js';
import { readPref, writePref } from './lib/prefs.js';
import { showsNothing, shownCount, diagnoseEmpty } from './lib/empties.js';
import { assign, prune, chatsOfProject, groupByProject } from './lib/assignments.js';
import { LanguageDialog } from './components/LanguageMenu.js';
import { t, tn, tNote, setLang, detectLang } from './lib/i18n.js';

const VIEW_IDS = VIEWS.map((v) => v.id);

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const view = parts[0] === 'home' || VIEW_IDS.includes(parts[0]) ? parts[0] : 'chats';
  let id = null;
  if (parts[1]) {
    try { id = decodeURIComponent(parts[1]); } catch { id = parts[1]; }
  }
  return { view, id };
}

function LogDialog({ data, onClose }) {
  return html`<${Modal} title=${t('imp.title')} onClose=${onClose}>
      <p class="fine">${t('imp.loaded', { summary: summarize(data) })}</p>
      <ul class="log">
        ${data.log.map((l, i) => html`<li key=${i} class=${`log-${l.kind === 'error' ? 'error' : ''}`}>
          <span class="log-path">${l.path}</span>
          <span class="log-kind">${l.kind}${l.count ? ` ${l.count}` : ''}</span>
          ${l.note && html`<span class="log-note">${tNote(l.note)}</span>`}
        </li>`)}
        ${!data.log.length && html`<li class="muted">${t('imp.none')}</li>`}
      </ul>
  <//>`;
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
  const [order, setOrder] = useState(() => (readPref('order', 'new') === 'old' ? 'old' : 'new'));
  const [groupBy, setGroupBy] = useState(() => (readPref('group', 'date') === 'project' ? 'project' : 'date'));
  const [filed, setFiled] = useState(() => readPref('filed', {}));
  const [pickerFor, setPickerFor] = useState(null);
  const [railOpen, setRailOpen] = useState(() => readPref('rail', false));
  // The language is applied before the first render so no string flashes in the wrong language.
  const [lang, setLangState] = useState(() => { const l = detectLang(); setLang(l); return l; });
  const [langOpen, setLangOpen] = useState(false);
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
      if (!hasContent(d) && d.manifest) {
        // A download list, not data: the start page explains what to do instead of showing an error.
      } else if (!hasContent(d)) {
        const notes = d.log.slice(logStart).map((l) => `${l.path.split('/').pop()}: ${l.note || l.kind}`);
        setError(t('err.noData', { notes: notes.slice(0, 3).join('; ') }));
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

  const changeGroupBy = (next) => { writePref('group', next); setGroupBy(next); };
  // Functional update so quick successive clicks never overwrite each other.
  const fileChat = (chatId, projectId) => setFiled((cur) => {
    const next = assign(cur, chatId, projectId);
    writePref('filed', next);
    return next;
  });
  const changeOrder = (next) => { writePref('order', next); setOrder(next); };
  const toggleRail = () => { writePref('rail', !railOpen); setRailOpen(!railOpen); };
  // Every string is computed while rendering, so changing this state re-renders the whole app.
  const changeLang = (next) => { setLang(next); writePref('lang', next); setLangState(next); };

  const exportAllProjects = () => {
    const entries = projects.map((p) => ({
      project: p, memory: data.memory.perProject[p.uuid] || '', chats: chatsOfProject(assignments, nonEmptyChats, p.uuid),
    }));
    downloadBlob(new Blob([projectsToZip(entries)], { type: 'application/zip' }), 'claude-projects.zip');
  };

  const forget = async () => {
    const msg = remember ? t('forget.stored') : t('forget.page');
    if (!confirm(msg)) return;
    await clearData().catch(() => {});
    dataRef.current = emptyData();
    setRemember(false);
    location.hash = '';
    setRev((r) => r + 1);
  };

  // ---- derived data -------------------------------------------------------
  const { view, id } = route;
  // Always newest first here: groupByRecency() needs that, and stored data may have any order.
  const chatsNewestFirst = useMemo(() => data.chats.toSorted(newestFirst), [rev]);
  // "Empty" means opening the chat would show nothing, not just that it has no messages in the file.
  const nonEmptyChats = useMemo(() => chatsNewestFirst.filter((c) => !showsNothing(c)), [chatsNewestFirst]);
  const emptyChats = useMemo(() => chatsNewestFirst.filter(showsNothing), [chatsNewestFirst]);
  const emptyCount = emptyChats.length;

  // A link to an empty chat must show it in the list, even if that section is collapsed.
  useEffect(() => {
    if (route.view === 'chats' && route.id && emptyChats.some((c) => c.uuid === route.id)) setShowEmpty(true);
  }, [route, emptyChats]);
  const projectName = useMemo(() => new Map(data.projects.map((p) => [p.uuid, p.name || t('untitledProject')])), [rev, lang]);
  const projects = useMemo(
    () => {
      const list = data.projects.filter((p) => p.name || p.prompt || p.docs.length).sort(newestFirst);
      return order === 'old' ? list.reverse() : list;
    },
    [rev, order],
  );
  // Which project each chat is filed under (user-made, see lib/assignments.js).
  const assignments = useMemo(() => prune(filed, data.chats, data.projects), [filed, rev]);

  // Artifacts with a readable page come first; the rest only have metadata in the export.
  const artifacts = useMemo(
    () => data.artifacts.toSorted((a, b) => (Boolean(b.page) - Boolean(a.page)) || (order === 'old' ? -newestFirst(a, b) : newestFirst(a, b))),
    [rev, order],
  );

  const memoryItems = useMemo(() => {
    const groups = [];
    const mem = data.memory;
    if (mem.global) groups.push({ label: '', items: [{ id: 'global', title: t('mem.about'), meta: t('mem.across') }] });
    const perProject = Object.keys(mem.perProject).map((uuid) => ({
      id: `project:${uuid}`, title: projectName.get(uuid) || t('mem.projectMemory'), meta: t('mem.projectMemory'),
    }));
    if (perProject.length) groups.push({ label: t('mem.projects'), items: perProject });
    const files = mem.files.map((f) => ({ id: `file:${f.path}`, title: f.path, meta: t('mem.file') }));
    if (files.length) groups.push({ label: t('mem.files'), items: files });
    return groups;
  }, [rev, projectName, lang]);

  const counts = {
    chats: nonEmptyChats.length,
    projects: projects.length,
    memory: (data.memory.global ? 1 : 0) + Object.keys(data.memory.perProject).length + data.memory.files.length,
    artifacts: artifacts.length,
    reflections: data.reflections.length,
  };

  // ---- list column --------------------------------------------------------
  const list = useMemo(() => {
    switch (view) {
      case 'projects':
        return {
          title: t('view.projects'), count: projects.length, sortable: true, emptyText: t('empty.projects'),
          groups: [{ label: '', items: projects.map((p) => ({ id: p.uuid, title: p.name || t('untitledProject'), meta: tn('document', p.docs.length) })) }],
        };
      case 'memory':
        return { title: t('view.memory'), count: counts.memory, groups: memoryItems, emptyText: t('empty.memory') };
      case 'artifacts':
        return {
          title: t('view.artifacts'), count: artifacts.length, sortable: true, emptyText: t('empty.artifacts'),
          groups: [{ label: '', items: artifacts.map((a) => ({ id: a.id, title: a.title, meta: `${a.page ? t('art.page') : t('art.meta')}  ${fmtDate(a.updated_at)}` })) }],
        };
      case 'reflections':
        return {
          title: t('view.reflections'), count: data.reflections.length, emptyText: t('empty.reflections'),
          groups: [{ label: '', items: data.reflections.map((r) => ({ id: r.period, title: r.period, meta: t('refl.monthly') })) }],
        };
      default: {
        let groups;
        if (query.trim()) {
          const hits = searchChats(nonEmptyChats, query);
          groups = [{
            label: tn('result', hits.length),
            items: hits.map((h) => ({ id: h.chat.uuid, title: chatTitle(h.chat), snippet: h.snippet })),
          }];
        } else {
          const describe = (c) => {
            const project = assignments[c.uuid] && projectName.get(assignments[c.uuid]);
            return `${fmtDate(c.updated_at)}  ${tn('message', shownCount(c))}${project && groupBy !== 'project' ? `  ${project}` : ''}`;
          };
          const toItem = (c) => ({ id: c.uuid, title: chatTitle(c), meta: describe(c) });
          groups = groupBy === 'project' && projects.length
            ? groupByProject(nonEmptyChats, assignments, projects).map((g) => ({
              label: g.label, items: (order === 'old' ? g.items.toReversed() : g.items).map(toItem),
            }))
            : orderGroups(groupByRecency(nonEmptyChats, (c) => c.updated_at), order).map((g) => ({
              label: g.label, items: g.items.map(toItem),
            }));
          if (showEmpty && emptyChats.length) {
            const ordered = order === 'old' ? emptyChats.toReversed() : emptyChats;
            groups.push({
              label: t('list.emptyGroup', { n: emptyChats.length }),
              items: ordered.map((c) => ({ id: c.uuid, title: chatTitle(c), meta: `${fmtDate(c.updated_at)}  ${diagnoseEmpty(c).short}` })),
            });
          }
        }
        return { title: t('view.chats'), count: nonEmptyChats.length, groups, searchable: true, sortable: !query.trim(), groupable: projects.length > 0 && !query.trim(), emptyText: query ? t('empty.chatsNoMatch') : t('empty.chats') };
      }
    }
  }, [view, rev, lang, query, showEmpty, order, groupBy, projects, assignments, projectName, memoryItems, emptyChats, nonEmptyChats]);

  // ---- detail pane --------------------------------------------------------
  const goBack = () => { location.hash = `#/${view}`; };
  let detail = null;
  let hasSelection = false;
  if (id) {
    if (view === 'chats') {
      const chat = data.chats.find((c) => c.uuid === id);
      if (chat) { hasSelection = true; detail = html`<${ChatView} key=${chat.uuid} chat=${chat} onBack=${goBack} query=${query} projects=${projects} projectId=${assignments[chat.uuid] || null} onAssign=${fileChat} />`; }
    } else if (view === 'projects') {
      const p = data.projects.find((x) => x.uuid === id);
      if (p) { hasSelection = true; detail = html`<${ProjectView} key=${p.uuid} project=${p} memory=${data.memory.perProject[p.uuid]} chats=${chatsOfProject(assignments, nonEmptyChats, p.uuid)} onPickChats=${() => setPickerFor(p.uuid)} onBack=${goBack} />`; }
    } else if (view === 'memory') {
      let title = '';
      let text = '';
      if (id === 'global') { title = t('mem.about'); text = data.memory.global; }
      else if (id.startsWith('project:')) { const u = id.slice(8); title = projectName.get(u) || t('mem.projectMemory'); text = data.memory.perProject[u]; }
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
  if (!detail) detail = html`<${NoSelection} text=${counts[view] ? t('pick') : t('nothingLoaded')} />`;

  // ---- render -------------------------------------------------------------
  if (restoring) return html`<div class="boot" aria-busy="true"><span class="spinner" aria-hidden="true"></span></div>`;

  if (!loaded) {
    return html`<${Landing}
      onEntries=${handleEntries} busy=${busy} progress=${progress} error=${error}
      remember=${remember} setRemember=${setRemember} manifest=${data.manifest} onLang=${changeLang}
    />${dragging && html`<div class="drop-overlay">${t('drop.import')}</div>`}`;
  }

  const footer = view === 'chats' && emptyCount > 0 && !query
    ? html`<button type="button" class="link-btn" onClick=${() => setShowEmpty((v) => !v)}>
        ${t(showEmpty ? 'foot.hide' : 'foot.show', { what: tn('emptyChat', emptyCount) })}
      </button>`
    : view === 'projects' && projects.length > 0
      ? html`<button type="button" class="link-btn" onClick=${exportAllProjects}>${t('foot.exportAll')}</button>`
      : null;

  return html`<div class=${`app ${hasSelection ? 'has-selection' : ''} ${view === 'home' ? 'is-home' : ''} ${railOpen ? 'rail-open' : ''}`}>
    <${Rail}
      view=${view} counts=${counts} canForget=${remember} open=${railOpen} onToggle=${toggleRail}
      onAdd=${() => addInput.current.click()} onLog=${() => setLogOpen(true)} onForget=${forget}
      onLanguage=${() => setLangOpen(true)}
    />
    ${view === 'home'
      ? html`<main class="main main-home"><${Landing}
          onEntries=${handleEntries} busy=${busy} progress=${progress} error=${error}
          remember=${remember} setRemember=${setRemember}
          loaded=${summarize(data)} onOpen=${() => { location.hash = '#/chats'; }} onClear=${forget} onLang=${changeLang}
        /></main>`
      : html`<${ListPane}
          title=${list.title} count=${list.count} groups=${list.groups} selectedId=${id} view=${view}
          query=${query} onQuery=${setQuery} searchable=${list.searchable} footer=${footer} emptyText=${list.emptyText}
          order=${order} onOrder=${list.sortable ? changeOrder : null}
          groupBy=${groupBy} onGroupBy=${list.groupable ? changeGroupBy : null}
        />
        <main class="main">${detail}</main>`}
    ${busy && html`<div class="toast" role="status"><span class="spinner" aria-hidden="true"></span>${progress || t('working')}</div>`}
    ${error && html`<div class="toast toast-error" role="alert">${error}</div>`}
    ${dragging && html`<div class="drop-overlay">${t('drop.add')}</div>`}
    ${logOpen && html`<${LogDialog} data=${data} onClose=${() => setLogOpen(false)} />`}
    ${langOpen && html`<${LanguageDialog} onChange=${changeLang} onClose=${() => setLangOpen(false)} />`}
    ${pickerFor && projects.some((p) => p.uuid === pickerFor) && html`<${ChatPicker}
      project=${projects.find((p) => p.uuid === pickerFor)} chats=${nonEmptyChats} assignments=${assignments}
      projects=${projects} onToggle=${fileChat} onClose=${() => setPickerFor(null)}
    />`}
    <input ref=${addInput} type="file" multiple accept=".json,.zip,application/json,application/zip" hidden
      onChange=${(e) => { const f = [...e.target.files].map((file) => ({ path: file.name, file })); e.target.value = ''; if (f.length) handleEntries(f); }} />
  </div>`;
}
