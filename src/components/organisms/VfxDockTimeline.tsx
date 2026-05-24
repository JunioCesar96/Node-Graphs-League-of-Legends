import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import { VfxTimelineContextMenu } from '@/components/molecules/VfxTimelineContextMenu'
import type { VfxWebEmitterBuilt } from '@/core/vfx/vfxWebBuilder'
import {
  computeEmitterActiveWindow,
  isTimeInsideActiveWindow,
} from '@/core/vfx/vfxEmitterTimeline'

import { emitterAccentColor } from './VfxDockInspector'
import styles from './VfxDockTimeline.module.css'

export type VfxTimelineLayer = {
  id: string
  name: string
  duration: number
  activeStart: number
  activeEnd: number
  activeAtPlayhead: boolean
  visible: boolean
  focused: boolean
}

type VfxDockTimelineProps = {
  layers: VfxTimelineLayer[]
  lifetime: number
  currentTime: number
  playing: boolean
  loop: boolean
  vfxScale: number
  resetPointTime: number | null
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onToggleLoop: () => void
  onScrub: (time: number) => void
  onScaleChange: (scale: number) => void
  onLayerFocus: (emitterId: string | null) => void
  onLayerVisibility: (emitterId: string) => void
  onSetResetPoint: (time: number) => void
  onRemoveResetPoint: () => void
}

function formatTime(seconds: number) {
  return `${seconds.toFixed(2)}s`
}

function timeFromPointerX(clientX: number, element: HTMLElement, scrubMax: number): number {
  const rect = element.getBoundingClientRect()
  const width = Math.max(rect.width, 1)
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / width))
  return ratio * scrubMax
}

