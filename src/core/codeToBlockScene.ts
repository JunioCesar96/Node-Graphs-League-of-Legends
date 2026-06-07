import type { CanvasScene } from './canvasScene'
import { buildCodeToBlockScene, buildCodeToBlockSceneSync } from './codeToBlockSceneBuild'
import { buildCodeToBlockSceneInWorker } from './sceneComputeWorkerClient'
import type { NodeSchemaDefinition } from './nodeSchema'

export type CodeToBlockSceneResult =
  | { ok: true; scene: CanvasScene; rootNodeId: string; warnings: string[] }
  | { ok: false; error: string }

export type CodeToBlockSceneProgressKind = 'phase' | 'block' | 'parameter'

export type CodeToBlockSceneProgress = {
  completed: number
  total: number
  currentLabel: string
  currentKind: CodeToBlockSceneProgressKind
  blockTotal: number
  parameterTotal: number
  blocksDone: number
  parametersDone: number
}

export type CodeToBlockSceneOptions = {
  rootBlockName?: string
  onProgress?: (progress: CodeToBlockSceneProgress) => void
  shouldCancel?: () => boolean
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    const scheduler =
      typeof globalThis.requestAnimationFrame === 'function'
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : (callback: FrameRequestCallback) => globalThis.setTimeout(() => callback(Date.now()), 0)
    scheduler(() => resolve())
  })
}

export function codeToBlockScene(
  ritualText: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  options?: Pick<CodeToBlockSceneOptions, 'rootBlockName'>,
): CodeToBlockSceneResult {
  return buildCodeToBlockSceneSync(ritualText, schemaLookup, options)
}

export async function codeToBlockSceneAsync(
  ritualText: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  options?: CodeToBlockSceneOptions,
): Promise<CodeToBlockSceneResult> {
  const report = (progress: CodeToBlockSceneProgress) => {
    options?.onProgress?.(progress)
  }

  report({
    completed: 0,
    total: 1,
    currentLabel: 'A analisar código ritual…',
    currentKind: 'phase',
    blockTotal: 0,
    parameterTotal: 0,
    blocksDone: 0,
    parametersDone: 0,
  })

  const workerPromise = buildCodeToBlockSceneInWorker(ritualText, schemaLookup, options)

  if (workerPromise) {
    try {
      return await workerPromise
    } catch {
      report({
        completed: 0,
        total: 1,
        currentLabel: 'Worker indisponível — a processar na janela principal…',
        currentKind: 'phase',
        blockTotal: 0,
        parameterTotal: 0,
        blocksDone: 0,
        parametersDone: 0,
      })
    }
  }

  return buildCodeToBlockScene(ritualText, schemaLookup, {
    rootBlockName: options?.rootBlockName,
    onProgress: options?.onProgress,
    shouldCancel: options?.shouldCancel,
    yieldUi: yieldToUi,
  })
}
