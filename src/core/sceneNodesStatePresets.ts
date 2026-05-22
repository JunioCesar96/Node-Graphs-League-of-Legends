import type { CanvasNode, CanvasScene, LinkVisibilityFilter, SceneCamera } from '@/core/canvasScene'
import type {
  NodeCardBodyLayout,
  NodeCardSectionExpandedMap,
  NodeCardSectionId,
} from '@/core/nodeCardSections'
import { captureElementViewSnapshot } from '@/core/elementViewState'
import type { ElementViewKey, ElementViewState } from '@/core/nodeSchema'
import { syncSceneElementWireless } from '@/core/compactConnectionRouting'
import { reapplyLinkVisibilityFilter } from '@/core/sceneNodeLinkVisibility'

export const SCENE_NODES_STATE_SNAPSHOT_VERSION = 1 as const
export const SCENE_NODES_STATE_PRESETS_FILE_VERSION = 1 as const
export const SCENE_NODES_STATE_PRESETS_FILE_KIND = 'scene-nodes-state-presets' as const

export type SceneNodesNodeStateEntry = {
  sceneHidden?: boolean
  branchForceVisible?: boolean
  locked?: boolean
  displayLabel?: string
  bodyColor?: string
  bodyColorEnabled?: boolean
  bodyCollapsed?: boolean
  cardSectionExpanded?: NodeCardSectionExpandedMap
  cardSectionOrder?: NodeCardSectionId[]
  cardBodyLayout?: NodeCardBodyLayout
  elementView?: Partial<Record<ElementViewKey, ElementViewState>>
}

export type SceneNodesStateSnapshot = {
  version: typeof SCENE_NODES_STATE_SNAPSHOT_VERSION
  nodes: Record<string, SceneNodesNodeStateEntry>
  linkVisibilityFilter?: LinkVisibilityFilter
  /** Vista do canvas (pan + zoom) no momento de guardar o estado. */
  camera?: SceneCamera
}

export type SceneNodesStatePreset = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  snapshot: SceneNodesStateSnapshot
}

