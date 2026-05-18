import { slugifyStructureId } from '@/core/convertRitobinTextToNodeStructures'
import {
  filterOutListEmbedCatalogChildStructures,
  listListEmbedCatalogPicksForElementMenu,
} from '@/core/listEmbedElementMenu'
import type { BuildElementMenuEntriesInput } from '@/core/elementMenuCatalogUtils'
import {
  filterInternalStructuresByPathHierarchy,
  listInternalStructureCandidatesForBase,
  listInternalStructureCandidatesForModuleParent,
} from '@/core/pathHierarchyInternalStructures'
import type { InternalStructureDefinition, NodeInstance, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

export type ElementMenuCatalogScope = 'module' | 'base'

export type ElementMenuScopeCatalogSources = {
  module: Pick<
    BuildElementMenuEntriesInput,
    'catalogParameters' | 'catalogStructures' | 'includeCatalogParameters' | 'includeCatalogStructures' | 'presetStructures'
  >
  base: Pick<
    BuildElementMenuEntriesInput,
    'catalogParameters' | 'catalogStructures' | 'includeCatalogParameters' | 'includeCatalogStructures' | 'presetStructures'
  >
}

/**
 * Nó módulo (JSON na raiz do pack) associado a um schema base via pathHierarchy (#2).
 */
export function resolveAnchorModuleSchemaId(
  nodeSchema: NodeSchemaDefinition,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
  schemaNodeKindBySchemaId: Record<string, 'module' | 'base'>,
): string | null {
  const steps = nodeSchema.nomenclature?.pathHierarchySteps
  if (steps) {
    for (const step of steps) {
      const match = /#2 Root Entry \(([^)]+)\)/.exec(step.type.trim())
      if (match?.[1]) {
        const candidate = slugifyStructureId(match[1])
        if (candidate && schemaRegistry[candidate] && schemaNodeKindBySchemaId[candidate] === 'module') {
          return candidate
        }
      }
    }
  }

  if (schemaNodeKindBySchemaId[nodeSchema.id] === 'module') {
    return nodeSchema.id
  }

  return null
}

/**
 * Pai do catálogo module: módulo `#2` referenciado em `pathHierarchySteps`, ou o próprio nó módulo.
 */
export function resolveModuleCatalogParentSchema(
  nodeSchema: NodeSchemaDefinition,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
  schemaNodeKindBySchemaId: Record<string, 'module' | 'base'>,
): NodeSchemaDefinition | null {
  const steps = nodeSchema.nomenclature?.pathHierarchySteps
  if (steps) {
    for (const step of steps) {
      const match = /#2 Root Entry \(([^)]+)\)/.exec(step.type.trim())
      if (match?.[1]) {
        const candidate = slugifyStructureId(match[1])
        const parent = candidate ? schemaRegistry[candidate] : undefined
        if (parent) {
          return parent
        }
      }
    }
  }

  if (schemaNodeKindBySchemaId[nodeSchema.id] === 'module') {
    return nodeSchema
  }

  const anchorId = resolveAnchorModuleSchemaId(nodeSchema, schemaRegistry, schemaNodeKindBySchemaId)
  return anchorId ? (schemaRegistry[anchorId] ?? null) : null
}

function unusedParametersOnNode(
  node: NodeInstance,
  definitions: readonly NodeParameterDefinition[],
): NodeParameterDefinition[] {
  const ids = new Set(node.schema.parameters.map((p) => p.id))
  const names = new Set(node.schema.parameters.map((p) => p.name))
  return definitions.filter((p) => !ids.has(p.id) && !names.has(p.name))
}

function unusedStructuresOnNode(
  node: NodeInstance,
  definitions: readonly InternalStructureDefinition[],
): InternalStructureDefinition[] {
  const used = new Set(node.schema.internalStructures.map((s) => s.schemaId))
  return definitions.filter((s) => !used.has(s.schemaId))
}

function moduleTemplateFromRegistry(
  moduleSchemaId: string,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
): NodeSchemaDefinition | null {
  return schemaRegistry[moduleSchemaId] ?? null
}

export function buildElementMenuScopeCatalogSources(input: {
  node: NodeInstance
  nodeKind: 'module' | 'base'
  schemaRegistry: Record<string, NodeSchemaDefinition>
  schemaNodeKindBySchemaId: Record<string, 'module' | 'base'>
  jsonRelativePathBySchemaId?: Record<string, string>
  packFolderBySchemaId?: Record<string, string>
  baseCatalogStructures?: readonly InternalStructureDefinition[]
  baseCatalogParameters?: readonly NodeParameterDefinition[]
}): ElementMenuScopeCatalogSources {
  const anchorModuleId =
    input.nodeKind === 'module'
      ? input.node.schema.id
      : resolveAnchorModuleSchemaId(
          input.node.schema,
          input.schemaRegistry,
          input.schemaNodeKindBySchemaId,
        )

  const moduleTemplate =
    anchorModuleId !== null ? moduleTemplateFromRegistry(anchorModuleId, input.schemaRegistry) : null

  const moduleParameters = moduleTemplate
    ? unusedParametersOnNode(input.node, moduleTemplate.parameters)
    : []

  const moduleCatalogParent = resolveModuleCatalogParentSchema(
    input.node.schema,
    input.schemaRegistry,
    input.schemaNodeKindBySchemaId,
  )

  const moduleStructureCandidates = moduleCatalogParent
    ? listInternalStructureCandidatesForModuleParent(moduleCatalogParent, input.schemaRegistry, {
        jsonRelativePathBySchemaId: input.jsonRelativePathBySchemaId,
        schemaNodeKindBySchemaId: input.schemaNodeKindBySchemaId,
        packFolderBySchemaId: input.packFolderBySchemaId,
      })
    : []

  const templateSchema = input.schemaRegistry[input.node.schema.id] ?? null

  const moduleStructures = filterOutListEmbedCatalogChildStructures(
    unusedStructuresOnNode(input.node, moduleStructureCandidates),
    templateSchema,
  )

  let baseStructures = input.baseCatalogStructures ?? []
  if (input.nodeKind === 'module' && !input.baseCatalogStructures) {
    const candidates = listInternalStructureCandidatesForBase(input.node.schema, input.schemaRegistry, {
      jsonRelativePathBySchemaId: input.jsonRelativePathBySchemaId,
    })
    baseStructures = filterOutListEmbedCatalogChildStructures(
      filterInternalStructuresByPathHierarchy(
        input.node.schema,
        unusedStructuresOnNode(input.node, candidates),
        input.schemaRegistry,
        input.jsonRelativePathBySchemaId,
      ),
      templateSchema,
    )
  } else if (input.baseCatalogStructures) {
    baseStructures = filterOutListEmbedCatalogChildStructures(
      unusedStructuresOnNode(input.node, input.baseCatalogStructures),
      templateSchema,
    )
  }

  const baseParameters = unusedParametersOnNode(input.node, input.baseCatalogParameters ?? [])

  const presetForModule =
    input.nodeKind === 'module' ? input.node.schema.internalStructures : []

  const listEmbedCatalog = listListEmbedCatalogPicksForElementMenu(input.node, templateSchema)
  const hasListEmbedCatalog = listEmbedCatalog.length > 0

  return {
    module: {
      presetStructures: presetForModule,
      catalogStructures: moduleStructures,
      catalogParameters: moduleParameters,
      listEmbedCatalog,
      includeCatalogStructures: moduleStructures.length > 0,
      includeCatalogParameters: moduleParameters.length > 0,
      includeListEmbedCatalog: hasListEmbedCatalog,
    },
    base: {
      presetStructures: [],
      catalogStructures: baseStructures,
      catalogParameters: baseParameters,
      listEmbedCatalog,
      includeCatalogStructures: baseStructures.length > 0,
      includeCatalogParameters: baseParameters.length > 0,
      includeListEmbedCatalog: hasListEmbedCatalog,
    },
  }
}

export function defaultElementMenuCatalogScope(nodeKind: 'module' | 'base'): ElementMenuCatalogScope {
  return nodeKind === 'module' ? 'module' : 'base'
}

export function elementMenuScopeHasCatalog(
  scope: ElementMenuCatalogScope,
  sources: ElementMenuScopeCatalogSources,
): boolean {
  const slice = scope === 'module' ? sources.module : sources.base
  return (
    slice.presetStructures.length > 0 ||
    slice.includeCatalogStructures ||
    slice.includeCatalogParameters ||
    Boolean(slice.includeListEmbedCatalog)
  )
}
