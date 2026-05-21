import type { CanvasScene } from '@/core/canvasScene'
import { emptyCanvasScene, hydrateScene } from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import { isCanvasScene, loadStoredScene, SCENE_STORAGE_KEY } from '@/core/sceneStorage'

export const STORAGE_SCENE_TABS_KEY = 'node-graphs-lol:scene-tabs-v1'
export const STORAGE_RECENT_SCENES_KEY = 'node-graphs-lol:recent-scenes'

export const MAX_RECENT_SCENES = 10

export type SceneTabSelection = {
  ids: string[]
  primaryId: string
}

export type SceneTabSnapshot = {
  id: string
  title: string
  past: CanvasScene[]
  present: CanvasScene
  future: CanvasScene[]
  selection: SceneTabSelection
  /** Último nome de ficheiro JSON associado à aba (sugestão no Salvar). */
  jsonFileName?: string
}

export type SceneTabsPersisted = {
  activeTabId: string
  tabs: SceneTabSnapshot[]
}

export type RecentSceneEntry = {
  id: string
  title: string
  openedAt: string
  scene: CanvasScene
  /** Nome do ficheiro JSON ao abrir (File → Open). */
  sourceFileName?: string
}

export type RecentSceneListItem = {
  id: string
  title: string
  openedAt: string
  sourceFileName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hydrateTabScene(scene: CanvasScene): CanvasScene {
  return syncSceneCollapsedBodyWireless(hydrateScene(scene))
}

function cloneScene(scene: CanvasScene): CanvasScene {
  return structuredClone(scene)
}

export function stripExtension(fileName: string): string {
  const trimmed = fileName.trim()
  const lastDot = trimmed.lastIndexOf('.')

  if (lastDot <= 0) {
    return trimmed
  }

  return trimmed.slice(0, lastDot)
}

export function createTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createRecentSceneId(): string {
  return `recent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Título único entre abas abertas; acrescenta (2), (3), … se necessário. */
export function uniqueTabTitle(requested: string, existingTitles: string[]): string {
  const base = requested.trim() || 'Cena'

  if (!existingTitles.includes(base)) {
    return base
  }

  let index = 2

  while (existingTitles.includes(`${base} (${index})`)) {
    index += 1
  }

  return `${base} (${index})`
}

/** Estado interno da grade quando não há abas abertas (não é persistido como tab). */
export function createEmptyWorkspaceSnapshot(): SceneTabSnapshot {
  const present = hydrateTabScene(emptyCanvasScene)

  return {
    id: '',
    title: '',
    past: [],
    present,
    future: [],
    selection: { ids: [], primaryId: '' },
  }
}

export function createDefaultTabSnapshot(title = 'Cena 1'): SceneTabSnapshot {
  const present = hydrateTabScene(emptyCanvasScene)

  return {
    id: createTabId(),
    title,
    past: [],
    present,
    future: [],
    selection: {
      ids: present.nodes[0] ? [present.nodes[0].id] : [],
      primaryId: present.nodes[0]?.id ?? '',
    },
  }
}

export function snapshotFromScene(
  title: string,
  scene: CanvasScene,
  jsonFileName?: string,
): SceneTabSnapshot {
  const present = hydrateTabScene(scene)
  const primaryId =
    present.nodes[0]?.id ?? ''

  return {
    id: createTabId(),
    title,
    past: [],
    present,
    future: [],
    selection: {
      ids: primaryId ? [primaryId] : [],
      primaryId,
    },
    ...(jsonFileName?.trim() ? { jsonFileName: jsonFileName.trim() } : {}),
  }
}

function parseTabSnapshot(raw: unknown): SceneTabSnapshot | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null
  }

  if (!isCanvasScene(raw.present)) {
    return null
  }

  const past = Array.isArray(raw.past) ? raw.past.filter(isCanvasScene) : []
  const future = Array.isArray(raw.future) ? raw.future.filter(isCanvasScene) : []
  const selectionRaw = raw.selection

  let selection: SceneTabSelection = { ids: [], primaryId: '' }

  if (isRecord(selectionRaw)) {
    const ids = Array.isArray(selectionRaw.ids)
      ? selectionRaw.ids.filter((id): id is string => typeof id === 'string')
      : []
    const primaryId = typeof selectionRaw.primaryId === 'string' ? selectionRaw.primaryId : ''

    selection = { ids, primaryId }
  }

  return {
    id: raw.id,
    title: raw.title,
    past: past.map(hydrateTabScene),
    present: hydrateTabScene(raw.present),
    future: future.map(hydrateTabScene),
    selection,
    ...(typeof raw.jsonFileName === 'string' && raw.jsonFileName.trim()
      ? { jsonFileName: raw.jsonFileName.trim() }
      : {}),
  }
}

export function loadSceneTabsPersisted(): SceneTabsPersisted | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_SCENE_TABS_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed) || typeof parsed.activeTabId !== 'string' || !Array.isArray(parsed.tabs)) {
      return null
    }

    if (parsed.tabs.length === 0) {
      return {
        activeTabId: typeof parsed.activeTabId === 'string' ? parsed.activeTabId : '',
        tabs: [],
      }
    }

    const tabs = parsed.tabs
      .map(parseTabSnapshot)
      .filter((tab): tab is SceneTabSnapshot => tab !== null)

    if (tabs.length === 0) {
      return null
    }

    const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId)
      ? parsed.activeTabId
      : tabs[0]!.id

    return { activeTabId, tabs }
  } catch {
    return null
  }
}

/** Migra cena única antiga (`node-graphs-lol:scene`) para o primeiro tab. */
export function migrateLegacySceneToTabs(): SceneTabsPersisted {
  const loaded = loadStoredScene()
  const title = loaded.nodes.length > 0 ? 'Cena guardada' : 'Cena 1'

  return {
    activeTabId: '',
    tabs: [snapshotFromScene(title, loaded)],
  }
}

function hasLegacySceneStorage(): boolean {
  try {
    return window.localStorage.getItem(SCENE_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function getInitialSceneTabsPersisted(): SceneTabsPersisted {
  const stored = loadSceneTabsPersisted()

  if (stored && stored.tabs.length > 0) {
    return stored
  }

  if (hasLegacySceneStorage()) {
    const migrated = migrateLegacySceneToTabs()
    migrated.activeTabId = migrated.tabs[0]!.id

    return migrated
  }

  if (stored) {
    return stored
  }

  return { activeTabId: '', tabs: [] }
}

export function saveSceneTabsPersisted(data: SceneTabsPersisted): void {
  try {
    const payload: SceneTabsPersisted = {
      activeTabId: data.activeTabId,
      tabs: data.tabs.map((tab) => ({
        ...tab,
        past: tab.past.map(cloneScene),
        present: cloneScene(tab.present),
        future: tab.future.map(cloneScene),
        selection: {
          ids: [...tab.selection.ids],
          primaryId: tab.selection.primaryId,
        },
      })),
    }

    window.localStorage.setItem(STORAGE_SCENE_TABS_KEY, JSON.stringify(payload))
  } catch {
    /** ignore quota */
  }
}

export function loadRecentSceneList(): RecentSceneListItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_RECENT_SCENES_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    const items: RecentSceneListItem[] = []

    for (const entry of parsed) {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.title !== 'string') {
        continue
      }

      items.push({
        id: entry.id,
        title: entry.title,
        openedAt: typeof entry.openedAt === 'string' ? entry.openedAt : '',
        sourceFileName:
          typeof entry.sourceFileName === 'string' ? entry.sourceFileName : undefined,
      })
    }

    return items
  } catch {
    return []
  }
}

function loadRecentSceneEntries(): RecentSceneEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_RECENT_SCENES_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    const entries: RecentSceneEntry[] = []

    for (const entry of parsed) {
      if (
        !isRecord(entry) ||
        typeof entry.id !== 'string' ||
        typeof entry.title !== 'string' ||
        !isCanvasScene(entry.scene)
      ) {
        continue
      }

      entries.push({
        id: entry.id,
        title: entry.title,
        openedAt: typeof entry.openedAt === 'string' ? entry.openedAt : new Date().toISOString(),
        scene: hydrateTabScene(entry.scene),
        sourceFileName:
          typeof entry.sourceFileName === 'string' ? entry.sourceFileName : undefined,
      })
    }

    return entries
  } catch {
    return []
  }
}

function saveRecentSceneEntries(entries: RecentSceneEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_RECENT_SCENES_KEY, JSON.stringify(entries))
  } catch {
    /** ignore */
  }
}

function recentEntryKey(title: string, sourceFileName?: string): string {
  const file = sourceFileName?.trim()

  if (file) {
    return `file:${file.toLowerCase()}`
  }

  return `title:${(title.trim() || 'Cena').toLowerCase()}`
}

/** Adiciona ou promove JSON aberto (FIFO, máx. MAX_RECENT_SCENES). */
export function pushRecentScene(
  title: string,
  scene: CanvasScene,
  sourceFileName?: string,
): void {
  const normalizedTitle = title.trim() || 'Cena'
  const hydrated = hydrateTabScene(scene)
  const key = recentEntryKey(normalizedTitle, sourceFileName)
  const existing = loadRecentSceneEntries().filter(
    (entry) => recentEntryKey(entry.title, entry.sourceFileName) !== key,
  )

  const next: RecentSceneEntry[] = [
    {
      id: createRecentSceneId(),
      title: normalizedTitle,
      openedAt: new Date().toISOString(),
      scene: cloneScene(hydrated),
      ...(sourceFileName?.trim() ? { sourceFileName: sourceFileName.trim() } : {}),
    },
    ...existing,
  ].slice(0, MAX_RECENT_SCENES)

  saveRecentSceneEntries(next)
}

export function loadRecentSceneById(id: string): RecentSceneEntry | null {
  return loadRecentSceneEntries().find((entry) => entry.id === id) ?? null
}
