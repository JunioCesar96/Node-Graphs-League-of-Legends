import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getAddonManifest, getAddonPackage } from '@/blockStructures/addonRegistry'
import {
  ADDON_CARD_WIDTH,
  connectionInvolvesAddon,
  createAddonDraftConnectionPath,
  findAddonSlotAtPoint,
  resolveAddonInvolvedConnectionPath,
  resolveAddonSlotCanvasPoint,
} from '@/core/addonSlotConnections'
import { resolveAddonCardWidthPx } from '@/core/addonUiTemplate'
import { findBlockSlotAtPoint } from '@/core/blockSlotConnections'
import type { CrossSlotConnectRequest } from '@/core/crossSlotConnections'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { graphClientToPosition } from '@/core/canvasCoordinates'
import type { GraphPanPoint } from '@/core/graphPortAnchors'

type PanPoint = { x: number; y: number }

export type PendingAddonLink = {
  fromNodeId: string
  fromAddonSlotId: string
  draftAnchor: { sx: number; sy: number }
}

type UseAddonCanvasLinksOptions = {
  scene: CanvasScene
  scale: number
  canvasRef: React.RefObject<HTMLDivElement | null>
  visibleNodeIds: ReadonlySet<string>
  addonSlotAnchors?: ReadonlyMap<string, GraphPanPoint>
  tryConnectCrossSlots?: (request: CrossSlotConnectRequest, allowForced?: boolean) => boolean
  onSelectNode: (nodeId: string) => void
  onOpenAddonPalette?: (context: {
    fromNodeId: string
    fromAddonSlotId: string
    position: PanPoint
  }) => void
  endBlockLinkDraft?: () => void
  endGroupLinkDraft?: () => void
}

