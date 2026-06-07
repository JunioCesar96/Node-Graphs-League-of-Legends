import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  hydrateScene,
  type CanvasScene,
} from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import {
  MAIN_SCHEMA_ID,
  parseClassGroupRitualWithStack,
  type MutableClassGroupSchema,
} from '@/core/classGroupRitualStackParser'
import {
  buildPackTypeIndex,
  collectChildLinks,
  SceneBuilder,
  type ChildLink,
} from '@/core/codeToCanvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { applyHideLinkedChildrenForVfxEmitterNodes } from '@/core/vfxEmitterLinkedChildrenVisibility'

export type { ChildLink }

export type CodeToCanvasStep =
  | {
      id: string
      kind: 'createNode'
      parsedId: string
      schemaTitle: string
      depth: number
      siblingIndex: number
    }
  | {
      id: string
      kind: 'attachLink'
      parentParsedId: string
      parentSchemaTitle: string
      link: ChildLink
      childParsedId: string
      childSchemaTitle: string
    }

export type StepVerdict = {
  stepId: string
  verdict: 'correct' | 'wrong'
  wrongDescription?: string
}

export type PrepareCodeToCanvasBuildResult =
  | {
      ok: true
      steps: CodeToCanvasStep[]
      parseRegistry: Map<string, MutableClassGroupSchema>
      typeIndex: ReturnType<typeof buildPackTypeIndex>
      warnings: string[]
    }
  | { ok: false; error: string }

export function createEmptyCodeToCanvasScene(): CanvasScene {
  return {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    nodes: [],
    connections: [],
  }
}

function linkDescriptor(link: ChildLink): string {
  switch (link.kind) {
    case 'internal':
    case 'embed':
    case 'pointer':
    case 'listEmbed':
    case 'listPointer':
    case 'list2Embed':
    case 'list2Pointer':
      return link.fieldName
    case 'mapHashEmbed':
    case 'mapHashPointer':
    case 'mapU64Pointer':
      return `${link.parameterName}["${link.entryKey}"]`
    default:
      return 'link'
  }
}

function linkSuffix(link: ChildLink): string {
  if (link.kind === 'listEmbed' || link.kind === 'listPointer') {
    return ` [${String(link.index)}]`
  }
  if (link.kind === 'list2Embed' || link.kind === 'list2Pointer') {
    return ` (instância ${String(link.instanceIndex)})`
  }
  return ''
}

function makeStepId(kind: string, parts: string[], index: number): string {
  return `${kind}:${parts.join(':')}:${String(index)}`
}

export function planBuildSteps(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  rootParsedId: string = MAIN_SCHEMA_ID,
): CodeToCanvasStep[] {
  const steps: CodeToCanvasStep[] = []
  const emittedNodes = new Set<string>()
  let stepCounter = 0

  const planWalk = (parsedId: string, depth: number, siblingIndex: number): void => {
    if (!emittedNodes.has(parsedId)) {
      const parsed = parseRegistry.get(parsedId)
      steps.push({
        id: makeStepId('node', [parsedId], stepCounter++),
        kind: 'createNode',
        parsedId,
        schemaTitle: parsed?.title.trim() || parsedId,
        depth,
        siblingIndex,
      })
      emittedNodes.add(parsedId)
    }

    const parsed = parseRegistry.get(parsedId)
    if (!parsed) {
      return
    }

    const links = collectChildLinks(parsed)
    let childSibling = 0

    for (const link of links) {
      if (!emittedNodes.has(link.childParsedId)) {
        const childParsed = parseRegistry.get(link.childParsedId)
        steps.push({
          id: makeStepId('node', [link.childParsedId], stepCounter++),
          kind: 'createNode',
          parsedId: link.childParsedId,
          schemaTitle: childParsed?.title.trim() || link.childParsedId,
          depth: depth + 1,
          siblingIndex: childSibling,
        })
        emittedNodes.add(link.childParsedId)
      }

      const childParsed = parseRegistry.get(link.childParsedId)
      steps.push({
        id: makeStepId('link', [parsedId, linkDescriptor(link), link.childParsedId], stepCounter++),
        kind: 'attachLink',
        parentParsedId: parsedId,
        parentSchemaTitle: parsed.title.trim() || parsedId,
        link,
        childParsedId: link.childParsedId,
        childSchemaTitle: childParsed?.title.trim() || link.childParsedId,
      })

      planWalk(link.childParsedId, depth + 1, childSibling)
      childSibling += 1
    }
  }

  planWalk(rootParsedId, 0, 0)
  return steps
}

