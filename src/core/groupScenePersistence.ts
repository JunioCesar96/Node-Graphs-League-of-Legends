import type { CanvasNode, CanvasScene } from './canvasScene'
import type {
  GroupParameterDef,
  GroupParameterSourcePath,
  GroupSlotRules,
  GroupStructurePayload,
} from './groupSchema'
import { isGroupTokenValue } from './groupSchema'
import { resolveGroupIconHint } from './groupInspectorUi'
import {
  nodeParameterValue,
  resolveGroupParameterValue,
} from './groupTokenCodegen'
import { groupTokenFromParameterDef, parseGroupToken } from './groupTokenParser'
import type { NodeInstance, NodeParameterDefinition, NodeSchemaDefinition } from './nodeSchema'
import { populatedSlotsForPointer } from './pointerSlots'

/** Referência mínima parâmetro Grupo → parâmetro ritual (formato JSON de cena). */
export type StoredGroupParameterSource =
  | { kind: 'parameter'; parameterId: string }
  | { kind: 'embedChild'; embedId: string; slotId: string; parameterId: string }
  | { kind: 'pointerChild'; pointerId: string; slotId: string }

export type StoredGroupParameterRef = {
  id: string
  source: StoredGroupParameterSource
  name?: string
  slots?: { out?: string[]; in?: string[] }
  iconId?: string
}