export function VfxDockTimeline({
  layers,
  lifetime,
  currentTime,
  playing,
  loop,
  vfxScale,
  resetPointTime,
  onPlay,
  onPause,
  onRestart,
  onToggleLoop,
  onScrub,
  onScaleChange,
  onLayerFocus,
  onLayerVisibility,
  onSetResetPoint,
  onRemoveResetPoint,
}: VfxDockTimelineProps) {
  const scrubMax = Math.max(lifetime, 0.001)
  const playheadPct = (currentTime / scrubMax) * 100
  const resetPointPct =
    resetPointTime !== null ? (resetPointTime / scrubMax) * 100 : null
  const rulerMarks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * scrubMax)

  const trackAreaRef = useRef<HTMLDivElement>(null)
  const scrubInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<{
    anchor: { x: number; y: number }
    timeAtClick: number
  } | null>(null)

  const openTimelineContextMenu = useCallback(
    (event: ReactMouseEvent, timeSource: HTMLElement) => {
      event.preventDefault()
      event.stopPropagation()
      const timeAtClick = timeFromPointerX(event.clientX, timeSource, scrubMax)
      setContextMenu({
        anchor: { x: event.clientX, y: event.clientY },
        timeAtClick,
      })
    },
    [scrubMax],
  )

  const handleTrackAreaContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (!trackAreaRef.current) return
      openTimelineContextMenu(event, trackAreaRef.current)
    },
    [openTimelineContextMenu],
  )

  const handleScrubContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      const target = scrubInputRef.current
      if (!target) return
      openTimelineContextMenu(event, target)
    },
    [openTimelineContextMenu],
  )

  return (
    <div className={styles.timeline}>
      <div className={styles.transport}>
        <div className={styles.transportLeft}>
          <button
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
            className={styles.transportBtn}
            onClick={playing ? onPause : onPlay}
            type="button"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button aria-label="Reiniciar" className={styles.transportBtn} onClick={onRestart} type="button">
            ⏮
          </button>
          <button
            aria-label="Loop"
            aria-pressed={loop}
            className={[styles.transportBtn, loop ? styles.transportBtnActive : ''].filter(Boolean).join(' ')}
            onClick={onToggleLoop}
            type="button"
          >
            ↻
          </button>
          <span className={styles.timeReadout}>
            {formatTime(currentTime)} / {formatTime(scrubMax)}
            {resetPointTime !== null ? (
              <span className={styles.resetPointReadout} title="Reset point — ao atingir, volta a 0s">
                {' '}
                · ↺ {formatTime(resetPointTime)}
              </span>
            ) : null}
          </span>
        </div>

        <label className={styles.scrubWrap} onContextMenu={handleScrubContextMenu}>
          <input
            className={styles.scrubInput}
            max={scrubMax}
            min={0}
            onChange={(event) => onScrub(Number(event.target.value))}
            ref={scrubInputRef}
            step={0.01}
            type="range"
            value={currentTime}
          />
        </label>

        <label className={styles.scaleWrap}>
          <span>Scale</span>
          <input
            className={styles.scaleInput}
            max={0.1}
            min={0.001}
            onChange={(event) => onScaleChange(Number(event.target.value))}
            step={0.001}
            type="number"
            value={vfxScale}
          />
        </label>
      </div>

      <div className={styles.tracksShell}>
        <div className={styles.layerColumn}>
          <div className={styles.layerColumnHead}>Camadas</div>
          {layers.map((layer, index) => (
            <div
              className={[
                styles.layerRow,
                layer.focused ? styles.layerRowFocused : '',
                !layer.visible ? styles.layerRowHidden : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={layer.id}
            >
              <span className={styles.layerIndex}>{index + 1}</span>
              <button
                aria-label={layer.visible ? 'Ocultar' : 'Mostrar'}
                className={styles.layerEye}
                onClick={() => onLayerVisibility(layer.id)}
                type="button"
              >
                {layer.visible ? '◉' : '○'}
              </button>
              <button
                className={styles.layerNameBtn}
                onClick={() => onLayerFocus(layer.focused ? null : layer.id)}
                type="button"
                title={layer.name}
              >
                {layer.name}
              </button>
            </div>
          ))}
        </div>

        <div
          className={styles.trackArea}
          onContextMenu={handleTrackAreaContextMenu}
          ref={trackAreaRef}
        >
          <div className={styles.ruler}>
            {rulerMarks.map((mark) => (
              <span className={styles.rulerTick} key={mark} style={{ left: `${(mark / scrubMax) * 100}%` }}>
                {formatTime(mark)}
              </span>
            ))}
          </div>

          <div className={styles.trackStack}>
            {layers.map((layer) => {
              const leftPct = (layer.activeStart / scrubMax) * 100
              const widthPct = Math.min(
                100 - leftPct,
                ((layer.activeEnd - layer.activeStart) / scrubMax) * 100,
              )
              const accent = emitterAccentColor(layer.name)
              return (
                <div className={styles.trackRow} key={layer.id}>
                  <div
                    className={[
                      styles.trackBar,
                      layer.focused ? styles.trackBarFocused : '',
                      layer.activeAtPlayhead ? styles.trackBarActive : '',
                      !layer.visible ? styles.trackBarHidden : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 0.8)}%`,
                      background: layer.activeAtPlayhead
                        ? `linear-gradient(90deg, ${accent}aa, ${accent}44)`
                        : `linear-gradient(90deg, ${accent}55, ${accent}22)`,
                      borderColor: layer.activeAtPlayhead ? `${accent}cc` : `${accent}88`,
                    }}
                  />
                </div>
              )
            })}
            {resetPointPct !== null ? (
              <div
                className={styles.resetPointMarker}
                style={{ left: `${resetPointPct}%` }}
                title={`Reset point — ${formatTime(resetPointTime ?? 0)}`}
              />
            ) : null}
            <div className={styles.playhead} style={{ left: `${playheadPct}%` }} />
          </div>
        </div>
      </div>

      {contextMenu ? (
        <VfxTimelineContextMenu
          anchor={contextMenu.anchor}
          clickTime={contextMenu.timeAtClick}
          hasResetPoint={resetPointTime !== null}
          onClose={() => setContextMenu(null)}
          onRemoveResetPoint={() => {
            onRemoveResetPoint()
            setContextMenu(null)
          }}
          onSetResetPoint={() => {
            onSetResetPoint(contextMenu.timeAtClick)
            setContextMenu(null)
          }}
          resetPointTime={resetPointTime}
        />
      ) : null}
    </div>
  )
}

export function buildTimelineLayers(
  emitters: VfxWebEmitterBuilt[],
  visibility: Record<string, boolean>,
  focusedEmitterId: string | null,
  currentTime: number,
): VfxTimelineLayer[] {
  return emitters.map((emitter) => {
    const window = computeEmitterActiveWindow(emitter.parsed)
    return {
      id: emitter.id,
      name: emitter.name,
      duration: emitter.duration,
      activeStart: window.start,
      activeEnd: window.end,
      activeAtPlayhead: isTimeInsideActiveWindow(currentTime, window),
      visible: visibility[emitter.id] !== false,
      focused: focusedEmitterId === emitter.id,
    }
  })
}
