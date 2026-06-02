import type { CanvasNode } from './canvasScene'
import { resolveSchemaIdForBlockDefinition } from './blockDefinitionJson'
import { pascalBlockTypeToKebabSlug } from './blockParameterIdTemplate'
import type { NodeSchemaDefinition } from './nodeSchema'

export type BlockSchemaResolutionContext = {
  sceneNodes?: readonly CanvasNode[]
  parentBlockName?: string
  parentParameterName?: string
}

function normalizeBlockTitleKey(title: string | undefined | null): string {
  if (typeof title !== 'string') {
    return ''
  }
  return title.replace(/\s+/g, '').trim()
}

function schemaTitleCandidates(schema: NodeSchemaDefinition): string[] {
  const candidates: string[] = []
  if (typeof schema.title === 'string') {
    const title = schema.title.trim()
    if (title) {
      candidates.push(title)
    }
  }
  const collection = schema.nomenclature?.collectionType
  if (typeof collection === 'string') {
    const trimmed = collection.trim()
    if (trimmed) {
      candidates.push(trimmed)
    }
  }
  return candidates
}

/** Registo efectivo = catálogo global + schemas dos nós presentes na cena. */
export function mergeSchemaRegistryWithSceneNodes(
  schemaRegistry: Record<string, NodeSchemaDefinition>,
  sceneNodes: readonly CanvasNode[],
): Record<string, NodeSchemaDefinition> {
  const merged: Record<string, NodeSchemaDefinition> = { ...schemaRegistry }

  for (const node of sceneNodes) {
    const schema = node.node.schema
    const schemaId = schema.id.trim()
    if (!schemaId) {
      continue
    }
    merged[schemaId] = schema
  }

  return merged
}

export function resolveSchemaIdFromSceneNodes(
  blockName: string,
  sceneNodes: readonly CanvasNode[],
): string | null {
  const targetNorm = normalizeBlockTitleKey(blockName)
  if (!targetNorm) {
    return null
  }

  for (const node of sceneNodes) {
    for (const candidate of schemaTitleCandidates(node.node.schema)) {
      if (normalizeBlockTitleKey(candidate) === targetNorm) {
        return node.node.schema.id.trim() || null
      }
    }
  }

  return null
}

function resolveSchemaIdFromStructureReferences(
  parentSchema: NodeSchemaDefinition,
  parameterName: string,
  childBlockName: string,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
): string | null {
  const paramKey = parameterName.trim()
  const childTarget = childBlockName.trim()
  if (!paramKey || !childTarget) {
    return null
  }

  const tryStructure = (schemaId: string | undefined): string | null => {
    const id = schemaId?.trim()
    if (!id) {
      return null
    }
    return schemaRegistry[id] ? id : null
  }

  for (const pointer of parentSchema.pointer ?? []) {
    if (pointer.title.trim() !== paramKey) {
      continue
    }
    for (const structure of pointer.internalStructures ?? []) {
      if (structure.name.trim() === childTarget) {
        const resolved = tryStructure(structure.schemaId)
        if (resolved) {
          return resolved
        }
      }
    }
    for (const slot of pointer.slots ?? []) {
      if (slot.name.trim() === childTarget) {
        const resolved = tryStructure(slot.schemaId)
        if (resolved) {
          return resolved
        }
      }
    }
  }

  for (const embed of parentSchema.embed ?? []) {
    if (embed.title.trim() !== paramKey) {
      continue
    }
    for (const structure of embed.internalStructures ?? []) {
      if (structure.name.trim() === childTarget) {
        const resolved = tryStructure(structure.schemaId)
        if (resolved) {
          return resolved
        }
      }
    }
    for (const slot of embed.slots ?? []) {
      if (slot.name.trim() === childTarget) {
        const resolved = tryStructure(slot.schemaId)
        if (resolved) {
          return resolved
        }
      }
    }
  }

  return null
}

export function resolveSchemaIdFromGlobalStructureReferences(
  blockName: string,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
): string | null {
  const childTarget = blockName.trim()
  if (!childTarget) {
    return null
  }

  for (const schema of Object.values(schemaRegistry)) {
    for (const pointer of schema.pointer ?? []) {
      for (const structure of pointer.internalStructures ?? []) {
        if (structure.name.trim() === childTarget) {
          const id = structure.schemaId?.trim()
          if (id && schemaRegistry[id]) {
            return id
          }
        }
      }
      for (const slot of pointer.slots ?? []) {
        if (slot.name.trim() === childTarget) {
          const id = slot.schemaId?.trim()
          if (id && schemaRegistry[id]) {
            return id
          }
        }
      }
    }

    for (const embed of schema.embed ?? []) {
      for (const structure of embed.internalStructures ?? []) {
        if (structure.name.trim() === childTarget) {
          const id = structure.schemaId?.trim()
          if (id && schemaRegistry[id]) {
            return id
          }
        }
      }
      for (const slot of embed.slots ?? []) {
        if (slot.name.trim() === childTarget) {
          const id = slot.schemaId?.trim()
          if (id && schemaRegistry[id]) {
            return id
          }
        }
      }
    }
  }

  return null
}

export function resolveSchemaIdByKebabPrefix(
  blockName: string,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
): string | null {
  const slug = pascalBlockTypeToKebabSlug(blockName.trim())
  if (!slug) {
    return null
  }

  const prefix = `${slug}__`
  const matches = Object.values(schemaRegistry)
    .filter((schema) => schema.id.startsWith(prefix))
    .sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id))

  return matches[0]?.id.trim() || null
}

/** Chave única por instância de bloco (tipo + nodeId template). */
export function blockDefinitionInstanceKey(definition: {
  blockName: string
  source: { nodeId: string }
}): string {
  return `${definition.blockName.trim()}::${definition.source.nodeId.trim()}`
}

export function resolveSchemaIdForBlockDefinitionContext(
  blockName: string,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
  context?: BlockSchemaResolutionContext,
): string | null {
  const target = blockName.trim()
  if (!target) {
    return null
  }

  const byTitle = resolveSchemaIdForBlockDefinition(target, schemaRegistry)
  if (byTitle) {
    return byTitle
  }

  if (context?.parentBlockName && context.parentParameterName) {
    const parentSchemaId =
      resolveSchemaIdForBlockDefinition(context.parentBlockName, schemaRegistry) ??
      resolveSchemaIdFromSceneNodes(context.parentBlockName, context.sceneNodes ?? [])

    if (parentSchemaId) {
      const parentSchema = schemaRegistry[parentSchemaId]
      if (parentSchema) {
        const fromParent = resolveSchemaIdFromStructureReferences(
          parentSchema,
          context.parentParameterName,
          target,
          schemaRegistry,
        )
        if (fromParent) {
          return fromParent
        }
      }
    }
  }

  const fromScene = resolveSchemaIdFromSceneNodes(target, context?.sceneNodes ?? [])
  if (fromScene) {
    return fromScene
  }

  const fromGlobalRefs = resolveSchemaIdFromGlobalStructureReferences(target, schemaRegistry)
  if (fromGlobalRefs) {
    return fromGlobalRefs
  }

  return resolveSchemaIdByKebabPrefix(target, schemaRegistry)
}
