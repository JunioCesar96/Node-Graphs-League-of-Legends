import type { CanvasNode, CanvasScene } from './canvasScene'
import {
  normalizeBlockHeaderSlots,
  resolveBlockHeaderSlotsForStructure,
} from './blockCardHeaderSlots'
import type {
  BlockParameterDef,
  BlockParameterSourcePath,
  BlockSlotRules,
  BlockStructureAppearance,
  BlockStructurePayload,
} from './blockSchema'
import { isBlockTokenValue } from './blockSchema'
import { resolveBlockIconHint } from './blockInspectorUi'
import { blockDefinitionByBlockName } from './blockDefinitionRegistry'
import { blockTypeDefinitionById } from './blockStructureRegistry'
import {
  nodeParameterValue,
  resolveBlockParameterValue,
} from './blockTokenCodegen'
import { blockTokenFromParameterDef, parseBlockToken } from './blockTokenParser'
import type { NodeInstance, NodeParameterDefinition, NodeSchemaDefinition } from './nodeSchema'
import { populatedSlotsForPointer } from './pointerSlots'

/** Referência mínima parâmetro bloco → parâmetro ritual (formato JSON de cena). */
export type StoredBlockParameterSource =
  | { kind: 'parameter'; parameterId: string }
  | { kind: 'embedChild'; embedId: string; slotId: string; parameterId: string }
  | { kind: 'pointerChild'; pointerId: string; slotId: string }

export type StoredBlockParameterRef = {
  id: string
  source: StoredBlockParameterSource
  name?: string
  slots?: { out?: string[]; in?: string[] }
  iconId?: string
  listParameter?: boolean
}

export type StoredSceneBlockAppearance = {
  color?: string
  headerSlots?: string[]
  parentBlockField?: string
}

