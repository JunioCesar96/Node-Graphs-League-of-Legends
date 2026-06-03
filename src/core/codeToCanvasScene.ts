import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  hydrateScene,
  type CanvasConnection,
  type CanvasNode,
  type CanvasPosition,
  type CanvasScene,
} from '@/core/canvasScene'
import { createUniqueNodeId } from '@/core/canvasNodeIds'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import { patchInternalStructureSlotForLink } from '@/core/collectionTypeLinking'
import {
  MAIN_SCHEMA_ID,
  parseClassGroupRitualWithStack,
  schemasFromClassGroupStackParse,
  type ClassGroupStackParseResult,
  type MutableClassGroupSchema,
} from '@/core/classGroupRitualStackParser'
import { materializeParsedSchemaAtPhase } from '@/core/ritualNodeMaterialize'
import { slugifyStructureId } from '@/core/convertRitobinTextToNodeStructures'
import { embedSlotId, populatedSlotsForEmbed } from '@/core/embedSlots'
import { patchOutputSlotInNodeSchemaWithEmbed } from '@/core/embedSlots'
import {
  appendListEmbedSlotIfNeeded,
  createEmptyListEmbedSlot,
  listEmbedSlotId,
  patchOutputSlotInNodeSchema,
  populatedSlotsForListEmbed,
} from '@/core/listEmbedSlots'
import {
  appendListPointerSlotIfNeeded,
  createEmptyListPointerSlot,
  findSlotInSchema as findSlotInListPointerSchema,
  listPointerSlotId,
  patchOutputSlotInNodeSchema as patchListPointerSlotInSchema,
  populatedSlotsForListPointer,
} from '@/core/listPointerSlots'
import { findList2EmbedByInstanceSlotId, populatedSlotsForList2EmbedInstance } from '@/core/list2EmbedSlots'
import { populatedSlotsForList2PointerInstance } from '@/core/list2PointerSlots'
import { parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { mapHashEmbedSlotId, mapHashEmbedSlotsForParameter } from '@/core/mapHashEmbedSlots'
import { parseMapHashPointerString } from '@/core/mapHashPointerValue'
import { mapHashPointerSlotId, mapHashPointerSlotsForParameter } from '@/core/mapHashPointerSlots'
import { parseMapU64PointerString } from '@/core/mapU64PointerValue'
import { mapU64PointerSlotId, mapU64PointerSlotsForParameter } from '@/core/mapU64PointerSlots'
import { defaultNewCanvasNodeLayout } from '@/core/nodeCardSections'
import type {
  EmbedDefinition,
  InternalStructureDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  NodeInstance,
  NodeSchemaDefinition,
  PointerDefinition,
} from '@/core/nodeSchema'
import { createNodeInstanceFromRegistry } from '@/core/nodeStructureRegistry'
import { pointerSlotId, populatedSlotsForPointer } from '@/core/pointerSlots'
import { patchOutputSlotInNodeSchemaWithPointer } from '@/core/pointerSlots'

const LAYOUT_ORIGIN_X = 80
const LAYOUT_ORIGIN_Y = 80
const LAYOUT_DEPTH_STEP_X = 520
const LAYOUT_SIBLING_STEP_Y = 110

export type CodeToCanvasSceneResult =
  | { ok: true; scene: CanvasScene; warnings: string[] }
  | { ok: false; error: string }

type PackTypeIndex = {
  byTitle: Map<string, string>
  byCollectionType: Map<string, string>
  bySlug: Map<string, string>
}

export type ChildLink =
  | { kind: 'internal'; fieldName: string; childParsedId: string }
  | { kind: 'embed'; fieldName: string; childParsedId: string }
  | { kind: 'pointer'; fieldName: string; childParsedId: string }
  | { kind: 'listEmbed'; fieldName: string; index: number; childParsedId: string }
  | { kind: 'listPointer'; fieldName: string; index: number; childParsedId: string }
  | { kind: 'list2Embed'; fieldName: string; instanceIndex: number; childParsedId: string }
  | { kind: 'list2Pointer'; fieldName: string; instanceIndex: number; childParsedId: string }
  | { kind: 'mapHashEmbed'; parameterName: string; entryKey: string; childParsedId: string }
  | { kind: 'mapHashPointer'; parameterName: string; entryKey: string; childParsedId: string }
  | { kind: 'mapU64Pointer'; parameterName: string; entryKey: string; childParsedId: string }

function normalizeTypeKey(value: string): string {
  return value.trim()
}

function registerIndexKey(map: Map<string, string>, key: string, schemaId: string): void {
  const normalized = normalizeTypeKey(key)
  if (!normalized || map.has(normalized)) {
    return
  }
  map.set(normalized, schemaId)
}

export function buildPackTypeIndex(schemasInPack: NodeSchemaDefinition[]): PackTypeIndex {
  const byTitle = new Map<string, string>()
  const byCollectionType = new Map<string, string>()
  const bySlug = new Map<string, string>()

  for (const schema of schemasInPack) {
    registerIndexKey(byTitle, schema.title, schema.id)
    registerIndexKey(bySlug, slugifyStructureId(schema.title), schema.id)
    registerIndexKey(bySlug, schema.id, schema.id)

    const collectionType = schema.nomenclature?.collectionType?.trim()
    if (collectionType) {
      registerIndexKey(byCollectionType, collectionType, schema.id)
      registerIndexKey(bySlug, slugifyStructureId(collectionType), schema.id)
    }
  }

  return { byTitle, byCollectionType, bySlug }
}

/** Inclui schemas de instância do parse (ex.: probabilitytables-N) no registry do pack. */
export function mergeParseSchemasIntoRegistry(
  baseRegistry: Record<string, NodeSchemaDefinition>,
  parsed: ClassGroupStackParseResult,
): Record<string, NodeSchemaDefinition> {
  const merged = { ...baseRegistry }
  for (const schema of schemasFromClassGroupStackParse(parsed)) {
    merged[schema.id] = schema
  }
  return merged
}

export function resolvePackSchemaId(
  registry: Record<string, NodeSchemaDefinition>,
  index: PackTypeIndex,
  parsedSchema: MutableClassGroupSchema,
): string | null {
  // Instâncias parseadas (ensureSchemaInstance) têm sufixo «__» — não confundir com template do pack.
  if (parsedSchema.id.includes('__') && registry[parsedSchema.id]) {
    return parsedSchema.id
  }

  const title = parsedSchema.title.trim()
  if (title) {
    const byTitle = index.byTitle.get(title)
    if (byTitle) {
      return byTitle
    }
    const bySlugTitle = index.bySlug.get(slugifyStructureId(title))
    if (bySlugTitle) {
      return bySlugTitle
    }
  }

  const collectionType = parsedSchema.nomenclature?.collectionType?.trim()
  if (collectionType) {
    const byCt = index.byCollectionType.get(collectionType)
    if (byCt) {
      return byCt
    }
    const bySlugCt = index.bySlug.get(slugifyStructureId(collectionType))
    if (bySlugCt) {
      return bySlugCt
    }
  }

  return index.bySlug.get(parsedSchema.id) ?? null
}

/** Prefer slots populados; senão catálogo (evita ligações duplicadas). */
function structuralOutputRefs(
  block: EmbedDefinition | PointerDefinition | ListEmbedDefinition | ListPointerDefinition,
): InternalStructureDefinition[] {
  const slots = block.slots ?? []
  if (slots.length > 0) {
    return slots
  }
  return block.internalStructures
}

function list2InstanceOutputRefs(instance: EmbedDefinition | PointerDefinition): InternalStructureDefinition[] {
  const slots = instance.slots ?? []
  if (slots.length > 0) {
    return slots
  }
  return instance.internalStructures
}

function ritualFieldNameToCamelCase(fieldName: string): string {
  if (fieldName.length === 0) {
    return fieldName
  }
  return fieldName[0]!.toLowerCase() + fieldName.slice(1)
}

function titlesMatchStructurally(packTitle: string, ritualFieldName: string): boolean {
  if (packTitle === ritualFieldName) {
    return true
  }
  if (packTitle.localeCompare(ritualFieldName, undefined, { sensitivity: 'accent' }) === 0) {
    return true
  }
  const camel = ritualFieldNameToCamelCase(ritualFieldName)
  if (packTitle === camel) {
    return true
  }
  if (packTitle.localeCompare(camel, undefined, { sensitivity: 'accent' }) === 0) {
    return true
  }
  return false
}

export function findStructuralBlockByFieldName<T extends { title: string }>(
  blocks: readonly T[] | undefined,
  fieldName: string,
): T | undefined {
  if (!blocks || blocks.length === 0) {
    return undefined
  }

  const exact = blocks.find((block) => block.title === fieldName)
  if (exact) {
    return exact
  }

  const caseInsensitive = blocks.find(
    (block) => block.title.localeCompare(fieldName, undefined, { sensitivity: 'accent' }) === 0,
  )
  if (caseInsensitive) {
    return caseInsensitive
  }

  const camelField = ritualFieldNameToCamelCase(fieldName)
  return blocks.find((block) => titlesMatchStructurally(block.title, camelField))
}

function findParsedListBlockByPackTitle(
  parsedBlocks: readonly ListEmbedDefinition[] | readonly ListPointerDefinition[],
  packTitle: string,
): ListEmbedDefinition | ListPointerDefinition | undefined {
  return parsedBlocks.find((block) => titlesMatchStructurally(packTitle, block.title))
}

function shouldLinkStructuralRef(ref: InternalStructureDefinition): boolean {
  return !ref.structOnlyEmpty
}

function findParsedBlockByPackTitle<T extends { title: string }>(
  parsedBlocks: readonly T[],
  packTitle: string,
): T | undefined {
  return findStructuralBlockByFieldName(parsedBlocks, packTitle) as T | undefined
}

function mergeParsedEmbedPointerSlots(
  schema: NodeSchemaDefinition,
  parsed: MutableClassGroupSchema,
): NodeSchemaDefinition {
  let next = schema

  if (next.embed && parsed.embed.length > 0) {
    next = {
      ...next,
      embed: next.embed.map((packBlock) => {
        const parsedBlock = findParsedBlockByPackTitle(parsed.embed, packBlock.title)
        if (!parsedBlock?.slots?.length) {
          return packBlock
        }
        return {
          ...packBlock,
          templateBlockId: packBlock.templateBlockId ?? packBlock.id,
          slots: parsedBlock.slots.map((slot, index) => ({
            ...structuredClone(slot),
            id: embedSlotId(packBlock.id, index),
          })),
        }
      }),
    }
  }

  if (next.pointer && parsed.pointer.length > 0) {
    next = {
      ...next,
      pointer: next.pointer.map((packBlock) => {
        const parsedBlock = findParsedBlockByPackTitle(parsed.pointer, packBlock.title)
        if (!parsedBlock?.slots?.length) {
          return packBlock
        }
        return {
          ...packBlock,
          templateBlockId: packBlock.templateBlockId ?? packBlock.id,
          slots: parsedBlock.slots.map((slot, index) => ({
            ...structuredClone(slot),
            id: pointerSlotId(packBlock.id, index),
          })),
        }
      }),
    }
  }

  return next
}

function mergeParsedListStructuralSlots(
  schema: NodeSchemaDefinition,
  parsed: MutableClassGroupSchema,
): NodeSchemaDefinition {
  let next = mergeParsedEmbedPointerSlots(schema, parsed)

  if (next.listEmbed && parsed.listEmbed.length > 0) {
    next = {
      ...next,
      listEmbed: next.listEmbed.map((packBlock) => {
        const parsedBlock = findParsedListBlockByPackTitle(parsed.listEmbed, packBlock.title) as
          | ListEmbedDefinition
          | undefined
        if (!parsedBlock?.slots?.length) {
          return packBlock
        }
        return {
          ...packBlock,
          templateBlockId: packBlock.templateBlockId ?? packBlock.id,
          slots: parsedBlock.slots.map((slot, index) => ({
            ...structuredClone(slot),
            id: listEmbedSlotId(packBlock.id, index),
          })),
        }
      }),
    }
  }

  if (next.listPointer && parsed.listPointer.length > 0) {
    next = {
      ...next,
      listPointer: next.listPointer.map((packBlock) => {
        const parsedBlock = findParsedListBlockByPackTitle(parsed.listPointer, packBlock.title) as
          | ListPointerDefinition
          | undefined
        if (!parsedBlock?.slots?.length) {
          return packBlock
        }
        return {
          ...packBlock,
          templateBlockId: packBlock.templateBlockId ?? packBlock.id,
          slots: parsedBlock.slots.map((slot, index) => ({
            ...structuredClone(slot),
            id: listPointerSlotId(packBlock.id, index),
          })),
        }
      }),
    }
  }

  return next
}

function createRitualCanvasNodeInstance(
  registry: Record<string, NodeSchemaDefinition>,
  packSchemaId: string,
  instanceId: string,
  parsed: MutableClassGroupSchema,
  warnings: string[],
): NodeInstance | null {
  if (packSchemaId === parsed.id && parsed.id.includes('__') && registry[parsed.id]) {
    return materializeParsedSchemaAtPhase(parsed, instanceId, 'full')
  }

  const packTemplate = registry[packSchemaId]
  if (!packTemplate) {
    return null
  }

  const node = createNodeInstanceFromRegistry(registry, packSchemaId, instanceId)
  if (!node) {
    return null
  }

  const packParamsByName = new Map(packTemplate.parameters.map((parameter) => [parameter.name, parameter]))
  const ritualParameters: NodeSchemaDefinition['parameters'] = []
  const ritualValues: NodeInstance['values'] = []

  const sortedRitualParams = [...parsed.parameters].sort((a, b) => a.name.localeCompare(b.name))
  for (const ritualParam of sortedRitualParams) {
    const packDef = packParamsByName.get(ritualParam.name)
    if (!packDef) {
      warnings.push(
        `Parâmetro «${ritualParam.name}» em «${parsed.title}» não existe no schema do pack «${packSchemaId}».`,
      )
      continue
    }
    ritualParameters.push(structuredClone(packDef))
    ritualValues.push({
      parameterId: packDef.id,
      value: ritualParam.defaultValue ?? '',
    })
  }

  const { required_parameter: _req, linked_parameter_values: _linked, ...schemaWithoutPackParams } =
    node.schema
  node.schema = mergeParsedListStructuralSlots(
    {
      ...schemaWithoutPackParams,
      parameters: ritualParameters,
    },
    parsed,
  )
  node.values = ritualValues
  delete node.required_parameter
  delete node.linked_parameter_values

  return node
}

export function collectChildLinks(parsed: MutableClassGroupSchema): ChildLink[] {
  const links: ChildLink[] = []

  for (const ref of parsed.internalStructures) {
    if (!shouldLinkStructuralRef(ref)) {
      continue
    }
    links.push({ kind: 'internal', fieldName: ref.name, childParsedId: ref.schemaId })
  }

  for (const block of parsed.embed) {
    structuralOutputRefs(block).forEach((ref) => {
      if (!shouldLinkStructuralRef(ref)) {
        return
      }
      links.push({ kind: 'embed', fieldName: block.title, childParsedId: ref.schemaId })
    })
  }

  for (const block of parsed.pointer) {
    structuralOutputRefs(block).forEach((ref) => {
      if (!shouldLinkStructuralRef(ref)) {
        return
      }
      links.push({ kind: 'pointer', fieldName: block.title, childParsedId: ref.schemaId })
    })
  }

  parsed.listEmbed.forEach((block) => {
    structuralOutputRefs(block).forEach((ref, index) => {
      if (!shouldLinkStructuralRef(ref)) {
        return
      }
      links.push({
        kind: 'listEmbed',
        fieldName: block.title,
        index,
        childParsedId: ref.schemaId,
      })
    })
  })

  parsed.listPointer.forEach((block) => {
    structuralOutputRefs(block).forEach((ref, index) => {
      if (!shouldLinkStructuralRef(ref)) {
        return
      }
      links.push({
        kind: 'listPointer',
        fieldName: block.title,
        index,
        childParsedId: ref.schemaId,
      })
    })
  })

  parsed.list2Embed.forEach((block) => {
    block.instances.forEach((instance, instanceIndex) => {
      for (const ref of list2InstanceOutputRefs(instance)) {
        if (!shouldLinkStructuralRef(ref)) {
          continue
        }
        links.push({
          kind: 'list2Embed',
          fieldName: block.title,
          instanceIndex,
          childParsedId: ref.schemaId,
        })
      }
    })
  })

  parsed.list2Pointer.forEach((block) => {
    block.instances.forEach((instance, instanceIndex) => {
      for (const ref of list2InstanceOutputRefs(instance)) {
        if (!shouldLinkStructuralRef(ref)) {
          continue
        }
        links.push({
          kind: 'list2Pointer',
          fieldName: block.title,
          instanceIndex,
          childParsedId: ref.schemaId,
        })
      }
    })
  })

  for (const parameter of parsed.parameters) {
    if (parameter.type === 'mapHashEmbed') {
      for (const entry of parseMapHashEmbedString(parameter.defaultValue)) {
        const childParsedId = entry.schemaId.trim()
        if (childParsedId) {
          links.push({
            kind: 'mapHashEmbed',
            parameterName: parameter.name,
            entryKey: entry.key,
            childParsedId,
          })
        }
      }
    } else if (parameter.type === 'mapHashPointer') {
      for (const entry of parseMapHashPointerString(parameter.defaultValue)) {
        const childParsedId = entry.schemaId.trim()
        if (childParsedId) {
          links.push({
            kind: 'mapHashPointer',
            parameterName: parameter.name,
            entryKey: entry.key,
            childParsedId,
          })
        }
      }
    } else if (parameter.type === 'mapU64Pointer') {
      for (const entry of parseMapU64PointerString(parameter.defaultValue)) {
        const childParsedId = entry.schemaId.trim()
        if (childParsedId) {
          links.push({
            kind: 'mapU64Pointer',
            parameterName: parameter.name,
            entryKey: entry.key,
            childParsedId,
          })
        }
      }
    }
  }

  return links
}

export function findPackSlotForLink(
  packSchema: NodeSchemaDefinition,
  link: ChildLink,
  childPackSchemaId: string,
  parentInstance?: NodeInstance,
): InternalStructureDefinition | null {
  if (link.kind === 'internal') {
    return (
      packSchema.internalStructures.find(
        (slot) => slot.name === link.fieldName && slot.schemaId === childPackSchemaId,
      ) ??
      packSchema.internalStructures.find((slot) => slot.name === link.fieldName) ??
      null
    )
  }

  if (link.kind === 'embed') {
    const block = findStructuralBlockByFieldName(packSchema.embed, link.fieldName)
    if (!block) {
      return null
    }
    const slots = populatedSlotsForEmbed(block)
    return slots[0] ?? {
      id: embedSlotId(block.id, 0),
      name: block.title,
      schemaId: childPackSchemaId,
    }
  }

  if (link.kind === 'pointer') {
    const block = findStructuralBlockByFieldName(packSchema.pointer, link.fieldName)
    if (!block) {
      return null
    }
    const slots = populatedSlotsForPointer(block)
    return slots[0] ?? {
      id: pointerSlotId(block.id, 0),
      name: block.title,
      schemaId: childPackSchemaId,
    }
  }

  if (link.kind === 'listEmbed') {
    const block = findStructuralBlockByFieldName(packSchema.listEmbed, link.fieldName)
    if (!block) {
      return null
    }
    const slots = populatedSlotsForListEmbed(block)
    return (
      slots[link.index] ?? createEmptyListEmbedSlot(block.id, link.index, block)
    )
  }

  if (link.kind === 'listPointer') {
    const block = findStructuralBlockByFieldName(packSchema.listPointer, link.fieldName)
    if (!block) {
      return null
    }
    const slots = populatedSlotsForListPointer(block)
    return (
      slots[link.index] ?? createEmptyListPointerSlot(block.id, link.index, block)
    )
  }

  if (link.kind === 'list2Embed') {
    const block = findStructuralBlockByFieldName(packSchema.list2Embed, link.fieldName)
    const instance = block?.instances[link.instanceIndex]
    if (!instance) {
      return null
    }
    const slots = populatedSlotsForList2EmbedInstance(instance)
    return (
      slots[0] ?? {
        id: embedSlotId(instance.id, 0),
        name: instance.title,
        schemaId: childPackSchemaId,
      }
    )
  }

  if (link.kind === 'list2Pointer') {
    const block = findStructuralBlockByFieldName(packSchema.list2Pointer, link.fieldName)
    const instance = block?.instances[link.instanceIndex]
    if (!instance) {
      return null
    }
    const slots = populatedSlotsForList2PointerInstance(instance)
    return (
      slots[0] ?? {
        id: pointerSlotId(instance.id, 0),
        name: instance.title,
        schemaId: childPackSchemaId,
      }
    )
  }

  if (link.kind === 'mapHashEmbed') {
    const param = packSchema.parameters.find((item) => item.name === link.parameterName)
    if (!param || param.type !== 'mapHashEmbed') {
      return null
    }
    const stored =
      parentInstance?.values.find((entry) => entry.parameterId === param.id)?.value ??
      param.defaultValue
    const slots = mapHashEmbedSlotsForParameter(param, stored)
    const slotId = mapHashEmbedSlotId(param.id, link.entryKey)
    return slots.find((slot) => slot.id === slotId) ?? null
  }

  if (link.kind === 'mapHashPointer') {
    const param = packSchema.parameters.find((item) => item.name === link.parameterName)
    if (!param || param.type !== 'mapHashPointer') {
      return null
    }
    const stored =
      parentInstance?.values.find((entry) => entry.parameterId === param.id)?.value ??
      param.defaultValue
    const slots = mapHashPointerSlotsForParameter(param, stored)
    const slotId = mapHashPointerSlotId(param.id, link.entryKey)
    return slots.find((slot) => slot.id === slotId) ?? null
  }

  if (link.kind === 'mapU64Pointer') {
    const param = packSchema.parameters.find((item) => item.name === link.parameterName)
    if (!param || param.type !== 'mapU64Pointer') {
      return null
    }
    const stored =
      parentInstance?.values.find((entry) => entry.parameterId === param.id)?.value ??
      param.defaultValue
    const slots = mapU64PointerSlotsForParameter(param, stored)
    const slotId = mapU64PointerSlotId(param.id, link.entryKey)
    return slots.find((slot) => slot.id === slotId) ?? null
  }

  return null
}

export function patchParentSlotSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
  connections: readonly CanvasConnection[],
  fromNodeId: string,
): NodeSchemaDefinition {
  if (findList2EmbedByInstanceSlotId(schema, slotId)) {
    return schema
  }

  let next = patchOutputSlotInNodeSchema(schema, slotId, patch, connections, fromNodeId)
  next = patchOutputSlotInNodeSchemaWithEmbed(next, slotId, patch)
  next = patchOutputSlotInNodeSchemaWithPointer(next, slotId, patch)
  next = patchListPointerSlotInSchema(next, slotId, patch, connections, fromNodeId)
  return next
}

