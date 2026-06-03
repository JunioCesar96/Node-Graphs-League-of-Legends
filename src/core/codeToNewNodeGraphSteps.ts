import type { CanvasScene } from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import { MAIN_SCHEMA_ID, type MutableClassGroupSchema } from '@/core/classGroupRitualStackParser'
import { collectChildLinks, type ChildLink } from '@/core/codeToCanvasScene'
import {
  buildNewNodeGraphScene,
  finalizeNewNodeGraphScene,
  NewNodeGraphBuilder,
  type NewNodeMaterializePhase,
} from '@/core/codeToNewNodeGraph'

export type { ChildLink }

export type NewNodeGraphStep =
  | {
      id: string
      kind: 'createNodeShell'
      parsedId: string
      schemaTitle: string
      depth: number
      siblingIndex: number
    }
  | {
      id: string
      kind: 'defineElements'
      parsedId: string
      schemaTitle: string
    }
  | {
      id: string
      kind: 'defineValues'
      parsedId: string
      schemaTitle: string
    }
  | {
      id: string
      kind: 'defineInternals'
      parsedId: string
      schemaTitle: string
    }
  | {
      id: string
      kind: 'attachLink'
      parentParsedId: string
      parentSchemaTitle: string
      link: ChildLink
      childParsedId: string
      childSchemaTitle: string
      depth: number
      siblingIndex: number
    }

