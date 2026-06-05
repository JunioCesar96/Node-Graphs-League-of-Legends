import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  buildBlockDefinitionDocumentId,
  buildBlockHeaderSlots,
  buildEmptyBlockStructureFromDefinition,
} from './blockDefinitionJson'
import {
  blockDefinitionInstanceKey,
  type BlockSchemaResolutionContext,
  resolveSchemaIdForBlockDefinitionContext,
} from './blockDefinitionSchemaResolve'
import { blockDefinitionByBlockName } from './blockDefinitionRegistry'
import { addParameterToBlockStructure } from './blockCatalogMutations'
import { blockParameterCatalogByName } from './blockParameterCatalogRegistry'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { mapParameterEntryTargets } from './blockParameterMapDocument'
import {
  deriveChildBlockNodeId,
  retargetParameterDocumentForBlock,
  synthesizeBlockParameterDocument,
} from './blockParameterSynthesis'
import type { BlockStructurePayload } from './blockSchema'
import { blockTypeDefinitionById } from './blockStructureRegistry'
import type { NodeSchemaDefinition } from './nodeSchema'

const DEFAULT_BLOCK_COLOR = '#40ff56'

export function resolveBlockParameterDocument(
  definition: BlockDefinitionJsonDocument,
  parameterName: string,
  schema: NodeSchemaDefinition,
): BlockParameterJsonDocument | null {
  const fromDisk = blockParameterCatalogByName(definition.blockName.trim(), parameterName)
  if (fromDisk) {
    return retargetParameterDocumentForBlock(fromDisk, definition)
  }
  return synthesizeBlockParameterDocument(definition, parameterName, schema)
}

/** Monta `blockStructure` com todos os parâmetros listados no JSON de bloco (+ schema). */
export function buildBlockStructureFromDefinition(
  definition: BlockDefinitionJsonDocument,
  schema: NodeSchemaDefinition,
): BlockStructurePayload {
  let structure = buildEmptyBlockStructureFromDefinition(definition)
  const seen = new Set<string>()

  for (const rawName of definition.parameters) {
    const parameterName = rawName.trim()
    if (!parameterName || seen.has(parameterName)) {
      continue
    }
    seen.add(parameterName)

    const doc = resolveBlockParameterDocument(definition, parameterName, schema)
    if (!doc) {
      continue
    }

    const added = addParameterToBlockStructure(structure, doc)
    if (!added.error) {
      structure = added.structure
    }
  }

  return structure
}

export function structuralChildBlockType(doc: BlockParameterJsonDocument): string | null {
  if (doc.type === 'pointer') {
    return doc.pointer.trim() || null
  }
  if (doc.type === 'embed') {
    return doc.embed.trim() || null
  }
  return null
}

function isMapParameterDocument(
  doc: BlockParameterJsonDocument,
): doc is Extract<BlockParameterJsonDocument, { entries: unknown }> {
  return doc.type === 'mapHashEmbed' || doc.type === 'mapHashPointer' || doc.type === 'mapU64Pointer'
}