export class SceneBuilder {
  readonly registry: Record<string, NodeSchemaDefinition>

  readonly typeIndex: PackTypeIndex

  readonly parseRegistry: Map<string, MutableClassGroupSchema>

  readonly warnings: string[]

  nodes: CanvasNode[] = []

  connections: CanvasConnection[] = []

  /** parsed schema id → canvas node id */
  readonly parsedToCanvas = new Map<string, string>()

  constructor(
    registry: Record<string, NodeSchemaDefinition>,
    typeIndex: PackTypeIndex,
    parseRegistry: Map<string, MutableClassGroupSchema>,
    parseWarnings: string[],
  ) {
    this.registry = registry
    this.typeIndex = typeIndex
    this.parseRegistry = parseRegistry
    this.warnings = [...parseWarnings]
  }

  getCanvasNode(nodeId: string): CanvasNode | undefined {
    return this.nodes.find((node) => node.id === nodeId)
  }

  resolvePackId(parsedId: string): string | null {
    const parsed = this.parseRegistry.get(parsedId)
    if (!parsed) {
      return null
    }
    return resolvePackSchemaId(this.registry, this.typeIndex, parsed)
  }

  ensureCanvasNode(
    parsedId: string,
    depth: number,
    siblingIndex: number,
  ): string | null {
    const existing = this.parsedToCanvas.get(parsedId)
    if (existing) {
      return existing
    }

    const parsed = this.parseRegistry.get(parsedId)
    if (!parsed) {
      this.warnings.push(`Schema parseado «${parsedId}» não encontrado no registry.`)
      return null
    }

    const packSchemaId = this.resolvePackId(parsedId)
    if (!packSchemaId) {
      this.warnings.push(
        `Tipo «${parsed.title}» (parse id «${parsedId}») não existe no pack seleccionado.`,
      )
      return null
    }

    const instanceId = createUniqueNodeId(packSchemaId, this.nodes)
    const node = createRitualCanvasNodeInstance(
      this.registry,
      packSchemaId,
      instanceId,
      parsed,
      this.warnings,
    )
    if (!node) {
      this.warnings.push(`Não foi possível instanciar «${packSchemaId}».`)
      return null
    }

    const position: CanvasPosition = {
      x: LAYOUT_ORIGIN_X + depth * LAYOUT_DEPTH_STEP_X,
      y: LAYOUT_ORIGIN_Y + siblingIndex * LAYOUT_SIBLING_STEP_Y,
    }

    const canvasNode: CanvasNode = {
      id: instanceId,
      node,
      position,
      ...defaultNewCanvasNodeLayout(node),
    }

    this.nodes.push(canvasNode)
    this.parsedToCanvas.set(parsedId, instanceId)
    return instanceId
  }