export type SceneNodesStatePresetsFile = {
  version: typeof SCENE_NODES_STATE_PRESETS_FILE_VERSION
  kind: typeof SCENE_NODES_STATE_PRESETS_FILE_KIND
  presets: SceneNodesStatePreset[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isElementViewState(value: unknown): value is ElementViewState {
  if (!isRecord(value) || (value.mode !== 'list' && value.mode !== 'compact')) {
    return false
  }
  if (value.selectedIndex !== undefined && typeof value.selectedIndex !== 'number') {
    return false
  }
  if (value.retracted !== undefined && typeof value.retracted !== 'boolean') {
    return false
  }
  return true
}

function parseElementView(raw: unknown): Partial<Record<ElementViewKey, ElementViewState>> | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const out: Partial<Record<ElementViewKey, ElementViewState>> = {}
  for (const [key, state] of Object.entries(raw)) {
    if (typeof key !== 'string' || !isElementViewState(state)) {
      return undefined
    }
    out[key] = state
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function parseSceneCamera(raw: unknown): SceneCamera | undefined {
  if (!isRecord(raw) || !isRecord(raw.pan)) {
    return undefined
  }

  if (typeof raw.pan.x !== 'number' || typeof raw.pan.y !== 'number') {
    return undefined
  }

  if (typeof raw.scale !== 'number' || !Number.isFinite(raw.scale) || raw.scale <= 0) {
    return undefined
  }

  return {
    pan: { x: raw.pan.x, y: raw.pan.y },
    scale: raw.scale,
  }
}

function parseLinkVisibilityFilter(raw: unknown): LinkVisibilityFilter | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  if (raw.mode === 'branch' && typeof raw.seedNodeId === 'string') {
    return { mode: 'branch', seedNodeId: raw.seedNodeId }
  }
  if (
    raw.mode === 'slot' &&
    typeof raw.fromNodeId === 'string' &&
    typeof raw.slotId === 'string'
  ) {
    return { mode: 'slot', fromNodeId: raw.fromNodeId, slotId: raw.slotId }
  }
  if (raw.mode === 'incoming' && typeof raw.toNodeId === 'string') {
    return { mode: 'incoming', toNodeId: raw.toNodeId }
  }
  return undefined
}

function captureNodeStateEntry(canvasNode: CanvasNode): SceneNodesNodeStateEntry | undefined {
  const entry: SceneNodesNodeStateEntry = {}

  if (canvasNode.sceneHidden === true) {
    entry.sceneHidden = true
  }
  if (canvasNode.branchForceVisible === true) {
    entry.branchForceVisible = true
  }
  if (canvasNode.locked === true) {
    entry.locked = true
  }
  if (typeof canvasNode.displayLabel === 'string' && canvasNode.displayLabel.length > 0) {
    entry.displayLabel = canvasNode.displayLabel
  }
  if (typeof canvasNode.bodyColor === 'string' && canvasNode.bodyColor.length > 0) {
    entry.bodyColor = canvasNode.bodyColor
  }
  if (canvasNode.bodyColorEnabled === true) {
    entry.bodyColorEnabled = true
  }
  if (canvasNode.bodyCollapsed === true) {
    entry.bodyCollapsed = true
  }
  if (canvasNode.cardSectionExpanded !== undefined) {
    entry.cardSectionExpanded = structuredClone(canvasNode.cardSectionExpanded)
  }
  if (canvasNode.cardSectionOrder !== undefined) {
    entry.cardSectionOrder = [...canvasNode.cardSectionOrder]
  }
  if (canvasNode.cardBodyLayout !== undefined) {
    entry.cardBodyLayout = canvasNode.cardBodyLayout
  }
  const elementView = captureElementViewSnapshot(canvasNode.node)
  if (elementView !== undefined) {
    entry.elementView = structuredClone(elementView)
  }

  return Object.keys(entry).length > 0 ? entry : undefined
}

export function captureSceneNodesStateSnapshot(scene: CanvasScene): SceneNodesStateSnapshot {
  const nodes: Record<string, SceneNodesNodeStateEntry> = {}

  for (const canvasNode of scene.nodes) {
    const entry = captureNodeStateEntry(canvasNode)
    if (entry !== undefined) {
      nodes[canvasNode.id] = entry
    }
  }

  return {
    version: SCENE_NODES_STATE_SNAPSHOT_VERSION,
    nodes,
    ...(scene.linkVisibilityFilter ? { linkVisibilityFilter: structuredClone(scene.linkVisibilityFilter) } : {}),
    ...(scene.camera ? { camera: structuredClone(scene.camera) } : {}),
  }
}

function clearNodePresentationFields(
  node: CanvasNode,
  options?: { clearElementView?: boolean },
): CanvasNode {
  const {
    sceneHidden: _sh,
    branchForceVisible: _bfv,
    locked: _locked,
    displayLabel: _dl,
    bodyColor: _bc,
    bodyColorEnabled: _bce,
    bodyCollapsed: _bcoll,
    cardSectionExpanded: _cse,
    cardSectionOrder: _cso,
    cardBodyLayout: _cbl,
    ...rest
  } = node

  if (options?.clearElementView) {
    const { elementView: _ev, ...nodeRest } = rest.node
    return {
      ...rest,
      node: nodeRest,
    }
  }

  return rest
}

function applyNodeStateEntry(canvasNode: CanvasNode, entry: SceneNodesNodeStateEntry): CanvasNode {
  const clearElementView = entry.elementView !== undefined
  let next = clearNodePresentationFields(canvasNode, { clearElementView })

  if (entry.sceneHidden === true) {
    next = { ...next, sceneHidden: true }
  }
  if (entry.branchForceVisible === true) {
    next = { ...next, branchForceVisible: true }
  }
  if (entry.locked === true) {
    next = { ...next, locked: true }
  }
  if (entry.displayLabel !== undefined) {
    next = { ...next, displayLabel: entry.displayLabel }
  }
  if (entry.bodyColor !== undefined) {
    next = { ...next, bodyColor: entry.bodyColor }
  }
  if (entry.bodyColorEnabled === true) {
    next = { ...next, bodyColorEnabled: true }
  }
  if (entry.bodyCollapsed === true) {
    next = { ...next, bodyCollapsed: true }
  }
  if (entry.cardSectionExpanded !== undefined) {
    next = { ...next, cardSectionExpanded: structuredClone(entry.cardSectionExpanded) }
  }
  if (entry.cardSectionOrder !== undefined) {
    next = { ...next, cardSectionOrder: [...entry.cardSectionOrder] }
  }
  if (entry.cardBodyLayout !== undefined) {
    next = { ...next, cardBodyLayout: entry.cardBodyLayout }
  }
  if (entry.elementView !== undefined) {
    next = {
      ...next,
      node: {
        ...next.node,
        elementView: structuredClone(entry.elementView),
      },
    }
  }

  return next
}

function finalizeSceneNodesStateScene(scene: CanvasScene): CanvasScene {
  return reapplyLinkVisibilityFilter(syncSceneElementWireless(scene))
}

export function applySceneNodesStateSnapshot(
  scene: CanvasScene,
  snapshot: SceneNodesStateSnapshot,
): CanvasScene {
  const presetById = snapshot.nodes

  let next: CanvasScene = {
    ...scene,
    nodes: scene.nodes.map((canvasNode) => {
      const entry = presetById[canvasNode.id]
      if (entry === undefined) {
        return canvasNode
      }
      return applyNodeStateEntry(canvasNode, entry)
    }),
  }

  if (snapshot.linkVisibilityFilter !== undefined) {
    next = { ...next, linkVisibilityFilter: structuredClone(snapshot.linkVisibilityFilter) }
  } else {
    const { linkVisibilityFilter: _removed, ...rest } = next
    next = rest
  }

  if (snapshot.camera !== undefined) {
    next = { ...next, camera: structuredClone(snapshot.camera) }
  }

  return finalizeSceneNodesStateScene(next)
}

function parseNodeStateEntry(raw: unknown): SceneNodesNodeStateEntry | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const entry: SceneNodesNodeStateEntry = {}

  if (raw.sceneHidden === true) {
    entry.sceneHidden = true
  }
  if (raw.branchForceVisible === true) {
    entry.branchForceVisible = true
  }
  if (raw.locked === true) {
    entry.locked = true
  }
  if (typeof raw.displayLabel === 'string') {
    entry.displayLabel = raw.displayLabel
  }
  if (typeof raw.bodyColor === 'string') {
    entry.bodyColor = raw.bodyColor
  }
  if (raw.bodyColorEnabled === true) {
    entry.bodyColorEnabled = true
  }
  if (raw.bodyCollapsed === true) {
    entry.bodyCollapsed = true
  }
  if (isRecord(raw.cardSectionExpanded)) {
    const expanded: NodeCardSectionExpandedMap = {}
    for (const [key, value] of Object.entries(raw.cardSectionExpanded)) {
      if ((value === true || value === false) && typeof key === 'string') {
        expanded[key as keyof NodeCardSectionExpandedMap] = value
      }
    }
    if (Object.keys(expanded).length > 0) {
      entry.cardSectionExpanded = expanded
    }
  }
  if (Array.isArray(raw.cardSectionOrder)) {
    const order = raw.cardSectionOrder.filter((item): item is NodeCardSectionId => typeof item === 'string')
    if (order.length > 0) {
      entry.cardSectionOrder = order
    }
  }
  if (typeof raw.cardBodyLayout === 'string') {
    entry.cardBodyLayout = raw.cardBodyLayout as NodeCardBodyLayout
  }
  if (isRecord(raw.elementView)) {
    const elementView = parseElementView(raw.elementView)
    if (elementView !== undefined) {
      entry.elementView = elementView
    } else if (Object.keys(raw.elementView).length === 0) {
      entry.elementView = {}
    } else {
      return undefined
    }
  }

  return Object.keys(entry).length > 0 ? entry : undefined
}

export function parseSceneNodesStateSnapshot(raw: unknown): SceneNodesStateSnapshot | undefined {
  if (!isRecord(raw) || raw.version !== SCENE_NODES_STATE_SNAPSHOT_VERSION) {
    return undefined
  }
  if (!isRecord(raw.nodes)) {
    return undefined
  }

  const nodes: Record<string, SceneNodesNodeStateEntry> = {}
  for (const [nodeId, entryRaw] of Object.entries(raw.nodes)) {
    if (typeof nodeId !== 'string') {
      return undefined
    }
    const entry = parseNodeStateEntry(entryRaw)
    if (entry !== undefined) {
      nodes[nodeId] = entry
    }
  }

  const linkVisibilityFilter = parseLinkVisibilityFilter(raw.linkVisibilityFilter)
  const camera = parseSceneCamera(raw.camera)

  return {
    version: SCENE_NODES_STATE_SNAPSHOT_VERSION,
    nodes,
    ...(linkVisibilityFilter ? { linkVisibilityFilter } : {}),
    ...(camera ? { camera } : {}),
  }
}

export function parseSceneNodesStatePreset(raw: unknown): SceneNodesStatePreset | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    return undefined
  }
  if (typeof raw.createdAt !== 'string' || typeof raw.updatedAt !== 'string') {
    return undefined
  }
  const snapshot = parseSceneNodesStateSnapshot(raw.snapshot)
  if (snapshot === undefined) {
    return undefined
  }
  return {
    id: raw.id,
    name: raw.name,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    snapshot,
  }
}