export function childBlockDefinitionForParameter(
  parentDefinition: BlockDefinitionJsonDocument,
  paramDoc: BlockParameterJsonDocument,
  schemaLookup?: Record<string, NodeSchemaDefinition>,
  context?: BlockSchemaResolutionContext,
): BlockDefinitionJsonDocument | null {
  const childType = structuralChildBlockType(paramDoc)
  if (!childType) {
    return null
  }
  const template = blockDefinitionByBlockName(childType)
  if (template) {
    const nodeId = deriveChildBlockNodeId(
      parentDefinition.source.nodeId,
      childType,
      paramDoc.parameterName,
    )
    const field = paramDoc.parameterName.trim()

    return {
      ...template,
      block: field,
      source: { kind: 'block', nodeId },
      headerSlots: [`in[${field}]`, `out[${childType}Preview]`],
    }
  }

  if (!schemaLookup) {
    return null
  }

  const schemaId = resolveSchemaIdForBlockDefinitionContext(childType, schemaLookup, {
    sceneNodes: context?.sceneNodes,
    parentBlockName: parentDefinition.blockName,
    parentParameterName: paramDoc.parameterName,
  })
  if (!schemaId) {
    return null
  }
  const schema = schemaLookup[schemaId]
  if (!schema) {
    return null
  }

  const nodeId = deriveChildBlockNodeId(
    parentDefinition.source.nodeId,
    childType,
    paramDoc.parameterName,
  )
  const field = paramDoc.parameterName.trim()
  const blockName = childType.trim()
  const parameters = schema.parameters.map((parameter) => parameter.name.trim()).filter(Boolean)

  return {
    id: buildBlockDefinitionDocumentId(blockName, blockName),
    block: field,
    blockName,
    type: paramDoc.type === 'pointer' ? 'pointer' : 'embed',
    name: blockName,
    source: { kind: 'block', nodeId },
    color: blockTypeDefinitionById(blockName)?.color ?? DEFAULT_BLOCK_COLOR,
    headerSlots: buildBlockHeaderSlots(field, blockName),
    parameters,
  }
}

/** Todos os documentos de parâmetro do bloco e filhos embed/pointer (para gravar em `parameters/`). */
export function collectParameterDocumentsForDefinitionTree(
  definition: BlockDefinitionJsonDocument,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  visitedDefinitionInstances = new Set<string>(),
  context?: BlockSchemaResolutionContext,
): BlockParameterJsonDocument[] {
  const visitKey = blockDefinitionInstanceKey(definition)
  if (!visitKey || visitedDefinitionInstances.has(visitKey)) {
    return []
  }
  visitedDefinitionInstances.add(visitKey)

  const schemaId = resolveSchemaIdForBlockDefinitionContext(definition.blockName, schemaLookup, {
    sceneNodes: context?.sceneNodes,
    parentBlockName: context?.parentBlockName,
    parentParameterName: context?.parentParameterName,
  })
  if (!schemaId) {
    return []
  }
  const schema = schemaLookup[schemaId]
  if (!schema) {
    return []
  }

  const documents: BlockParameterJsonDocument[] = []
  const seenParam = new Set<string>()

  for (const rawName of definition.parameters) {
    const parameterName = rawName.trim()
    if (!parameterName || seenParam.has(parameterName)) {
      continue
    }
    seenParam.add(parameterName)

    const doc = resolveBlockParameterDocument(definition, parameterName, schema)
    if (!doc) {
      continue
    }
    documents.push(doc)

    if (isMapParameterDocument(doc)) {
      for (const target of mapParameterEntryTargets(doc)) {
        const embedLike: BlockParameterJsonDocument = {
          ...doc,
          type: 'embed',
          embed: target,
          slots: { out: [target] },
        }
        const childDef = childBlockDefinitionForParameter(definition, embedLike, schemaLookup, {
          sceneNodes: context?.sceneNodes,
          parentBlockName: definition.blockName,
          parentParameterName: parameterName,
        })
        if (childDef) {
          documents.push(
            ...collectParameterDocumentsForDefinitionTree(childDef, schemaLookup, visitedDefinitionInstances, {
              sceneNodes: context?.sceneNodes,
              parentBlockName: definition.blockName,
              parentParameterName: parameterName,
            }),
          )
        }
      }
    } else {
      const childDef = childBlockDefinitionForParameter(definition, doc, schemaLookup, {
        sceneNodes: context?.sceneNodes,
        parentBlockName: definition.blockName,
        parentParameterName: parameterName,
      })
      if (childDef) {
        documents.push(
          ...collectParameterDocumentsForDefinitionTree(childDef, schemaLookup, visitedDefinitionInstances, {
            sceneNodes: context?.sceneNodes,
            parentBlockName: definition.blockName,
            parentParameterName: parameterName,
          }),
        )
      }
    }
  }

  return documents
}