  /** Nova instância canvas por ligação (não deduplica por `templateParsedId`). */
  createChildCanvasNodeForLink(
    templateParsedId: string,
    depth: number,
    siblingIndex: number,
  ): string | null {
    const parsed = this.parseRegistry.get(templateParsedId)
    if (!parsed) {
      this.warnings.push(`Schema parseado «${templateParsedId}» não encontrado no registry.`)
      return null
    }

    const packSchemaId = this.resolvePackId(templateParsedId)
    if (!packSchemaId) {
      this.warnings.push(
        `Tipo «${parsed.title}» (parse id «${templateParsedId}») não existe no pack seleccionado.`,
      )
      return null
    }

    const instanceId = createUniqueNodeId(packSchemaId, this.nodes)
    const node = createRitualCanvasNodeInstance(
      this.registry,
      packSchemaId,
      instanceId,
      parsed,
      this.warnings,
    )
    if (!node) {
      this.warnings.push(`Não foi possível instanciar «${packSchemaId}».`)
      return null
    }

    const position: CanvasPosition = {
      x: LAYOUT_ORIGIN_X + depth * LAYOUT_DEPTH_STEP_X,
      y: LAYOUT_ORIGIN_Y + siblingIndex * LAYOUT_SIBLING_STEP_Y,
    }

    const canvasNode: CanvasNode = {
      id: instanceId,
      node,
      position,
      ...defaultNewCanvasNodeLayout(node),
    }

    this.nodes.push(canvasNode)
    this.parsedToCanvas.set(templateParsedId, instanceId)
    return instanceId
  }

