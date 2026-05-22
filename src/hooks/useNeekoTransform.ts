import { useCallback, useRef, useState } from 'react'

import type { MutableClassGroupSchema } from '@/core/classGroupRitualStackParser'
import type { NewNodeMaterializePhase } from '@/core/codeToNewNodeGraph'
import {
  isNeekoSchemaId,
  neekoPhaseSequence,
  prepareNeekoTransform,
  type PrepareNeekoTransformResult,
} from '@/core/neekoNodeTransform'

const PHASE_DELAY_MS = 200

export type NeekoTransformCallbacks = {
  updateCanvasNodeNeekoPhase: (
    nodeId: string,
    phase: NewNodeMaterializePhase,
    parseRegistry: Map<string, MutableClassGroupSchema>,
    rootParsedId: string,
    options?: { error?: string; clearError?: boolean },
  ) => void
  applyNeekoTransform: (
    nodeId: string,
    source: string,
  ) => Promise<{ ok: boolean; error?: string; warnings?: string[] }>
}

export function useNeekoTransform(callbacks: NeekoTransformCallbacks) {
  const [transformingNodeId, setTransformingNodeId] = useState<string | null>(null)
  const runIdRef = useRef(0)

  const cancelTransform = useCallback(() => {
    runIdRef.current += 1
    setTransformingNodeId(null)
  }, [])

  const runTransform = useCallback(
    async (nodeId: string, source: string) => {
      const runId = runIdRef.current + 1
      runIdRef.current = runId
      setTransformingNodeId(nodeId)

      const prepared: PrepareNeekoTransformResult = prepareNeekoTransform(source)
      if (!prepared.ok) {
        if (runIdRef.current === runId) {
          callbacks.updateCanvasNodeNeekoPhase(nodeId, 'shell', new Map(), '', {
            error: prepared.error,
          })
          setTransformingNodeId(null)
        }
        return { ok: false as const, error: prepared.error }
      }

      for (const phase of neekoPhaseSequence()) {
        if (runIdRef.current !== runId) {
          return { ok: false as const, error: 'Transformação cancelada.' }
        }

        callbacks.updateCanvasNodeNeekoPhase(
          nodeId,
          phase,
          prepared.parseRegistry,
          prepared.rootParsedId,
          { clearError: true },
        )

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, PHASE_DELAY_MS)
        })
      }

      if (runIdRef.current !== runId) {
        return { ok: false as const, error: 'Transformação cancelada.' }
      }

      const applied = await callbacks.applyNeekoTransform(nodeId, source)

      if (runIdRef.current === runId) {
        setTransformingNodeId(null)
      }

      if (!applied.ok) {
        callbacks.updateCanvasNodeNeekoPhase(nodeId, 'internals', prepared.parseRegistry, prepared.rootParsedId, {
          error: applied.error ?? 'Falha ao aplicar subárvore.',
        })
        return { ok: false as const, error: applied.error }
      }

      return { ok: true as const, warnings: applied.warnings ?? [] }
    },
    [callbacks],
  )

  const canTransformNode = useCallback((schemaId: string, locked?: boolean) => {
    return isNeekoSchemaId(schemaId) && !locked
  }, [])

  return {
    transformingNodeId,
    runTransform,
    cancelTransform,
    canTransformNode,
  }
}
