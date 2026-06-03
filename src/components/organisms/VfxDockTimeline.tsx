import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'

import { VfxTimelineContextMenu, type VfxTimelineContextMenuAnchor } from '@/components/molecules/VfxTimelineContextMenu'
import { VfxTimelineTimeControls } from '@/components/molecules/VfxTimelineTimeControls'
import { LangId } from '@/core/language/languageIds'
import type { VfxWebEmitterBuilt } from '@/core/vfx/vfxWebBuilder'
import {
  annotateTimelineLayers,
  filterAndSortTimelineLayers,
  type VfxTimelineLayer,
  type VfxTimelineSortMode,
} from '@/core/vfx/vfxTimelineLayers'
import {
  computeEmitterActiveWindow,
  isTimeInsideActiveWindow,
} from '@/core/vfx/vfxEmitterTimeline'
import { useLanguage } from '@/language/LanguageProvider'

import {
  formatPlaybackSpeed,
  isPlaybackRangeActive,
  VFX_PLAYBACK_SPEED_MAX,
  VFX_PLAYBACK_SPEED_MIN,
  VFX_STEP_PLAYBACK_INTERVAL_MIN,
  VFX_STEP_PLAYBACK_TIMELINE_MIN,
} from '@/core/vfx/vfxPlayback'
import type { VfxPlaybackRange } from '@/core/vfx/vfxPlaybackRange'

import { emitterAccentColor } from './VfxDockInspector'
import styles from './VfxDockTimeline.module.css'

export type { VfxTimelineLayer } from '@/core/vfx/vfxTimelineLayers'

export type VfxTimelineMode = 'emitters' | 'compositor'

