import type { CanvasScene } from './canvasScene'
import type { NodeSchemaDefinition } from './nodeSchema'
import { ritualJsonTextToCode } from './ritualJsonToCode'

export type AddonSystemFunctionContext = {
  nodeId: string
  addonId: string
  cardDOM: HTMLElement
  inputs: Record<string, unknown>
  readDomValue: (name: string) => string
}

export type CodeToNodeBlockProgress = {
  completed: number
  total: number
  currentLabel: string
  progressCountLabel: string
}

export type AddonSystemFunctionDeps = {
  extendSchemaLookup: Record<string, NodeSchemaDefinition>
  getScene: () => CanvasScene
  updateScene: (updater: (scene: CanvasScene) => CanvasScene) => void
  getAddonNodePosition: (nodeId: string) => { x: number; y: number } | null
  getAddonCardWidth: (nodeId: string) => number
  selectNode: (nodeId: string) => void
  focusIntoView: (nodeIds: string[]) => void
  showCodeToNodeBlockProgress: (progress: CodeToNodeBlockProgress) => void
  hideCodeToNodeBlockProgress: () => void
  showCodeToNodeBlockError: (title: string, body: string) => void
  showCodeToNodeBlockSummary: (title: string, body: string) => void
  showWarnings: (title: string, warnings: string[]) => void
  runCodeToNodeBlock: (
    ritualText: string,
    options: {
      mergeInto?: {
        scene: CanvasScene
        spawnPosition: { x: number; y: number }
      }
      shouldCancel?: () => boolean
      onProgress?: (progress: import('@/core/codeToBlockScene').CodeToBlockSceneProgress) => void
    },
  ) => Promise<
    | { ok: true; scene: CanvasScene; rootNodeId: string; warnings: string[] }
    | { ok: false; error: string }
  >
}

export type AddonSystemFunctionHandler = (
  ctx: AddonSystemFunctionContext,
  deps: AddonSystemFunctionDeps,
) => void | Promise<void>

const KNOWN_ADDON_SYSTEM_FUNCTIONS = ['codeToNodeBlock', 'jsonToNodeBlock'] as const

export type KnownAddonSystemFunction = (typeof KNOWN_ADDON_SYSTEM_FUNCTIONS)[number]

export function isKnownAddonSystemFunction(name: string): name is KnownAddonSystemFunction {
  return (KNOWN_ADDON_SYSTEM_FUNCTIONS as readonly string[]).includes(name.trim())
}

function formatProgressCountLabel(input: {
  completed: number
  total: number
  blockTotal: number
  parameterTotal: number
  blocksDone: number
  parametersDone: number
}): string {
  return `${String(input.completed)}/${String(input.total)} · Blocos ${String(input.blocksDone)}/${String(input.blockTotal)} · Parâmetros ${String(input.parametersDone)}/${String(input.parameterTotal)}`
}

function resolveCodeText(ctx: AddonSystemFunctionContext): string {
  const fromInput = String(ctx.inputs.code ?? '').trim()
  if (fromInput) {
    return fromInput
  }
  return ctx.readDomValue('code').trim()
}

function resolveJsonText(ctx: AddonSystemFunctionContext): string {
  const fromInput = String(ctx.inputs.json ?? '').trim()
  if (fromInput) {
    return fromInput
  }
  return ctx.readDomValue('json').trim()
}

async function handleCodeToNodeBlock(
  ctx: AddonSystemFunctionContext,
  deps: AddonSystemFunctionDeps,
): Promise<void> {
  const ritualText = resolveCodeText(ctx)
  if (!ritualText) {
    deps.showCodeToNodeBlockError(
      'Code To Node Block',
      'Não há código ritual para converter. Ligue um slot ou escreva no textarea.',
    )
    return
  }

  const anchor = deps.getAddonNodePosition(ctx.nodeId)
  if (!anchor) {
    deps.showCodeToNodeBlockError('Code To Node Block', 'Nó add-on não encontrado na cena.')
    return
  }

  const cardWidth = deps.getAddonCardWidth(ctx.nodeId)
  const spawnPosition = {
    x: anchor.x + cardWidth + 48,
    y: anchor.y,
  }

  deps.showCodeToNodeBlockProgress({
    completed: 0,
    total: 1,
    currentLabel: 'Etapa: A analisar código ritual…',
    progressCountLabel: '0/1 · Blocos 0/0 · Parâmetros 0/0',
  })

  const currentScene = deps.getScene()
  const result = await deps.runCodeToNodeBlock(ritualText, {
    mergeInto: {
      scene: currentScene,
      spawnPosition,
    },
    onProgress: (progress) => {
      const kindPrefix =
        progress.currentKind === 'parameter'
          ? 'Parâmetro'
          : progress.currentKind === 'block'
            ? 'Bloco'
            : 'Etapa'
      deps.showCodeToNodeBlockProgress({
        completed: progress.completed,
        total: progress.total,
        currentLabel: `${kindPrefix}: ${progress.currentLabel}`,
        progressCountLabel: formatProgressCountLabel(progress),
      })
    },
  })

  if (!result.ok) {
    deps.showCodeToNodeBlockError('Code To Node Block falhou', result.error)
    return
  }

  deps.hideCodeToNodeBlockProgress()
  deps.updateScene(() => result.scene)
  deps.selectNode(result.rootNodeId)
  requestAnimationFrame(() => {
    deps.focusIntoView([result.rootNodeId])
  })

  if (result.warnings.length > 0) {
    deps.showWarnings('[Code To Node Block]', result.warnings)
  }
}

async function handleJsonToNodeBlock(
  ctx: AddonSystemFunctionContext,
  deps: AddonSystemFunctionDeps,
): Promise<void> {
  const jsonText = resolveJsonText(ctx)
  if (!jsonText) {
    deps.showCodeToNodeBlockError(
      'JSON To Node Block',
      'Não há JSON ritual para converter. Ligue um slot ou escreva no textarea.',
    )
    return
  }

  let ritualText: string
  try {
    ritualText = ritualJsonTextToCode(jsonText)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    deps.showCodeToNodeBlockError('JSON To Node Block', message)
    return
  }

  await handleCodeToNodeBlock(
    {
      ...ctx,
      inputs: { ...ctx.inputs, code: ritualText },
    },
    deps,
  )
}

const HANDLERS: Record<KnownAddonSystemFunction, AddonSystemFunctionHandler> = {
  codeToNodeBlock: handleCodeToNodeBlock,
  jsonToNodeBlock: handleJsonToNodeBlock,
}

export function invokeAddonSystemFunction(
  functionName: string,
  ctx: AddonSystemFunctionContext,
  deps: AddonSystemFunctionDeps,
): void | Promise<void> {
  if (!isKnownAddonSystemFunction(functionName)) {
    return
  }
  const handler = HANDLERS[functionName]
  return handler(ctx, deps)
}

export function listKnownAddonSystemFunctions(): readonly KnownAddonSystemFunction[] {
  return KNOWN_ADDON_SYSTEM_FUNCTIONS
}
