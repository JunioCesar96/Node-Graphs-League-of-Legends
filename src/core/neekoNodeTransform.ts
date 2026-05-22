import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene } from '@/core/canvasScene'
import { hydrateScene } from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import {
  findParsedSchemaInRegistry,
  MAIN_SCHEMA_ID,
  normalizeStandaloneClassGroupRitual,
  parseClassGroupRitualWithStack,
  type MutableClassGroupSchema,
} from '@/core/classGroupRitualStackParser'
import { MAP_ENTRY_HEAD_REGEX, STRUCT_ONLY_LINE } from '@/core/classGroupFieldClassifier'
import { collectChildLinks } from '@/core/codeToCanvasScene'
import {
  finalizeNewNodeGraphScene,
  materializeParsedSchemaAtPhase,
  NewNodeGraphBuilder,
  type NewNodeMaterializePhase,
} from '@/core/codeToNewNodeGraph'
import { createUniqueNodeId } from '@/core/canvasNodeIds'
import { defaultNewCanvasNodeLayout } from '@/core/nodeCardSections'
import {
  NEEKO_DISK_PACK_FOLDER,
  prepareNeekoSchemasForDisk,
} from '@/core/neekoNodeDiskLayout'

export const NEEKO_SCHEMA_ID = 'neeko'

const NEEKO_LAYOUT_DEPTH_STEP_X = 520
const NEEKO_LAYOUT_SIBLING_STEP_Y = 110

const NEEKO_PHASE_SEQUENCE: NewNodeMaterializePhase[] = ['shell', 'elements', 'values', 'internals']

export type NeekoBuildPlan = {
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  warnings: string[]
  rootCanvasNodeId: string
  rootParsedId: string
}

export type PrepareNeekoTransformResult =
  | {
      ok: true
      parseRegistry: Map<string, MutableClassGroupSchema>
      rootParsedId: string
      warnings: string[]
    }
  | { ok: false; error: string }

export type NeekoTransformResult =
  | { ok: true; scene: CanvasScene; warnings: string[]; rootCanvasNodeId: string }
  | { ok: false; error: string }

export function isNeekoSchemaId(schemaId: string): boolean {
  return schemaId === NEEKO_SCHEMA_ID
}

export function neekoPhaseSequence(): readonly NewNodeMaterializePhase[] {
  return NEEKO_PHASE_SEQUENCE
}

export function stripNeekoTransientFromScene(scene: CanvasScene): CanvasScene {
  let changed = false
  const nodes = scene.nodes.map((canvasNode) => {
    if (canvasNode.neekoTransformPhase === undefined) {
      return canvasNode
    }
    changed = true
    const { neekoTransformPhase: _phase, neekoTransformError: _err, ...rest } = canvasNode
    return rest
  })
  return changed ? { ...scene, nodes } : scene
}

function inferStandaloneRootTypeTitle(source: string): string | null {
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }

    const mapEntry = MAP_ENTRY_HEAD_REGEX.exec(trimmed)
    if (mapEntry?.[3]) {
      return mapEntry[3]!
    }

    const structOnly = STRUCT_ONLY_LINE.exec(trimmed)
    if (structOnly?.[1]) {
      return structOnly[1]!
    }

    break
  }

  return null
}

function findRootParsedIdByTypeTitle(
  registry: Map<string, MutableClassGroupSchema>,
  candidateIds: readonly string[],
  typeTitle: string,
): string | null {
  for (const id of candidateIds) {
    const schema = registry.get(id)
    if (schema?.title === typeTitle) {
      return id
    }
  }

  for (const id of candidateIds) {
    if (id === typeTitle || id.startsWith(`${typeTitle}__`)) {
      return id
    }
  }

  const titleLower = typeTitle.toLowerCase()
  for (const id of candidateIds) {
    const schema = registry.get(id)
    if (schema?.title.toLowerCase() === titleLower) {
      return id
    }
  }

  return null
}

export function resolveNeekoRootParsedId(
  registry: Map<string, MutableClassGroupSchema>,
  rootSchemaIds: ReadonlySet<string>,
  options?: { sourceText?: string },
): { rootParsedId: string; warnings: string[] } | { error: string } {
  const roots = [...rootSchemaIds]
  const warnings: string[] = []

  if (roots.length === 0) {
    return { error: 'Nenhum tipo raiz encontrado no ritual.' }
  }

  const nonMain = roots.filter((id) => id !== MAIN_SCHEMA_ID)

  if (roots.length === 1 && roots[0] !== MAIN_SCHEMA_ID) {
    return { rootParsedId: roots[0]!, warnings }
  }

  if (roots.includes(MAIN_SCHEMA_ID)) {
    const main = registry.get(MAIN_SCHEMA_ID)
    if (!main) {
      return { error: 'Schema main ausente no parse.' }
    }
    const links = collectChildLinks(main)
    if (links.length === 0) {
      return { error: 'Ritual com entries: map sem entradas para transformar.' }
    }
    if (links.length > 1) {
      warnings.push(
        `Várias entradas em main; a usar a primeira («${links[0]!.childParsedId}»).`,
      )
    }
    return { rootParsedId: links[0]!.childParsedId, warnings }
  }

  if (nonMain.length > 0) {
    const inferredTitle = options?.sourceText
      ? inferStandaloneRootTypeTitle(options.sourceText)
      : null

    if (inferredTitle && nonMain.length > 1) {
      const matched = findRootParsedIdByTypeTitle(registry, nonMain, inferredTitle)
      if (matched) {
        warnings.push(`Vários tipos raiz; a usar «${matched}» (tipo inferido do ritual).`)
        return { rootParsedId: matched, warnings }
      }
    }

    if (nonMain.length > 1) {
      warnings.push(`Vários tipos raiz; a usar «${nonMain[0]!}».`)
    }
    return { rootParsedId: nonMain[0]!, warnings }
  }

  return { rootParsedId: roots[0]!, warnings }
}

