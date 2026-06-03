import type { CanvasNode, CanvasScene } from './canvasScene'
import type { BlockInspectorDraftEntry } from './blockSchema'
import { parseListF32String } from './listF32Value'
import { parseListHashString } from './listHashValue'
import { parseListStringString } from './listStringValue'
import { parseListVector2String } from './listVector2Value'
import { parseListVector3String } from './listVector3Value'
import { parseListVector4String } from './listVector4Value'
import { formatVector2String } from './vector2Value'
import { formatVector3String } from './vector3Value'
import { formatVector4String } from './vector4Value'
import { hasMapHashStructure } from './mapHashStructureValue'
import { parseMapHashEmbedString } from './mapHashEmbedValue'
import { mapHashEmbedSlotId } from './mapHashEmbedSlots'
import { parseMapHashPointerString } from './mapHashPointerValue'
import { mapHashPointerSlotId } from './mapHashPointerSlots'
import { parseMapU64PointerString } from './mapU64PointerValue'
import { mapU64PointerSlotId } from './mapU64PointerSlots'
import type { NodeDataType, NodeParameterDefinition, NodeSchemaDefinition } from './nodeSchema'
import {
  parseOptionF32Items,
  parseOptionStringItems,
  parseOptionVector3Items,
} from './optionValue'

export type BlockParameterClassificationKind =
  | 'simple'
  | 'embed'
  | 'pointer'
  | 'map'
  | 'list'
  | 'option'

export type BlockParameterClassification = {
  kind: BlockParameterClassificationKind
  nodeDataType?: NodeDataType
  mapKind?: 'mapHashPointer' | 'mapHashEmbed' | 'mapU64Pointer'
}

export type BlockParameterMapEntry = {
  key: string
  target: string
}

const SIMPLE_NODE_DATA_TYPES = new Set<NodeDataType>([
  'keyword',
  'string',
  'comment',
  'property',
  'symbol',
  'integer',
  'i8',
  'u8',
  'i16',
  'u16',
  'i32',
  'u32',
  'i64',
  'u64',
  'f32',
  'float',
  'double',
  'vector2',
  'vector3',
  'vector4',
  'rgba',
  'mtx44',
  'link',
  'bool',
  'flag',
  'mapHashLink',
])

const LIST_NODE_DATA_TYPES = new Set<NodeDataType>([
  'listF32',
  'listString',
  'listHash',
  'listVector2',
  'listVector3',
  'listVector4',
])

const OPTION_NODE_DATA_TYPES = new Set<NodeDataType>([
  'optionF32',
  'optionString',
  'optionVector3',
])

const MAP_NODE_DATA_TYPES = new Set<NodeDataType>([
  'mapHashPointer',
  'mapHashEmbed',
  'mapU64Pointer',
])

export function isSimpleNodeDataType(type: NodeDataType): boolean {
  return SIMPLE_NODE_DATA_TYPES.has(type)
}

function parameterForEntry(
  canvasNode: CanvasNode,
  entry: BlockInspectorDraftEntry,
): NodeParameterDefinition | undefined {
  if (entry.sourcePath.kind !== 'parameter') {
    return undefined
  }
  return canvasNode.node.schema.parameters.find((p) => p.id === entry.sourcePath.parameterId)
}

export function classifyBlockParameterEntry(
  entry: BlockInspectorDraftEntry,
  canvasNode: CanvasNode,
): BlockParameterClassification {
  if (entry.sourcePath.kind === 'embedChild') {
    return { kind: 'embed' }
  }
  if (entry.sourcePath.kind === 'pointerChild') {
    return { kind: 'pointer' }
  }

  const parameter = parameterForEntry(canvasNode, entry)
  const nodeDataType = parameter?.type
  if (!nodeDataType) {
    return { kind: 'simple' }
  }

  if (MAP_NODE_DATA_TYPES.has(nodeDataType)) {
    return {
      kind: 'map',
      nodeDataType,
      mapKind: nodeDataType,
    }
  }
  if (LIST_NODE_DATA_TYPES.has(nodeDataType)) {
    return { kind: 'list', nodeDataType }
  }
  if (OPTION_NODE_DATA_TYPES.has(nodeDataType)) {
    return { kind: 'option', nodeDataType }
  }
  return { kind: 'simple', nodeDataType }
}

function nodeParameterValue(canvasNode: CanvasNode, parameterId: string, fallback = ''): string {
  return (
    canvasNode.node.values.find((entry) => entry.parameterId === parameterId)?.value ?? fallback
  )
}

