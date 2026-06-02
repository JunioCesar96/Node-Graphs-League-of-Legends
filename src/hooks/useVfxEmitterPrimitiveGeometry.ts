import { useEffect, useMemo } from 'react'
import type { BufferGeometry } from 'three'

import type { EmitterPrimitiveGeometryKind } from '@/core/vfx/semantic/vfxSemanticTypes'
import { cloneVfxPrimitiveGeometry } from '@/core/vfx/vfxPrimitiveMeshPool'

/**
 * Geometria do emitter: malha LoL em cache ou clone do pool de primitivas.
 * Clones são libertados no unmount.
 */
export function useVfxEmitterPrimitiveGeometry(
  kind: EmitterPrimitiveGeometryKind,
  meshGeometry: BufferGeometry | null | undefined,
  options?: {
    uvRotationSafeMargin?: boolean
    texDiv?: [number, number] | null
  },
): BufferGeometry | undefined {
  const uvRotationSafe = options?.uvRotationSafeMargin === true
  const texDiv = options?.texDiv ?? null

  const cloned = useMemo(() => {
    if (meshGeometry) return null
    return cloneVfxPrimitiveGeometry(kind, {
      uvRotationSafe,
      texDiv: uvRotationSafe ? texDiv : null,
    })
  }, [kind, meshGeometry, uvRotationSafe, texDiv])

  useEffect(() => {
    return () => {
      cloned?.dispose()
    }
  }, [cloned])

  return meshGeometry ?? cloned ?? undefined
}