  attachLink(parentCanvasId: string, link: ChildLink, childCanvasId: string): boolean {
    const parentNode = this.getCanvasNode(parentCanvasId)
    const childNode = this.getCanvasNode(childCanvasId)
    if (!parentNode || !childNode) {
      return false
    }

    const childPackSchemaId = childNode.node.schema.id
    const slot = findPackSlotForLink(
      parentNode.node.schema,
      link,
      childPackSchemaId,
      parentNode.node,
    )
    if (!slot) {
      const fieldLabel =
        link.kind === 'internal' ||
        link.kind === 'embed' ||
        link.kind === 'pointer' ||
        link.kind === 'listEmbed' ||
        link.kind === 'listPointer' ||
        link.kind === 'list2Embed' ||
        link.kind === 'list2Pointer'
          ? link.fieldName
          : link.parameterName
      this.warnings.push(
        `Slot «${fieldLabel}» não encontrado em «${parentNode.node.schema.title}» para ligar «${childNode.node.schema.title}».`,
      )
      return false
    }

    const connection: CanvasConnection = {
      id: `${parentCanvasId}:${slot.id}->${childCanvasId}`,
      fromInternalStructureId: slot.id,
      fromNodeId: parentCanvasId,
      toNodeId: childCanvasId,
      routing: 'wireless',
    }

    this.connections = this.connections.filter(
      (item) =>
        item.fromNodeId !== parentCanvasId || item.fromInternalStructureId !== slot.id,
    )
    this.connections.push(connection)

    const patch = patchInternalStructureSlotForLink(slot, childNode)
    let nextSchema = parentNode.node.schema

    if (link.kind === 'listEmbed') {
      const block = findStructuralBlockByFieldName(nextSchema.listEmbed, link.fieldName)
      if (block) {
        nextSchema = appendListEmbedSlotIfNeeded(nextSchema, block.id, this.connections, parentCanvasId)
      }
    } else if (link.kind === 'listPointer') {
      const block = findStructuralBlockByFieldName(nextSchema.listPointer, link.fieldName)
      if (block) {
        nextSchema = appendListPointerSlotIfNeeded(
          nextSchema,
          block.id,
          this.connections,
          parentCanvasId,
        )
      }
    }

    parentNode.node = {
      ...parentNode.node,
      schema: patchParentSlotSchema(nextSchema, slot.id, patch, this.connections, parentCanvasId),
    }

    return true
  }

