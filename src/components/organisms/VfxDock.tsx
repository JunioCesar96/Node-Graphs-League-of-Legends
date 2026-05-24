import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import type { VfxAssetFileIndex } from '@/core/vfx/vfxAssetIndex'
import {
  assetIndexSize,
  buildAssetIndexFromFileList,
  createEmptyAssetIndex,
  indexSingleTextureFile,
  lookupTextureForRitual,
  revokeAssetIndex,
} from '@/core/vfx/vfxAssetIndex'
import { getStoredVfxGameRoot, setStoredVfxGameRoot } from '@/core/vfx/gameRootPreference'
import {
  buildLolAssetCachesFromFiles,
  disposeLolAssetCaches,
  lookupMeshGeometry,
  type VfxLolAssetCaches,
} from '@/core/vfx/vfxMeshCache'
import type { UseVfxPreviewOptions } from '@/hooks/useVfxPreview'
import { useVfxAutoAssets } from '@/hooks/useVfxAutoAssets'
import { useVfxPreview } from '@/hooks/useVfxPreview'
import {
  clampFloatingDockRect,
  type CodeDockFloatingRect,
} from '@/components/organisms/codeDockFloatingRect'

import { VfxDockInspector } from './VfxDockInspector'
import { computeEmitterActiveWindow } from '@/core/vfx/vfxEmitterTimeline'
import { buildTimelineLayers, VfxDockTimeline } from './VfxDockTimeline'
import {
  DEFAULT_VFX_VIEWPORT_SETTINGS,
  loadVfxViewportSettings,
  saveVfxViewportSettings,
  type VfxViewportSettings,
} from '@/core/vfx/vfxViewportPreferences'
import { VfxViewport } from './VfxViewport'
import styles from './VfxDock.module.css'

export const VFX_DOCK_DEFAULT_WIDTH = 580
export const VFX_DOCK_MIN_WIDTH = 480
export const VFX_DOCK_MAX_WIDTH = 800

type FloatingDragPhase =
  | null
  | { kind: 'move'; sx: number; sy: number; rx: number; ry: number }
  | { kind: 'east'; sx: number; rw: number }
  | { kind: 'south'; sy: number; rh: number }
  | { kind: 'southEast'; sx: number; sy: number; rw: number; rh: number }

export type VfxDockProps = {
  dockedWidth: number
  floatingActive: boolean
  floatingRect: CodeDockFloatingRect
  onFloatingRectChange: (next: CodeDockFloatingRect) => void
  onClose: () => void
  onToggleFloating: () => void
  onResetFloatingDimensions: () => void
  onDockedWidthChange: (nextWidth: number) => void
  ritualText: string
  dockOpen: boolean
}