function resolveSchemaTitle(
  schemaId: string,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): string | null {
  const trimmed = schemaId.trim()
  if (!trimmed) {
    return null
  }
  const fromRegistry = schemaRegistry?.[trimmed]
  if (fromRegistry) {
    const collectionType = fromRegistry.nomenclature?.collectionType?.trim()
    if (collectionType) {
      return collectionType
    }
    const title = fromRegistry.title.trim()
    if (title) {
      return title
    }
  }
  return null
}

export function connectedChildTitle(scene: CanvasScene, fromNodeId: string, slotId: string): string | null {
  const connection = scene.connections.find(
    (entry) => entry.fromNodeId === fromNodeId && entry.fromInternalStructureId === slotId,
  )
  if (!connection) {
    return null
  }
  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child) {
    return null
  }
  const title = child.node.schema.title.trim()
  return title || child.node.schema.nomenclature?.collectionType?.trim() || null
}

/** Tipo do nó filho ligado ao slot pointer (ex.: `VfxPrimitiveMesh`), não o nome do campo ritual. */
export function resolvePointerSlotTargetType(
  scene: CanvasScene,
  fromNodeId: string,
  slot: { id: string; name: string; schemaId: string },
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): string {
  const fromChild = connectedChildTitle(scene, fromNodeId, slot.id)
  if (fromChild) {
    return fromChild
  }
  return (resolveSchemaTitle(slot.schemaId, schemaRegistry) ?? slot.name.trim()) || ''
}

export function resolveEmbedTarget(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  entry: BlockInspectorDraftEntry,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): string | null {
  if (entry.sourcePath.kind !== 'embedChild') {
    return null
  }

  const fromChild = connectedChildTitle(scene, canvasNode.id, entry.sourcePath.slotId)
  if (fromChild) {
    return fromChild
  }

  const embed = canvasNode.node.schema.embed?.find((block) => block.id === entry.sourcePath.embedId)
  const slot =
    embed?.slots?.find((item) => item.id === entry.sourcePath.slotId) ??
    embed?.internalStructures.find((item) => item.id === entry.sourcePath.slotId)
  if (!slot) {
    return null
  }

  return (resolveSchemaTitle(slot.schemaId, schemaRegistry) ?? slot.name.trim()) || null
}

export function resolvePointerTarget(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  entry: BlockInspectorDraftEntry,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): string | null {
  if (entry.sourcePath.kind !== 'pointerChild') {
    return null
  }

  const fromChild = connectedChildTitle(scene, canvasNode.id, entry.sourcePath.slotId)
  if (fromChild) {
    return fromChild
  }

  const pointer = canvasNode.node.schema.pointer?.find(
    (block) => block.id === entry.sourcePath.pointerId,
  )
  const slot =
    pointer?.slots?.find((item) => item.id === entry.sourcePath.slotId) ??
    pointer?.internalStructures.find((item) => item.id === entry.sourcePath.slotId)
  if (slot) {
    return (resolveSchemaTitle(slot.schemaId, schemaRegistry) ?? slot.name.trim()) || null
  }

  const fallback = entry.typeParameter.trim() || entry.ritualName.trim() || entry.nameParameter.trim()
  return fallback || null
}

function resolveMapTargetForEntry(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameter: NodeParameterDefinition,
  key: string,
  fallbackTarget: string,
  slotIdFn: (parameterId: string, key: string) => string,
): string {
  const slotId = slotIdFn(parameter.id, key)
  return (connectedChildTitle(scene, canvasNode.id, slotId) ?? fallbackTarget.trim()) || key
}

export function resolveMapEntries(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  entry: BlockInspectorDraftEntry,
  mapKind: BlockParameterClassification['mapKind'],
): BlockParameterMapEntry[] {
  if (!mapKind || entry.sourcePath.kind !== 'parameter') {
    return []
  }

  const parameter = parameterForEntry(canvasNode, entry)
  if (!parameter || parameter.type !== mapKind) {
    return []
  }

  const raw = nodeParameterValue(canvasNode, parameter.id, parameter.defaultValue)

  if (mapKind === 'mapHashPointer') {
    return parseMapHashPointerString(raw)
      .filter((item) => hasMapHashStructure(item))
      .map((item) => ({
        key: item.key,
        target: resolveMapTargetForEntry(
          scene,
          canvasNode,
          parameter,
          item.key,
          item.typeName,
          mapHashPointerSlotId,
        ),
      }))
  }

  if (mapKind === 'mapHashEmbed') {
    return parseMapHashEmbedString(raw)
      .filter((item) => hasMapHashStructure(item))
      .map((item) => ({
        key: item.key,
        target: resolveMapTargetForEntry(
          scene,
          canvasNode,
          parameter,
          item.key,
          item.typeName,
          mapHashEmbedSlotId,
        ),
      }))
  }

  return parseMapU64PointerString(raw)
    .filter((item) => hasMapHashStructure(item))
    .map((item) => ({
      key: item.key,
      target: resolveMapTargetForEntry(
        scene,
        canvasNode,
        parameter,
        item.key,
        item.typeName,
        mapU64PointerSlotId,
      ),
    }))
}

