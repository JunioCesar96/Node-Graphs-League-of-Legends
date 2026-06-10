import {
  listElementSlotType,
  optionElementSlotType,
  parseListItems,
  parseOptionItem,
} from './blockParameterClassification'
import type {
  BlockParameterJsonDocument,
  BlockParameterJsonDocumentList,
} from './blockParameterJson'
import { isSimpleBlockParameterDocument } from './blockParameterJson'
import { buildBlockParameterDocumentId } from './blockParameterJson'
import { buildMapParameterJsonDocument } from './blockParameterMapDocument'
import {
  ritualClassOutSlots,
  ritualScalarSlotType,
} from './blockParameterRitualModel'
import { blockParameterSourceId } from './blockParameterSynthesis'
import type { NodeDataType } from './nodeSchema'

export type ManualBlockParameterInput = {
  blockName: string
  nodeId: string
  parameterName: string
  name?: string
  type: string
  value?: string
  target?: string
  list?: boolean
  mapRawValue?: string
  listItemsRaw?: string
  optionItem?: string | null
  /** Tipos de slot `in` customizados (sobrepõe o calculado automaticamente). */
  slotInTypes?: string[]
  /** Tipos de slot `out` customizados (sobrepõe o calculado automaticamente). */
  slotOutTypes?: string[]
}

export type BuildBlockParameterManualResult =
  | { ok: true; document: BlockParameterJsonDocument }
  | { ok: false; error: string }

const SIMPLE_TYPES = new Set([
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
  'vec2',
  'vec3',
  'vec4',
])

const LIST_TYPES = new Set<NodeDataType>([
  'listF32',
  'listString',
  'listHash',
  'listVector2',
  'listVector3',
  'listVector4',
])

const OPTION_TYPES = new Set<NodeDataType>([
  'optionF32',
  'optionString',
  'optionVector3',
])

const MAP_TYPES = new Set(['mapHashEmbed', 'mapHashPointer', 'mapU64Pointer'])

function resolveDisplayName(parameterName: string, name?: string): string {
  const fromName = name?.trim()
  if (fromName) {
    return fromName
  }
  return parameterName.trim()
}

export function blockParameterDocumentToManualInput(
  document: BlockParameterJsonDocument,
): Omit<ManualBlockParameterInput, 'nodeId'> {
  const base: Omit<ManualBlockParameterInput, 'nodeId'> = {
    blockName: document.block.trim(),
    parameterName: document.parameterName.trim(),
    name: document.name.trim() !== document.parameterName.trim() ? document.name.trim() : undefined,
    type: document.type,
    slotOutTypes: document.slots.out,
  }

  if (isSimpleBlockParameterDocument(document)) {
    return {
      ...base,
      type: document.type,
      value: document.value,
      slotInTypes: document.slots.in,
    }
  }

  if (document.type === 'embed' || document.type === 'pointer') {
    return {
      ...base,
      type: document.type,
      target: document.type === 'embed' ? document.embed : document.pointer,
      list: document.list === true,
    }
  }

  if (
    document.type === 'mapHashEmbed' ||
    document.type === 'mapHashPointer' ||
    document.type === 'mapU64Pointer'
  ) {
    const mapRawValue = document.entries
      .map((entry) => `${entry.key}\t${entry.target}\t${entry.target}`)
      .join('\n')
    return {
      ...base,
      type: document.type,
      mapRawValue,
    }
  }

  if (
    document.type === 'listF32' ||
    document.type === 'listString' ||
    document.type === 'listHash' ||
    document.type === 'listVector2' ||
    document.type === 'listVector3' ||
    document.type === 'listVector4'
  ) {
    return {
      ...base,
      type: document.type,
      listItemsRaw: document.items.join('\n'),
    }
  }

  if (
    document.type === 'optionF32' ||
    document.type === 'optionString' ||
    document.type === 'optionVector3'
  ) {
    const optionItem =
      document.item === null || document.item === undefined ? '' : String(document.item)
    return {
      ...base,
      type: document.type,
      optionItem,
    }
  }

  return base
}

