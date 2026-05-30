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
import { VfxBackToPreviousIcon } from '@/components/atoms/VfxToolsIcons'
import { LangId } from '@/core/language/languageIds'
import {
  SHORTCUT_SCOPE_ATTR,
  SHORTCUT_SCOPE_VFX_DOCK,
} from '@/core/shortcuts/shortcutScopes'
import { VFX_ISOLATION_REGION_ATTR } from '@/core/vfx/vfxWindowIsolation'
import { getStoredVfxGameRoot, setStoredVfxGameRoot } from '@/core/vfx/gameRootPreference'
import { useLanguage } from '@/language/LanguageProvider'
import {
  buildLolAssetCachesFromFiles,
  disposeLolAssetCaches,
  lookupMeshGeometry,
  type VfxLolAssetCaches,
} from '@/core/vfx/vfxMeshCache'
import type { UseVfxPreviewOptions } from '@/hooks/useVfxPreview'
import { useVfxAutoAssets } from '@/hooks/useVfxAutoAssets'
import {
  ensureDirectoryReadPermission,
  getStoredAssetsDirectoryHandle,
} from '@/core/vfx/vfxAssetsDirectory'
import { useVfxPreview } from '@/hooks/useVfxPreview'
import { useVfxCharacterScene } from '@/hooks/useVfxCharacterScene'
import {
  resolveCharacterEngineRotationXDeg,
  resolveCharacterEngineScale,
} from '@/core/vfx/characterEngineVfx'
import { useVfxWindowIsolation } from '@/hooks/useVfxWindowIsolation'
import { useVfxDockSplitResize } from '@/hooks/useVfxDockSplitResize'
import { useVfxDockShortcutHandlers } from '@/shortcuts/useVfxDockShortcutHandlers'
import { VFX_DOCK_MIN_WORKSPACE_HEIGHT } from '@/core/vfx/vfxDockSplitLayout'
import {
  clampFloatingDockRect,
  type CodeDockFloatingRect,
} from '@/components/organisms/codeDockFloatingRect'

