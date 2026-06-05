import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import {
  BLOCK_PARAMETER_PANEL_FALLBACK_STYLE,
  BLOCK_PARAMETER_PANEL_PLACEMENT_ESTIMATE,
  buildFrozenScreenAnchoredStyle,
  screenAnchorKey,
} from '@/core/ui/screenAnchoredPanelPlacement'

import styles from './BlockCardParameterMenu.module.css'

const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6
const MIN_SPACE_FOR_PANEL_ABOVE = 120
const MIN_VISIBLE_PANEL_HEIGHT = 120

type ManualPanelPosition = {
  left: number
  top: number
}

const BlockCardMenuFloatingLayerDragContext = createContext<HTMLAttributes<HTMLElement> | undefined>(
  undefined,
)

export function useBlockCardMenuFloatingLayerDragHandle(): HTMLAttributes<HTMLElement> | undefined {
  return useContext(BlockCardMenuFloatingLayerDragContext)
}

type BlockCardMenuFloatingLayerProps = {
  open: boolean
  anchorRef?: RefObject<HTMLElement | null>
  /** Ponto de ecrã do clique — posição fixa (regra de quadrante da tela). */
  screenAnchor?: CanvasContextMenuAnchor | null
  /** Tamanho estimado para calcular o quadrante (lista vs picker vs inspector). */
  placementEstimate?: { width: number; height: number }
  /** Sem âncora de ecrã, não usa fallback fixo no canto — não renderiza. */
  requireScreenAnchor?: boolean
  /** Permite mover o painel arrastando o cabeçalho (via contexto de drag handle). */
  draggable?: boolean
  layerRef?: RefObject<HTMLDivElement | null>
  zIndex?: number
  children: ReactNode
}

function clampPanelPosition(
  left: number,
  top: number,
  width: number,
): ManualPanelPosition {
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - MIN_VISIBLE_PANEL_HEIGHT - VIEWPORT_MARGIN,
  )

  return {
    left: Math.min(Math.max(VIEWPORT_MARGIN, left), maxLeft),
    top: Math.min(Math.max(VIEWPORT_MARGIN, top), maxTop),
  }
}

function applyManualPanelPosition(
  baseStyle: CSSProperties,
  manualPosition: ManualPanelPosition,
): CSSProperties {
  return {
    ...baseStyle,
    left: manualPosition.left,
    top: manualPosition.top,
    maxHeight: Math.max(140, window.innerHeight - manualPosition.top - VIEWPORT_MARGIN),
  }
}