export type NewNodeGraphStepVerdict = {
  stepId: string
  verdict: 'correct' | 'wrong'
  wrongDescription?: string
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

function emitNodePhases(
  steps: NewNodeGraphStep[],
  emittedNodes: Set<string>,
  parsedId: string,
  parseRegistry: Map<string, MutableClassGroupSchema>,
  depth: number,
  siblingIndex: number,
  stepCounter: { value: number },
): void {
  if (emittedNodes.has(parsedId)) {
    return
  }

  const parsed = parseRegistry.get(parsedId)
  const title = parsed?.title.trim() || parsedId

  steps.push({
    id: makeStepId('shell', [parsedId], stepCounter.value++),
    kind: 'createNodeShell',
    parsedId,
    schemaTitle: title,
    depth,
    siblingIndex,
  })
  steps.push({
    id: makeStepId('elements', [parsedId], stepCounter.value++),
    kind: 'defineElements',
    parsedId,
    schemaTitle: title,
  })
  steps.push({
    id: makeStepId('values', [parsedId], stepCounter.value++),
    kind: 'defineValues',
    parsedId,
    schemaTitle: title,
  })
  steps.push({
    id: makeStepId('internals', [parsedId], stepCounter.value++),
    kind: 'defineInternals',
    parsedId,
    schemaTitle: title,
  })

  emittedNodes.add(parsedId)
}

export function planNewNodeGraphSteps(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  rootParsedId: string = MAIN_SCHEMA_ID,
): NewNodeGraphStep[] {
  const steps: NewNodeGraphStep[] = []
  const emittedNodes = new Set<string>()
  const stepCounter = { value: 0 }

  const planWalk = (
    parsedId: string,
    depth: number,
    siblingIndex: number,
    options?: { emitPhases?: boolean },
  ): void => {
    if (options?.emitPhases !== false) {
      emitNodePhases(steps, emittedNodes, parsedId, parseRegistry, depth, siblingIndex, stepCounter)
    }

    const parsed = parseRegistry.get(parsedId)
    if (!parsed) {
      return
    }

    const links = collectChildLinks(parsed)
    let childSibling = 0

    for (const link of links) {
      const childParsed = parseRegistry.get(link.childParsedId)
      steps.push({
        id: makeStepId('link', [parsedId, linkDescriptor(link), link.childParsedId], stepCounter.value++),
        kind: 'attachLink',
        parentParsedId: parsedId,
        parentSchemaTitle: parsed.title.trim() || parsedId,
        link,
        childParsedId: link.childParsedId,
        childSchemaTitle: childParsed?.title.trim() || link.childParsedId,
        depth: depth + 1,
        siblingIndex: childSibling,
      })

      planWalk(link.childParsedId, depth + 1, childSibling, { emitPhases: false })
      childSibling += 1
    }
  }

  planWalk(rootParsedId, 0, 0, { emitPhases: true })
  return steps
}

export function applyNewNodeGraphStep(builder: NewNodeGraphBuilder, step: NewNodeGraphStep): boolean {
  switch (step.kind) {
    case 'createNodeShell':
      return builder.ensureNodeShell(step.parsedId, step.depth, step.siblingIndex) !== null
    case 'defineElements':
      return builder.defineElements(step.parsedId) !== null
    case 'defineValues':
      return builder.defineValues(step.parsedId) !== null
    case 'defineInternals':
      return builder.defineInternals(step.parsedId) !== null
    case 'attachLink': {
      const parentCanvasId = builder.parsedToCanvas.get(step.parentParsedId)
      if (!parentCanvasId) {
        return false
      }
      const childCanvasId = builder.createChildCanvasNodeForLink(
        step.childParsedId,
        step.depth,
        step.siblingIndex,
      )
      if (!childCanvasId) {
        return false
      }
      return builder.attachLink(parentCanvasId, step.link, childCanvasId)
    }
    default:
      return false
  }
}

export function buildNewNodeGraphThroughSteps(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  initialWarnings: string[],
  steps: readonly NewNodeGraphStep[],
  throughIndex: number,
  options?: { hydrate?: boolean },
): { scene: CanvasScene; warnings: string[]; builder: NewNodeGraphBuilder } {
  const builder = new NewNodeGraphBuilder(parseRegistry, initialWarnings)
  const lastIndex = Math.min(throughIndex, steps.length - 1)

  for (let index = 0; index <= lastIndex; index += 1) {
    applyNewNodeGraphStep(builder, steps[index]!)
  }

  let scene = builder.buildScene()

  if (options?.hydrate && throughIndex >= steps.length - 1) {
    scene = finalizeNewNodeGraphScene(scene)
  }

  return { scene, warnings: builder.warnings, builder }
}

export function formatNewNodeGraphStepLabel(step: NewNodeGraphStep): string {
  switch (step.kind) {
    case 'createNodeShell':
      return `Criar nó (estrutura): ${step.schemaTitle}`
    case 'defineElements':
      return `Definir elementos: ${step.schemaTitle}`
    case 'defineValues':
      return `Definir valores: ${step.schemaTitle}`
    case 'defineInternals':
      return `Definir estruturas internas: ${step.schemaTitle}`
    case 'attachLink': {
      const field = linkDescriptor(step.link) + linkSuffix(step.link)
      return `Ligar: ${step.parentSchemaTitle} → ${step.childSchemaTitle} (${field})`
    }
    default:
      return 'Passo'
  }
}

export function getNewNodeGraphStepFocusNodeIds(
  step: NewNodeGraphStep,
  parsedToCanvas: ReadonlyMap<string, string>,
): string[] {
  if (step.kind === 'createNodeShell' || step.kind === 'defineElements' || step.kind === 'defineValues' || step.kind === 'defineInternals') {
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

export function formatNewNodeGraphWizardSummary(
  steps: readonly NewNodeGraphStep[],
  verdicts: readonly NewNodeGraphStepVerdict[],
): {
  wrongCount: number
  lines: string[]
} {
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const wrong = verdicts.filter((item) => item.verdict === 'wrong')
  const lines = wrong.map((item) => {
    const step = stepById.get(item.stepId)
    const label = step ? formatNewNodeGraphStepLabel(step) : item.stepId
    const note = item.wrongDescription?.trim()
    return note ? `• ${label}: ${note}` : `• ${label}`
  })
  return { wrongCount: wrong.length, lines }
}

/** Paridade one-shot vs incremental (útil em testes). */
export function buildFullNewNodeGraphScene(
  parseRegistry: Map<string, MutableClassGroupSchema>,
  warnings: string[],
): CanvasScene {
  const { scene } = buildNewNodeGraphScene(parseRegistry, warnings, MAIN_SCHEMA_ID)
  return finalizeNewNodeGraphScene(scene)
}
