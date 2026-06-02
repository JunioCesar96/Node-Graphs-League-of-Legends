import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  hydrateScene,
  type CanvasConnection,
  type CanvasNode,
  type CanvasPosition,
  type CanvasScene,
} from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import { patchInternalStructureSlotForLink } from '@/core/collectionTypeLinking'
import {
  findParsedSchemaInRegistry,
  MAIN_SCHEMA_ID,
  parseClassGroupRitualWithStack,
  schemasFromClassGroupStackParse,
  type MutableClassGroupSchema,
} from '@/core/classGroupRitualStackParser'
import {
  collectChildLinks,
  findPackSlotForLink,
  findStructuralBlockByFieldName,
  patchParentSlotSchema,
  type ChildLink,
} from '@/core/codeToCanvasScene'
import { createUniqueNodeId } from '@/core/canvasNodeIds'
import { findSlotInEmbedSchema } from '@/core/embedSlots'
import { appendListEmbedSlotIfNeeded } from '@/core/listEmbedSlots'
import { findSlotInSchema as findSlotInListEmbedSchema } from '@/core/listEmbedSlots'
import {
  appendListPointerSlotIfNeeded,
  findSlotInSchema as findSlotInListPointerSchema,
} from '@/core/listPointerSlots'
import { findSlotInPointerSchema } from '@/core/pointerSlots'
import {
  materializeParsedSchemaAtPhase,
  ritualParameterId,
  type RitualMaterializePhase,
} from '@/core/ritualNodeMaterialize'
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

const LAYOUT_ORIGIN_X = 80
const LAYOUT_ORIGIN_Y = 80
const LAYOUT_DEPTH_STEP_X = 520
const LAYOUT_SIBLING_STEP_Y = 110

export type NewNodeMaterializePhase = RitualMaterializePhase

const PHASE_RANK: Record<NewNodeMaterializePhase, number> = {
  shell: 0,
  elements: 1,
  values: 2,
  internals: 3,
  full: 4,
}

export { materializeParsedSchemaAtPhase, ritualParameterId }

export type CodeToNewNodeGraphResult =
  | { ok: true; scene: CanvasScene; warnings: string[]; schemas: NodeSchemaDefinition[] }
  | { ok: false; error: string }

export type PrepareCodeToNewNodeGraphResult =
  | {
      ok: true
      parseRegistry: Map<string, MutableClassGroupSchema>
      schemas: NodeSchemaDefinition[]
      warnings: string[]
      rootSchemaIds: string[]
    }
  | { ok: false; error: string }

function resolveOutputSlotFromSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): InternalStructureDefinition | null {
  const topLevel = schema.internalStructures.find((structure) => structure.id === slotId)
  if (topLevel) {
    return topLevel
  }

  const embedHit = findSlotInEmbedSchema(schema, slotId)
  if (embedHit) {
    return embedHit.slot
  }

  const pointerHit = findSlotInPointerSchema(schema, slotId)
  if (pointerHit) {
    return pointerHit.slot
  }

  const listEmbedHit = findSlotInListEmbedSchema(schema, slotId)
  if (listEmbedHit) {
    return listEmbedHit.slot
  }

  const listPointerHit = findSlotInListPointerSchema(schema, slotId)
  if (listPointerHit) {
    return listPointerHit.slot
  }

  return null
}

export function prepareCodeToNewNodeGraph(source: string): PrepareCodeToNewNodeGraphResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  if (text.length === 0) {
    return { ok: false, error: 'Texto ritual vazio.' }
  }

  const parsed = parseClassGroupRitualWithStack(text)
  const schemas = schemasFromClassGroupStackParse(parsed)

  if (schemas.length === 0) {
    return { ok: false, error: 'Nenhum schema gerado a partir do ritual.' }
  }

  if (!parsed.registry.has(MAIN_SCHEMA_ID)) {
    return {
      ok: false,
      error:
        'Não foi possível obter o nó main a partir do ritual (esperado entries: map ou estrutura Class Group).',
    }
  }

  const rootSchemaIds =
    parsed.rootSchemaIds.size > 0 ? [...parsed.rootSchemaIds] : [MAIN_SCHEMA_ID]

  return {
    ok: true,
    parseRegistry: parsed.registry,
    schemas,
    warnings: [...parsed.warnings],
    rootSchemaIds,
  }
}

export function schemasToRegistry(schemas: readonly NodeSchemaDefinition[]): Record<string, NodeSchemaDefinition> {
  const registry: Record<string, NodeSchemaDefinition> = {}
  for (const schema of schemas) {
    registry[schema.id] = schema
  }
  return registry
}

export function createEmptyNewNodeGraphScene(): CanvasScene {
  return {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    nodes: [],
    connections: [],
  }
}

export function finalizeNewNodeGraphScene(scene: CanvasScene): CanvasScene {
  return syncSceneCollapsedBodyWireless(hydrateScene(scene))
}

export class NewNodeGraphBuilder {
  readonly parseRegistry: Map<string, MutableClassGroupSchema>

  readonly warnings: string[]

  nodes: CanvasNode[] = []

  connections: CanvasConnection[] = []

  readonly parsedToCanvas = new Map<string, string>()

  readonly phaseByParsedId = new Map<string, NewNodeMaterializePhase>()

  constructor(
    parseRegistry: Map<string, MutableClassGroupSchema>,
    parseWarnings: string[],
  ) {
    this.parseRegistry = parseRegistry
    this.warnings = [...parseWarnings]
  }

  getCanvasNode(nodeId: string): CanvasNode | undefined {
    return this.nodes.find((node) => node.id === nodeId)
  }

