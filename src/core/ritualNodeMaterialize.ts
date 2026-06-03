import type { NodeInstance, NodeSchemaDefinition } from '@/core/nodeSchema'
import type { MutableClassGroupSchema } from '@/core/classGroupRitualStackParser'
import { embedSlotId } from '@/core/embedSlots'
import { listEmbedSlotId } from '@/core/listEmbedSlots'
import { listPointerSlotId } from '@/core/listPointerSlots'
import { pointerSlotId } from '@/core/pointerSlots'
import type {
  EmbedDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  PointerDefinition,
} from '@/core/nodeSchema'

export type RitualMaterializePhase = 'shell' | 'elements' | 'values' | 'internals' | 'full'

const PHASE_RANK: Record<RitualMaterializePhase, number> = {
  shell: 0,
  elements: 1,
  values: 2,
  internals: 3,
  full: 4,
}

export function ritualParameterId(schemaId: string, paramName: string): string {
  const safeName = paramName.replace(/[^\w]+/g, '_')
  return `${schemaId}_parameter_${safeName}`
}

function cloneStructuralBlocksForElements(
  blocks: readonly EmbedDefinition[] | readonly PointerDefinition[],
): EmbedDefinition[] | PointerDefinition[] {
  return blocks.map((block) => ({
    ...structuredClone(block),
    slots: [],
  })) as EmbedDefinition[] & PointerDefinition[]
}

function cloneListBlocksForElements(
  blocks: readonly ListEmbedDefinition[] | readonly ListPointerDefinition[],
): ListEmbedDefinition[] | ListPointerDefinition[] {
  return blocks.map((block) => ({
    ...structuredClone(block),
    slots: [],
    internalStructures: [...block.internalStructures],
  })) as ListEmbedDefinition[] & ListPointerDefinition[]
}

function mergeParsedListSlotsOnSchema(
  schema: NodeSchemaDefinition,
  parsed: MutableClassGroupSchema,
): NodeSchemaDefinition {
  let next = schema

  if (parsed.listEmbed.length > 0) {
    next = {
      ...next,
      listEmbed: parsed.listEmbed.map((block) => ({
        ...structuredClone(block),
        templateBlockId: block.templateBlockId ?? block.id,
        slots: (block.slots ?? []).map((slot, index) => ({
          ...structuredClone(slot),
          id: listEmbedSlotId(block.id, index),
        })),
      })),
    }
  }

  if (parsed.listPointer.length > 0) {
    next = {
      ...next,
      listPointer: parsed.listPointer.map((block) => ({
        ...structuredClone(block),
        templateBlockId: block.templateBlockId ?? block.id,
        slots: (block.slots ?? []).map((slot, index) => ({
          ...structuredClone(slot),
          id: listPointerSlotId(block.id, index),
        })),
      })),
    }
  }

  return next
}

function mergeParsedEmbedAndPointerSlotsOnSchema(
  schema: NodeSchemaDefinition,
  parsed: MutableClassGroupSchema,
): NodeSchemaDefinition {
  let next = schema

  if (parsed.embed.length > 0) {
    next = {
      ...next,
      embed: parsed.embed.map((block) => ({
        ...structuredClone(block),
        slots: (block.slots ?? []).map((slot, index) => ({
          ...structuredClone(slot),
          id: embedSlotId(block.id, index),
        })),
      })),
    }
  }

  if (parsed.pointer.length > 0) {
    next = {
      ...next,
      pointer: parsed.pointer.map((block) => ({
        ...structuredClone(block),
        slots: (block.slots ?? []).map((slot, index) => ({
          ...structuredClone(slot),
          id: pointerSlotId(block.id, index),
        })),
      })),
    }
  }

  return next
}

/** Materializa instância ritual parseada (Neeko / code→canvas com schema de instância). */
export function materializeParsedSchemaAtPhase(
  parsed: MutableClassGroupSchema,
  instanceId: string,
  phase: RitualMaterializePhase,
): NodeInstance {
  const targetRank = PHASE_RANK[phase]

  let schema: NodeSchemaDefinition = {
    id: parsed.id,
    title: parsed.title,
    parameters: [],
    internalStructures: [],
    embed: [],
    pointer: [],
    listEmbed: [],
    listPointer: [],
    list2Embed: [],
    list2Pointer: [],
  }

  if (parsed.nomenclature) {
    schema.nomenclature = structuredClone(parsed.nomenclature)
  }

  let values: NodeInstance['values'] = []

  if (targetRank >= PHASE_RANK.elements) {
    schema = {
      ...schema,
      embed: cloneStructuralBlocksForElements(parsed.embed) as EmbedDefinition[],
      pointer: cloneStructuralBlocksForElements(parsed.pointer) as PointerDefinition[],
      listEmbed: cloneListBlocksForElements(parsed.listEmbed) as ListEmbedDefinition[],
      listPointer: cloneListBlocksForElements(parsed.listPointer) as ListPointerDefinition[],
      list2Embed: parsed.list2Embed.length > 0 ? structuredClone(parsed.list2Embed) : [],
      list2Pointer: parsed.list2Pointer.length > 0 ? structuredClone(parsed.list2Pointer) : [],
    }
  }

  if (targetRank >= PHASE_RANK.values) {
    const sortedParams = [...parsed.parameters].sort((a, b) => a.name.localeCompare(b.name))
    schema.parameters = sortedParams.map((param) => ({
      id: ritualParameterId(parsed.id, param.name),
      name: param.name,
      type: param.type,
      defaultValue: param.defaultValue ?? '',
    }))
    values = schema.parameters.map((param) => ({
      parameterId: param.id,
      value: param.defaultValue,
    }))
  }

  if (targetRank >= PHASE_RANK.internals) {
    schema.internalStructures = structuredClone(parsed.internalStructures)
    schema = mergeParsedListSlotsOnSchema(schema, parsed)
    schema = mergeParsedEmbedAndPointerSlotsOnSchema(schema, parsed)
  }

  return {
    id: instanceId,
    schema,
    values,
  }
}
