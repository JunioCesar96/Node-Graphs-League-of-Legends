import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import {
  MAX_CANVAS_GRID_OPACITY,
  MAX_CANVAS_GRID_SIZE,
  MIN_CANVAS_GRID_OPACITY,
  MIN_CANVAS_GRID_SIZE,
  resolveCanvasGridPresentation,
  type CanvasGridChrome,
} from '@/core/canvasGridSettings'
import { LangId } from '@/core/language/languageIds'
import { computeContextMenuPlacement } from '@/core/ui/contextMenuPlacement'
import { useCanvasGridThemeColors } from '@/hooks/useCanvasGridThemeColors'
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
  canvasGridLineColorEnabled: boolean
  canvasGridHorizontalLineColor?: string
  canvasGridVerticalLineColor?: string
  canvasGridCheckerEnabled: boolean
  canvasGridCheckerColorA?: string
  canvasGridCheckerColorB?: string
}

export type CanvasGridControlPatch = Partial<{
  [K in keyof CanvasGridControlState]: CanvasGridControlState[K] | null
}>

type CanvasGridControlPanelProps = {
  anchor: CanvasContextMenuAnchor
  state: CanvasGridControlState
  onClose: () => void
  onChange: (patch: CanvasGridControlPatch) => void
}

function ColorField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className={styles.colorRow}>
      <span className={styles.rowLabel}>{label}</span>
      <input
        aria-label={label}
        className={styles.colorInput}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        type="color"
        value={value}
      />
    </label>
  )
}

export function CanvasGridControlPanel({
  anchor,
  state,
  onClose,
  onChange,
}: CanvasGridControlPanelProps) {
  const { t } = useLanguage()
  const themeColors = useCanvasGridThemeColors()
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPosition, setPanelPosition] = useState(() => {
    const placement = computeContextMenuPlacement(anchor.left, anchor.top, 300, 420)
    return { x: placement.x, y: placement.y }
  })
  const [panelDragging, setPanelDragging] = useState(false)
  const showLineColorOptions = state.showCanvasGrid && state.canvasGridLineColorEnabled
  const showCheckerColorOptions = state.canvasGridCheckerEnabled

  useLayoutEffect(() => {
    const element = panelRef.current
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    const placement = computeContextMenuPlacement(anchor.left, anchor.top, rect.width, rect.height)
    setPanelPosition({ x: placement.x, y: placement.y })
  }, [anchor.left, anchor.top])

  const startPanelDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!panelRef.current) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      setPanelDragging(true)

      const startX = event.clientX
      const startY = event.clientY
      const startLeft = panelPosition.x
      const startTop = panelPosition.y
      const panelWidth = panelRef.current.getBoundingClientRect().width
      const panelHeight = panelRef.current.getBoundingClientRect().height

      const onPointerMove = (moveEvent: PointerEvent) => {
        const margin = 8
        const nextLeft = Math.min(
          Math.max(margin, startLeft + moveEvent.clientX - startX),
          window.innerWidth - panelWidth - margin,
        )
        const nextTop = Math.min(
          Math.max(margin, startTop + moveEvent.clientY - startY),
          window.innerHeight - panelHeight - margin,
        )

        setPanelPosition({ x: nextLeft, y: nextTop })
      }

      const onPointerUp = () => {
        setPanelDragging(false)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [panelPosition],
  )

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
      data-dragging={panelDragging ? 'true' : undefined}
      ref={panelRef}
      onPointerDown={(event) => event.stopPropagation()}
      role="dialog"
      aria-label={t(LangId.CtxCanvasGridPanelTitle, 'Controlo da grade')}
      style={{ left: `${panelPosition.x}px`, top: `${panelPosition.y}px` }}
    >
      <div
        className={styles.header}
        onPointerDown={startPanelDrag}
        title={t(LangId.CtxCanvasGridPanelTitle, 'Controlo da grade')}
      >
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
            className={styles.rangeInput}
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
            className={styles.rangeInput}
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

      <div className={styles.section}>
        <span className={styles.sectionLabel}>
          {t(LangId.CtxCanvasGridSectionColorLines, 'Colorir linhas')}
        </span>

        <label className={styles.toggleRow}>
          <span className={styles.rowLabel}>{t(LangId.CtxCanvasGridColorLines, 'Colorir grade')}</span>
          <AppToggleCheckbox
            checked={state.canvasGridLineColorEnabled}
            disabled={!state.showCanvasGrid}
            onChange={(checked) =>
              onChange(
                checked
                  ? {
                      canvasGridLineColorEnabled: true,
                      canvasGridHorizontalLineColor: null,
                      canvasGridVerticalLineColor: null,
                    }
                  : { canvasGridLineColorEnabled: false },
              )
            }
          />
        </label>

        {showLineColorOptions ? (
          <>
            <ColorField
              label={t(LangId.CtxCanvasGridHorizontalLines, 'Horizontais')}
              onChange={(value) => onChange({ canvasGridHorizontalLineColor: value })}
              value={state.canvasGridHorizontalLineColor ?? themeColors.horizontalLine}
            />

            <ColorField
              label={t(LangId.CtxCanvasGridVerticalLines, 'Verticais')}
              onChange={(value) => onChange({ canvasGridVerticalLineColor: value })}
              value={state.canvasGridVerticalLineColor ?? themeColors.verticalLine}
            />
          </>
        ) : null}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>
          {t(LangId.CtxCanvasGridSectionChecker, 'Xadrez')}
        </span>

        <label className={styles.toggleRow}>
          <span className={styles.rowLabel}>{t(LangId.CtxCanvasGridChecker, 'Grade em xadrez')}</span>
          <AppToggleCheckbox
            checked={state.canvasGridCheckerEnabled}
            onChange={(checked) =>
              onChange(
                checked
                  ? {
                      canvasGridCheckerEnabled: true,
                      canvasGridCheckerColorA: null,
                      canvasGridCheckerColorB: null,
                    }
                  : { canvasGridCheckerEnabled: false },
              )
            }
          />
        </label>

        {showCheckerColorOptions ? (
          <>
            <ColorField
              label={t(LangId.CtxCanvasGridCheckerColorA, 'Cor A')}
              onChange={(value) => onChange({ canvasGridCheckerColorA: value })}
              value={state.canvasGridCheckerColorA ?? themeColors.checkerA}
            />

            <ColorField
              label={t(LangId.CtxCanvasGridCheckerColorB, 'Cor B')}
              onChange={(value) => onChange({ canvasGridCheckerColorB: value })}
              value={state.canvasGridCheckerColorB ?? themeColors.checkerB}
            />
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function resolveCanvasGridControlState(
  chrome: CanvasGridChrome | undefined,
): CanvasGridControlState {
  const presentation = resolveCanvasGridPresentation(chrome)

  return {
    showCanvasGrid: presentation.showCanvasGrid,
    canvasGridSize: presentation.canvasGridSize,
    canvasGridOpacity: presentation.canvasGridOpacity,
    canvasGridLineColorEnabled: presentation.canvasGridLineColorEnabled,
    canvasGridHorizontalLineColor: presentation.canvasGridHorizontalLineColor,
    canvasGridVerticalLineColor: presentation.canvasGridVerticalLineColor,
    canvasGridCheckerEnabled: presentation.canvasGridCheckerEnabled,
    canvasGridCheckerColorA: presentation.canvasGridCheckerColorA,
    canvasGridCheckerColorB: presentation.canvasGridCheckerColorB,
  }
}