/** Entrada no array `groups` do documento de cena v2. */
export type StoredSceneGroupEntry = {
  nodeId: string
  type: string
  name: string
  viewActive?: boolean
  parameters: StoredGroupParameterRef[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ritualTypeFromNodeDataType(type: NodeParameterDefinition['type']): string {
  switch (type) {
    case 'vector4':
      return 'vec4'
    case 'vector3':
      return 'vec3'
    case 'vector2':
      return 'vec2'
    case 'boolean':
      return 'bool'
    case 'number':
      return 'f32'
    case 'string':
      return 'string'
    default:
      return type
  }
}

function storedSourceFromRuntime(source: GroupParameterSourcePath): StoredGroupParameterSource {
  if (source.kind === 'parameter') {
    return { kind: 'parameter', parameterId: source.parameterId }
  }
  if (source.kind === 'pointerChild') {
    return { kind: 'pointerChild', pointerId: source.pointerId, slotId: source.slotId }
  }
  return {
    kind: 'embedChild',
    embedId: source.embedId,
    slotId: source.slotId,
    parameterId: source.childParameterId,
  }
}

function runtimeSourceFromStored(source: StoredGroupParameterSource): GroupParameterSourcePath {
  if (source.kind === 'parameter') {
    return { kind: 'parameter', parameterId: source.parameterId }
  }
  if (source.kind === 'pointerChild') {
    return { kind: 'pointerChild', pointerId: source.pointerId, slotId: source.slotId }
  }
  return {
    kind: 'embedChild',
    embedId: source.embedId,
    slotId: source.slotId,
    childParameterId: source.parameterId,
  }
}

function storedSlotsFromRules(slotRules?: GroupSlotRules): StoredGroupParameterRef['slots'] | undefined {
  if (!slotRules?.outputs?.length && !slotRules?.inputs?.length) {
    return undefined
  }
  return {
    ...(slotRules.outputs?.length ? { out: [...slotRules.outputs] } : {}),
    ...(slotRules.inputs?.length ? { in: [...slotRules.inputs] } : {}),
  }
}

function slotRulesFromStored(slots?: StoredGroupParameterRef['slots']): GroupSlotRules | undefined {
  if (!slots?.out?.length && !slots?.in?.length) {
    return undefined
  }
  return {
    ...(slots.out?.length ? { outputs: [...slots.out] } : {}),
    ...(slots.in?.length ? { inputs: [...slots.in] } : {}),
  }
}

function runtimeParameterToStored(param: GroupParameterDef): StoredGroupParameterRef {
  const slots = storedSlotsFromRules(param.slotRules)
  return {
    id: param.idParameter,
    source: storedSourceFromRuntime(param.sourcePath),
    ...(param.nameParameter ? { name: param.nameParameter } : {}),
    ...(slots ? { slots } : {}),
    ...(param.iconId ? { iconId: param.iconId } : {}),
  }
}

function findPointerSlot(
  schema: NodeSchemaDefinition,
  pointerId: string,
  slotId: string,
) {
  const pointer = schema.pointer?.find((entry) => entry.id === pointerId)
  if (!pointer) {
    return null
  }
  return (
    populatedSlotsForPointer(pointer).find((entry) => entry.id === slotId) ??
    pointer.internalStructures.find((entry) => entry.id === slotId) ??
    populatedSlotsForPointer(pointer)[0] ??
    pointer.internalStructures[0] ??
    null
  )
}

function resolveRitualTypeFromSource(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  source: StoredGroupParameterSource,
): string {
  if (source.kind === 'parameter') {
    const parameter = canvasNode.node.schema.parameters.find((entry) => entry.id === source.parameterId)
    if (!parameter) {
      return 'string'
    }
    const raw = nodeParameterValue(canvasNode.node, source.parameterId)
    const parsed = parseGroupToken(raw)
    if (parsed) {
      return parsed.typeParameter
    }
    return ritualTypeFromNodeDataType(parameter.type)
  }

  if (source.kind === 'pointerChild') {
    return findPointerSlot(canvasNode.node.schema, source.pointerId, source.slotId)?.name ?? 'pointer'
  }

  const connection = scene.connections.find(
    (entry) =>
      entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === source.slotId,
  )
  if (!connection) {
    return 'string'
  }
  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child) {
    return 'string'
  }
  const parameter = child.node.schema.parameters.find((entry) => entry.id === source.parameterId)
  if (!parameter) {
    return 'string'
  }
  const raw = nodeParameterValue(child.node, source.parameterId)
  const parsed = parseGroupToken(raw)
  if (parsed) {
    return parsed.typeParameter
  }
  return ritualTypeFromNodeDataType(parameter.type)
}

function findTokenInNodeValues(node: NodeInstance, idParameter: string): string | null {
  for (const entry of node.values) {
    if (isGroupTokenValue(entry.value)) {
      const parsed = parseGroupToken(entry.value)
      if (parsed?.idParameter === idParameter) {
        return entry.value
      }
    }
  }
  return null
}

function findTokenForGroupParameter(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  source: StoredGroupParameterSource,
  idParameter: string,
): string | null {
  if (source.kind === 'parameter') {
    const raw = nodeParameterValue(canvasNode.node, source.parameterId)
    if (isGroupTokenValue(raw)) {
      const parsed = parseGroupToken(raw)
      if (parsed?.idParameter === idParameter) {
        return raw
      }
    }
    return findTokenInNodeValues(canvasNode.node, idParameter)
  }

  if (source.kind === 'pointerChild') {
    return null
  }

  const connection = scene.connections.find(
    (entry) =>
      entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === source.slotId,
  )
  if (!connection) {
    return null
  }
  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child) {
    return null
  }
  const raw = nodeParameterValue(child.node, source.parameterId)
  if (isGroupTokenValue(raw)) {
    const parsed = parseGroupToken(raw)
    if (parsed?.idParameter === idParameter) {
      return raw
    }
  }
  return findTokenInNodeValues(child.node, idParameter)
}

function resolveRitualNameFromSource(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  source: StoredGroupParameterSource,
): string {
  if (source.kind === 'parameter') {
    return (
      canvasNode.node.schema.parameters.find((entry) => entry.id === source.parameterId)?.name ??
      source.parameterId
    )
  }

  if (source.kind === 'pointerChild') {
    return (
      findPointerSlot(canvasNode.node.schema, source.pointerId, source.slotId)?.name ??
      source.pointerId
    )
  }

  const connection = scene.connections.find(
    (entry) =>
      entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === source.slotId,
  )
  if (!connection) {
    return source.parameterId
  }
  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child) {
    return source.parameterId
  }
  return (
    child.node.schema.parameters.find((entry) => entry.id === source.parameterId)?.name ??
    source.parameterId
  )
}

