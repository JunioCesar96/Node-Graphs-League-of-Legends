import type { CanvasScene } from '@/core/canvasScene'
import { emptyCanvasScene, hydrateScene } from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import { stripNeekoTransientFromScene } from '@/core/neekoNodeTransform'
import {
  clearStoredScene,
  isCanvasScene,
  loadStoredScene,
  SCENE_LEGACY_STORAGE_MAX_BYTES,
  SCENE_STORAGE_KEY,
} from '@/core/sceneStorage'

export const STORAGE_SCENE_TABS_KEY = 'node-graphs-lol:scene-tabs-v1'
export const STORAGE_RECENT_SCENES_KEY = 'node-graphs-lol:recent-scenes'

export const MAX_RECENT_SCENES = 10

/** Limite de snapshots undo/redo por aba ao persistir (evita QuotaExceeded). */
export const MAX_TAB_HISTORY_STACK = 24

/** Total de nós (soma das abas) acima disto: não grava abas em localStorage. */
export const SCENE_TABS_PERSIST_MAX_NODES = 80

/** Tamanho máximo do JSON de abas antes de `setItem` (evita bloqueio longo + quota). */
export const SCENE_TABS_STORAGE_MAX_BYTES = Math.min(
  SCENE_LEGACY_STORAGE_MAX_BYTES,
  1_500_000,
)

let tabsPersistQuotaWarned = false

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

export type SnapshotFromSceneOptions = {
  /** Cena já hidratada / modo leve (ex.: Code To Node Block) — evita passes extra. */
  prepared?: boolean
}

export function snapshotFromScene(
  title: string,
  scene: CanvasScene,
  jsonFileName?: string,
  options?: SnapshotFromSceneOptions,
): SceneTabSnapshot {
  const stripped = stripNeekoTransientFromScene(scene)
  const present = options?.prepared ? stripped : hydrateTabScene(stripped)
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

/** Sempre inicia sem abas abertas; o utilizador cria ou abre uma cena manualmente. */
export function getInitialSceneTabsPersisted(): SceneTabsPersisted {
  return { activeTabId: '', tabs: [] }
}

function trimTabHistoryStacks(tab: SceneTabSnapshot): SceneTabSnapshot {
  const past =
    tab.past.length > MAX_TAB_HISTORY_STACK
      ? tab.past.slice(tab.past.length - MAX_TAB_HISTORY_STACK)
      : tab.past
  const future =
    tab.future.length > MAX_TAB_HISTORY_STACK
      ? tab.future.slice(0, MAX_TAB_HISTORY_STACK)
      : tab.future

  return { ...tab, past, future }
}

function buildTabsPersistPayload(data: SceneTabsPersisted, options?: { stripHistory?: boolean }): SceneTabsPersisted {
  return {
    activeTabId: data.activeTabId,
    tabs: data.tabs.map((tab) => {
      const trimmed = trimTabHistoryStacks(tab)

      return {
        ...trimmed,
        past: options?.stripHistory ? [] : trimmed.past.map(cloneScene),
        present: cloneScene(trimmed.present),
        future: options?.stripHistory ? [] : trimmed.future.map(cloneScene),
        selection: {
          ids: [...trimmed.selection.ids],
          primaryId: trimmed.selection.primaryId,
        },
      }
    }),
  }
}

/** Payload leve: sem `structuredClone`, só `present` (sem undo). */
function buildTabsPersistPayloadLean(data: SceneTabsPersisted): SceneTabsPersisted {
  return {
    activeTabId: data.activeTabId,
    tabs: data.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      past: [],
      present: tab.present,
      future: [],
      selection: {
        ids: [...tab.selection.ids],
        primaryId: tab.selection.primaryId,
      },
      ...(tab.jsonFileName?.trim() ? { jsonFileName: tab.jsonFileName.trim() } : {}),
    })),
  }
}

export function countNodesInTabsPersist(data: SceneTabsPersisted): number {
  return data.tabs.reduce((sum, tab) => sum + tab.present.nodes.length, 0)
}

export function shouldSkipSceneTabsPersist(data: SceneTabsPersisted): boolean {
  return data.tabs.length > 0 && countNodesInTabsPersist(data) > SCENE_TABS_PERSIST_MAX_NODES
}

