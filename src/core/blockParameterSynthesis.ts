import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import { buildMapParameterJsonDocument } from './blockParameterMapDocument'
import type {
  BlockParameterJsonDocument,
  BlockParameterJsonDocumentEmbed,
  BlockParameterJsonDocumentList,
  BlockParameterJsonDocumentMap,
  BlockParameterJsonDocumentOption,
  BlockParameterJsonDocumentPointer,
  BlockParameterJsonDocumentSimple,
} from './blockParameterJson'
import { buildBlockParameterDocumentId } from './blockParameterJson'
import { pascalBlockTypeToKebabSlug } from './blockParameterIdTemplate'
import type { NodeDataType, NodeSchemaDefinition } from './nodeSchema'

function ritualTypeFromNodeDataType(type: NodeDataType | string): string {
  switch (type) {
    case 'vector4':
    case 'rgba':
      return 'vec4'
    case 'vector3':
      return 'vec3'
    case 'vector2':
      return 'vec2'
    case 'float':
    case 'f32':
      return 'f32'
    case 'string':
      return 'string'
    case 'listF32':
      return 'listF32'
    case 'listString':
      return 'listString'
    case 'listHash':
      return 'listHash'
    case 'listVector2':
      return 'listVector2'
    case 'listVector3':
      return 'listVector3'
    case 'listVector4':
      return 'listVector4'
    case 'optionF32':
      return 'optionF32'
    case 'optionString':
      return 'optionString'
    case 'optionVector3':
      return 'optionVector3'
    default:
      return String(type)
  }
}

function fieldSlug(parameterName: string): string {
  return pascalBlockTypeToKebabSlug(parameterName).replace(/_/g, '-')
}

export function blockParameterSourceId(
  blockNodeId: string,
  parameterName: string,
  mode: 'scalar' | 'pointer',
): string {
  const base = blockNodeId.trim()
  if (mode === 'pointer') {
    return `${base}-${fieldSlug(parameterName)}`
  }
  return `${base}_parameter_${parameterName.trim()}`
}

/** `childSlug__{suffix}-{field}` a partir do nodeId do bloco pai. */
export function deriveChildBlockNodeId(
  parentBlockNodeId: string,
  childBlockType: string,
  fieldName: string,
): string {
  const childSlug = pascalBlockTypeToKebabSlug(childBlockType)
  const field = fieldSlug(fieldName)
  const trimmed = parentBlockNodeId.trim()
  const separator = trimmed.indexOf('__')
  if (separator >= 0) {
    const suffix = trimmed.slice(separator + 2)
    return `${childSlug}__${suffix}-${field}`
  }
  return `${childSlug}__${trimmed}-${field}`
}

function cloneDocumentForBlock(
  doc: BlockParameterJsonDocument,
  definition: BlockDefinitionJsonDocument,
): BlockParameterJsonDocument {
  const blockNodeId = definition.source.nodeId.trim()
  const parameterName = doc.parameterName.trim()
  const base = {
    ...doc,
    block: definition.blockName.trim(),
    source: {
      kind: 'parameter' as const,
      parameterId:
        doc.type === 'pointer'
          ? blockParameterSourceId(blockNodeId, parameterName, 'pointer')
          : blockParameterSourceId(blockNodeId, parameterName, 'scalar'),
    },
  }
  return base
}

function synthesizeSimple(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  ritualType: string,
  defaultValue: string,
): BlockParameterJsonDocumentSimple {
  const name = parameterName.trim()
  const slotType = ritualTypeFromNodeDataType(ritualType)
  return {
    id: buildBlockParameterDocumentId(parameterName, name),
    block: definition.blockName.trim(),
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(definition.source.nodeId, parameterName, 'scalar'),
    },
    type: slotType,
    value: defaultValue,
    slots: { in: [slotType], out: [slotType] },
  }
}

function synthesizePointer(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  pointerType: string,
  options?: { list?: boolean },
): BlockParameterJsonDocumentPointer {
  const name = parameterName.trim()
  return {
    id: buildBlockParameterDocumentId(
      parameterName,
      `${name}_pointer_${pointerType}`,
    ),
    block: definition.blockName.trim(),
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(definition.source.nodeId, parameterName, 'pointer'),
    },
    type: 'pointer',
    ...(options?.list ? { list: true } : {}),
    pointer: pointerType,
    slots: { out: [pointerType] },
  }
}

function synthesizeEmbed(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  embedType: string,
  options?: { list?: boolean },
): BlockParameterJsonDocumentEmbed {
  const name = parameterName.trim()
  return {
    id: buildBlockParameterDocumentId(parameterName, `${name}_embed_${embedType}`),
    block: definition.blockName.trim(),
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(definition.source.nodeId, parameterName, 'scalar'),
    },
    type: 'embed',
    ...(options?.list ? { list: true } : {}),
    embed: embedType,
    slots: { out: [embedType] },
  }
}