export function BlockCardMenuFloatingLayer({
  open,
  anchorRef,
  screenAnchor = null,
  placementEstimate = BLOCK_PARAMETER_PANEL_PLACEMENT_ESTIMATE,
  requireScreenAnchor = false,
  draggable = false,
  layerRef,
  zIndex = 12000,
  children,
}: BlockCardMenuFloatingLayerProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [screenPlacement, setScreenPlacement] = useState<CSSProperties | null>(null)
  const [manualPosition, setManualPosition] = useState<ManualPanelPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const frozenPlacementRef = useRef<CSSProperties | null>(null)
  const frozenAnchorKeyRef = useRef<string | null>(null)
  const internalLayerRef = useRef<HTMLDivElement | null>(null)

  const useScreenAnchor = Boolean(screenAnchor)
  const anchorKey = screenAnchorKey(screenAnchor)
  const placementFreezeKey = anchorKey
    ? `${anchorKey}|${placementEstimate.width}x${placementEstimate.height}`
    : null

  const mergeLayerRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalLayerRef.current = node
      if (layerRef) {
        layerRef.current = node
      }
    },
    [layerRef],
  )

  useEffect(() => {
    if (!open || useScreenAnchor) {
      setAnchorRect(null)
      return
    }

    const update = () => {
      const element = anchorRef?.current
      if (!element) {
        return
      }
      setAnchorRect(element.getBoundingClientRect())
    }

    update()

    let raf = 0
    const tick = () => {
      update()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef, open, useScreenAnchor])

  useLayoutEffect(() => {
    if (!open) {
      frozenPlacementRef.current = null
      frozenAnchorKeyRef.current = null
      setScreenPlacement(null)
      setManualPosition(null)
      setDragging(false)
      return
    }

    if (screenAnchor && placementFreezeKey) {
      if (frozenAnchorKeyRef.current === placementFreezeKey && frozenPlacementRef.current) {
        setScreenPlacement(frozenPlacementRef.current)
        return
      }

      setManualPosition(null)
      setDragging(false)

      const style = buildFrozenScreenAnchoredStyle(screenAnchor, placementEstimate, zIndex)
      frozenPlacementRef.current = style
      frozenAnchorKeyRef.current = placementFreezeKey
      setScreenPlacement(style)
      return
    }

    if (!anchorRef && !requireScreenAnchor) {
      setScreenPlacement({ ...BLOCK_PARAMETER_PANEL_FALLBACK_STYLE, zIndex })
    }
  }, [anchorRef, open, placementEstimate, placementFreezeKey, requireScreenAnchor, screenAnchor, zIndex])

  const startHeaderDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!draggable || !useScreenAnchor || event.button !== 0) {
        return
      }

      const target = event.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [data-no-panel-drag]')) {
        return
      }

      const layer = internalLayerRef.current
      if (!layer) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const rect = layer.getBoundingClientRect()
      const startX = event.clientX
      const startY = event.clientY
      const startLeft = rect.left
      const startTop = rect.top
      setDragging(true)

      const onPointerMove = (moveEvent: PointerEvent) => {
        setManualPosition(
          clampPanelPosition(
            startLeft + moveEvent.clientX - startX,
            startTop + moveEvent.clientY - startY,
            placementEstimate.width,
          ),
        )
      }

      const onPointerUp = () => {
        setDragging(false)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)
    },
    [draggable, placementEstimate.width, useScreenAnchor],
  )

  const dragHandleProps = draggable && useScreenAnchor
    ? {
        onPointerDown: startHeaderDrag,
        'data-panel-dragging': dragging ? '1' : '0',
      }
    : undefined

  if (!open) {
    return null
  }

  if (requireScreenAnchor && !screenAnchor) {
    return null
  }

  const resolvedScreenPlacement =
    screenPlacement && manualPosition
      ? applyManualPanelPosition(screenPlacement, manualPosition)
      : screenPlacement

  if (useScreenAnchor && resolvedScreenPlacement) {
    return createPortal(
      <BlockCardMenuFloatingLayerDragContext.Provider value={dragHandleProps}>
        <div
          ref={mergeLayerRef}
          className={[styles.floatingLayer, dragging ? styles.floatingLayerDragging : '']
            .filter(Boolean)
            .join(' ')}
          data-block-param-menu-portal="1"
          style={resolvedScreenPlacement}
        >
          {children}
        </div>
      </BlockCardMenuFloatingLayerDragContext.Provider>,
      document.body,
    )
  }

  if (!anchorRef && screenPlacement) {
    return createPortal(
      <div
        ref={mergeLayerRef}
        className={styles.floatingLayer}
        data-block-param-menu-portal="1"
        style={screenPlacement}
      >
        {children}
      </div>,
      document.body,
    )
  }

  if (!anchorRect) {
    return null
  }

  const spaceAbove = anchorRect.top - VIEWPORT_MARGIN
  const openBelow = spaceAbove < MIN_SPACE_FOR_PANEL_ABOVE

  const elementStyle: CSSProperties = openBelow
    ? {
        position: 'fixed',
        right: Math.max(VIEWPORT_MARGIN, window.innerWidth - anchorRect.right),
        top: Math.min(
          window.innerHeight - VIEWPORT_MARGIN,
          anchorRect.bottom + ANCHOR_GAP,
        ),
        zIndex,
        maxHeight: `min(70vh, ${window.innerHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN}px)`,
        overflow: 'auto',
      }
    : {
        position: 'fixed',
        right: Math.max(VIEWPORT_MARGIN, window.innerWidth - anchorRect.right),
        bottom: Math.max(VIEWPORT_MARGIN, window.innerHeight - anchorRect.top + ANCHOR_GAP),
        zIndex,
        maxHeight: `min(70vh, ${anchorRect.top - ANCHOR_GAP - VIEWPORT_MARGIN}px)`,
        overflow: 'auto',
      }

  return createPortal(
    <div
      ref={mergeLayerRef}
      className={styles.floatingLayer}
      data-block-param-menu-portal="1"
      style={elementStyle}
    >
      {children}
    </div>,
    document.body,
  )
}