import { VfxEffectTabsBar } from '@/components/molecules/VfxEffectTabsBar'
import { buildVfxTransformDebugList } from '@/core/vfx/vfxTransformDebugList'
import { VfxToolsDock } from './VfxToolsDock'
import { computeEmitterActiveWindow } from '@/core/vfx/vfxEmitterTimeline'
import {
  buildTimelineLayers,
  compositorLayersToTimelineLayers,
  VfxDockTimeline,
} from './VfxDockTimeline'
import {
  DEFAULT_VFX_VIEWPORT_SETTINGS,
  loadVfxViewportSettings,
  saveVfxViewportSettings,
  type VfxViewportSettings,
} from '@/core/vfx/vfxViewportPreferences'
import {
  disposeVfxPrimitiveMeshPool,
  warmVfxPrimitiveMeshPool,
} from '@/core/vfx/vfxPrimitiveMeshPool'
import type { Object3D } from 'three'
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
  const { t } = useLanguage()
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
  const assetIndexRef = useRef(assetIndex)
  assetIndexRef.current = assetIndex
  const sceneRaycastRootsRef = useRef<Object3D[]>([])

  useEffect(() => {
    if (!dockOpen) return
    warmVfxPrimitiveMeshPool()
    return () => {
      disposeVfxPrimitiveMeshPool()
    }
  }, [dockOpen])

  const characterScene = useVfxCharacterScene({
    onIndexCharacter: async (champion) => {
      setAssetLoading(true)
      try {
        const handle = await getStoredAssetsDirectoryHandle()
        if (!handle) {
          setAssetWarnings((previous) => [
            ...previous,
            'Indexe a pasta assets primeiro (botão «Pasta assets…» no inspector).',
          ])
          return null
        }
        const allowed = await ensureDirectoryReadPermission(handle)
        if (!allowed) {
          setAssetWarnings((previous) => [
            ...previous,
            'Permissão de leitura da pasta assets negada — seleccione a pasta de novo.',
          ])
          return null
        }
        const { indexCharacterFromDirectory } = await import('@/core/vfx/vfxAssetsDirectory')
        const result = await indexCharacterFromDirectory(
          handle,
          champion,
          lolCachesRef.current,
          assetIndexRef.current,
        )
        setLolCaches(result.lolCaches)
        setAssetIndex(result.assetIndex)
        if (result.warnings.length) {
          setAssetWarnings((previous) => [...previous, ...result.warnings])
        }
        if (result.filesFound === 0) {
          setAssetWarnings((previous) => [
            ...previous,
            `Nenhum ficheiro de «${champion}» encontrado na pasta assets.`,
          ])
        }
        return { lolCaches: result.lolCaches, assetIndex: result.assetIndex }
      } catch (error) {
        setAssetWarnings((previous) => [
          ...previous,
          `Falha ao indexar «${champion}»: ${error instanceof Error ? error.message : String(error)}`,
        ])
        return null
      } finally {
        setAssetLoading(false)
      }
    },
    onCollectCharacterFiles: async (champion) => {
      const handle = await getStoredAssetsDirectoryHandle()
      if (!handle) return null
      const allowed = await ensureDirectoryReadPermission(handle)
      if (!allowed) return null
      const { collectCharacterGltfSourceFiles } = await import('@/core/vfx/vfxAssetsDirectory')
      return collectCharacterGltfSourceFiles(handle, champion)
    },
  })

  const resolveBoneWorld = characterScene.boneApi?.resolveBoneWorld ?? null

  const previewOptions: UseVfxPreviewOptions = {
    ritualText,
    vfxScale,
    assetIndex,
    lolCaches,
    autoRebuild: viewportSettings.vfxAutoRebuildEnabled,
    dockOpen,
    vfxPositionEnabled: viewportSettings.vfxPositionEnabled,
    vfxPositionOffset: viewportSettings.vfxPositionOffset,
    vfxGlobalRotationEnabled:
      viewportSettings.vfxGlobalRotationEnabled || Boolean(resolveBoneWorld),
    vfxGlobalRotationOffsetDegrees: viewportSettings.vfxGlobalRotationOffsetDegrees,
    vfxLockMotionEnabled: viewportSettings.vfxLockMotionEnabled,
    vfxBirthRotationLoLEnabled: viewportSettings.vfxBirthRotationLoLEnabled,
    showGround: viewportSettings.showGround,
    groundPosition: viewportSettings.groundPosition,
    sceneRaycastRootsRef,
    resolveBoneWorld,
    referenceBoneName: characterScene.referenceBoneName,
    boundObjectSizeLol: characterScene.boundObjectSizeLol,
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
    playbackSpeed,
    setPlaybackSpeed,
    playbackReverse,
    togglePlaybackReverse,
    stepPlaybackEnabled,
    stepPlaybackTimelineSeconds,
    stepPlaybackIntervalSeconds,
    toggleStepPlayback,
    setStepPlaybackTimelineSeconds,
    setStepPlaybackIntervalSeconds,
    timelineResetPoint,
    setTimelineResetPointAt,
    clearTimelineResetPoint,
    playbackRange,
    setPlaybackRangeStart,
    setPlaybackRangeEnd,
    movePlaybackRangeTo,
    clearPlaybackRange,
    selectedEffectIds,
    compositorMode,
    previewLifetime,
    compositorTimelineLayers,
    toggleEffectSelection,
    addEffectToCompositor,
    removeEffectFromCompositor,
    setEffectClipOffset,
    focusCompositorEffect,
    toggleCompositorEffectVisibility,
  } = useVfxPreview(previewOptions)

  rebuildRef.current = rebuild

  const { pickAssetsDirectory } = useVfxAutoAssets({
    assetIndex,
    lolCaches,
    dockOpen,
    autoRebuild: viewportSettings.vfxAutoRebuildEnabled,
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
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const splitRef = useRef<HTMLDivElement | null>(null)
  const transportRef = useRef<HTMLDivElement | null>(null)

  const { isolation, exitIsolation, toggleIsolation } = useVfxWindowIsolation({
    dockOpen,
    shellRef,
    workspaceRef,
    timelineRef,
  })

  useVfxDockShortcutHandlers({
    enabled: dockOpen,
    onToggleWindowIsolation: toggleIsolation,
  })

  const showWorkspace = isolation !== 'timeline'
  const showTimeline = isolation !== 'workspace'
  const splitResizeEnabled = showWorkspace && showTimeline && isolation === null

  const { timelineHeight, transportMinHeight, onSplitPointerDown } = useVfxDockSplitResize({
    enabled: splitResizeEnabled && dockOpen,
    splitRef,
    transportRef,
  })

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

  const lifetime = previewLifetime
  const allWarnings = useMemo(
    () => [...new Set([...assetWarnings, ...buildWarnings])],
    [assetWarnings, buildWarnings],
  )

  const timelineLayers = useMemo(() => {
    if (compositorMode) {
      return compositorLayersToTimelineLayers(compositorTimelineLayers)
    }
    return buildTimelineLayers(effectEmitters, emitterVisibility, focusedEmitterId, currentTime)
  }, [
    compositorMode,
    compositorTimelineLayers,
    currentTime,
    effectEmitters,
    emitterVisibility,
    focusedEmitterId,
  ])

  const handleLayerFocus = useCallback(
    (layerId: string | null) => {
      if (compositorMode) {
        focusCompositorEffect(layerId)
        return
      }
      if (layerId) {
        const target = effectEmitters.find((emitter) => emitter.id === layerId)
        if (target) {
          const window = computeEmitterActiveWindow(target.parsed)
          scrubTo(window.start)
        }
      }
      focusEmitter(layerId)
    },
    [compositorMode, effectEmitters, focusCompositorEffect, focusEmitter, scrubTo],
  )

  const handleLayerVisibility = useCallback(
    (layerId: string) => {
      if (compositorMode) {
        toggleCompositorEffectVisibility(layerId)
        return
      }
      toggleEmitter(layerId)
    },
    [compositorMode, toggleCompositorEffectVisibility, toggleEmitter],
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

  const inspectorPreviewEntry = useMemo(() => {
    if (!inspectorEmitter) return null
    const prefix = `${inspectorEmitter.id}-`
    const matches = emitterEntries.filter((entry) => entry.id.startsWith(prefix))
    if (!matches.length) return null
    return matches.find((entry) => entry.particleIndex === 0) ?? matches[0]
  }, [emitterEntries, inspectorEmitter])

  const inspectorParticleNormalized = inspectorPreviewEntry?.particleNormalized ?? 0

  const inspectorTransformDebugRows = useMemo(() => {
    if (!viewportSettings.showTransformDebug || !inspectorPreviewEntry) return null
    return buildVfxTransformDebugList(inspectorPreviewEntry, inspectorEmitter?.parsed ?? null)
  }, [
    viewportSettings.showTransformDebug,
    inspectorPreviewEntry,
    inspectorEmitter?.parsed,
  ])

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

  const showEffectTabsBar = effectList.length > 1 && isolation === null

  const shellClassName = [
    styles.shell,
    floatingActive ? styles.shellFloating : '',
    isolation === 'workspace' ? styles.shellIsolatedWorkspace : '',
    isolation === 'timeline' ? styles.shellIsolatedTimeline : '',
  ]
    .filter(Boolean)
    .join(' ')

  const dockBody = (
    <section
      className={shellClassName}
      ref={shellRef}
      style={dockedShellStyle}
      {...{ [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_VFX_DOCK }}
    >
      {!floatingActive ? (
        <button
          aria-label={t(LangId.VfxDockResizePanelAria)}
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
          <span className={styles.title}>{t(LangId.VfxDockTitle)}</span>
          {scene?.particleName ? (
            <span className={styles.subtitle} title={scene.particleName}>
              {scene.particleName}
            </span>
          ) : (
            <span className={styles.subtitleMuted}>{t(LangId.VfxDockNoRitual)}</span>
          )}
        </div>
        <div className={styles.headerActions}>
          {isolation !== null ? (
            <button
              aria-label={t(LangId.VfxDockBackToPrevious)}
              className={`${styles.actionBtn} ${styles.isolationExitBtn}`}
              onClick={exitIsolation}
              title={t(LangId.VfxDockBackToPrevious)}
              type="button"
            >
              <VfxBackToPreviousIcon className={styles.isolationExitIcon} size={14} />
              <span>{t(LangId.VfxDockBackToPrevious)}</span>
            </button>
          ) : null}
          {playing ? <span className={styles.liveBadge}>{t(LangId.VfxDockLive)}</span> : null}
          {compositorMode ? (
            <span className={styles.compositorBadge} title={t(LangId.VfxDockCompositorBadge)}>
              {t(LangId.VfxDockCompositorBadge)}
            </span>
          ) : null}
          <button className={styles.actionBtn} onClick={() => rebuild()} type="button">
            {t(LangId.VfxDockRebuild)}
          </button>
          <button className={styles.actionBtn} onClick={onToggleFloating} type="button">
            {floatingActive ? t(LangId.VfxDockDock) : t(LangId.VfxDockFloat)}
          </button>
          {floatingActive ? (
            <button className={styles.actionBtn} onClick={onResetFloatingDimensions} type="button">
              {t(LangId.VfxDockReset)}
            </button>
          ) : null}
          <button className={styles.actionBtnDanger} onClick={onClose} type="button">
            {t(LangId.VfxDockClose)}
          </button>
        </div>
      </header>

      {showEffectTabsBar ? (
        <VfxEffectTabsBar
          activeEffectId={activeEffectId}
          compositorMode={compositorMode}
          effects={effectList}
          onAddToCompositor={addEffectToCompositor}
          onRemoveFromCompositor={removeEffectFromCompositor}
          onSelectEffect={selectEffect}
          onToggleEffectSelection={toggleEffectSelection}
          selectedEffectIds={selectedEffectIds}
        />
      ) : null}

      {showWorkspace || showTimeline ? (
      <div className={styles.mainSplit} ref={splitResizeEnabled ? splitRef : undefined}>
      {showWorkspace ? (
      <div
        className={[
          styles.workspace,
          splitResizeEnabled ? styles.workspaceInSplit : '',
        ]
          .filter(Boolean)
          .join(' ')}
        ref={workspaceRef}
        style={splitResizeEnabled ? { minHeight: VFX_DOCK_MIN_WORKSPACE_HEIGHT } : undefined}
        {...{ [VFX_ISOLATION_REGION_ATTR]: 'workspace' }}
      >
        <div className={styles.viewportColumn}>
          <VfxViewport
            vfxScale={vfxScale}
            character={
              characterScene.gltfModel
                ? {
                    url: characterScene.gltfModel.url,
                    modelBaseName: characterScene.gltfModel.baseName,
                    animationName: characterScene.animationName,
                    animTimeSeconds: characterScene.animSyncVfx
                      ? currentTime
                      : characterScene.animTime,
                    engineScale: resolveCharacterEngineScale(
                      characterScene.characterEngineResizeEnabled,
                      vfxScale,
                    ),
                    rotationXLolDeg: resolveCharacterEngineRotationXDeg(
                      characterScene.characterEngineRotationEnabled,
                    ),
                    showSkeleton: characterScene.showSkeleton,
                    showWireframe: characterScene.showWireframe,
                    flatLighting: characterScene.flatLighting,
                    meshPoseMode: characterScene.meshPoseMode,
                    referenceBoneName: characterScene.referenceBoneName,
                    onBoneApi: characterScene.registerBoneApi,
                    onEngineBoundSize: characterScene.handleEngineBoundSize,
                    onGltfReady: characterScene.handleGltfReady,
                    setActiveClipDuration: characterScene.setActiveClipDuration,
                  }
                : null
            }
            emitters={emitterEntries}
            onSettingsChange={patchViewportSettings}
            particleName={scene?.particleName}
            sceneRaycastRootsRef={sceneRaycastRootsRef}
            settings={viewportSettings}
          />
        </div>

        <VfxToolsDock
          assetIndexSize={assetIndex ? assetIndexSize(assetIndex) : 0}
          assetLoading={assetLoading}
          characterScene={characterScene}
          vfxScale={vfxScale}
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
          particleNormalized={inspectorParticleNormalized}
          showTransformDebug={viewportSettings.showTransformDebug}
          textureHit={inspectorTextureHit}
          textureResolved={Boolean(inspectorTextureHit)}
          transformDebugRows={inspectorTransformDebugRows}
          warnings={allWarnings}
        />
      </div>
      ) : null}

      {splitResizeEnabled ? (
        <button
          aria-label={t(LangId.VfxDockResizeSplitAria)}
          className={styles.splitResizeHandle}
          onPointerDown={onSplitPointerDown}
          type="button"
        />
      ) : null}

      {showTimeline ? (
      <div
        className={
          splitResizeEnabled
            ? styles.timelineHostSized
            : isolation === 'timeline'
              ? styles.timelineHostExpanded
              : undefined
        }
        ref={timelineRef}
        style={
          splitResizeEnabled
            ? { height: timelineHeight, minHeight: transportMinHeight }
            : undefined
        }
        {...{ [VFX_ISOLATION_REGION_ATTR]: 'timeline' }}
      >
      <VfxDockTimeline
        fillHeight={isolation === 'timeline'}
        tracksExpand={splitResizeEnabled}
        transportRef={splitResizeEnabled ? transportRef : undefined}
        currentTime={currentTime}
        layers={timelineLayers}
        lifetime={lifetime}
        loop={loop}
        mode={compositorMode ? 'compositor' : 'emitters'}
        onClipOffsetChange={compositorMode ? setEffectClipOffset : undefined}
        onLayerFocus={handleLayerFocus}
        onLayerVisibility={handleLayerVisibility}
        onPause={pause}
        onPlay={play}
        onRemoveResetPoint={clearTimelineResetPoint}
        onRestart={restart}
        onScaleChange={setVfxScale}
        onScrub={scrubTo}
        onSetResetPoint={setTimelineResetPointAt}
        onRemoveResetPoint={clearTimelineResetPoint}
        onSetPlaybackRangeStart={setPlaybackRangeStart}
        onSetPlaybackRangeEnd={setPlaybackRangeEnd}
        onMovePlaybackRange={movePlaybackRangeTo}
        onRemovePlaybackRange={clearPlaybackRange}
        playbackRange={playbackRange}
        onToggleLoop={() => setLoop((previous) => !previous)}
        onToggleStepPlayback={toggleStepPlayback}
        onToggleReverse={togglePlaybackReverse}
        onStepPlaybackTimelineSecondsChange={setStepPlaybackTimelineSeconds}
        onStepPlaybackIntervalSecondsChange={setStepPlaybackIntervalSeconds}
        onPlaybackSpeedChange={setPlaybackSpeed}
        playbackReverse={playbackReverse}
        stepPlaybackEnabled={stepPlaybackEnabled}
        stepPlaybackTimelineSeconds={stepPlaybackTimelineSeconds}
        stepPlaybackIntervalSeconds={stepPlaybackIntervalSeconds}
        playbackSpeed={playbackSpeed}
        playing={playing}
        resetPointTime={timelineResetPoint}
        vfxScale={vfxScale}
      />
      </div>
      ) : null}
      </div>
      ) : null}

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