  private applyPhase(parsedId: string, phase: NewNodeMaterializePhase): string | null {
    const parsed = this.parseRegistry.get(parsedId)
    if (!parsed) {
      this.warnings.push(`Schema parseado «${parsedId}» não encontrado.`)
      return null
    }

    const existingCanvasId = this.parsedToCanvas.get(parsedId)
    const currentPhase = this.phaseByParsedId.get(parsedId) ?? 'shell'
    const nextRank = Math.max(PHASE_RANK[currentPhase], PHASE_RANK[phase])
    const nextPhase =
      nextRank >= PHASE_RANK.internals
        ? 'internals'
        : nextRank >= PHASE_RANK.values
          ? 'values'
          : nextRank >= PHASE_RANK.elements
            ? 'elements'
            : 'shell'

    if (existingCanvasId) {
      const canvasNode = this.getCanvasNode(existingCanvasId)
      if (canvasNode) {
        canvasNode.node = materializeParsedSchemaAtPhase(parsed, existingCanvasId, nextPhase)
        this.phaseByParsedId.set(parsedId, nextPhase)
      }
      return existingCanvasId
    }

    if (phase !== 'shell') {
      this.warnings.push(`Nó «${parsedId}» sem shell; a criar shell antes de ${phase}.`)
    }

    return null
  }

  ensureNodeShell(parsedId: string, depth: number, siblingIndex: number): string | null {
    const existing = this.parsedToCanvas.get(parsedId)
    if (existing) {
      return existing
    }

    const parsed = this.parseRegistry.get(parsedId)
    if (!parsed) {
      this.warnings.push(`Schema parseado «${parsedId}» não encontrado.`)
      return null
    }

    const instanceId = createUniqueNodeId(parsed.id, this.nodes)
    const node = materializeParsedSchemaAtPhase(parsed, instanceId, 'shell')

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
    this.phaseByParsedId.set(parsedId, 'shell')
    return instanceId
  }

  defineElements(parsedId: string): string | null {
    const canvasId = this.parsedToCanvas.get(parsedId) ?? null
    if (!canvasId) {
      return this.ensureNodeShell(parsedId, 0, 0) ? this.applyPhase(parsedId, 'elements') : null
    }
    return this.applyPhase(parsedId, 'elements')
  }

  defineValues(parsedId: string): string | null {
    if (!this.parsedToCanvas.has(parsedId)) {
      return null
    }
    this.applyPhase(parsedId, 'elements')
    return this.applyPhase(parsedId, 'values')
  }

  defineInternals(parsedId: string): string | null {
    if (!this.parsedToCanvas.has(parsedId)) {
      return null
    }
    this.applyPhase(parsedId, 'elements')
    this.applyPhase(parsedId, 'values')
    return this.applyPhase(parsedId, 'internals')
  }

  /** Nova instância canvas por ligação (não deduplica por `childParsedId`). */
  createChildCanvasNodeForLink(
    templateParsedId: string,
    depth: number,
    siblingIndex: number,
  ): string | null {
    const parsed = findParsedSchemaInRegistry(this.parseRegistry, templateParsedId)
    if (!parsed) {
      this.warnings.push(`Schema parseado «${templateParsedId}» não encontrado.`)
      return null
    }

    const instanceId = createUniqueNodeId(parsed.id, this.nodes)
    const node = materializeParsedSchemaAtPhase(parsed, instanceId, 'full')

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

    const childSchemaId = childNode.node.schema.id
    const slot = findPackSlotForLink(
      parentNode.node.schema,
      link,
      childSchemaId,
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
    _siblingIndex: number,
  ): void {
    const parsed = findParsedSchemaInRegistry(this.parseRegistry, templateParsedId)
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

      this.walkParsedSubtree(link.childParsedId, childCanvasId, depth + 1, 0)
      childSibling += 1
    }
  }

  walkParsedNode(parsedId: string, depth: number, siblingIndex: number): void {
    const canvasId = this.ensureNodeShell(parsedId, depth, siblingIndex)
    if (!canvasId) {
      return
    }

    this.defineElements(parsedId)
    this.defineValues(parsedId)
    this.defineInternals(parsedId)

    this.walkParsedSubtree(parsedId, canvasId, depth, siblingIndex)
  }

  syncStructuralSlotsOnNodes(): void {
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

        const existingSlot = resolveOutputSlotFromSchema(
          schema,
          connection.fromInternalStructureId,
        )
        const baseSlot: InternalStructureDefinition = existingSlot ?? {
          id: connection.fromInternalStructureId,
          name: childNode.node.schema.title,
          schemaId: childNode.node.schema.id,
        }
        const patch = patchInternalStructureSlotForLink(baseSlot, childNode)
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
    this.syncStructuralSlotsOnNodes()

    return {
      width: DEFAULT_CANVAS_WIDTH,
      height: DEFAULT_CANVAS_HEIGHT,
      nodes: this.nodes,
      connections: this.connections,
    }
  }
}

export function buildNewNodeGraphScene(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  warnings: string[],
  rootParsedId: string = MAIN_SCHEMA_ID,
): { scene: CanvasScene; warnings: string[]; builder: NewNodeGraphBuilder } {
  const builder = new NewNodeGraphBuilder(parseRegistry, warnings)
  builder.walkParsedNode(rootParsedId, 0, 0)
  return { scene: builder.buildScene(), warnings: builder.warnings, builder }
}

export function codeToNewNodeGraph(source: string): CodeToNewNodeGraphResult {
  const prepared = prepareCodeToNewNodeGraph(source)
  if (!prepared.ok) {
    return prepared
  }

  const { scene, warnings } = buildNewNodeGraphScene(
    prepared.parseRegistry,
    prepared.warnings,
    MAIN_SCHEMA_ID,
  )

  const finalScene = finalizeNewNodeGraphScene(scene)

  return {
    ok: true,
    scene: finalScene,
    warnings,
    schemas: prepared.schemas,
  }
}