function sourceExistsOnNode(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  source: StoredGroupParameterSource,
): boolean {
  if (source.kind === 'parameter') {
    return canvasNode.node.schema.parameters.some((entry) => entry.id === source.parameterId)
  }

  if (source.kind === 'pointerChild') {
    return findPointerSlot(canvasNode.node.schema, source.pointerId, source.slotId) !== null
  }

  const embed = canvasNode.node.schema.embed?.find((entry) => entry.id === source.embedId)
  if (!embed) {
    return false
  }
  const slot =
    embed.slots?.find((entry) => entry.id === source.slotId) ??
    embed.internalStructures.find((entry) => entry.id === source.slotId)
  if (!slot) {
    return false
  }

  const connection = scene.connections.find(
    (entry) =>
      entry.fromNodeId === canvasNode.id && entry.fromInternalStructureId === source.slotId,
  )
  if (!connection) {
    return false
  }
  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child) {
    return false
  }
  return child.node.schema.parameters.some((entry) => entry.id === source.parameterId)
}

export function extractSceneGroupsFromCanvas(scene: CanvasScene): StoredSceneGroupEntry[] {
  const groups: StoredSceneGroupEntry[] = []

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.groupStructure) {
      continue
    }

    const structure = canvasNode.groupStructure
    groups.push({
      nodeId: canvasNode.id,
      type: structure.groupType,
      name: structure.groupName,
      ...(canvasNode.groupViewActive === false ? { viewActive: false } : {}),
      parameters: structure.parameters.map(runtimeParameterToStored),
    })
  }

  return groups
}

function parseStoredGroupParameterSource(raw: unknown): StoredGroupParameterSource | null {
  if (!isRecord(raw) || typeof raw.kind !== 'string') {
    return null
  }

  if (raw.kind === 'parameter') {
    if (typeof raw.parameterId !== 'string') {
      return null
    }
    return { kind: 'parameter', parameterId: raw.parameterId }
  }

  if (raw.kind === 'embedChild') {
    if (
      typeof raw.embedId !== 'string' ||
      typeof raw.slotId !== 'string' ||
      typeof raw.parameterId !== 'string'
    ) {
      return null
    }
    return {
      kind: 'embedChild',
      embedId: raw.embedId,
      slotId: raw.slotId,
      parameterId: raw.parameterId,
    }
  }

  if (raw.kind === 'pointerChild') {
    if (typeof raw.pointerId !== 'string' || typeof raw.slotId !== 'string') {
      return null
    }
    return {
      kind: 'pointerChild',
      pointerId: raw.pointerId,
      slotId: raw.slotId,
    }
  }

  return null
}

function parseStoredGroupParameterRef(raw: unknown): StoredGroupParameterRef | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') {
    return null
  }

  const source = parseStoredGroupParameterSource(raw.source)
  if (!source) {
    return null
  }

  if (raw.name !== undefined && typeof raw.name !== 'string') {
    return null
  }

  let slots: StoredGroupParameterRef['slots']
  if (raw.slots !== undefined) {
    if (!isRecord(raw.slots)) {
      return null
    }
    const outRaw = raw.slots.out
    const inRaw = raw.slots.in
    if (outRaw !== undefined && (!Array.isArray(outRaw) || !outRaw.every((item) => typeof item === 'string'))) {
      return null
    }
    if (inRaw !== undefined && (!Array.isArray(inRaw) || !inRaw.every((item) => typeof item === 'string'))) {
      return null
    }
    slots = {
      ...(outRaw?.length ? { out: outRaw as string[] } : {}),
      ...(inRaw?.length ? { in: inRaw as string[] } : {}),
    }
  }

  if (raw.iconId !== undefined && typeof raw.iconId !== 'string') {
    return null
  }

  return {
    id: raw.id,
    source,
    ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
    ...(slots ? { slots } : {}),
    ...(typeof raw.iconId === 'string' ? { iconId: raw.iconId } : {}),
  }
}