export function parseSceneNodesStatePresets(raw: unknown): SceneNodesStatePreset[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const presets: SceneNodesStatePreset[] = []
  for (const item of raw) {
    const preset = parseSceneNodesStatePreset(item)
    if (preset === undefined) {
      return undefined
    }
    presets.push(preset)
  }
  return presets
}

export function parseSceneNodesStatePresetsFile(raw: unknown): SceneNodesStatePresetsFile | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  if (
    raw.version !== SCENE_NODES_STATE_PRESETS_FILE_VERSION ||
    raw.kind !== SCENE_NODES_STATE_PRESETS_FILE_KIND
  ) {
    return undefined
  }
  const presets = parseSceneNodesStatePresets(raw.presets)
  if (presets === undefined) {
    return undefined
  }
  return {
    version: SCENE_NODES_STATE_PRESETS_FILE_VERSION,
    kind: SCENE_NODES_STATE_PRESETS_FILE_KIND,
    presets,
  }
}

export function serializeSceneNodesStatePresetsFile(presets: SceneNodesStatePreset[]): string {
  const file: SceneNodesStatePresetsFile = {
    version: SCENE_NODES_STATE_PRESETS_FILE_VERSION,
    kind: SCENE_NODES_STATE_PRESETS_FILE_KIND,
    presets,
  }
  return JSON.stringify(file, null, 2)
}

export function createSceneNodesStatePreset(name: string, scene: CanvasScene): SceneNodesStatePreset {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    snapshot: captureSceneNodesStateSnapshot(scene),
  }
}

export function defaultSceneNodesStatePresetName(existing: SceneNodesStatePreset[]): string {
  const used = new Set(existing.map((preset) => preset.name.trim().toLowerCase()))
  for (let index = 1; index < 10_000; index += 1) {
    const candidate = `Estado ${index}`
    if (!used.has(candidate.toLowerCase())) {
      return candidate
    }
  }
  return `Estado ${Date.now()}`
}