  walkParsedSubtree(
    templateParsedId: string,
    canvasId: string,
    depth: number,
    siblingIndex: number,
  ): void {
    const parsed = this.parseRegistry.get(templateParsedId)
    if (!parsed) {
      return
    }

    const links = collectChildLinks(parsed)
    let childSibling = 0

    for (const link of links) {
      const childCanvasId = this.createChildCanvasNodeForLink(
        link.childParsedId,
        depth + 1,
        childSibling,
      )
      if (!childCanvasId) {
        continue
      }
      if (!this.attachLink(canvasId, link, childCanvasId)) {
        continue
      }
      this.walkParsedSubtree(link.childParsedId, childCanvasId, depth + 1, childSibling)
      childSibling += 1
    }
  }

  walkParsedNode(parsedId: string, depth: number, siblingIndex: number): void {
    const canvasId = this.ensureCanvasNode(parsedId, depth, siblingIndex)
    if (!canvasId) {
      return
    }

    this.walkParsedSubtree(parsedId, canvasId, depth, siblingIndex)
  }

  syncListStructuralSlotsOnNodes(): void {
    for (const canvasNode of this.nodes) {
      let schema = canvasNode.node.schema

      for (const block of schema.listEmbed ?? []) {
        schema = appendListEmbedSlotIfNeeded(schema, block.id, this.connections, canvasNode.id)
      }
      for (const block of schema.listPointer ?? []) {
        schema = appendListPointerSlotIfNeeded(schema, block.id, this.connections, canvasNode.id)
      }

      for (const connection of this.connections) {
        if (connection.fromNodeId !== canvasNode.id) {
          continue
        }
        const childNode = this.getCanvasNode(connection.toNodeId)
        if (!childNode) {
          continue
        }
        const slotHit = findSlotInListPointerSchema(schema, connection.fromInternalStructureId)
        if (!slotHit) {
          continue
        }
        const patch = patchInternalStructureSlotForLink(slotHit.slot, childNode)
        schema = patchParentSlotSchema(
          schema,
          connection.fromInternalStructureId,
          patch,
          this.connections,
          canvasNode.id,
        )
      }

      canvasNode.node = {
        ...canvasNode.node,
        schema,
      }
    }
  }

