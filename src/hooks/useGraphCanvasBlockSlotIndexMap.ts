import { useRef } from 'react'

import { buildBlockOutputSlotIndexMap } from '@/core/blockElementViewState'
import type { CanvasScene } from '@/core/canvasScene'
import { graphCanvasBlockSlotIndexKey } from '@/core/graphCanvasSceneMemoKeys'

export function useGraphCanvasBlockSlotIndexMap(
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  lightModeDefaultFirst: boolean,
): Map<string, number> {
  const cacheRef = useRef<{ key: string; map: Map<string, number> }>({
    key: '',
    map: new Map(),
  })

  const key = graphCanvasBlockSlotIndexKey(scene, lightModeDefaultFirst)

  if (cacheRef.current.key === key) {
    return cacheRef.current.map
  }

  const map = buildBlockOutputSlotIndexMap(scene, { lightModeDefaultFirst: lightModeDefaultFirst })
  cacheRef.current = { key, map }
  return map
}
