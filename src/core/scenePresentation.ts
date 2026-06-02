import type {
  CanvasNode,
  CanvasScene,
  SceneCamera,
  SceneChromeState,
  SceneNodesChrome,
} from '@/core/canvasScene'
import {
  allVisibleSectionsExpandedMap,
  isNodeCardBodyLayout,
  isNodeCardSectionId,
  resolveNodeCardBodyLayout,
  type NodeCardBodyLayout,
  type NodeCardSectionExpandedMap,
  type NodeCardSectionId,
} from '@/core/nodeCardSections'
import {
  DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
  type CanvasToolbarToolId,
  type CanvasToolbarVisibility,
} from '@/core/canvasToolbarVisibility'
import type { NodeInstance } from '@/core/nodeSchema'
import {
  DEFAULT_CANVAS_GRID_OPACITY,
  DEFAULT_CANVAS_GRID_SIZE,
  resolveCanvasGridOpacity,
  resolveCanvasGridSize,
} from '@/core/canvasGridSettings'
import { parseSceneNodesStatePresets } from '@/core/sceneNodesStatePresets'
import type { SceneNodesSortMode } from '@/core/sceneNodesListSort'

export type { SceneChromeState, SceneNodesChrome } from '@/core/canvasScene'

/** Campos de apresentação por nó (layout.json / export v2). */
export type CanvasNodePresentationEntry = {
  position: { x: number; y: number }
  bodyCollapsed?: boolean
  cardSectionExpanded?: NodeCardSectionExpandedMap
  cardSectionOrder?: NodeCardSectionId[]
  cardBodyLayout: NodeCardBodyLayout
  sceneHidden?: boolean
  branchForceVisible?: boolean
  displayLabel?: string
  bodyColor?: string
  bodyColorEnabled?: boolean
  locked?: boolean
  blockViewActive?: boolean
  groupViewActive?: boolean
  structureCardParamsExpanded?: boolean
  structureCardWidth?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCardSectionExpanded(raw: unknown): NodeCardSectionExpandedMap | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const out: NodeCardSectionExpandedMap = {}
  for (const [key, value] of Object.entries(raw)) {
    if (isNodeCardSectionId(key) && (value === true || value === false)) {
      out[key] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function parseCardBodyLayout(raw: unknown): NodeCardBodyLayout | undefined {
  if (typeof raw === 'string' && isNodeCardBodyLayout(raw)) {
    return raw
  }
  return undefined
}

export function parseCardSectionOrder(raw: unknown): NodeCardSectionId[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const out: NodeCardSectionId[] = []
  for (const item of raw) {
    if (typeof item === 'string' && isNodeCardSectionId(item) && !out.includes(item)) {
      out.push(item)
    }
  }
  return out.length > 0 ? out : undefined
}

const SCENE_NODES_SORT_MODES: readonly SceneNodesSortMode[] = ['name', 'position', 'type']

function parseSceneNodesSortMode(raw: unknown): SceneNodesSortMode | undefined {
  if (typeof raw === 'string' && (SCENE_NODES_SORT_MODES as readonly string[]).includes(raw)) {
    return raw as SceneNodesSortMode
  }
  return undefined
}

function parseToolbarVisibility(raw: unknown): CanvasToolbarVisibility | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const out = { ...DEFAULT_CANVAS_TOOLBAR_VISIBILITY }
  let changed = false
  for (const toolId of Object.keys(DEFAULT_CANVAS_TOOLBAR_VISIBILITY) as CanvasToolbarToolId[]) {
    const value = raw[toolId]
    if (typeof value === 'boolean' && value !== DEFAULT_CANVAS_TOOLBAR_VISIBILITY[toolId]) {
      out[toolId] = value
      changed = true
    }
  }
  return changed ? out : undefined
}

export function parseSceneChrome(raw: unknown): SceneChromeState | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const sceneNodesRaw = raw.sceneNodes
  let sceneNodes: SceneNodesChrome | undefined
  if (isRecord(sceneNodesRaw)) {
    const minimized =
      sceneNodesRaw.minimized === true
        ? true
        : sceneNodesRaw.minimized === false
          ? false
          : undefined
    const sortMode = parseSceneNodesSortMode(sceneNodesRaw.sortMode)
    const presets = parseSceneNodesStatePresets(sceneNodesRaw.presets)
    if (minimized !== undefined || sortMode !== undefined || presets !== undefined) {
      sceneNodes = {
        ...(minimized !== undefined ? { minimized } : {}),
        ...(sortMode ? { sortMode } : {}),
        ...(presets !== undefined ? { presets } : {}),
      }
    }
  }

  const toolbarVisibility = parseToolbarVisibility(raw.toolbarVisibility)
  const toolbarCollapsed =
    raw.toolbarCollapsed === true ? true : raw.toolbarCollapsed === false ? false : undefined
  const showCanvasGrid = raw.showCanvasGrid === false ? false : undefined
  const canvasGridSize =
    raw.canvasGridSize !== undefined ? resolveCanvasGridSize(raw.canvasGridSize) : undefined
  const canvasGridOpacity =
    raw.canvasGridOpacity !== undefined ? resolveCanvasGridOpacity(raw.canvasGridOpacity) : undefined

  const hasGridSize = canvasGridSize !== undefined && canvasGridSize !== DEFAULT_CANVAS_GRID_SIZE
  const hasGridOpacity =
    canvasGridOpacity !== undefined && canvasGridOpacity !== DEFAULT_CANVAS_GRID_OPACITY

  if (
    !sceneNodes &&
    !toolbarVisibility &&
    !toolbarCollapsed &&
    showCanvasGrid === undefined &&
    !hasGridSize &&
    !hasGridOpacity
  ) {
    return undefined
  }

  return {
    ...(sceneNodes ? { sceneNodes } : {}),
    ...(toolbarCollapsed !== undefined ? { toolbarCollapsed } : {}),
    ...(toolbarVisibility ? { toolbarVisibility } : {}),
    ...(showCanvasGrid === false ? { showCanvasGrid: false } : {}),
    ...(hasGridSize ? { canvasGridSize } : {}),
    ...(hasGridOpacity ? { canvasGridOpacity } : {}),
  }
}

export function sceneChromeFromScene(scene: CanvasScene): SceneChromeState | undefined {
  if (!scene.sceneChrome) {
    return undefined
  }
  return structuredClone(scene.sceneChrome)
}

export function applySceneChromeToScene(
  scene: CanvasScene,
  chrome: SceneChromeState | undefined,
): CanvasScene {
  if (
    !chrome ||
    (Object.keys(chrome).length === 0 &&
      !chrome.sceneNodes &&
      !chrome.toolbarVisibility &&
      !chrome.toolbarCollapsed &&
      chrome.showCanvasGrid === undefined &&
      chrome.canvasGridSize === undefined &&
      chrome.canvasGridOpacity === undefined)
  ) {
    const { sceneChrome: _removed, ...rest } = scene
    return rest
  }
  return { ...scene, sceneChrome: structuredClone(chrome) }
}

export function canvasNodePresentationFromNode(canvasNode: CanvasNode): CanvasNodePresentationEntry {
  return {
    position: { ...canvasNode.position },
    ...(canvasNode.bodyCollapsed ? { bodyCollapsed: true } : {}),
    ...(canvasNode.cardSectionExpanded && Object.keys(canvasNode.cardSectionExpanded).length > 0
      ? { cardSectionExpanded: structuredClone(canvasNode.cardSectionExpanded) }
      : {}),
    ...(canvasNode.cardSectionOrder && canvasNode.cardSectionOrder.length > 0
      ? { cardSectionOrder: [...canvasNode.cardSectionOrder] }
      : {}),
    cardBodyLayout: resolveNodeCardBodyLayout(canvasNode),
    ...(canvasNode.sceneHidden ? { sceneHidden: true } : {}),
    ...(canvasNode.branchForceVisible ? { branchForceVisible: true } : {}),
    ...(canvasNode.displayLabel !== undefined ? { displayLabel: canvasNode.displayLabel } : {}),
    ...(canvasNode.bodyColor !== undefined ? { bodyColor: canvasNode.bodyColor } : {}),
    ...(canvasNode.bodyColorEnabled === false
      ? { bodyColorEnabled: false }
      : canvasNode.bodyColorEnabled
        ? { bodyColorEnabled: true }
        : {}),
    ...(canvasNode.locked ? { locked: true } : {}),
    ...(canvasNode.blockViewActive ? { blockViewActive: true } : {}),
    ...(canvasNode.groupViewActive ? { groupViewActive: true } : {}),
    ...(canvasNode.structureCardParamsExpanded ? { structureCardParamsExpanded: true } : {}),
    ...(canvasNode.structureCardWidth !== undefined
      ? { structureCardWidth: canvasNode.structureCardWidth }
      : {}),
  }
}

/** Layout legado sem cardBodyLayout → freeform (alinhado a nós novos). */
export function resolveCardBodyLayoutFromEntry(
  entry: Pick<CanvasNodePresentationEntry, 'cardBodyLayout'> | { cardBodyLayout?: NodeCardBodyLayout },
): NodeCardBodyLayout {
  return entry.cardBodyLayout ?? 'freeform'
}

export function canvasNodeOverlayFromPresentation(
  entry: CanvasNodePresentationEntry,
  nodeInstance: NodeInstance,
): Partial<CanvasNode> {
  const cardBodyLayout = resolveCardBodyLayoutFromEntry(entry)
  const cardSectionExpanded =
    cardBodyLayout === 'freeform'
      ? allVisibleSectionsExpandedMap(nodeInstance)
      : entry.cardSectionExpanded
        ? structuredClone(entry.cardSectionExpanded)
        : undefined
  const cardSectionOrder = entry.cardSectionOrder ? [...entry.cardSectionOrder] : undefined

  return {
    cardBodyLayout,
    ...(cardSectionExpanded ? { cardSectionExpanded } : {}),
    ...(cardSectionOrder ? { cardSectionOrder } : {}),
    ...(entry.sceneHidden ? { sceneHidden: true } : {}),
    ...(entry.branchForceVisible ? { branchForceVisible: true } : {}),
    ...(entry.displayLabel !== undefined ? { displayLabel: entry.displayLabel } : {}),
    ...(entry.bodyColor !== undefined ? { bodyColor: entry.bodyColor } : {}),
    ...(entry.bodyColorEnabled === false
      ? { bodyColorEnabled: false }
      : entry.bodyColorEnabled
        ? { bodyColorEnabled: true }
        : {}),
    ...(entry.locked ? { locked: true } : {}),
    ...(entry.blockViewActive ? { blockViewActive: true } : {}),
    ...(entry.groupViewActive ? { groupViewActive: true } : {}),
    ...(entry.structureCardParamsExpanded ? { structureCardParamsExpanded: true } : {}),
    ...(entry.structureCardWidth !== undefined ? { structureCardWidth: entry.structureCardWidth } : {}),
  }
}

export function isValidPresentationEntry(raw: unknown): raw is CanvasNodePresentationEntry {
  if (!isRecord(raw) || !isRecord(raw.position)) {
    return false
  }
  if (typeof raw.position.x !== 'number' || typeof raw.position.y !== 'number') {
    return false
  }
  if (raw.bodyCollapsed !== undefined && raw.bodyCollapsed !== true) {
    return false
  }
  if (raw.cardSectionExpanded !== undefined && parseCardSectionExpanded(raw.cardSectionExpanded) === undefined) {
    return false
  }
  if (raw.cardSectionOrder !== undefined && parseCardSectionOrder(raw.cardSectionOrder) === undefined) {
    return false
  }
  const layout =
    raw.cardBodyLayout !== undefined ? parseCardBodyLayout(raw.cardBodyLayout) : ('freeform' as const)
  if (raw.cardBodyLayout !== undefined && layout === undefined) {
    return false
  }
  if (raw.sceneHidden !== undefined && raw.sceneHidden !== true) {
    return false
  }
  if (raw.branchForceVisible !== undefined && raw.branchForceVisible !== true) {
    return false
  }
  if (raw.displayLabel !== undefined && typeof raw.displayLabel !== 'string') {
    return false
  }
  if (raw.bodyColor !== undefined && typeof raw.bodyColor !== 'string') {
    return false
  }
  if (raw.bodyColorEnabled !== undefined && typeof raw.bodyColorEnabled !== 'boolean') {
    return false
  }
  if (raw.locked !== undefined && raw.locked !== true) {
    return false
  }
  if (raw.blockViewActive !== undefined && raw.blockViewActive !== true) {
    return false
  }
  if (raw.groupViewActive !== undefined && raw.groupViewActive !== true) {
    return false
  }
  if (raw.structureCardWidth !== undefined && typeof raw.structureCardWidth !== 'number') {
    return false
  }
  return true
}

export function presentationEntryFromRawLayout(raw: unknown): CanvasNodePresentationEntry | null {
  if (!isValidPresentationEntry(raw)) {
    if (!isRecord(raw) || !isRecord(raw.position)) {
      return null
    }
    if (typeof raw.position.x !== 'number' || typeof raw.position.y !== 'number') {
      return null
    }
    const cardBodyLayout = parseCardBodyLayout(raw.cardBodyLayout) ?? 'freeform'
    return {
      position: { x: raw.position.x, y: raw.position.y },
      ...(raw.bodyCollapsed === true ? { bodyCollapsed: true } : {}),
      ...(parseCardSectionExpanded(raw.cardSectionExpanded)
        ? { cardSectionExpanded: parseCardSectionExpanded(raw.cardSectionExpanded) }
        : {}),
      ...(parseCardSectionOrder(raw.cardSectionOrder)
        ? { cardSectionOrder: parseCardSectionOrder(raw.cardSectionOrder) }
        : {}),
      cardBodyLayout,
      ...(raw.sceneHidden === true ? { sceneHidden: true } : {}),
      ...(raw.branchForceVisible === true ? { branchForceVisible: true } : {}),
      ...(typeof raw.displayLabel === 'string' ? { displayLabel: raw.displayLabel } : {}),
      ...(typeof raw.bodyColor === 'string' ? { bodyColor: raw.bodyColor } : {}),
      ...(raw.bodyColorEnabled === false
        ? { bodyColorEnabled: false }
        : raw.bodyColorEnabled === true
          ? { bodyColorEnabled: true }
          : {}),
      ...(raw.locked === true ? { locked: true } : {}),
      ...(raw.blockViewActive === true ? { blockViewActive: true } : {}),
      ...(raw.groupViewActive === true ? { groupViewActive: true } : {}),
      ...(raw.structureCardParamsExpanded === true ? { structureCardParamsExpanded: true } : {}),
      ...(typeof raw.structureCardWidth === 'number' ? { structureCardWidth: raw.structureCardWidth } : {}),
    }
  }
  return {
    ...raw,
    cardBodyLayout: resolveCardBodyLayoutFromEntry(raw),
  }
}

export function parseSceneCamera(raw: unknown): SceneCamera | undefined {
  if (
    !isRecord(raw) ||
    !isRecord(raw.pan) ||
    typeof raw.pan.x !== 'number' ||
    typeof raw.pan.y !== 'number' ||
    typeof raw.scale !== 'number'
  ) {
    return undefined
  }
  return {
    pan: { x: raw.pan.x, y: raw.pan.y },
    scale: raw.scale,
  }
}