export function useAddonCanvasLinks({
  scene,
  scale,
  canvasRef,
  visibleNodeIds,
  addonSlotAnchors,
  tryConnectCrossSlots,
  onSelectNode,
  onOpenAddonPalette,
  endBlockLinkDraft,
  endGroupLinkDraft,
}: UseAddonCanvasLinksOptions) {
  const [pendingAddonLink, setPendingAddonLink] = useState<PendingAddonLink | null>(null)
  const pendingAddonLinkRef = useRef<PendingAddonLink | null>(null)
  const [addonLinkDraftPoint, setAddonLinkDraftPoint] = useState<PanPoint | null>(null)

  const getManifest = useCallback((addonId: string) => {
    return getAddonManifest(addonId) ?? getAddonPackage(addonId)?.manifest
  }, [])

  const getAddonCardWidth = useCallback(
    (nodeId: string) => {
      const cardEl = canvasRef.current?.querySelector(
        `[data-addon-card="true"][data-instance-id="${CSS.escape(nodeId)}"]`,
      )
      const domWidth = cardEl?.getAttribute('data-addon-card-width')
      if (domWidth) {
        const parsed = Number.parseInt(domWidth, 10)
        if (parsed > 0) {
          return parsed
        }
      }
      const node = scene.nodes.find((entry) => entry.id === nodeId)
      const pkg = node?.addonInstance ? getAddonPackage(node.addonInstance.addonId) : undefined
      return resolveAddonCardWidthPx(pkg?.cardWidthPx, ADDON_CARD_WIDTH)
    },
    [canvasRef, scene.nodes],
  )

  const getPendingAddonLink = useCallback(() => pendingAddonLinkRef.current, [])

  const addonConnectionPaths = useMemo(() => {
    return scene.connections
      .filter(
        (connection) =>
          connectionInvolvesAddon(connection) &&
          connection.routing !== 'wireless' &&
          visibleNodeIds.has(connection.fromNodeId) &&
          visibleNodeIds.has(connection.toNodeId),
      )
      .map((connection) =>
        resolveAddonInvolvedConnectionPath(
          connection,
          scene.nodes,
          getManifest,
          getAddonCardWidth,
          addonSlotAnchors,
        ),
      )
      .filter((path): path is NonNullable<typeof path> => path !== null)
  }, [addonSlotAnchors, getAddonCardWidth, scene.connections, scene.nodes, visibleNodeIds, getManifest])

  const endAddonLinkDraft = useCallback(() => {
    pendingAddonLinkRef.current = null
    setPendingAddonLink(null)
    setAddonLinkDraftPoint(null)
  }, [])

  const beginAddonOutputLink = useCallback(
    (fromNodeId: string, fromAddonSlotId: string) => {
      endBlockLinkDraft?.()
      endGroupLinkDraft?.()
      endAddonLinkDraft()

      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
      if (!fromNode?.addonInstance) {
        return
      }
      const manifest = getManifest(fromNode.addonInstance.addonId)
      if (!manifest) {
        return
      }

      const slotPoint = resolveAddonSlotCanvasPoint(
        fromNode,
        manifest,
        fromAddonSlotId,
        'output',
        getAddonCardWidth(fromNodeId),
        addonSlotAnchors,
      )
      if (!slotPoint) {
        return
      }

      const next: PendingAddonLink = {
        fromNodeId,
        fromAddonSlotId,
        draftAnchor: { sx: slotPoint.x, sy: slotPoint.y },
      }
      pendingAddonLinkRef.current = next
      setPendingAddonLink(next)
      setAddonLinkDraftPoint({ x: slotPoint.x, y: slotPoint.y })
    },
    [addonSlotAnchors, endAddonLinkDraft, endBlockLinkDraft, endGroupLinkDraft, getAddonCardWidth, scene.nodes, getManifest],
  )

  const resolveAddonLinkDrop = useCallback(
    (clientX: number, clientY: number) => {
      const pending = pendingAddonLinkRef.current
      if (!pending || !tryConnectCrossSlots) {
        endAddonLinkDraft()
        return
      }

      const el = document.elementFromPoint(clientX, clientY)
      const blockSlotEl = el instanceof Element ? el.closest('[data-block-slot-id]') : null
      if (blockSlotEl instanceof HTMLElement) {
        const direction = blockSlotEl.getAttribute('data-block-slot-direction')
        const toNodeId = blockSlotEl.getAttribute('data-block-slot-node-id')
        const toBlockSlotId = blockSlotEl.getAttribute('data-block-slot-id')
        if (
          direction === 'input' &&
          toNodeId &&
          toBlockSlotId &&
          toNodeId !== pending.fromNodeId
        ) {
          const paramMatch = /^block-param:(.+):input$/.exec(toBlockSlotId)
          tryConnectCrossSlots({
            kind: 'addonToBlock',
            fromNodeId: pending.fromNodeId,
            fromAddonSlotId: pending.fromAddonSlotId,
            toNodeId,
            toBlockSlotId,
            toBlockParameterId: paramMatch?.[1],
          })
          endAddonLinkDraft()
          onSelectNode(toNodeId)
          return
        }
      }

      const addonSlotEl = el instanceof Element ? el.closest('[data-addon-slot-id]') : null
      if (addonSlotEl instanceof HTMLElement) {
        const direction = addonSlotEl.getAttribute('data-addon-slot-direction')
        const toNodeId = addonSlotEl.getAttribute('data-addon-slot-node-id')
        const toAddonSlotId = addonSlotEl.getAttribute('data-addon-slot-id')
        if (
          direction === 'input' &&
          toNodeId &&
          toAddonSlotId &&
          toNodeId !== pending.fromNodeId
        ) {
          tryConnectCrossSlots({
            kind: 'addon',
            fromNodeId: pending.fromNodeId,
            fromAddonSlotId: pending.fromAddonSlotId,
            toNodeId,
            toAddonSlotId,
          })
          endAddonLinkDraft()
          onSelectNode(toNodeId)
          return
        }
      }

      const canvasEl = canvasRef.current
      let toNodeId: string | null = null
      let toAddonSlotId: string | null = null
      let toBlockSlotId: string | null = null
      let toBlockParameterId: string | undefined

      if (canvasEl) {
        const point = graphClientToPosition(canvasEl, scale, clientX, clientY)
        const addonHit = findAddonSlotAtPoint(
          scene.nodes,
          getManifest,
          point,
          undefined,
          addonSlotAnchors,
          getAddonCardWidth,
        )
        if (addonHit && addonHit.direction === 'input' && addonHit.nodeId !== pending.fromNodeId) {
          toNodeId = addonHit.nodeId
          toAddonSlotId = addonHit.slotId
        } else {
          const blockHit = findBlockSlotAtPoint(scene.nodes, point)
          if (blockHit && blockHit.direction === 'input' && blockHit.nodeId !== pending.fromNodeId) {
            toNodeId = blockHit.nodeId
            toBlockSlotId = blockHit.slotId
            toBlockParameterId = blockHit.parameterId
          }
        }
      }

      if (!toNodeId) {
        if (canvasEl && onOpenAddonPalette) {
          const dropPosition = graphClientToPosition(canvasEl, scale, clientX, clientY)
          onOpenAddonPalette({
            fromNodeId: pending.fromNodeId,
            fromAddonSlotId: pending.fromAddonSlotId,
            position: dropPosition,
          })
        }
        endAddonLinkDraft()
        return
      }

      if (toAddonSlotId) {
        tryConnectCrossSlots({
          kind: 'addon',
          fromNodeId: pending.fromNodeId,
          fromAddonSlotId: pending.fromAddonSlotId,
          toNodeId,
          toAddonSlotId,
        })
      } else if (toBlockSlotId) {
        tryConnectCrossSlots({
          kind: 'addonToBlock',
          fromNodeId: pending.fromNodeId,
          fromAddonSlotId: pending.fromAddonSlotId,
          toNodeId,
          toBlockSlotId,
          toBlockParameterId,
        })
      }

      endAddonLinkDraft()
      onSelectNode(toNodeId)
    },
    [
      addonSlotAnchors,
      canvasRef,
      endAddonLinkDraft,
      getManifest,
      tryConnectCrossSlots,
      onOpenAddonPalette,
      onSelectNode,
      scale,
      scene.nodes,
    ],
  )

  const resolveBlockLinkDropOnAddon = useCallback(
    (
      pending: {
        fromNodeId: string
        fromBlockSlotId: string
        fromBlockParameterId?: string
      },
      clientX: number,
      clientY: number,
    ): boolean => {
      if (!tryConnectCrossSlots) {
        return false
      }

      const el = document.elementFromPoint(clientX, clientY)
      const slotEl = el instanceof Element ? el.closest('[data-addon-slot-id]') : null
      if (slotEl instanceof HTMLElement) {
        const direction = slotEl.getAttribute('data-addon-slot-direction')
        const toNodeId = slotEl.getAttribute('data-addon-slot-node-id')
        const toAddonSlotId = slotEl.getAttribute('data-addon-slot-id')
        if (
          direction === 'input' &&
          toNodeId &&
          toAddonSlotId &&
          toNodeId !== pending.fromNodeId
        ) {
          return tryConnectCrossSlots({
            kind: 'blockToAddon',
            fromNodeId: pending.fromNodeId,
            fromBlockSlotId: pending.fromBlockSlotId,
            fromBlockParameterId: pending.fromBlockParameterId,
            toNodeId,
            toAddonSlotId,
          })
        }
      }

      const canvasEl = canvasRef.current
      if (!canvasEl) {
        return false
      }

      const point = graphClientToPosition(canvasEl, scale, clientX, clientY)
      const hit = findAddonSlotAtPoint(
        scene.nodes,
        getManifest,
        point,
        undefined,
        addonSlotAnchors,
        getAddonCardWidth,
      )
      if (!hit || hit.direction !== 'input' || hit.nodeId === pending.fromNodeId) {
        return false
      }

      return tryConnectCrossSlots({
        kind: 'blockToAddon',
        fromNodeId: pending.fromNodeId,
        fromBlockSlotId: pending.fromBlockSlotId,
        fromBlockParameterId: pending.fromBlockParameterId,
        toNodeId: hit.nodeId,
        toAddonSlotId: hit.slotId,
      })
    },
    [addonSlotAnchors, canvasRef, getAddonCardWidth, getManifest, scale, scene.nodes, tryConnectCrossSlots],
  )

  useEffect(() => {
    pendingAddonLinkRef.current = pendingAddonLink
  }, [pendingAddonLink])

  useEffect(() => {
    if (!pendingAddonLink) {
      return
    }
    const onMove = (event: globalThis.PointerEvent) => {
      const canvasEl = canvasRef.current
      if (!canvasEl) {
        return
      }
      setAddonLinkDraftPoint(graphClientToPosition(canvasEl, scale, event.clientX, event.clientY))
    }
    const onUp = (event: globalThis.PointerEvent) => {
      if (!pendingAddonLinkRef.current) {
        return
      }
      resolveAddonLinkDrop(event.clientX, event.clientY)
    }
    const onCancel = () => {
      endAddonLinkDraft()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
    }
  }, [canvasRef, endAddonLinkDraft, pendingAddonLink, resolveAddonLinkDrop, scale])

  const setAddonLinkDraftPointFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const canvasEl = canvasRef.current
      if (!canvasEl) {
        return
      }
      setAddonLinkDraftPoint(graphClientToPosition(canvasEl, scale, clientX, clientY))
    },
    [canvasRef, scale],
  )

  return {
    pendingAddonLink,
    addonLinkDraftPoint,
    addonConnectionPaths,
    beginAddonOutputLink,
    getPendingAddonLink,
    resolveAddonLinkDrop,
    resolveBlockLinkDropOnAddon,
    endAddonLinkDraft,
    createAddonDraftConnectionPath,
    setAddonLinkDraftPointFromClient,
  }
}