type VfxDockTimelineProps = {
  mode?: VfxTimelineMode
  layers: VfxTimelineLayer[]
  lifetime: number
  currentTime: number
  playing: boolean
  loop: boolean
  playbackSpeed: number
  stepPlaybackEnabled: boolean
  stepPlaybackTimelineSeconds: number
  stepPlaybackIntervalSeconds: number
  playbackReverse: boolean
  vfxScale: number
  resetPointTime: number | null
  playbackRange: VfxPlaybackRange
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onToggleLoop: () => void
  onToggleStepPlayback: () => void
  onToggleReverse: () => void
  onStepPlaybackTimelineSecondsChange: (seconds: number) => void
  onStepPlaybackIntervalSecondsChange: (seconds: number) => void
  onPlaybackSpeedChange: (speed: number) => void
  onScrub: (time: number) => void
  onScaleChange: (scale: number) => void
  onLayerFocus: (layerId: string | null) => void
  onLayerVisibility: (layerId: string) => void
  onSetResetPoint: (time: number) => void
  onRemoveResetPoint: () => void
  onSetPlaybackRangeStart: (time: number) => void
  onSetPlaybackRangeEnd: (time: number) => void
  onMovePlaybackRange: (anchorTime: number) => void
  onRemovePlaybackRange: () => void
  onClipOffsetChange?: (effectId: string, offset: number) => void
  /** Preenche o dock quando a timeline está isolada (Ctrl+Space). */
  fillHeight?: boolean
  /** Expande trilhas no layout com altura fixa (split workspace/timeline). */
  tracksExpand?: boolean
  transportRef?: RefObject<HTMLDivElement | null>
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

type ClipDragPhase = {
  effectId: string
  startOffset: number
  startClientX: number
}

type RangeDragPhase = {
  startRangeStart: number
  startClientX: number
}

export function VfxDockTimeline({
  mode = 'emitters',
  layers,
  lifetime,
  currentTime,
  playing,
  loop,
  playbackSpeed,
  stepPlaybackEnabled,
  stepPlaybackTimelineSeconds,
  stepPlaybackIntervalSeconds,
  playbackReverse,
  vfxScale,
  resetPointTime,
  playbackRange,
  onPlay,
  onPause,
  onRestart,
  onToggleLoop,
  onToggleStepPlayback,
  onToggleReverse,
  onStepPlaybackTimelineSecondsChange,
  onStepPlaybackIntervalSecondsChange,
  onPlaybackSpeedChange,
  onScrub,
  onScaleChange,
  onLayerFocus,
  onLayerVisibility,
  onSetResetPoint,
  onRemoveResetPoint,
  onSetPlaybackRangeStart,
  onSetPlaybackRangeEnd,
  onMovePlaybackRange,
  onRemovePlaybackRange,
  onClipOffsetChange,
  fillHeight = false,
  tracksExpand = false,
  transportRef,
}: VfxDockTimelineProps) {
  const { t } = useLanguage()
  const compositorMode = mode === 'compositor'
  const rangeActive = isPlaybackRangeActive(playbackRange, lifetime)
  const [layerQuery, setLayerQuery] = useState('')
  const [layerSortMode, setLayerSortMode] = useState<VfxTimelineSortMode>('asc')
  const [layersControlsExpanded, setLayersControlsExpanded] = useState(false)

  const filteredLayers = useMemo(() => {
    const annotated = annotateTimelineLayers(layers)
    return filterAndSortTimelineLayers(annotated, layerQuery, layerSortMode)
  }, [layerQuery, layerSortMode, layers])

  const scrubMax = Math.max(lifetime, 0.001)
  const playheadPct = (currentTime / scrubMax) * 100
  const resetPointPct =
    resetPointTime !== null ? (resetPointTime / scrubMax) * 100 : null
  const rangeStartPct = rangeActive ? (playbackRange.start / scrubMax) * 100 : null
  const rangeWidthPct = rangeActive
    ? ((playbackRange.end - playbackRange.start) / scrubMax) * 100
    : null
  const rulerMarks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * scrubMax)

  const trackAreaRef = useRef<HTMLDivElement>(null)
  const layerListRef = useRef<HTMLDivElement>(null)
  const trackStackRef = useRef<HTMLDivElement>(null)
  const scrollSyncRef = useRef<'layers' | 'tracks' | null>(null)
  const scrubInputRef = useRef<HTMLInputElement>(null)
  const clipDragRef = useRef<ClipDragPhase | null>(null)
  const rangeDragRef = useRef<RangeDragPhase | null>(null)
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

  const handleClipPointerDown = useCallback(
    (event: ReactPointerEvent, layer: VfxTimelineLayer) => {
      if (!compositorMode || !onClipOffsetChange || !trackAreaRef.current) return
      event.preventDefault()
      event.stopPropagation()
      clipDragRef.current = {
        effectId: layer.id,
        startOffset: layer.activeStart,
        startClientX: event.clientX,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [compositorMode, onClipOffsetChange],
  )

  const handleClipPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const drag = clipDragRef.current
      if (!drag || !onClipOffsetChange || !trackAreaRef.current) return
      const rect = trackAreaRef.current.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const deltaPx = event.clientX - drag.startClientX
      const deltaSeconds = (deltaPx / width) * scrubMax
      onClipOffsetChange(drag.effectId, drag.startOffset + deltaSeconds)
    },
    [onClipOffsetChange, scrubMax],
  )

  const handleClipPointerUp = useCallback((event: ReactPointerEvent) => {
    if (clipDragRef.current) {
      clipDragRef.current = null
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
    }
  }, [])

  const handleRangeBandPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (!rangeActive || !trackAreaRef.current) return
      event.preventDefault()
      event.stopPropagation()
      rangeDragRef.current = {
        startRangeStart: playbackRange.start,
        startClientX: event.clientX,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [playbackRange.start, rangeActive],
  )

  const handleRangeBandPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const drag = rangeDragRef.current
      if (!drag || !trackAreaRef.current) return
      const rect = trackAreaRef.current.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const deltaPx = event.clientX - drag.startClientX
      const deltaSeconds = (deltaPx / width) * scrubMax
      onMovePlaybackRange(drag.startRangeStart + deltaSeconds)
    },
    [onMovePlaybackRange, scrubMax],
  )

  const handleRangeBandPointerUp = useCallback((event: ReactPointerEvent) => {
    if (rangeDragRef.current) {
      rangeDragRef.current = null
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
    }
  }, [])

  const syncLayerScroll = useCallback((source: 'layers' | 'tracks', scrollTop: number) => {
    if (scrollSyncRef.current && scrollSyncRef.current !== source) {
      return
    }
    scrollSyncRef.current = source
    if (source === 'layers') {
      if (trackStackRef.current) trackStackRef.current.scrollTop = scrollTop
    } else if (layerListRef.current) {
      layerListRef.current.scrollTop = scrollTop
    }
    requestAnimationFrame(() => {
      scrollSyncRef.current = null
    })
  }, [])

  const toggleLayerSort = () => {
    setLayerSortMode((previous) => (previous === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div
      className={[
        styles.timeline,
        fillHeight ? styles.timelineFillHeight : '',
        tracksExpand ? styles.timelineTracksExpand : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.transport} ref={transportRef}>
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
          <button
            aria-label={t(LangId.VfxTimelineStepPlayback)}
            aria-pressed={stepPlaybackEnabled}
            className={[
              styles.transportBtn,
              stepPlaybackEnabled ? styles.transportBtnActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onToggleStepPlayback}
            title={t(LangId.VfxTimelineStepPlayback)}
            type="button"
          >
            ⏭
          </button>
          {stepPlaybackEnabled ? (
            <div className={styles.stepControls}>
              <label className={styles.stepWrap} title={t(LangId.VfxTimelineStepTimeline)}>
                <input
                  className={styles.stepInput}
                  max={scrubMax}
                  min={VFX_STEP_PLAYBACK_TIMELINE_MIN}
                  onChange={(event) =>
                    onStepPlaybackTimelineSecondsChange(Number(event.target.value))
                  }
                  step={0.01}
                  type="number"
                  value={stepPlaybackTimelineSeconds}
                />
                <span>{t(LangId.VfxTimelineStepTimeline)}</span>
              </label>
              <label className={styles.stepWrap} title={t(LangId.VfxTimelineStepInterval)}>
                <input
                  className={styles.stepInput}
                  min={VFX_STEP_PLAYBACK_INTERVAL_MIN}
                  onChange={(event) =>
                    onStepPlaybackIntervalSecondsChange(Number(event.target.value))
                  }
                  step={0.01}
                  type="number"
                  value={stepPlaybackIntervalSeconds}
                />
                <span>{t(LangId.VfxTimelineStepInterval)}</span>
              </label>
              {resetPointTime !== null && stepPlaybackTimelineSeconds > 0 ? (
                <span
                  className={styles.stepResetHint}
                  title={t(LangId.VfxTimelineStepResetHint)}
                >
                  ↺ {Math.round(resetPointTime / stepPlaybackTimelineSeconds)}
                </span>
              ) : null}
            </div>
          ) : null}
          <button
            aria-label={t(LangId.VfxTimelineReverse)}
            aria-pressed={playbackReverse}
            className={[
              styles.transportBtn,
              playbackReverse ? styles.transportBtnActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onToggleReverse}
            title={t(LangId.VfxTimelineReverse)}
            type="button"
          >
            ◀▶
          </button>
          <label className={styles.speedWrap} title="Velocidade de reprodução (0.1x – 2x)">
            <span>{formatPlaybackSpeed(playbackSpeed)}</span>
            <input
              className={styles.speedRange}
              max={VFX_PLAYBACK_SPEED_MAX}
              min={VFX_PLAYBACK_SPEED_MIN}
              onChange={(event) => onPlaybackSpeedChange(Number(event.target.value))}
              step={0.1}
              type="range"
              value={playbackSpeed}
            />
          </label>
          <VfxTimelineTimeControls
            currentTime={currentTime}
            lifetime={scrubMax}
            onScrub={onScrub}
            onSetPlaybackRangeEnd={onSetPlaybackRangeEnd}
            onSetPlaybackRangeStart={onSetPlaybackRangeStart}
            playbackRange={playbackRange}
            resetPointTime={resetPointTime}
          />
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

      <div
        className={[
          styles.tracksShell,
          layersControlsExpanded ? styles.tracksShellExpanded : '',
          fillHeight ? styles.tracksShellFillHeight : '',
          tracksExpand ? styles.tracksShellExpandable : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className={styles.layerColumnHeader}>
          <button
            aria-expanded={layersControlsExpanded}
            aria-label={
              layersControlsExpanded
                ? t(LangId.VfxTimelineLayersCollapse)
                : t(LangId.VfxTimelineLayersExpand)
            }
            className={styles.layerHeadToggle}
            onClick={() => setLayersControlsExpanded((previous) => !previous)}
            title={
              layersControlsExpanded
                ? t(LangId.VfxTimelineLayersCollapse)
                : t(LangId.VfxTimelineLayersExpand)
            }
            type="button"
          >
            <span aria-hidden className={styles.layerHeadChevron}>
              {layersControlsExpanded ? '▾' : '▸'}
            </span>
            <span className={styles.layerHeadLabel}>{t(LangId.VfxTimelineLayers)}</span>
            {!layersControlsExpanded && layerQuery.trim() ? (
              <span aria-hidden className={styles.layerFilterActiveDot} />
            ) : null}
          </button>
          {layersControlsExpanded ? (
            <div className={styles.layerControls}>
              <input
                aria-label={t(LangId.VfxTimelineLayersSearch)}
                className={styles.layerSearch}
                onChange={(event) => setLayerQuery(event.target.value)}
                placeholder={t(LangId.VfxTimelineLayersSearchPlaceholder)}
                type="search"
                value={layerQuery}
              />
              <button
                aria-label={t(LangId.VfxTimelineLayersSort)}
                className={[styles.layerSortBtn, styles.layerSortBtnActive].join(' ')}
                onClick={toggleLayerSort}
                title={t(LangId.VfxTimelineLayersSort)}
                type="button"
              >
                <span>AZ</span>
                <span aria-hidden className={styles.layerSortArrow}>
                  {layerSortMode === 'asc' ? '↓' : '↑'}
                </span>
              </button>
              <span className={styles.layerMeta}>
                {filteredLayers.length}/{layers.length}
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.trackColumnHeader}>
          <div className={styles.ruler}>
            {rulerMarks.map((mark, index) => {
              const isFirst = index === 0
              const isLast = index === rulerMarks.length - 1
              return (
                <span
                  className={[
                    styles.rulerTick,
                    isFirst ? styles.rulerTickStart : '',
                    isLast ? styles.rulerTickEnd : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={mark}
                  style={{ left: `${(mark / scrubMax) * 100}%` }}
                >
                  {formatTime(mark)}
                </span>
              )
            })}
          </div>
        </div>

        <div
          className={styles.layerListScroll}
          onScroll={(event) => syncLayerScroll('layers', event.currentTarget.scrollTop)}
          ref={layerListRef}
        >
            {filteredLayers.length === 0 ? (
              <div className={styles.layerEmpty}>{t(LangId.VfxTimelineLayersNoMatch)}</div>
            ) : (
              filteredLayers.map((layer) => (
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
                  <span className={styles.layerIndex}>{layer.sourceIndex}</span>
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
              ))
            )}
        </div>

        <div
          className={styles.trackStackScroll}
          onContextMenu={handleTrackAreaContextMenu}
          onScroll={(event) => syncLayerScroll('tracks', event.currentTarget.scrollTop)}
          ref={trackStackRef}
        >
          <div className={styles.trackStack} ref={trackAreaRef}>
            {filteredLayers.map((layer) => {
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
                      compositorMode ? styles.trackBarDraggable : '',
                      layer.focused ? styles.trackBarFocused : '',
                      layer.activeAtPlayhead ? styles.trackBarActive : '',
                      !layer.visible ? styles.trackBarHidden : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onPointerDown={
                      compositorMode ? (event) => handleClipPointerDown(event, layer) : undefined
                    }
                    onPointerMove={compositorMode ? handleClipPointerMove : undefined}
                    onPointerUp={compositorMode ? handleClipPointerUp : undefined}
                    onPointerCancel={compositorMode ? handleClipPointerUp : undefined}
                    role={compositorMode ? 'slider' : undefined}
                    aria-label={compositorMode ? `Clip ${layer.name}` : undefined}
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
            {rangeActive && rangeStartPct !== null && rangeWidthPct !== null ? (
              <div
                className={styles.playbackRangeBand}
                onPointerCancel={handleRangeBandPointerUp}
                onPointerDown={handleRangeBandPointerDown}
                onPointerMove={handleRangeBandPointerMove}
                onPointerUp={handleRangeBandPointerUp}
                style={{
                  left: `${rangeStartPct}%`,
                  width: `${Math.max(rangeWidthPct, 0.4)}%`,
                }}
                title={`${t(LangId.VfxCtxTimelinePlaybackRangeMenu)} — ${formatTime(playbackRange.start)} → ${formatTime(playbackRange.end)}`}
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
          currentTime={currentTime}
          hasPlaybackRange={rangeActive}
          hasResetPoint={resetPointTime !== null}
          onClose={() => setContextMenu(null)}
          onRemovePlaybackRange={() => {
            onRemovePlaybackRange()
            setContextMenu(null)
          }}
          onRemoveResetPoint={() => {
            onRemoveResetPoint()
            setContextMenu(null)
          }}
          onSetRangeEnd={() => {
            onSetPlaybackRangeEnd(contextMenu.timeAtClick)
            setContextMenu(null)
          }}
          onSetRangeEndAtCurrent={() => {
            onSetPlaybackRangeEnd(currentTime)
            setContextMenu(null)
          }}
          onSetRangeStart={() => {
            onSetPlaybackRangeStart(contextMenu.timeAtClick)
            setContextMenu(null)
          }}
          onSetRangeStartAtCurrent={() => {
            onSetPlaybackRangeStart(currentTime)
            setContextMenu(null)
          }}
          onMovePlaybackRange={() => {
            onMovePlaybackRange(contextMenu.timeAtClick)
            setContextMenu(null)
          }}
          onSetResetPoint={() => {
            onSetResetPoint(contextMenu.timeAtClick)
            setContextMenu(null)
          }}
          onSetResetPointAtCurrent={() => {
            onSetResetPoint(currentTime)
            setContextMenu(null)
          }}
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

export function compositorLayersToTimelineLayers(
  layers: Array<{
    effectId: string
    name: string
    duration: number
    clipStart: number
    clipEnd: number
    activeAtPlayhead: boolean
    visible: boolean
    focused: boolean
  }>,
): VfxTimelineLayer[] {
  return layers.map((layer) => ({
    id: layer.effectId,
    name: layer.name,
    duration: layer.duration,
    activeStart: layer.clipStart,
    activeEnd: layer.clipEnd,
    activeAtPlayhead: layer.activeAtPlayhead,
    visible: layer.visible,
    focused: layer.focused,
  }))
}