/** Entrada no array `blocks` do documento de cena v2. */
export type StoredSceneBlockEntry = {
  nodeId: string
  type: string
  name: string
  viewActive?: boolean
  appearance?: StoredSceneBlockAppearance
  parameters: StoredBlockParameterRef[]
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

function storedSourceFromRuntime(source: BlockParameterSourcePath): StoredBlockParameterSource {
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

function runtimeSourceFromStored(source: StoredBlockParameterSource): BlockParameterSourcePath {
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

function storedSlotsFromRules(slotRules?: BlockSlotRules): StoredBlockParameterRef['slots'] | undefined {
  if (!slotRules?.outputs?.length && !slotRules?.inputs?.length) {
    return undefined
  }
  return {
    ...(slotRules.outputs?.length ? { out: [...slotRules.outputs] } : {}),
    ...(slotRules.inputs?.length ? { in: [...slotRules.inputs] } : {}),
  }
}

function slotRulesForStoredParameterRef(
  ref: StoredBlockParameterRef,
  ritualName: string,
): BlockSlotRules | undefined {
  const fromStored = slotRulesFromStored(ref.slots)
  if (ref.source.kind !== 'pointerChild') {
    return fromStored
  }

  const outputs = fromStored?.outputs
  const inputs = fromStored?.inputs?.length ? fromStored.inputs : [ref.name ?? ritualName]
  if (!outputs?.length && inputs.length === 0) {
    return undefined
  }

  return {
    ...(outputs?.length ? { outputs } : {}),
    inputs,
  }
}

function slotRulesFromStored(slots?: StoredBlockParameterRef['slots']): BlockSlotRules | undefined {
  if (!slots?.out?.length && !slots?.in?.length) {
    return undefined
  }
  return {
    ...(slots.out?.length ? { outputs: [...slots.out] } : {}),
    ...(slots.in?.length ? { inputs: [...slots.in] } : {}),
  }
}

function runtimeParameterToStored(param: BlockParameterDef): StoredBlockParameterRef {
  const slots = storedSlotsFromRules(param.slotRules)
  return {
    id: param.idParameter,
    source: storedSourceFromRuntime(param.sourcePath),
    ...(param.nameParameter ? { name: param.nameParameter } : {}),
    ...(slots ? { slots } : {}),
    ...(param.iconId ? { iconId: param.iconId } : {}),
    ...(param.listParameter ? { listParameter: true } : {}),
  }
}

function resolveStoredBlockDefinition(
  entry: Pick<StoredSceneBlockEntry, 'type' | 'name'>,
): ReturnType<typeof blockDefinitionByBlockName> {
  return blockDefinitionByBlockName(entry.name) ?? blockDefinitionByBlockName(entry.type)
}

function storedAppearanceFromStructure(
  structure: BlockStructurePayload,
): StoredSceneBlockAppearance | undefined {
  const headerSlots = resolveBlockHeaderSlotsForStructure(structure)
  const definition =
    blockDefinitionByBlockName(structure.blockName) ?? blockDefinitionByBlockName(structure.blockType)
  const registry = blockTypeDefinitionById(structure.blockType)
  const color =
    structure.appearance?.color?.trim() || definition?.color?.trim() || registry?.color?.trim()
  const parentBlockField = structure.appearance?.parentBlockField?.trim()

  if (!headerSlots.length && !color && !parentBlockField) {
    return undefined
  }

  return {
    ...(color ? { color } : {}),
    ...(headerSlots.length ? { headerSlots } : {}),
    ...(parentBlockField ? { parentBlockField } : {}),
  }
}

function parseStoredSceneBlockAppearance(raw: unknown): StoredSceneBlockAppearance | undefined {
  if (!isRecord(raw)) {
    return undefined
  }

  const color = typeof raw.color === 'string' && raw.color.trim() ? raw.color.trim() : undefined
  const parentBlockField =
    typeof raw.parentBlockField === 'string' && raw.parentBlockField.trim()
      ? raw.parentBlockField.trim()
      : undefined

  let headerSlots: string[] | undefined
  if (Array.isArray(raw.headerSlots)) {
    const parsed = raw.headerSlots
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
    headerSlots = parsed.length > 0 ? parsed : undefined
  }

  if (!color && !parentBlockField && !headerSlots?.length) {
    return undefined
  }

  return {
    ...(color ? { color } : {}),
    ...(headerSlots ? { headerSlots } : {}),
    ...(parentBlockField ? { parentBlockField } : {}),
  }
}

function appearancePayloadFromStored(stored: StoredSceneBlockEntry): BlockStructureAppearance | undefined {
  const definition = resolveStoredBlockDefinition(stored)
  const registry = blockTypeDefinitionById(stored.type)
  const headerSlots = stored.appearance?.headerSlots?.length
    ? normalizeBlockHeaderSlots(stored.appearance.headerSlots)
    : definition?.headerSlots?.length
      ? normalizeBlockHeaderSlots(definition.headerSlots)
      : registry?.headerSlots?.length
        ? normalizeBlockHeaderSlots(registry.headerSlots)
        : []

  const color =
    stored.appearance?.color?.trim() ||
    definition?.color?.trim() ||
    registry?.color?.trim() ||
    '#40ff56'
  const parentBlockField = stored.appearance?.parentBlockField?.trim()

  if (!headerSlots.length && !stored.appearance) {
    return undefined
  }

  return {
    color,
    headerSlots,
    ...(parentBlockField ? { parentBlockField } : {}),
  }
}

function mergeRestoredBlockStructure(
  hydrated: BlockStructurePayload,
  preserved?: BlockStructurePayload,
): BlockStructurePayload {
  if (!preserved) {
    return hydrated
  }

  const mergedParameters = hydrated.parameters.map((param) => {
    const preservedParam = preserved.parameters.find(
      (entry) => entry.idParameter === param.idParameter,
    )
    if (!preservedParam) {
      return param
    }

    return {
      ...param,
      ...(param.slotRules || preservedParam.slotRules
        ? { slotRules: param.slotRules ?? preservedParam.slotRules }
        : {}),
      ...(param.listParameter || preservedParam.listParameter
        ? { listParameter: param.listParameter ?? preservedParam.listParameter }
        : {}),
    }
  })

  const appearance = hydrated.appearance ?? preserved.appearance

  return {
    ...hydrated,
    parameters: mergedParameters,
    ...(appearance ? { appearance: structuredClone(appearance) } : {}),
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
  source: StoredBlockParameterSource,
): string {
  if (source.kind === 'parameter') {
    const raw = nodeParameterValue(canvasNode.node, source.parameterId)
    const parsed = parseBlockToken(raw)
    if (parsed) {
      return parsed.typeParameter
    }
    const parameter = canvasNode.node.schema.parameters.find((entry) => entry.id === source.parameterId)
    if (!parameter) {
      return 'string'
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
  const parsed = parseBlockToken(raw)
  if (parsed) {
    return parsed.typeParameter
  }
  return ritualTypeFromNodeDataType(parameter.type)
}

function findTokenInNodeValues(node: NodeInstance, idParameter: string): string | null {
  for (const entry of node.values) {
    if (isBlockTokenValue(entry.value)) {
      const parsed = parseBlockToken(entry.value)
      if (parsed?.idParameter === idParameter) {
        return entry.value
      }
    }
  }
  return null
}

function findTokenForBlockParameter(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  source: StoredBlockParameterSource,
  idParameter: string,
): string | null {
  if (source.kind === 'parameter') {
    const raw = nodeParameterValue(canvasNode.node, source.parameterId)
    if (isBlockTokenValue(raw)) {
      const parsed = parseBlockToken(raw)
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
  if (isBlockTokenValue(raw)) {
    const parsed = parseBlockToken(raw)
    if (parsed?.idParameter === idParameter) {
      return raw
    }
  }
  return findTokenInNodeValues(child.node, idParameter)
}

function resolveRitualNameFromSource(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  source: StoredBlockParameterSource,
): string {
  if (source.kind === 'parameter') {
    const raw = nodeParameterValue(canvasNode.node, source.parameterId)
    const parsed = parseBlockToken(raw)
    if (parsed?.nameParameter) {
      return parsed.nameParameter
    }
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
  source: StoredBlockParameterSource,
): boolean {
  if (source.kind === 'parameter') {
    return (
      canvasNode.node.schema.parameters.some((entry) => entry.id === source.parameterId) ||
      canvasNode.node.values.some((entry) => entry.parameterId === source.parameterId)
    )
  }

  if (source.kind === 'pointerChild') {
    if (source.pointerId.startsWith('catalog-ptr-')) {
      return true
    }
    return findPointerSlot(canvasNode.node.schema, source.pointerId, source.slotId) !== null
  }

  if (source.kind === 'embedChild' && source.embedId.startsWith('catalog-embed-')) {
    return true
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

export function extractSceneBlocksFromCanvas(scene: CanvasScene): StoredSceneBlockEntry[] {
  const blocks: StoredSceneBlockEntry[] = []

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.blockStructure) {
      continue
    }

    const structure = canvasNode.blockStructure
    const appearance = storedAppearanceFromStructure(structure)
    blocks.push({
      nodeId: canvasNode.id,
      type: structure.blockType,
      name: structure.blockName,
      ...(canvasNode.blockViewActive === false ? { viewActive: false } : {}),
      ...(appearance ? { appearance } : {}),
      parameters: structure.parameters.map(runtimeParameterToStored),
    })
  }

  return blocks
}

function parseStoredBlockParameterSource(raw: unknown): StoredBlockParameterSource | null {
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

function parseStoredBlockParameterRef(raw: unknown): StoredBlockParameterRef | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') {
    return null
  }

  const source = parseStoredBlockParameterSource(raw.source)
  if (!source) {
    return null
  }

  if (raw.name !== undefined && typeof raw.name !== 'string') {
    return null
  }

  let slots: StoredBlockParameterRef['slots']
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

  if (raw.listParameter !== undefined && raw.listParameter !== true) {
    return null
  }

  return {
    id: raw.id,
    source,
    ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
    ...(slots ? { slots } : {}),
    ...(typeof raw.iconId === 'string' ? { iconId: raw.iconId } : {}),
    ...(raw.listParameter === true ? { listParameter: true } : {}),
  }
}

export function parseSceneBlocks(raw: unknown): StoredSceneBlockEntry[] | null {
  if (raw === undefined) {
    return []
  }
  if (!Array.isArray(raw)) {
    return null
  }

  const blocks: StoredSceneBlockEntry[] = []
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

    const parameters: StoredBlockParameterRef[] = []
    for (const paramRaw of item.parameters) {
      const param = parseStoredBlockParameterRef(paramRaw)
      if (!param) {
        return null
      }
      parameters.push(param)
    }

    const appearance = parseStoredSceneBlockAppearance(item.appearance)

    blocks.push({
      nodeId: item.nodeId,
      type: item.type,
      name: item.name,
      ...(item.viewActive === false ? { viewActive: false } : {}),
      ...(appearance ? { appearance } : {}),
      parameters,
    })
  }

  return blocks
}

export function hydrateBlockStructureFromStored(
  stored: StoredSceneBlockEntry,
  scene: CanvasScene,
  canvasNode: CanvasNode,
): BlockStructurePayload | null {
  const parameters: BlockParameterDef[] = []
  const identification_codes: string[] = []

  for (const ref of stored.parameters) {
    if (!sourceExistsOnNode(scene, canvasNode, ref.source)) {
      return null
    }

    const sourcePath = runtimeSourceFromStored(ref.source)
    const typeParameter = resolveRitualTypeFromSource(scene, canvasNode, ref.source)
    const defaultValue = resolveBlockParameterValue(scene, canvasNode, sourcePath)
    const ritualName = resolveRitualNameFromSource(scene, canvasNode, ref.source)
    const iconId = ref.iconId?.trim() ?? ''
    const slotRules = slotRulesForStoredParameterRef(ref, ritualName)

    const param: BlockParameterDef = {
      idParameter: ref.id,
      nameParameter: ref.name ?? ritualName,
      typeParameter,
      defaultValue,
      ...(slotRules ? { slotRules } : {}),
      iconHint: resolveBlockIconHint(iconId),
      ...(iconId ? { iconId } : {}),
      ...(ref.listParameter ? { listParameter: true } : {}),
      sourcePath,
    }

    parameters.push(param)

    const existingToken = findTokenForBlockParameter(scene, canvasNode, ref.source, ref.id)
    identification_codes.push(
      existingToken ?? blockTokenFromParameterDef(stored.type, stored.name, param),
    )
  }

  const appearance = appearancePayloadFromStored(stored)

  return {
    blockType: stored.type,
    blockName: stored.name,
    parameters,
    identification_codes,
    ...(appearance ? { appearance } : {}),
  }
}

export function applySceneBlocksToCanvas(
  scene: CanvasScene,
  blocks: readonly StoredSceneBlockEntry[],
): CanvasScene | null {
  if (blocks.length === 0) {
    return scene
  }

  const nodeIds = new Set(scene.nodes.map((node) => node.id))
  const blockByNodeId = new Map(blocks.map((entry) => [entry.nodeId, entry]))

  for (const block of blocks) {
    if (!nodeIds.has(block.nodeId)) {
      return null
    }
  }

  const nodes = scene.nodes.map((canvasNode) => {
    const stored = blockByNodeId.get(canvasNode.id)
    if (!stored) {
      return canvasNode
    }

    const hydrated = hydrateBlockStructureFromStored(stored, scene, canvasNode)
    const structure = hydrated
      ? mergeRestoredBlockStructure(hydrated, canvasNode.blockStructure)
      : canvasNode.blockStructure

    if (!structure) {
      return canvasNode
    }

    return {
      ...canvasNode,
      blockStructure: structure,
      blockViewActive: stored.viewActive !== false,
    }
  })

  return { ...scene, nodes }
}