export function VfxDock({
  dockedWidth,
  floatingActive,
  floatingRect,
  onFloatingRectChange,
  onClose,
  onToggleFloating,
  onResetFloatingDimensions,
  onDockedWidthChange,
  ritualText,
  dockOpen,
}: VfxDockProps) {
  const [vfxScale, setVfxScale] = useState(0.01)
  const [gameRoot, setGameRoot] = useState(() => getStoredVfxGameRoot() ?? '')
  const [assetIndex, setAssetIndex] = useState<VfxAssetFileIndex | null>(null)
  const [lolCaches, setLolCaches] = useState<VfxLolAssetCaches | null>(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetWarnings, setAssetWarnings] = useState<string[]>([])
  const [viewportSettings, setViewportSettings] = useState<VfxViewportSettings>(loadVfxViewportSettings)
  const assetFolderInputRef = useRef<HTMLInputElement>(null)
  const assetFileInputRef = useRef<HTMLInputElement>(null)
  const rebuildRef = useRef<() => void>(() => {})
  const lolCachesRef = useRef(lolCaches)
  lolCachesRef.current = lolCaches

  const previewOptions: UseVfxPreviewOptions = {
    ritualText,
    vfxScale,
    assetIndex,
    lolCaches,
    autoRebuild: true,
    dockOpen,
    vfxPositionEnabled: viewportSettings.vfxPositionEnabled,
    vfxPositionOffset: viewportSettings.vfxPositionOffset,
  }

  const {
    scene,
    effectList,
    activeEffectId,
    buildWarnings,
    currentTime,
    playing,
    emitterEntries,
    emitterVisibility,
    effectEmitters,
    rebuild,
    selectEffect,
    focusEmitter,
    focusedEmitterId,
    play,
    pause,
    restart,
    scrubTo,
    toggleEmitter,
    loop,
    setLoop,
    timelineResetPoint,
    setTimelineResetPointAt,
    clearTimelineResetPoint,
  } = useVfxPreview(previewOptions)

  rebuildRef.current = rebuild

  const { pickAssetsDirectory } = useVfxAutoAssets({
    assetIndex,
    lolCaches,
    dockOpen,
    onIndexed: rebuild,
    ritualText,
    setAssetIndex,
    setLolCaches,
    setAssetLoading,
    setAssetWarnings,
    setGameRoot,
  })

  useEffect(() => {
    return () => {
      if (lolCaches) disposeLolAssetCaches(lolCaches)
    }
  }, [lolCaches])

  const dragPhaseRef = useRef<FloatingDragPhase>(null)
  const floatingRectRef = useRef(floatingRect)
  floatingRectRef.current = floatingRect
  const dockedResizePhaseRef = useRef(false)
  const shellRef = useRef<HTMLElement | null>(null)

  const applyFloatingRect = useCallback(
    (incoming: CodeDockFloatingRect) => {
      onFloatingRectChange(clampFloatingDockRect(incoming))
    },
    [onFloatingRectChange],
  )

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!floatingActive) return
      const phase = dragPhaseRef.current
      if (!phase) return
      const r = floatingRectRef.current

      if (phase.kind === 'move') {
        applyFloatingRect({
          ...r,
          left: phase.rx + (event.clientX - phase.sx),
          top: phase.ry + (event.clientY - phase.sy),
        })
        return
      }
      if (phase.kind === 'east') {
        applyFloatingRect({ ...r, width: phase.rw + (event.clientX - phase.sx) })
        return
      }
      if (phase.kind === 'south') {
        applyFloatingRect({ ...r, height: phase.rh + (event.clientY - phase.sy) })
        return
      }
      applyFloatingRect({
        ...r,
        height: phase.rh + (event.clientY - phase.sy),
        width: phase.rw + (event.clientX - phase.sx),
      })
    }

    const stop = () => {
      dragPhaseRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('pointerup', stop)
    }
  }, [applyFloatingRect, floatingActive])

  useEffect(() => {
    const handleDockWidthMove = (event: PointerEvent) => {
      if (!dockedResizePhaseRef.current || floatingActive || !shellRef.current?.parentElement) return
      const parentRect = shellRef.current.parentElement.getBoundingClientRect()
      const nextWidth = parentRect.right - event.clientX
      const clamped = Math.min(VFX_DOCK_MAX_WIDTH, Math.max(VFX_DOCK_MIN_WIDTH, nextWidth))
      onDockedWidthChange(clamped)
    }
    const stop = () => {
      dockedResizePhaseRef.current = false
    }
    window.addEventListener('pointermove', handleDockWidthMove)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', handleDockWidthMove)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('pointerup', stop)
    }
  }, [floatingActive, onDockedWidthChange])

  const handlePickGameRootFolder = useCallback(async () => {
    const picked = await pickAssetsDirectory()
    if (!picked) assetFolderInputRef.current?.click()
  }, [pickAssetsDirectory])

  const handlePickSingleTex = useCallback(() => {
    assetFileInputRef.current?.click()
  }, [])

  const handleFolderInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      event.target.value = ''
      if (!files?.length) return

      setAssetLoading(true)
      try {
        if (assetIndex) revokeAssetIndex(assetIndex)
        if (lolCaches) disposeLolAssetCaches(lolCaches)
        const built = await buildAssetIndexFromFileList(files)
        const meshes = await buildLolAssetCachesFromFiles(Array.from(files))
        setAssetIndex(built.index)
        setLolCaches(meshes.caches)
        setGameRoot(built.rootLabel)
        setStoredVfxGameRoot(built.rootLabel)
        setAssetWarnings([
          ...built.warnings,
          ...meshes.warnings,
          ...(meshes.loadedMeshes > 0 ? [`Meshes: ${meshes.loadedMeshes}`] : []),
          ...(meshes.loadedSkinned > 0 ? [`Skinned: ${meshes.loadedSkinned}`] : []),
          ...(meshes.loadedAnm > 0 ? [`ANM: ${meshes.loadedAnm}`] : []),
        ])
        rebuild()
      } finally {
        setAssetLoading(false)
      }
    },
    [assetIndex, lolCaches, rebuild],
  )

  const lifetime = scene?.lifetime ?? 1
  const allWarnings = useMemo(
    () => [...new Set([...assetWarnings, ...buildWarnings])],
    [assetWarnings, buildWarnings],
  )

  const timelineLayers = useMemo(
    () => buildTimelineLayers(effectEmitters, emitterVisibility, focusedEmitterId, currentTime),
    [currentTime, effectEmitters, emitterVisibility, focusedEmitterId],
  )

  const handleLayerFocus = useCallback(
    (emitterId: string | null) => {
      if (emitterId) {
        const target = effectEmitters.find((emitter) => emitter.id === emitterId)
        if (target) {
          const window = computeEmitterActiveWindow(target.parsed)
          scrubTo(window.start)
        }
      }
      focusEmitter(emitterId)
    },
    [effectEmitters, focusEmitter, scrubTo],
  )

  const inspectorEmitter = useMemo(() => {
    if (!scene) return null
    if (focusedEmitterId) {
      return scene.emitters.find((emitter) => emitter.id === focusedEmitterId) ?? scene.emitters[0] ?? null
    }
    return scene.emitters[0] ?? null
  }, [focusedEmitterId, scene])

  const inspectorTextureHit = useMemo(() => {
    if (!inspectorEmitter || !assetIndex) return null
    const paths = [
      inspectorEmitter.texturePath,
      inspectorEmitter.colorTexturePath,
      inspectorEmitter.textureMultPath,
    ].filter((path) => path.trim())
    for (const path of paths) {
      const hit = lookupTextureForRitual(assetIndex, path)
      if (hit) return { path, hit }
    }
    return null
  }, [assetIndex, inspectorEmitter])

  const inspectorMeshGeometry = useMemo(() => {
    const meshPath = inspectorEmitter?.meshPath?.trim()
    if (!meshPath || !lolCaches) return null
    return lookupMeshGeometry(lolCaches.meshes, meshPath)
  }, [inspectorEmitter, lolCaches])

  const handleSingleTexFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      setAssetLoading(true)
      try {
        const nextIndex = assetIndex ?? createEmptyAssetIndex()
        const ritualHint =
          inspectorEmitter?.texturePath ||
          inspectorEmitter?.colorTexturePath ||
          `ASSETS/${file.name}`

        const result = await indexSingleTextureFile(nextIndex, file, ritualHint)
        setAssetIndex(nextIndex)
        setAssetWarnings((previous) => [
          ...previous,
          result.warning ?? `Ficheiro carregado: ${file.name}`,
        ])
      } finally {
        setAssetLoading(false)
      }
    },
    [assetIndex, inspectorEmitter],
  )

  const patchViewportSettings = useCallback((patch: Partial<VfxViewportSettings>) => {
    setViewportSettings((previous) => {
      const next = { ...previous, ...patch }
      saveVfxViewportSettings(next)
      return next
    })
  }, [])

  const dockedShellStyle = floatingActive
    ? undefined
    : { width: dockedWidth, minWidth: VFX_DOCK_MIN_WIDTH }

  const dockBody = (
    <section
      className={[styles.shell, floatingActive ? styles.shellFloating : ''].filter(Boolean).join(' ')}
      ref={shellRef}
      style={dockedShellStyle}
    >
      {!floatingActive ? (
        <button
          aria-label="Redimensionar painel VFX"
          className={styles.resizeDockWidth}
          onPointerDown={() => {
            dockedResizePhaseRef.current = true
          }}
          type="button"
        />
      ) : null}

      <header
        className={styles.header}
        onPointerDown={(event: ReactPointerEvent) => {
          if (!floatingActive || event.button !== 0) return
          dragPhaseRef.current = {
            kind: 'move',
            rx: floatingRect.left,
            ry: floatingRect.top,
            sx: event.clientX,
            sy: event.clientY,
          }
        }}
      >
        <div className={styles.headerTitle}>
          <span className={styles.title}>VFX Editor</span>
          {scene?.particleName ? (
            <span className={styles.subtitle} title={scene.particleName}>
              {scene.particleName}
            </span>
          ) : (
            <span className={styles.subtitleMuted}>Sem ritual VFX</span>
          )}
        </div>
        <div className={styles.headerActions}>
          {playing ? <span className={styles.liveBadge}>LIVE</span> : null}
          <button className={styles.actionBtn} onClick={() => rebuild()} type="button">
            Rebuild
          </button>
          <button className={styles.actionBtn} onClick={onToggleFloating} type="button">
            {floatingActive ? 'Docar' : 'Flutuar'}
          </button>
          {floatingActive ? (
            <button className={styles.actionBtn} onClick={onResetFloatingDimensions} type="button">
              Reset
            </button>
          ) : null}
          <button className={styles.actionBtnDanger} onClick={onClose} type="button">
            Fechar
          </button>
        </div>
      </header>

      {effectList.length > 1 ? (
        <div className={styles.effectTabs}>
          {effectList.map((effect) => (
            <button
              className={[
                styles.effectTab,
                effect.id === activeEffectId ? styles.effectTabActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={effect.id}
              onClick={() => selectEffect(effect.id)}
              type="button"
            >
              <span className={styles.effectTabLabel}>{effect.label}</span>
              <span className={styles.effectTabMeta}>{effect.emitterCount}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.workspace}>
        <div className={styles.viewportColumn}>
          <VfxViewport
            emitters={emitterEntries}
            onSettingsChange={patchViewportSettings}
            particleName={scene?.particleName}
            settings={viewportSettings}
            vfxScale={vfxScale}
          />
        </div>

        <div className={styles.inspectorColumn}>
        <VfxDockInspector
          assetIndexSize={assetIndex ? assetIndexSize(assetIndex) : 0}
          textureHit={inspectorTextureHit}
          assetLoading={assetLoading}
          emitter={inspectorEmitter}
          gameRoot={gameRoot}
          meshCacheSize={lolCaches?.meshes.size ?? 0}
          meshGeometry={inspectorMeshGeometry}
          meshResolved={Boolean(inspectorMeshGeometry)}
          onGameRootChange={(value) => {
            setGameRoot(value)
            setStoredVfxGameRoot(value)
          }}
          onOpenTexFile={handlePickSingleTex}
          onPickAssets={handlePickGameRootFolder}
          onVfxPositionEnabledChange={(enabled) => patchViewportSettings({ vfxPositionEnabled: enabled })}
          onVfxPositionOffsetChange={(offset) => patchViewportSettings({ vfxPositionOffset: offset })}
          textureResolved={Boolean(inspectorTextureHit)}
          vfxPositionEnabled={viewportSettings.vfxPositionEnabled}
          vfxPositionOffset={viewportSettings.vfxPositionOffset}
          warnings={allWarnings}
        />
        </div>
      </div>

      <VfxDockTimeline
        currentTime={currentTime}
        layers={timelineLayers}
        lifetime={lifetime}
        loop={loop}
        onLayerFocus={handleLayerFocus}
        onLayerVisibility={toggleEmitter}
        onPause={pause}
        onPlay={play}
        onRemoveResetPoint={clearTimelineResetPoint}
        onRestart={restart}
        onScaleChange={setVfxScale}
        onScrub={scrubTo}
        onSetResetPoint={setTimelineResetPointAt}
        onToggleLoop={() => setLoop((previous) => !previous)}
        playing={playing}
        resetPointTime={timelineResetPoint}
        vfxScale={vfxScale}
      />

      <input
        className={styles.hiddenInput}
        onChange={(event) => void handleFolderInputChange(event)}
        ref={assetFolderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
      />
      <input
        accept=".tex,.dds,.png,.jpg,.jpeg,.webp,.tga"
        className={styles.hiddenInput}
        onChange={(event) => void handleSingleTexFileChange(event)}
        ref={assetFileInputRef}
        type="file"
      />

      {floatingActive ? (
        <>
          <button
            aria-label="Redimensionar largura"
            className={styles.resizeE}
            onPointerDown={(event) => {
              dragPhaseRef.current = { kind: 'east', rw: floatingRect.width, sx: event.clientX }
            }}
            type="button"
          />
          <button
            aria-label="Redimensionar altura"
            className={styles.resizeS}
            onPointerDown={(event) => {
              dragPhaseRef.current = { kind: 'south', rh: floatingRect.height, sy: event.clientY }
            }}
            type="button"
          />
          <button
            aria-label="Redimensionar canto"
            className={styles.resizeSE}
            onPointerDown={(event) => {
              dragPhaseRef.current = {
                kind: 'southEast',
                rw: floatingRect.width,
                rh: floatingRect.height,
                sx: event.clientX,
                sy: event.clientY,
              }
            }}
            type="button"
          />
        </>
      ) : null}
    </section>
  )

  if (!floatingActive) {
    return <div className={`${styles.outer} ${styles.outerStretch}`}>{dockBody}</div>
  }

  const floatingChrome = (
    <div
      className={styles.floatingChrome}
      style={{
        boxSizing: 'border-box',
        height: floatingRect.height,
        left: floatingRect.left,
        top: floatingRect.top,
        width: floatingRect.width,
      }}
    >
      {dockBody}
    </div>
  )

  return createPortal(floatingChrome, document.body)
}