export function prepareNeekoTransform(source: string): PrepareNeekoTransformResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  if (text.length === 0) {
    return { ok: false, error: 'Texto ritual vazio.' }
  }

  const normalized = normalizeStandaloneClassGroupRitual(text)
  const parsed = parseClassGroupRitualWithStack(normalized)

  if (parsed.registry.size === 0) {
    return { ok: false, error: 'Nenhum schema gerado a partir do ritual.' }
  }

  const resolved = resolveNeekoRootParsedId(parsed.registry, parsed.rootSchemaIds, {
    sourceText: text,
  })
  if ('error' in resolved) {
    return { ok: false, error: resolved.error }
  }

  return {
    ok: true,
    parseRegistry: parsed.registry,
    rootParsedId: resolved.rootParsedId,
    warnings: [...parsed.warnings, ...resolved.warnings],
  }
}

export function materializeNeekoRootAtPhase(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  rootParsedId: string,
  instanceId: string,
  phase: NewNodeMaterializePhase,
) {
  const parsed = parseRegistry.get(rootParsedId)
  if (!parsed) {
    return null
  }
  return materializeParsedSchemaAtPhase(parsed, instanceId, phase)
}

export class NeekoGraphBuilder extends NewNodeGraphBuilder {
  private readonly anchorPosition: CanvasPosition

  private readonly replaceCanvasNodeId: string

  private readonly existingRootCanvasNode: CanvasNode

  constructor(
    parseRegistry: Map<string, MutableClassGroupSchema>,
    parseWarnings: string[],
    anchorPosition: CanvasPosition,
    replaceCanvasNodeId: string,
    existingRootCanvasNode: CanvasNode,
  ) {
    super(parseRegistry, parseWarnings)
    this.anchorPosition = anchorPosition
    this.replaceCanvasNodeId = replaceCanvasNodeId
    this.existingRootCanvasNode = existingRootCanvasNode
  }

  layoutPosition(depth: number, siblingIndex: number): CanvasPosition {
    return {
      x: this.anchorPosition.x + depth * NEEKO_LAYOUT_DEPTH_STEP_X,
      y: this.anchorPosition.y + siblingIndex * NEEKO_LAYOUT_SIBLING_STEP_Y,
    }
  }

  seedRootAtInternals(rootParsedId: string): void {
    const parsed = this.parseRegistry.get(rootParsedId)
    if (!parsed) {
      this.warnings.push(`Schema parseado «${rootParsedId}» não encontrado.`)
      return
    }

    const node = materializeParsedSchemaAtPhase(parsed, this.replaceCanvasNodeId, 'internals')
    const canvasNode: CanvasNode = {
      ...this.existingRootCanvasNode,
      node,
      position: this.anchorPosition,
      ...defaultNewCanvasNodeLayout(node),
      neekoTransformPhase: undefined,
      neekoTransformError: undefined,
    }

    this.nodes.push(canvasNode)
    this.parsedToCanvas.set(rootParsedId, this.replaceCanvasNodeId)
    this.phaseByParsedId.set(rootParsedId, 'internals')
  }

  buildSubtreeOnly(rootParsedId: string): void {
    this.seedRootAtInternals(rootParsedId)
    this.walkParsedSubtree(rootParsedId, this.replaceCanvasNodeId, 0, 0)
    this.syncStructuralSlotsOnNodes()
  }