export function buildBlockParameterFromManualInput(
  input: ManualBlockParameterInput,
): BuildBlockParameterManualResult {
  const blockName = input.blockName.trim()
  if (!blockName) {
    return { ok: false, error: 'blockName em falta' }
  }

  const nodeId = input.nodeId.trim()
  if (!nodeId) {
    return { ok: false, error: 'nodeId em falta' }
  }

  const parameterName = input.parameterName.trim()
  if (!parameterName) {
    return { ok: false, error: 'parameterName em falta' }
  }

  const name = resolveDisplayName(parameterName, input.name)
  if (!name) {
    return { ok: false, error: 'name em falta' }
  }
  if (name.includes('_')) {
    return { ok: false, error: `name não pode conter "_": ${name}` }
  }

  const type = input.type.trim()
  if (!type) {
    return { ok: false, error: 'type em falta' }
  }

  function resolveSlotOut(defaultOut: string[]): string[] {
    return input.slotOutTypes && input.slotOutTypes.length > 0 ? input.slotOutTypes : defaultOut
  }

  if (type === 'embed' || type === 'pointer') {
    const target = input.target?.trim()
    if (!target) {
      return { ok: false, error: `${type} requer alvo (classe de bloco)` }
    }

    const id =
      type === 'embed'
        ? buildBlockParameterDocumentId(parameterName, `${name}_embed_${target}`)
        : buildBlockParameterDocumentId(parameterName, `${name}_pointer_${target}`)

    const base = {
      id,
      block: blockName,
      parameterName,
      name,
      source: {
        kind: 'parameter' as const,
        parameterId: blockParameterSourceId(
          nodeId,
          parameterName,
          type === 'pointer' ? 'pointer' : 'scalar',
        ),
      },
      ...(input.list ? { list: true } : {}),
      slots: { out: resolveSlotOut(ritualClassOutSlots(target)) },
    }

    if (type === 'embed') {
      return { ok: true, document: { ...base, type: 'embed', embed: target } }
    }
    return { ok: true, document: { ...base, type: 'pointer', pointer: target } }
  }

  if (MAP_TYPES.has(type)) {
    const mapKind = type as 'mapHashEmbed' | 'mapHashPointer' | 'mapU64Pointer'
    const document = buildMapParameterJsonDocument({
      blockName,
      parameterName,
      name,
      parameterId: blockParameterSourceId(nodeId, parameterName, 'scalar'),
      mapKind,
      rawValue: input.mapRawValue ?? '',
    })
    const overriddenOut = resolveSlotOut(document.slots.out)
    return { ok: true, document: { ...document, slots: { out: overriddenOut } } }
  }

  if (LIST_TYPES.has(type as NodeDataType)) {
    const listType = type as BlockParameterJsonDocumentList['type']
    const raw = (input.listItemsRaw ?? '').trim()
    const items = parseListItems(listType, raw)
    const document: BlockParameterJsonDocumentList = {
      id: buildBlockParameterDocumentId(parameterName, `${parameterName}_${listType}`),
      block: blockName,
      parameterName,
      name,
      source: {
        kind: 'parameter',
        parameterId: blockParameterSourceId(nodeId, parameterName, 'scalar'),
      },
      type: listType,
      items,
      slots: { out: resolveSlotOut([listElementSlotType(listType)]) },
    }
    return { ok: true, document }
  }

  if (OPTION_TYPES.has(type as NodeDataType)) {
    const optionType = type as NodeDataType
    const raw = input.optionItem ?? ''
    const item = parseOptionItem(optionType, raw)
    return {
      ok: true,
      document: {
        id: buildBlockParameterDocumentId(parameterName, `${parameterName}_${optionType}`),
        block: blockName,
        parameterName,
        name,
        source: {
          kind: 'parameter',
          parameterId: blockParameterSourceId(nodeId, parameterName, 'scalar'),
        },
        type: optionType as 'optionF32' | 'optionString' | 'optionVector3',
        item,
        slots: { out: resolveSlotOut([optionElementSlotType(optionType)]) },
      },
    }
  }

  if (!SIMPLE_TYPES.has(type)) {
    return { ok: false, error: `type não suportado: ${type}` }
  }

  const slotType = ritualScalarSlotType(type)
  const value = input.value ?? ''
  const inTypes =
    input.slotInTypes && input.slotInTypes.length > 0 ? input.slotInTypes : [slotType]
  const outTypes = resolveSlotOut([slotType])

  return {
    ok: true,
    document: {
      id: buildBlockParameterDocumentId(parameterName, name),
      block: blockName,
      parameterName,
      name,
      source: {
        kind: 'parameter',
        parameterId: blockParameterSourceId(nodeId, parameterName, 'scalar'),
      },
      type: slotType,
      value,
      slots: { in: inTypes, out: outTypes },
    },
  }
}