export function parseListItems(nodeDataType: NodeDataType, raw: string): string[] {
  switch (nodeDataType) {
    case 'listF32':
      return parseListF32String(raw)
    case 'listString':
      return parseListStringString(raw)
    case 'listHash':
      return parseListHashString(raw)
    case 'listVector2':
      return parseListVector2String(raw).map((item) => formatVector2String(item))
    case 'listVector3':
      return parseListVector3String(raw).map((item) => formatVector3String(item))
    case 'listVector4':
      return parseListVector4String(raw).map((item) => formatVector4String(item))
    default:
      return []
  }
}

export function parseOptionItem(nodeDataType: NodeDataType, raw: string): string | null {
  switch (nodeDataType) {
    case 'optionF32': {
      const items = parseOptionF32Items(raw)
      return items.length > 0 ? items[0]! : null
    }
    case 'optionString': {
      const items = parseOptionStringItems(raw)
      return items.length > 0 ? items[0]! : null
    }
    case 'optionVector3': {
      const items = parseOptionVector3Items(raw)
      return items.length > 0 ? `${items[0]!.x}, ${items[0]!.y}, ${items[0]!.z}` : null
    }
    default:
      return null
  }
}

export function listElementSlotType(nodeDataType: NodeDataType): string {
  switch (nodeDataType) {
    case 'listF32':
      return 'f32'
    case 'listString':
      return 'string'
    case 'listHash':
      return 'hash'
    case 'listVector2':
      return 'vec2'
    case 'listVector3':
      return 'vec3'
    case 'listVector4':
      return 'vec4'
    default:
      return nodeDataType
  }
}

export function optionElementSlotType(nodeDataType: NodeDataType): string {
  switch (nodeDataType) {
    case 'optionF32':
      return 'f32'
    case 'optionString':
      return 'string'
    case 'optionVector3':
      return 'vec3'
    default:
      return nodeDataType
  }
}

/** Slug seguro para o segmento final do id composto. */
export function slugifyTypeValueForId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return 'empty'
  }
  return trimmed
    .replace(/[\s,]+/g, '-')
    .replace(/\./g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'empty'
}

export function buildComplexBlockParameterDocumentId(
  parameterName: string,
  displayName: string,
  kindSegment: string,
  typeValue: string,
): string {
  return `${parameterName.trim()}_${displayName.trim()}_${kindSegment.trim()}_${slugifyTypeValueForId(typeValue)}`
}

export function resolveTypeValueForId(
  classification: BlockParameterClassification,
  entry: BlockInspectorDraftEntry,
  scene: CanvasScene,
  canvasNode: CanvasNode,
  schemaRegistry?: Record<string, NodeSchemaDefinition>,
): string {
  switch (classification.kind) {
    case 'embed':
      return resolveEmbedTarget(scene, canvasNode, entry, schemaRegistry) ?? 'unknown'
    case 'pointer':
      return resolvePointerTarget(scene, canvasNode, entry, schemaRegistry) ?? 'unknown'
    case 'map': {
      const entries = resolveMapEntries(scene, canvasNode, entry, classification.mapKind)
      const firstTarget = entries.find((item) => item.target.trim())?.target
      if (firstTarget) {
        return firstTarget
      }
      return entries.length > 0 ? `keys-${entries.length}` : 'empty'
    }
    case 'list': {
      const parameter = parameterForEntry(canvasNode, entry)
      const raw =
        parameter != null
          ? nodeParameterValue(canvasNode, parameter.id, entry.defaultValue)
          : entry.defaultValue
      const items = classification.nodeDataType
        ? parseListItems(classification.nodeDataType, raw)
        : []
      return items.length > 0 ? items.map((item) => slugifyTypeValueForId(item)).join('-') : 'empty'
    }
    case 'option': {
      const parameter = parameterForEntry(canvasNode, entry)
      const raw =
        parameter != null
          ? nodeParameterValue(canvasNode, parameter.id, entry.defaultValue)
          : entry.defaultValue
      const item =
        classification.nodeDataType != null
          ? parseOptionItem(classification.nodeDataType, raw)
          : null
      return item ? slugifyTypeValueForId(item) : 'none'
    }
    default:
      return entry.typeParameter.trim() || 'string'
  }
}

export function classificationKindSegment(classification: BlockParameterClassification): string {
  if (classification.kind === 'map') {
    return classification.mapKind ?? 'map'
  }
  if (classification.kind === 'list' || classification.kind === 'option') {
    return classification.nodeDataType ?? classification.kind
  }
  return classification.kind
}
