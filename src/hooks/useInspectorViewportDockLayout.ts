import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

import { computeDockedPanelPlacement } from '@/core/ui/contextMenuPlacement'

const INSPECTOR_VIEWPORT_FLOAT_Z = 18
/** Mesma largura dos painéis flutuantes (.panel em Block/Group/SceneNodes). */
const INSPECTOR_DOCK_PANEL_WIDTH_PX = 380

function readCssSpacePx(variables: readonly string[]) {
  if (typeof window === 'undefined') {
    return 0
  }

  for (const name of variables) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    if (raw.endsWith('px')) {
      const value = Number.parseFloat(raw)
      if (Number.isFinite(value)) {
        return value
      }
    }
  }

  return undefined
}

export type InspectorViewportDockPlacement = 'panel' | null

/**
 * Inspetor acoplado: largura fixa (380px), abre junto ao ícone na toolbar.
 */
export function useInspectorViewportDockLayout(
  tabAnchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  placement: InspectorViewportDockPlacement,
) {
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!placement) {
      setPanelStyle({})
      return
    }

    let raf = 0

    const syncPosition = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const tab = tabAnchorRef.current
        if (!(tab instanceof HTMLElement)) {
          return
        }

        const tabRect = tab.getBoundingClientRect()
        const margin = readCssSpacePx(['--space-4']) ?? 16
        const gap = readCssSpacePx(['--space-2']) ?? 8
        const panelWidth = Math.min(
          INSPECTOR_DOCK_PANEL_WIDTH_PX,
          Math.max(240, window.innerWidth - margin * 2),
        )
        const measuredHeight = panelRef.current?.getBoundingClientRect().height ?? 320
        const docked = computeDockedPanelPlacement(tabRect, panelWidth, measuredHeight, margin, gap)
        const toolbarRect =
          tabAnchorRef.current
            ?.closest('[data-canvas-toolbar]')
            ?.getBoundingClientRect()
        const minTopFromToolbar = toolbarRect ? toolbarRect.bottom + gap : margin
        const resolvedTop = Math.max(docked.y, minTopFromToolbar)
        const resolvedMaxHeight = Math.max(160, window.innerHeight - resolvedTop - margin)

        setPanelStyle({
          position: 'fixed',
          top: resolvedTop,
          left: docked.x,
          width: panelWidth,
          maxWidth: panelWidth,
          maxHeight: Math.min(docked.maxHeight, resolvedMaxHeight),
          zIndex: INSPECTOR_VIEWPORT_FLOAT_Z,
        })
      })
    }

    syncPosition()
    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)

    const toolbarObserved = tabAnchorRef.current?.closest('[data-canvas-toolbar]')

    let resizeObserver: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncPosition)
      if (toolbarObserved instanceof HTMLElement) {
        resizeObserver.observe(toolbarObserved)
      }
      if (tabAnchorRef.current instanceof HTMLElement) {
        resizeObserver.observe(tabAnchorRef.current)
      }
      if (panelRef.current instanceof HTMLElement) {
        resizeObserver.observe(panelRef.current)
      }
    }

    return () => {
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
      cancelAnimationFrame(raf)
      resizeObserver?.disconnect()
    }
  }, [placement, panelRef, tabAnchorRef])

  return { panelStyle }
}
