import type { CanvasNode, CanvasScene } from './canvasScene'
import type { LabelParameterEntry, LabelStructurePayload } from './labelSchema'

export type StoredLabelParameterEntry = {
  parameterId: string
  hiddenInParent?: boolean
}

/** Entrada no array `labels` do documento de cena v2. */
export type StoredSceneLabelEntry = {
  nodeId: string
  labelName: string
  color: string
  parentBlockNodeId: string
  catalogBlockType?: string
  viewActive?: boolean
  parameters: StoredLabelParameterEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function runtimeParameterToStored(entry: LabelParameterEntry): StoredLabelParameterEntry {
  return {
    parameterId: entry.parameterId,
    ...(entry.hiddenInParent ? { hiddenInParent: true } : {}),
  }
}

function storedParameterToRuntime(entry: StoredLabelParameterEntry): LabelParameterEntry {
  return {
    parameterId: entry.parameterId,
    ...(entry.hiddenInParent ? { hiddenInParent: true } : {}),
  }
}

export function extractSceneLabelsFromCanvas(scene: CanvasScene): StoredSceneLabelEntry[] {
  const labels: StoredSceneLabelEntry[] = []

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.labelStructure) {
      continue
    }

    const structure = canvasNode.labelStructure
    labels.push({
      nodeId: canvasNode.id,
      labelName: structure.labelName,
      color: structure.color,
      parentBlockNodeId: structure.parentBlockNodeId,
      ...(structure.catalogBlockType?.trim()
        ? { catalogBlockType: structure.catalogBlockType.trim() }
        : {}),
      ...(canvasNode.labelViewActive === false ? { viewActive: false } : {}),
      parameters: structure.parameters.map(runtimeParameterToStored),
    })
  }

  return labels
}

function parseStoredLabelParameterEntry(raw: unknown): StoredLabelParameterEntry | null {
  if (!isRecord(raw) || typeof raw.parameterId !== 'string' || !raw.parameterId.trim()) {
    return null
  }
  if (raw.hiddenInParent !== undefined && raw.hiddenInParent !== true) {
    return null
  }
  return {
    parameterId: raw.parameterId.trim(),
    ...(raw.hiddenInParent === true ? { hiddenInParent: true } : {}),
  }
}

export function parseSceneLabels(raw: unknown): StoredSceneLabelEntry[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }

  const labels: StoredSceneLabelEntry[] = []
  const seenNodeIds = new Set<string>()

  for (const item of raw) {
    if (!isRecord(item) || typeof item.nodeId !== 'string') {
      return null
    }
    if (seenNodeIds.has(item.nodeId)) {
      return null
    }
    seenNodeIds.add(item.nodeId)

    if (
      typeof item.labelName !== 'string' ||
      typeof item.color !== 'string' ||
      typeof item.parentBlockNodeId !== 'string' ||
      !Array.isArray(item.parameters)
    ) {
      return null
    }

    if (item.viewActive !== undefined && item.viewActive !== false && item.viewActive !== true) {
      return null
    }

    if (item.catalogBlockType !== undefined && typeof item.catalogBlockType !== 'string') {
      return null
    }

    const parameters: StoredLabelParameterEntry[] = []
    for (const paramRaw of item.parameters) {
      const param = parseStoredLabelParameterEntry(paramRaw)
      if (!param) {
        return null
      }
      parameters.push(param)
    }

    labels.push({
      nodeId: item.nodeId,
      labelName: item.labelName,
      color: item.color,
      parentBlockNodeId: item.parentBlockNodeId,
      ...(typeof item.catalogBlockType === 'string' && item.catalogBlockType.trim()
        ? { catalogBlockType: item.catalogBlockType.trim() }
        : {}),
      ...(item.viewActive === false ? { viewActive: false } : {}),
      parameters,
    })
  }

  return labels
}

export function hydrateLabelStructureFromStored(stored: StoredSceneLabelEntry): LabelStructurePayload {
  return {
    labelName: stored.labelName,
    color: stored.color,
    parentBlockNodeId: stored.parentBlockNodeId,
    ...(stored.catalogBlockType?.trim() ? { catalogBlockType: stored.catalogBlockType.trim() } : {}),
    parameters: stored.parameters.map(storedParameterToRuntime),
  }
}

export function applySceneLabelsToCanvas(
  scene: CanvasScene,
  labels: readonly StoredSceneLabelEntry[],
): CanvasScene | null {
  if (labels.length === 0) {
    return scene
  }

  const nodeIds = new Set(scene.nodes.map((node) => node.id))
  const labelByNodeId = new Map(labels.map((entry) => [entry.nodeId, entry]))

  for (const label of labels) {
    if (!nodeIds.has(label.nodeId)) {
      return null
    }
  }

  const nodes = scene.nodes.map((canvasNode) => {
    const stored = labelByNodeId.get(canvasNode.id)
    if (!stored) {
      return canvasNode
    }

    return {
      ...canvasNode,
      labelStructure: hydrateLabelStructureFromStored(stored),
      labelViewActive: stored.viewActive !== false,
    }
  })

  return { ...scene, nodes }
}

export function findLabelNodesForParent(
  scene: CanvasScene,
  parentBlockNodeId: string,
): CanvasNode[] {
  return scene.nodes.filter(
    (node) =>
      node.labelViewActive &&
      node.labelStructure?.parentBlockNodeId === parentBlockNodeId,
  )
}
