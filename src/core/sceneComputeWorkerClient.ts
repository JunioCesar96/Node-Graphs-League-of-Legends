import { createCompactElementCanvasVisibility, type CompactElementCanvasVisibility } from '@/core/canvasNodePresentation'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import type {
  CodeToBlockSceneOptions,
  CodeToBlockSceneProgress,
  CodeToBlockSceneResult,
} from '@/core/codeToBlockScene'
import type {
  SceneComputeWorkerRequest,
  SceneComputeWorkerResponse,
} from '@/workers/sceneCompute.worker'

/** Acima disto, visibilidade compacta corre no Web Worker. */
export const SCENE_COMPUTE_WORKER_NODE_THRESHOLD = 40

function sceneWorkersDisabled(): boolean {
  return import.meta.env.VITE_DISABLE_SCENE_WORKERS === 'true'
}

/** Code To Node Block no worker está opt-in — o payload (schema + cena) é pesado para clonar. */
function codeToBlockWorkerEnabled(): boolean {
  return import.meta.env.VITE_CODE_TO_BLOCK_WORKER === 'true'
}

export function isSceneComputeWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined' && !sceneWorkersDisabled()
}

export function shouldUseSceneComputeWorker(nodeCount: number): boolean {
  return isSceneComputeWorkerAvailable() && nodeCount > SCENE_COMPUTE_WORKER_NODE_THRESHOLD
}

type PendingJob =
  | {
      kind: 'compactVisibility'
      resolve: (value: CompactElementCanvasVisibility) => void
      reject: (reason: unknown) => void
    }
  | {
      kind: 'codeToBlock'
      resolve: (value: CodeToBlockSceneResult) => void
      reject: (reason: unknown) => void
      onProgress?: (progress: CodeToBlockSceneProgress) => void
    }

let workerInstance: Worker | null = null
let jobCounter = 0
const pendingJobs = new Map<number, PendingJob>()

function rejectAllPending(error: unknown): void {
  for (const job of pendingJobs.values()) {
    job.reject(error)
  }
  pendingJobs.clear()
}

function getWorker(): Worker | null {
  if (!isSceneComputeWorkerAvailable()) {
    return null
  }

  if (workerInstance) {
    return workerInstance
  }

  try {
    workerInstance = new Worker(new URL('../workers/sceneCompute.worker.ts', import.meta.url), {
      type: 'module',
    })

    workerInstance.onmessage = (event: MessageEvent<SceneComputeWorkerResponse>) => {
      const message = event.data

      if (message.kind === 'codeToBlockProgress') {
        const job = pendingJobs.get(message.jobId)
        if (job?.kind === 'codeToBlock') {
          job.onProgress?.(message.progress)
        }
        return
      }

      const job = pendingJobs.get(message.jobId)
      if (!job) {
        return
      }

      pendingJobs.delete(message.jobId)

      if (!message.ok) {
        job.reject(new Error(message.error))
        return
      }

      if (message.kind === 'compactVisibility' && job.kind === 'compactVisibility') {
        job.resolve({
          hiddenNodeIds: new Set(message.hiddenNodeIds),
          listCollapsedBodyNodeIds: new Set(message.listCollapsedBodyNodeIds),
        })
        return
      }

      if (message.kind === 'codeToBlock' && job.kind === 'codeToBlock') {
        job.resolve(message.result)
      }
    }

    workerInstance.onerror = (event) => {
      rejectAllPending(event.error ?? new Error('Scene compute worker falhou'))
      workerInstance?.terminate()
      workerInstance = null
    }

    return workerInstance
  } catch {
    workerInstance = null
    return null
  }
}

function postJob<T>(request: SceneComputeWorkerRequest, job: PendingJob): Promise<T> {
  const worker = getWorker()

  if (!worker) {
    return Promise.reject(new Error('Web Worker indisponível'))
  }

  return new Promise<T>((resolve, reject) => {
    pendingJobs.set(request.jobId, { ...job, resolve: resolve as PendingJob['resolve'], reject })
    worker.postMessage(request)
  })
}

export function computeCompactVisibilityInWorker(
  scene: CanvasScene,
  lightModeDefaultFirst: boolean,
): Promise<CompactElementCanvasVisibility> {
  if (!shouldUseSceneComputeWorker(scene.nodes.length)) {
    return Promise.resolve(
      createCompactElementCanvasVisibility(scene, { lightModeDefaultFirst }),
    )
  }

  const jobId = ++jobCounter

  return postJob<CompactElementCanvasVisibility>(
    {
      jobId,
      kind: 'compactVisibility',
      scene,
      lightModeDefaultFirst,
    },
    {
      kind: 'compactVisibility',
      resolve: () => undefined,
      reject: () => undefined,
    },
  ).catch(() => createCompactElementCanvasVisibility(scene, { lightModeDefaultFirst }))
}

export function buildCodeToBlockSceneInWorker(
  ritualText: string,
  schemaLookup: Record<string, NodeSchemaDefinition>,
  options?: CodeToBlockSceneOptions,
): Promise<CodeToBlockSceneResult> | null {
  if (!isSceneComputeWorkerAvailable() || !codeToBlockWorkerEnabled()) {
    return null
  }

  const jobId = ++jobCounter

  return postJob<CodeToBlockSceneResult>(
    {
      jobId,
      kind: 'codeToBlock',
      ritualText,
      schemaLookup,
      rootBlockName: options?.rootBlockName,
    },
    {
      kind: 'codeToBlock',
      resolve: () => undefined,
      reject: () => undefined,
      onProgress: options?.onProgress,
    },
  )
}

/** Termina o worker partilhado (ex.: testes). */
export function terminateSceneComputeWorker(): void {
  rejectAllPending(new Error('Scene compute worker terminado'))
  workerInstance?.terminate()
  workerInstance = null
}