let tabsPersistScheduled: ReturnType<typeof setTimeout> | undefined
let tabsPersistPending: SceneTabsPersisted | null = null

/** Adia gravação de abas para não bloquear a UI após cargas grandes. */
export function scheduleSceneTabsPersist(data: SceneTabsPersisted): void {
  if (shouldSkipSceneTabsPersist(data)) {
    warnTabsPersistSkippedOnce()

    try {
      window.localStorage.removeItem(STORAGE_SCENE_TABS_KEY)
    } catch {
      /** ignore */
    }

    return
  }

  tabsPersistPending = data

  if (tabsPersistScheduled !== undefined) {
    return
  }

  tabsPersistScheduled = globalThis.setTimeout(() => {
    tabsPersistScheduled = undefined
    const payload = tabsPersistPending
    tabsPersistPending = null

    if (payload) {
      saveSceneTabsPersistedPresentOnly(payload)
    }
  }, 0)
}

let recentScenePushScheduled: ReturnType<typeof setTimeout> | undefined
let recentScenePushPending: { title: string; scene: CanvasScene; sourceFileName?: string } | null =
  null

/** Adia «recentes» para fora do caminho crítico de abrir cena. */
export function schedulePushRecentScene(
  title: string,
  scene: CanvasScene,
  sourceFileName?: string,
  onDone?: () => void,
): void {
  recentScenePushPending = { title, scene, sourceFileName }

  if (recentScenePushScheduled !== undefined) {
    return
  }

  recentScenePushScheduled = globalThis.setTimeout(() => {
    recentScenePushScheduled = undefined
    const payload = recentScenePushPending
    recentScenePushPending = null

    if (payload) {
      pushRecentScene(payload.title, payload.scene, payload.sourceFileName)
      onDone?.()
    }
  }, 0)
}

function warnTabsPersistSkippedOnce(): void {
  if (tabsPersistQuotaWarned) {
    return
  }

  tabsPersistQuotaWarned = true

  if (import.meta.env.DEV) {
    console.warn(
      '[Scene tabs] Cena demasiado grande para localStorage — persistência de abas omitida. Usa «Salvar Cena de trabalho».',
    )
  }
}

function tryFreeLocalStorageForTabs(): void {
  try {
    window.localStorage.removeItem(STORAGE_RECENT_SCENES_KEY)
    clearStoredScene()
  } catch {
    /** ignore */
  }
}

function tryPersistTabsPayload(raw: string): boolean {
  try {
    window.localStorage.setItem(STORAGE_SCENE_TABS_KEY, raw)
    clearStoredScene()
    return true
  } catch {
    return false
  }
}

/**
 * Persiste abas em localStorage (apenas `present` por aba; sem stacks undo).
 * Devolve `false` se a cena for grande demais ou a quota falhar (sem bloquear a UI).
 */
export function saveSceneTabsPersistedPresentOnly(data: SceneTabsPersisted): boolean {
  if (data.tabs.length === 0) {
    return tryPersistTabsPayload(JSON.stringify({ activeTabId: '', tabs: [] }))
  }

  if (countNodesInTabsPersist(data) > SCENE_TABS_PERSIST_MAX_NODES) {
    warnTabsPersistSkippedOnce()

    try {
      window.localStorage.removeItem(STORAGE_SCENE_TABS_KEY)
    } catch {
      /** ignore */
    }

    return false
  }

  const payload = buildTabsPersistPayloadLean(data)
  let raw: string

  try {
    raw = JSON.stringify(payload)
  } catch {
    warnTabsPersistSkippedOnce()
    return false
  }

  if (raw.length > SCENE_TABS_STORAGE_MAX_BYTES) {
    warnTabsPersistSkippedOnce()
    return false
  }

  if (tryPersistTabsPayload(raw)) {
    return true
  }

  tryFreeLocalStorageForTabs()

  if (tryPersistTabsPayload(raw)) {
    return true
  }

  warnTabsPersistSkippedOnce()
  return false
}

/** @deprecated Alias — usar `saveSceneTabsPersistedPresentOnly`. */
export function saveSceneTabsPersisted(data: SceneTabsPersisted): void {
  saveSceneTabsPersistedPresentOnly(data)
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

  if (hydrated.nodes.length > SCENE_TABS_PERSIST_MAX_NODES) {
    return
  }

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
