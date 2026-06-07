import { useRef } from 'react'

import { applyBlockOutputSlotConnectionSelection } from '@/core/blockConnectionDisplay'
import {
  buildBlockWirelessDisplayByNode,
  type BlockWirelessNodeDisplay,
} from '@/core/blockConnectionDisplay'
import type { CanvasConnection, CanvasNode } from '@/core/canvasScene'
import { buildWirelessDisplayByNode, type WirelessNodeDisplay } from '@/core/connectionDisplay'
import { buildGroupWirelessDisplayByNode } from '@/core/groupConnectionDisplay'
import { graphCanvasWirelessDisplayKey } from '@/core/graphCanvasSceneMemoKeys'

type WirelessDisplayMaps = {
  wirelessDisplayByNode: Map<string, WirelessNodeDisplay>
  blockWirelessDisplayByNode: Map<string, BlockWirelessNodeDisplay>
  groupWirelessDisplayByNode: Map<string, BlockWirelessNodeDisplay>
}

const emptyWirelessDisplayMaps: WirelessDisplayMaps = {
  wirelessDisplayByNode: new Map(),
  blockWirelessDisplayByNode: new Map(),
  groupWirelessDisplayByNode: new Map(),
}

/**
 * Mantém mapas wireless estáveis quando só posições mudam (evita re-render de todos os cartões).
 */
export function useGraphCanvasWirelessDisplayMaps(
  connections: readonly CanvasConnection[],
  nodes: readonly CanvasNode[],
  blockOutputSlotConnectionIndexByKey: Map<string, number>,
): WirelessDisplayMaps {
  const cacheRef = useRef<{ key: string; maps: WirelessDisplayMaps }>({
    key: '',
    maps: emptyWirelessDisplayMaps,
  })

  const key = graphCanvasWirelessDisplayKey(connections, nodes)

  if (cacheRef.current.key === key) {
    return cacheRef.current.maps
  }

  const wirelessDisplayByNode = buildWirelessDisplayByNode(connections, nodes)
  const blockBase = buildBlockWirelessDisplayByNode(connections, nodes)
  const blockWirelessDisplayByNode = applyBlockOutputSlotConnectionSelection(
    blockBase,
    connections,
    nodes,
    blockOutputSlotConnectionIndexByKey,
  )
  const groupWirelessDisplayByNode = buildGroupWirelessDisplayByNode(connections, nodes)

  const maps: WirelessDisplayMaps = {
    wirelessDisplayByNode,
    blockWirelessDisplayByNode,
    groupWirelessDisplayByNode,
  }

  cacheRef.current = { key, maps }
  return maps
}
