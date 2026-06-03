import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import {
  DEFAULT_CANVAS_GRID_OPACITY,
  DEFAULT_CANVAS_GRID_SIZE,
  MAX_CANVAS_GRID_OPACITY,
  MAX_CANVAS_GRID_SIZE,
  MIN_CANVAS_GRID_OPACITY,
  MIN_CANVAS_GRID_SIZE,
} from '@/core/canvasGridSettings'
import { LangId } from '@/core/language/languageIds'
import { computeContextMenuPlacement } from '@/core/ui/contextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import { AppToggleCheckbox } from '@/components/atoms/AppToggleCheckbox'

import styles from './CanvasGridControlPanel.module.css'

export const CANVAS_GRID_CONTROL_ROOT_ATTR = 'data-canvas-grid-control-root'
const APP_FORM_CONTROLS_ATTR = 'data-app-form-controls'

function rangeFillPercent(value: number, min: number, max: number): string {
  if (max <= min) {
    return '0%'
  }
  const ratio = (value - min) / (max - min)
  return `${Math.min(100, Math.max(0, ratio * 100))}%`
}

export type CanvasGridControlState = {
  showCanvasGrid: boolean
  canvasGridSize: number
  canvasGridOpacity: number
}

type CanvasGridControlPanelProps = {
  anchor: CanvasContextMenuAnchor
  state: CanvasGridControlState
  onClose: () => void
  onChange: (patch: Partial<CanvasGridControlState>) => void
}

export function CanvasGridControlPanel({
  anchor,
  state,
  onClose,
  onChange,
}: CanvasGridControlPanelProps) {
  const { t } = useLanguage()
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPlacement, setPanelPlacement] = useState(() =>
    computeContextMenuPlacement(anchor.left, anchor.top, 280, 280),
  )

  useLayoutEffect(() => {
    const element = panelRef.current
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    setPanelPlacement(computeContextMenuPlacement(anchor.left, anchor.top, rect.width, rect.height))
  }, [anchor.left, anchor.top])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof globalThis.Node)) {
        return
      }
      if (target instanceof Element && target.closest(`[${CANVAS_GRID_CONTROL_ROOT_ATTR}]`)) {
        return
      }
      if (target instanceof Element && target.closest('[data-canvas-context-menu-root]')) {
        return
      }
      if (!panelRef.current?.contains(target)) {
        onClose()
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      {...{ [CANVAS_GRID_CONTROL_ROOT_ATTR]: '', [APP_FORM_CONTROLS_ATTR]: '' }}
      className={styles.panel}
      data-expand-down={panelPlacement.expandDown ? 'true' : 'false'}
      data-expand-right={panelPlacement.expandRight ? 'true' : 'false'}
      ref={panelRef}
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
      aria-label={t(LangId.CtxCanvasGridPanelTitle, 'Controlo da grade')}
      style={{ left: `${panelPlacement.x}px`, top: `${panelPlacement.y}px` }}
    >
      <div className={styles.header}>
        <span className={styles.eyebrow}>{t(LangId.CtxCanvasGridPanelEyebrow, 'Studio Controls')}</span>
        <span className={styles.title}>{t(LangId.CtxCanvasGridPanelTitle, 'Controlo da grade')}</span>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>
          {t(LangId.CtxCanvasGridSectionSettings, 'Definições da grade')}
        </span>

        <label className={styles.toggleRow}>
          <span className={styles.rowLabel}>{t(LangId.CtxCanvasGridShow, 'Mostrar grade')}</span>
          <AppToggleCheckbox
            checked={state.showCanvasGrid}
            onChange={(checked) => onChange({ showCanvasGrid: checked })}
          />
        </label>

        <div className={styles.rangeBlock}>
          <div className={styles.rangeHead}>
            <span className={styles.rangeLabel}>{t(LangId.CtxCanvasGridSize, 'Tamanho')}</span>
            <span className={styles.rangeValue}>{state.canvasGridSize}px</span>
          </div>
          <input
            disabled={!state.showCanvasGrid}
            max={MAX_CANVAS_GRID_SIZE}
            min={MIN_CANVAS_GRID_SIZE}
            onChange={(event) =>
              onChange({ canvasGridSize: Number.parseInt(event.target.value, 10) })
            }
            step={4}
            style={
              {
                '--range-fill-percent': rangeFillPercent(
                  state.canvasGridSize,
                  MIN_CANVAS_GRID_SIZE,
                  MAX_CANVAS_GRID_SIZE,
                ),
              } as CSSProperties
            }
            type="range"
            value={state.canvasGridSize}
          />
          <div className={styles.rangeMarks}>
            <span>{MIN_CANVAS_GRID_SIZE}</span>
            <span>{MAX_CANVAS_GRID_SIZE}</span>
          </div>
        </div>

        <div className={styles.rangeBlock}>
          <div className={styles.rangeHead}>
            <span className={styles.rangeLabel}>{t(LangId.CtxCanvasGridOpacity, 'Opacidade')}</span>
            <span className={styles.rangeValue}>{state.canvasGridOpacity}%</span>
          </div>
          <input
            disabled={!state.showCanvasGrid}
            max={MAX_CANVAS_GRID_OPACITY}
            min={MIN_CANVAS_GRID_OPACITY}
            onChange={(event) =>
              onChange({ canvasGridOpacity: Number.parseInt(event.target.value, 10) })
            }
            step={1}
            style={
              {
                '--range-fill-percent': rangeFillPercent(
                  state.canvasGridOpacity,
                  MIN_CANVAS_GRID_OPACITY,
                  MAX_CANVAS_GRID_OPACITY,
                ),
              } as CSSProperties
            }
            type="range"
            value={state.canvasGridOpacity}
          />
          <div className={styles.rangeMarks}>
            <span>{MIN_CANVAS_GRID_OPACITY}</span>
            <span>{MAX_CANVAS_GRID_OPACITY}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function resolveCanvasGridControlState(chrome: {
  showCanvasGrid?: boolean
  canvasGridSize?: number
  canvasGridOpacity?: number
} | undefined): CanvasGridControlState {
  return {
    showCanvasGrid: chrome?.showCanvasGrid !== false,
    canvasGridSize: chrome?.canvasGridSize ?? DEFAULT_CANVAS_GRID_SIZE,
    canvasGridOpacity: chrome?.canvasGridOpacity ?? DEFAULT_CANVAS_GRID_OPACITY,
  }
}