export function prepareCodeToCanvasBuild(
  source: string,
  packFolder: string,
  registry: Record<string, NodeSchemaDefinition>,
  packFolderBySchemaId: Record<string, string>,
): PrepareCodeToCanvasBuildResult {
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

  const typeIndex = buildPackTypeIndex(schemasInPack)
  const parsed = parseClassGroupRitualWithStack(text)

  if (!parsed.registry.has(MAIN_SCHEMA_ID)) {
    return {
      ok: false,
      error:
        'Não foi possível obter o nó main a partir do ritual (esperado entries: map ou estrutura Class Group).',
    }
  }

  const steps = planBuildSteps(parsed.registry)

  if (steps.length === 0) {
    return { ok: false, error: 'Nenhum passo de construção gerado a partir do ritual.' }
  }

  return {
    ok: true,
    steps,
    parseRegistry: parsed.registry,
    typeIndex,
    warnings: [...parsed.warnings],
  }
}

export function applyCodeToCanvasStep(builder: SceneBuilder, step: CodeToCanvasStep): boolean {
  if (step.kind === 'createNode') {
    return builder.ensureCanvasNode(step.parsedId, step.depth, step.siblingIndex) !== null
  }

  const parentCanvasId = builder.parsedToCanvas.get(step.parentParsedId)
  const childCanvasId = builder.parsedToCanvas.get(step.childParsedId)
  if (!parentCanvasId || !childCanvasId) {
    return false
  }

  return builder.attachLink(parentCanvasId, step.link, childCanvasId)
}

export function buildSceneThroughSteps(
  registry: Record<string, NodeSchemaDefinition>,
  typeIndex: ReturnType<typeof buildPackTypeIndex>,
  parseRegistry: Map<string, MutableClassGroupSchema>,
  initialWarnings: string[],
  steps: readonly CodeToCanvasStep[],
  throughIndex: number,
  options?: { hydrate?: boolean },
): { scene: CanvasScene; warnings: string[]; builder: SceneBuilder } {
  const builder = new SceneBuilder(registry, typeIndex, parseRegistry, initialWarnings)
  const lastIndex = Math.min(throughIndex, steps.length - 1)

  for (let index = 0; index <= lastIndex; index += 1) {
    applyCodeToCanvasStep(builder, steps[index]!)
  }

  let scene = builder.buildScene()

  if (options?.hydrate && throughIndex >= steps.length - 1) {
    scene = syncSceneCollapsedBodyWireless(hydrateScene(scene))
  }

  return { scene, warnings: builder.warnings, builder }
}

export function finalizeCodeToCanvasScene(scene: CanvasScene): CanvasScene {
  return applyHideLinkedChildrenForVfxEmitterNodes(
    syncSceneCollapsedBodyWireless(hydrateScene(scene)),
  )
}

export function formatStepLabel(step: CodeToCanvasStep): string {
  if (step.kind === 'createNode') {
    return `Criar nó: ${step.schemaTitle}`
  }

  const field = linkDescriptor(step.link) + linkSuffix(step.link)
  return `Ligar: ${step.parentSchemaTitle} → ${step.childSchemaTitle} (${field})`
}

export function getStepFocusNodeIds(
  step: CodeToCanvasStep,
  parsedToCanvas: ReadonlyMap<string, string>,
): string[] {
  if (step.kind === 'createNode') {
    const nodeId = parsedToCanvas.get(step.parsedId)
    return nodeId ? [nodeId] : []
  }

  const parentId = parsedToCanvas.get(step.parentParsedId)
  const childId = parsedToCanvas.get(step.childParsedId)
  const ids: string[] = []
  if (parentId) {
    ids.push(parentId)
  }
  if (childId && childId !== parentId) {
    ids.push(childId)
  }
  return ids
}

export function formatWizardSummary(
  steps: readonly CodeToCanvasStep[],
  verdicts: readonly StepVerdict[],
): {
  wrongCount: number
  lines: string[]
} {
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const wrong = verdicts.filter((item) => item.verdict === 'wrong')
  const lines = wrong.map((item) => {
    const step = stepById.get(item.stepId)
    const label = step ? formatStepLabel(step) : item.stepId
    const note = item.wrongDescription?.trim()
    return note ? `• ${label}: ${note}` : `• ${label}`
  })
  return { wrongCount: wrong.length, lines }
}
