// The export does not say which project a chat belonged to, so the viewer lets the user file
// chats into projects themselves. An assignment map is { [chatUuid]: projectUuid }, kept in this
// browser only. All functions are pure and never mutate their input.

import { t } from './i18n.js';

export const NO_PROJECT = 'none';

/** Return a new map with the chat filed under `projectId`, or removed when `projectId` is falsy. */
export function assign(map, chatId, projectId) {
  const next = { ...map };
  if (projectId) next[chatId] = projectId;
  else delete next[chatId];
  return next;
}

/**
 * Drop assignments that point at items or projects that are not loaded (for example after a re-import).
 * `key` is the id field of the items: chats use `uuid`, artifacts use `id`.
 */
export function prune(map, items, projects, key = 'uuid') {
  const itemIds = new Set(items.map((i) => i[key]));
  const projectIds = new Set(projects.map((p) => p.uuid));
  const next = {};
  for (const [c, p] of Object.entries(map || {})) if (itemIds.has(c) && projectIds.has(p)) next[c] = p;
  return next;
}

/** Items (chats by default, artifacts with key 'id') filed under one project, in the order given. */
export function itemsOfProject(map, items, projectId, key = 'uuid') {
  return items.filter((i) => map[i[key]] === projectId);
}

/** Chats filed under one project, in the order given. */
export const chatsOfProject = (map, chats, projectId) => itemsOfProject(map, chats, projectId);

/** Artifacts attached to one project, in the order given. */
export const artifactsOfProject = (map, artifacts, projectId) => itemsOfProject(map, artifacts, projectId, 'id');

/**
 * Group chats by project for the list column. Projects keep the order given, only projects that
 * hold at least one chat appear, and unfiled chats come last under `NO_PROJECT`.
 * @returns {{id: string, label: string, items: object[]}[]}
 */
export function groupByProject(chats, map, projects) {
  const groups = [];
  for (const p of projects) {
    const items = chatsOfProject(map, chats, p.uuid);
    if (items.length) groups.push({ id: p.uuid, label: p.name || t('untitledProject'), items });
  }
  const known = new Set(projects.map((p) => p.uuid));
  const loose = chats.filter((c) => !known.has(map[c.uuid]));
  if (loose.length) groups.push({ id: NO_PROJECT, label: t('noProject'), items: loose });
  return groups;
}