export function parseSceneGroups(raw: unknown): StoredSceneGroupEntry[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }

  const groups: StoredSceneGroupEntry[] = []
  const seenNodeIds = new Set<string>()

  for (const item of raw) {
    if (!isRecord(item) || typeof item.nodeId !== 'string') {
      return null
    }
    if (seenNodeIds.has(item.nodeId)) {
      return null
    }
    seenNodeIds.add(item.nodeId)

    if (typeof item.type !== 'string' || typeof item.name !== 'string' || !Array.isArray(item.parameters)) {
      return null
    }

    if (item.viewActive !== undefined && item.viewActive !== false && item.viewActive !== true) {
      return null
    }

    const parameters: StoredGroupParameterRef[] = []
    for (const paramRaw of item.parameters) {
      const param = parseStoredGroupParameterRef(paramRaw)
      if (!param) {
        return null
      }
      parameters.push(param)
    }

    groups.push({
      nodeId: item.nodeId,
      type: item.type,
      name: item.name,
      ...(item.viewActive === false ? { viewActive: false } : {}),
      parameters,
    })
  }

  return groups
}

export function hydrateGroupStructureFromStored(
  stored: StoredSceneGroupEntry,
  scene: CanvasScene,
  canvasNode: CanvasNode,
): GroupStructurePayload | null {
  const parameters: GroupParameterDef[] = []
  const identification_codes: string[] = []

  for (const ref of stored.parameters) {
    if (!sourceExistsOnNode(scene, canvasNode, ref.source)) {
      return null
    }

    const sourcePath = runtimeSourceFromStored(ref.source)
    const typeParameter = resolveRitualTypeFromSource(scene, canvasNode, ref.source)
    const defaultValue = resolveGroupParameterValue(scene, canvasNode, sourcePath)
    const ritualName = resolveRitualNameFromSource(scene, canvasNode, ref.source)
    const iconId = ref.iconId?.trim() ?? ''
    const isPointer = ref.source.kind === 'pointerChild'
    const slotRules = isPointer
      ? { inputs: [ref.name ?? ritualName] }
      : slotRulesFromStored(ref.slots)

    const param: GroupParameterDef = {
      idParameter: ref.id,
      nameParameter: ref.name ?? ritualName,
      typeParameter,
      defaultValue,
      ...(slotRules ? { slotRules } : {}),
      iconHint: resolveGroupIconHint(iconId),
      ...(iconId ? { iconId } : {}),
      sourcePath,
    }

    parameters.push(param)

    const existingToken = findTokenForGroupParameter(scene, canvasNode, ref.source, ref.id)
    identification_codes.push(
      existingToken ?? groupTokenFromParameterDef(stored.type, stored.name, param),
    )
  }

  return {
    groupType: stored.type,
    groupName: stored.name,
    parameters,
    identification_codes,
  }
}

export function applySceneGroupsToCanvas(
  scene: CanvasScene,
  groups: readonly StoredSceneGroupEntry[],
): CanvasScene | null {
  if (groups.length === 0) {
    return scene
  }

  const nodeIds = new Set(scene.nodes.map((node) => node.id))
  const groupByNodeId = new Map(groups.map((entry) => [entry.nodeId, entry]))

  for (const group of groups) {
    if (!nodeIds.has(group.nodeId)) {
      return null
    }
  }

  const nodes = scene.nodes.map((canvasNode) => {
    const stored = groupByNodeId.get(canvasNode.id)
    if (!stored) {
      return canvasNode
    }

    const structure = hydrateGroupStructureFromStored(stored, scene, canvasNode)
    if (!structure) {
      return canvasNode
    }

    return {
      ...canvasNode,
      groupStructure: structure,
      groupViewActive: stored.viewActive !== false,
    }
  })

  return { ...scene, nodes }
}