  buildScene(): CanvasScene {
    this.syncListStructuralSlotsOnNodes()

    return {
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT,
      nodes: this.nodes,
      connections: this.connections,
    }
  }
}

export function codeToCanvasScene(
  source: string,
  packFolder: string,
  registry: Record<string, NodeSchemaDefinition>,
  packFolderBySchemaId: Record<string, string>,
): CodeToCanvasSceneResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  if (text.length === 0) {
    return { ok: false, error: 'Texto ritual vazio.' }
  }

  const schemasInPack = Object.values(registry).filter(
    (schema) => packFolderBySchemaId[schema.id] === packFolder,
  )

  if (schemasInPack.length === 0) {
    return { ok: false, error: `Nenhum schema encontrado no pack «${packFolder}».` }
  }

  const hasMain = schemasInPack.some((schema) => schema.id === MAIN_SCHEMA_ID)
  if (!hasMain) {
    return {
      ok: false,
      error: `O pack «${packFolder}» não contém o nó «${MAIN_SCHEMA_ID}».`,
    }
  }

  const parsed = parseClassGroupRitualWithStack(text)

  if (!parsed.registry.has(MAIN_SCHEMA_ID)) {
    return {
      ok: false,
      error: 'Não foi possível obter o nó main a partir do ritual (esperado entries: map ou estrutura Class Group).',
    }
  }

  const combinedRegistry = mergeParseSchemasIntoRegistry(registry, parsed)
  const typeIndex = buildPackTypeIndex(schemasInPack)
  const builder = new SceneBuilder(combinedRegistry, typeIndex, parsed.registry, parsed.warnings)
  builder.walkParsedNode(MAIN_SCHEMA_ID, 0, 0)

  const mainCanvasId = builder.parsedToCanvas.get(MAIN_SCHEMA_ID)
  if (!mainCanvasId) {
    return {
      ok: false,
      error: 'Não foi possível criar o nó main na cena (verifica o pack e o ritual).',
    }
  }

  const scene = syncSceneCollapsedBodyWireless(hydrateScene(builder.buildScene()))

  return { ok: true, scene, warnings: builder.warnings }
}
