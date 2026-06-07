import { buildCodeToBlockScene } from '@/core/codeToBlockSceneBuild'
import type { CodeToBlockSceneProgress, CodeToBlockSceneResult } from '@/core/codeToBlockScene'
import { createCompactElementCanvasVisibility } from '@/core/canvasNodePresentation'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

export type SceneComputeWorkerRequest =
  | {
      jobId: number
      kind: 'compactVisibility'
      scene: CanvasScene
      lightModeDefaultFirst: boolean
    }
  | {
      jobId: number
      kind: 'codeToBlock'
      ritualText: string
      schemaLookup: Record<string, NodeSchemaDefinition>
      rootBlockName?: string
    }

export type SceneComputeWorkerResponse =
  | {
      jobId: number
      kind: 'compactVisibility'
      ok: true
      hiddenNodeIds: string[]
      listCollapsedBodyNodeIds: string[]
    }
  | {
      jobId: number
      kind: 'codeToBlockProgress'
      progress: CodeToBlockSceneProgress
    }
  | {
      jobId: number
      kind: 'codeToBlock'
      ok: true
      result: CodeToBlockSceneResult
    }
  | {
      jobId: number
      kind: 'compactVisibility' | 'codeToBlock'
      ok: false
      error: string
    }

self.onmessage = (event: MessageEvent<SceneComputeWorkerRequest>) => {
  const message = event.data

  if (message.kind === 'compactVisibility') {
    try {
      const visibility = createCompactElementCanvasVisibility(message.scene, {
        lightModeDefaultFirst: message.lightModeDefaultFirst,
      })

      const response: SceneComputeWorkerResponse = {
        jobId: message.jobId,
        kind: 'compactVisibility',
        ok: true,
        hiddenNodeIds: [...visibility.hiddenNodeIds],
        listCollapsedBodyNodeIds: [...visibility.listCollapsedBodyNodeIds],
      }
      self.postMessage(response)
    } catch (error) {
      const response: SceneComputeWorkerResponse = {
        jobId: message.jobId,
        kind: 'compactVisibility',
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
      self.postMessage(response)
    }
    return
  }

  void (async () => {
    try {
      const ackProgress: CodeToBlockSceneProgress = {
        completed: 0,
        total: 1,
        currentLabel: 'A processar em segundo plano…',
        currentKind: 'phase',
        blockTotal: 0,
        parameterTotal: 0,
        blocksDone: 0,
        parametersDone: 0,
      }
      self.postMessage({
        jobId: message.jobId,
        kind: 'codeToBlockProgress',
        progress: ackProgress,
      } satisfies SceneComputeWorkerResponse)

      const result = await buildCodeToBlockScene(message.ritualText, message.schemaLookup, {
        rootBlockName: message.rootBlockName,
        onProgress: (progress) => {
          const progressResponse: SceneComputeWorkerResponse = {
            jobId: message.jobId,
            kind: 'codeToBlockProgress',
            progress,
          }
          self.postMessage(progressResponse)
        },
      })

      const response: SceneComputeWorkerResponse = {
        jobId: message.jobId,
        kind: 'codeToBlock',
        ok: true,
        result,
      }
      self.postMessage(response)
    } catch (error) {
      const response: SceneComputeWorkerResponse = {
        jobId: message.jobId,
        kind: 'codeToBlock',
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
      self.postMessage(response)
    }
  })()
}