  override walkParsedSubtree(
    templateParsedId: string,
    canvasId: string,
    depth: number,
    _siblingIndex: number,
  ): void {
    const parsed = findParsedSchemaInRegistry(this.parseRegistry, templateParsedId)
    if (!parsed) {
      this.warnings.push(`Subárvore: schema «${templateParsedId}» não encontrado no parse.`)
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

  override createChildCanvasNodeForLink(
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
    const position = this.layoutPosition(depth, siblingIndex)

    const canvasNode: CanvasNode = {
      id: instanceId,
      node,
      position,
      ...defaultNewCanvasNodeLayout(node),
    }

    this.nodes.push(canvasNode)
    return instanceId
  }
}

export function buildNeekoSubtreePlan(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  warnings: string[],
  rootParsedId: string,
  anchorPosition: CanvasPosition,
  replaceCanvasNodeId: string,
  existingRootCanvasNode: CanvasNode,
): NeekoBuildPlan {
  const builder = new NeekoGraphBuilder(
    parseRegistry,
    warnings,
    anchorPosition,
    replaceCanvasNodeId,
    existingRootCanvasNode,
  )
  builder.buildSubtreeOnly(rootParsedId)

  return {
    nodes: builder.nodes,
    connections: builder.connections,
    warnings: builder.warnings,
    rootCanvasNodeId: replaceCanvasNodeId,
    rootParsedId,
  }
}

export function applyNeekoTransformToScene(
  scene: CanvasScene,
  neekoCanvasNodeId: string,
  plan: NeekoBuildPlan,
): CanvasScene {
  const planNodeIds = new Set(plan.nodes.map((node) => node.id))
  const keptNodes = scene.nodes.filter(
    (node) => node.id !== neekoCanvasNodeId && !planNodeIds.has(node.id),
  )

  const planConnectionIds = new Set(plan.connections.map((connection) => connection.id))
  const keptConnections = scene.connections.filter((connection) => {
    if (planConnectionIds.has(connection.id)) {
      return false
    }
    if (connection.toNodeId === neekoCanvasNodeId) {
      return true
    }
    if (planNodeIds.has(connection.fromNodeId) || planNodeIds.has(connection.toNodeId)) {
      return false
    }
    return true
  })

  const merged: CanvasScene = {
    ...scene,
    nodes: [...keptNodes, ...plan.nodes],
    connections: [...keptConnections, ...plan.connections],
  }

  return finalizeNewNodeGraphScene(merged)
}

export type NeekoDiskPersistResult = {
  ok: boolean
  paths?: string[]
  warnings: string[]
  error?: string
}

export async function persistNeekoSubtreeToDisk(plan: NeekoBuildPlan): Promise<NeekoDiskPersistResult> {
  const warnings: string[] = []

  if (!import.meta.env.DEV) {
    return { ok: true, warnings }
  }

  const schemas = prepareNeekoSchemasForDisk(plan.nodes)
  if (schemas.length === 0) {
    return { ok: true, warnings }
  }

  try {
    const res = await fetch('/api/node-structures-write', {
      body: JSON.stringify({
        folder: NEEKO_DISK_PACK_FOLDER,
        layout: 'neeko',
        schemas,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    const payload: unknown = await res.json().catch(() => null)
    const ok =
      res.ok &&
      typeof payload === 'object' &&
      payload !== null &&
      'ok' in payload &&
      Reflect.get(payload, 'ok') === true

    if (ok && typeof payload === 'object' && payload !== null) {
      const paths = Reflect.get(payload, 'paths')
      const list = Array.isArray(paths) ? paths.map(String) : []
      for (const rel of list) {
        warnings.push(`Disco (dev): gravado ${NEEKO_DISK_PACK_FOLDER}/${rel}`)
      }
      return { ok: true, paths: list, warnings }
    }

    const errMsg =
      typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
        ? String(Reflect.get(payload, 'error'))
        : `HTTP ${String(res.status)}`

    warnings.push(`Disco (dev): falha ao gravar schemas Neeko (${errMsg}).`)
    return { ok: false, error: errMsg, warnings }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    warnings.push(`Disco (dev): pedido falhou (${errMsg}).`)
    return { ok: false, error: errMsg, warnings }
  }
}

export async function buildNeekoTransformScene(
  scene: CanvasScene,
  neekoCanvasNodeId: string,
  source: string,
): Promise<NeekoTransformResult> {
  const prepared = prepareNeekoTransform(source)
  if (!prepared.ok) {
    return prepared
  }

  const neekoNode = scene.nodes.find((node) => node.id === neekoCanvasNodeId)
  if (!neekoNode) {
    return { ok: false, error: 'Neeko Node não encontrado na cena.' }
  }

  if (!isNeekoSchemaId(neekoNode.node.schema.id)) {
    return { ok: false, error: 'O nó seleccionado já não é um Neeko Node.' }
  }

  const plan = buildNeekoSubtreePlan(
    prepared.parseRegistry,
    prepared.warnings,
    prepared.rootParsedId,
    neekoNode.position,
    neekoCanvasNodeId,
    neekoNode,
  )

  const diskPersist = await persistNeekoSubtreeToDisk(plan)
  const mergedWarnings = [...plan.warnings, ...diskPersist.warnings]

  const nextScene = applyNeekoTransformToScene(scene, neekoCanvasNodeId, plan)

  return {
    ok: true,
    scene: nextScene,
    warnings: mergedWarnings,
    rootCanvasNodeId: neekoCanvasNodeId,
  }
}

export function hydrateNeekoScene(scene: CanvasScene): CanvasScene {
  return syncSceneCollapsedBodyWireless(hydrateScene(stripNeekoTransientFromScene(scene)))
}