function synthesizeList(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  listType: BlockParameterJsonDocumentList['type'],
  defaultValue: string,
): BlockParameterJsonDocumentList {
  const name = parameterName.trim()
  const items =
    defaultValue.trim() === ''
      ? []
      : defaultValue
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
  const outSlot =
    listType === 'listF32'
      ? 'f32'
      : listType === 'listString'
        ? 'string'
        : listType === 'listHash'
          ? 'hash'
          : listType === 'listVector2'
            ? 'vec2'
            : listType === 'listVector3'
              ? 'vec3'
              : 'vec4'

  return {
    id: buildBlockParameterDocumentId(parameterName, `${name}_${listType}`),
    block: definition.blockName.trim(),
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(definition.source.nodeId, parameterName, 'scalar'),
    },
    type: listType,
    items,
    slots: { out: [outSlot] },
  }
}

function synthesizeOption(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  optionType: BlockParameterJsonDocumentOption['type'],
  defaultValue: string,
): BlockParameterJsonDocumentOption {
  const name = parameterName.trim()
  const outSlot =
    optionType === 'optionF32' ? 'f32' : optionType === 'optionString' ? 'string' : 'vec3'
  return {
    id: buildBlockParameterDocumentId(parameterName, `${name}_${optionType}`),
    block: definition.blockName.trim(),
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(definition.source.nodeId, parameterName, 'scalar'),
    },
    type: optionType,
    item: defaultValue.trim() || null,
    slots: { out: [outSlot] },
  }
}

/** Gera documento JSON de parâmetro a partir do schema Class Group quando não há ficheiro em disco. */
export function synthesizeBlockParameterDocument(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  schema: NodeSchemaDefinition,
): BlockParameterJsonDocument | null {
  const key = parameterName.trim()
  if (!key) {
    return null
  }

  const scalar = schema.parameters.find((entry) => entry.name === key)
  if (scalar) {
    const mapTypes = new Set<BlockParameterJsonDocumentMap['mapKind']>([
      'mapHashEmbed',
      'mapHashPointer',
      'mapU64Pointer',
    ])
    const listTypes = new Set([
      'listF32',
      'listString',
      'listHash',
      'listVector2',
      'listVector3',
      'listVector4',
    ])
    const optionTypes = new Set(['optionF32', 'optionString', 'optionVector3'])
    if (mapTypes.has(scalar.type as BlockParameterJsonDocumentMap['mapKind'])) {
      return buildMapParameterJsonDocument({
        blockName: definition.blockName.trim(),
        parameterName: key,
        parameterId: blockParameterSourceId(definition.source.nodeId, key, 'scalar'),
        mapKind: scalar.type as BlockParameterJsonDocumentMap['mapKind'],
        rawValue: scalar.defaultValue,
      })
    }
    if (listTypes.has(scalar.type)) {
      return synthesizeList(
        definition,
        key,
        scalar.type as BlockParameterJsonDocumentList['type'],
        scalar.defaultValue,
      )
    }
    if (optionTypes.has(scalar.type)) {
      return synthesizeOption(
        definition,
        key,
        scalar.type as BlockParameterJsonDocumentOption['type'],
        scalar.defaultValue,
      )
    }
    return synthesizeSimple(definition, key, scalar.type, scalar.defaultValue)
  }

  const listPointer = schema.listPointer?.find((entry) => entry.title === key)
  if (listPointer) {
    const target =
      listPointer.internalStructures[0]?.name ??
      listPointer.slots?.[0]?.name ??
      'pointer'
    return synthesizePointer(definition, key, target, { list: true })
  }

  const listEmbed = schema.listEmbed?.find(
    (entry) => (entry.parameterName ?? entry.title).trim() === key,
  )
  if (listEmbed) {
    const target =
      listEmbed.internalStructures[0]?.name ?? listEmbed.slots?.[0]?.name ?? 'embed'
    return synthesizeEmbed(definition, key, target, { list: true })
  }

  const pointer = schema.pointer?.find((entry) => entry.title === key)
  if (pointer) {
    const target =
      pointer.internalStructures[0]?.name ??
      pointer.slots?.[0]?.name ??
      'pointer'
    return synthesizePointer(definition, key, target)
  }

  const embed = schema.embed?.find((entry) => entry.title === key)
  if (embed) {
    const target =
      embed.internalStructures[0]?.name ?? embed.slots?.[0]?.name ?? 'embed'
    return synthesizeEmbed(definition, key, target)
  }

  return null
}

export function retargetParameterDocumentForBlock(
  doc: BlockParameterJsonDocument,
  definition: BlockDefinitionJsonDocument,
): BlockParameterJsonDocument {
  return cloneDocumentForBlock(doc, definition)
}
