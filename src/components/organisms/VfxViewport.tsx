import { Suspense, useCallback, useMemo, useRef, type MutableRefObject } from 'react'

import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { VfxCollapsiblePanel } from '@/components/molecules/VfxCollapsiblePanel'
import type { VfxAxisWorldColors, VfxViewportSettings } from '@/core/vfx/vfxViewportPreferences'
import { LangId } from '@/core/language/languageIds'
import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'
import { useLanguage } from '@/language/LanguageProvider'

import type { VfxCharacterBoneApi, VfxCharacterMeshPoseMode } from '@/hooks/useVfxCharacterScene'
import type { GltfModelStats } from '@/core/vfx/characterGltfClips'

import { VfxCharacterGltfScene } from './VfxCharacterGltfScene'
import { VfxScene3dDock } from './VfxScene3dDock'
import { VfxEmitterSurface } from './VfxTexturedEmitter'
import { VfxGround } from './VfxGround'
import { VfxTransformDebug } from './VfxTransformDebug'
import { VfxWorldAxes } from './VfxWorldAxes'
import { VfxSceneDepthProvider } from './vfxSceneDepth'
import { VfxSceneRaycastProvider } from './vfxSceneRaycast'
import { VfxViewportNavigation } from './VfxViewportNavigation'
import { VfxViewportProjectionSync } from './VfxViewportProjectionSync'
import {
  VFX_VIEWPORT_CAMERA_FOV,
  VFX_VIEWPORT_DEFAULT_CAMERA_POSITION,
  VFX_VIEWPORT_DEFAULT_TARGET,
  type VfxViewportProjectionFraming,
} from '@/core/vfx/vfxViewportViews'
import {
  SHORTCUT_SCOPE_ATTR,
  SHORTCUT_SCOPE_VFX_VIEWPORT,
} from '@/core/shortcuts/shortcutScopes'
import styles from './VfxViewport.module.css'
import type { Object3D } from 'three'

export type { VfxViewportSettings }

export type VfxViewportCharacterProps = {
  url: string
  modelBaseName: string
  animationName: string | null
  animTimeSeconds: number
  engineScale: number
  rotationXLolDeg: number
  showSkeleton: boolean
  showWireframe: boolean
  flatLighting: boolean
  meshPoseMode: VfxCharacterMeshPoseMode
  referenceBoneName: string | null
  onBoneApi: (api: VfxCharacterBoneApi | null) => void
  onGltfReady: (payload: {
    clipNames: string[]
    stats: GltfModelStats
    boneNames: string[]
    boundObjectSizeLol: [number, number, number]
  }) => void
  onEngineBoundSize: (size: [number, number, number] | null) => void
  setActiveClipDuration: (duration: number) => void
}

type VfxSceneProps = {
  emitters: VfxEmitterPreviewEntry[]
  vfxScale: number
  settings: VfxViewportSettings
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  character?: VfxViewportCharacterProps | null
  sceneRaycastRootsRef: MutableRefObject<Object3D[]>
  onOrthographicProjectionChange: (next: boolean) => void
  onRegisterProjectionToggle: (toggle: (() => void) | null) => void
  pendingFramingRef: MutableRefObject<VfxViewportProjectionFraming | null>
}

function VfxScene({
  emitters,
  vfxScale,
  settings,
  controlsRef,
  character,
  sceneRaycastRootsRef,
  onOrthographicProjectionChange,
  onRegisterProjectionToggle,
  pendingFramingRef,
}: VfxSceneProps) {
  const bg = settings.darkScene ? '#06080c' : '#12161e'

  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={settings.darkScene ? 0.4 : 0.55} />
      <directionalLight intensity={settings.darkScene ? 0.95 : 1.15} position={[6, 4, 10]} />
      {settings.showGrid ? (
        <Grid
          args={[20, 20]}
          cellColor="#2a3344"
          fadeDistance={24}
          infiniteGrid
          rotation={[Math.PI / 2, 0, 0]}
          sectionColor="#4a5a72"
        />
      ) : null}
      {settings.showAxisWorld ? (
        <VfxWorldAxes colors={settings.axisWorldColors} scale={settings.axisWorldScale} />
      ) : null}
      {settings.showGizmos ? (
        <OrbitControls
          ref={controlsRef}
          dampingFactor={0.08}
          enableDamping
          makeDefault
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: 0,
            RIGHT: 2,
          }}
          panSpeed={0.8}
          rotateSpeed={0.9}
          target={VFX_VIEWPORT_DEFAULT_TARGET}
          zoomSpeed={1.1}
        />
      ) : null}
      <VfxViewportProjectionSync
        controlsRef={controlsRef}
        orthographic={settings.orthographicProjection}
        pendingFramingRef={pendingFramingRef}
      />
      <VfxViewportNavigation
        controlsRef={controlsRef}
        enabled={settings.showGizmos}
        onOrthographicProjectionChange={onOrthographicProjectionChange}
        onRegisterProjectionToggle={onRegisterProjectionToggle}
        orthographicProjection={settings.orthographicProjection}
        pendingFramingRef={pendingFramingRef}
      />
      <Suspense fallback={null}>
        <VfxSceneRaycastProvider rootsRef={sceneRaycastRootsRef}>
          <VfxSceneDepthProvider enabled={settings.sceneDepthFade}>
            {character ? (
              <VfxCharacterGltfScene
                animTimeSeconds={character.animTimeSeconds}
                animationName={character.animationName}
                engineScale={character.engineScale}
                flatLighting={character.flatLighting}
                meshPoseMode={character.meshPoseMode}
                modelBaseName={character.modelBaseName}
                onBoneApi={character.onBoneApi}
                onEngineBoundSize={character.onEngineBoundSize}
                onGltfReady={character.onGltfReady}
                referenceBoneName={character.referenceBoneName}
                rotationXLolDeg={character.rotationXLolDeg}
                setActiveClipDuration={character.setActiveClipDuration}
                showSkeleton={character.showSkeleton}
                showWireframe={character.showWireframe}
                url={character.url}
              />
            ) : null}
            {settings.showGround ? (
              <VfxGround
                groundPosition={settings.groundPosition}
                scale2d={settings.groundScale2d}
                visible
              />
            ) : null}
            {emitters.map((entry) => (
              <VfxEmitterSurface
                key={`${entry.id}-${entry.material.textureUrl ?? ''}-${entry.material.textureMultUrl ?? ''}`}
                entry={entry}
                sceneDepthFade={settings.sceneDepthFade}
                vfxCamLockEnabled={settings.vfxCamLockEnabled}
                meshOnly={settings.meshOnlyEnabled}
                wireframe={settings.showEmitterShapes}
              />
            ))}
            {settings.showTransformDebug
              ? emitters.map((entry) => (
                  <VfxTransformDebug entry={entry} key={`debug-${entry.id}`} vfxScale={vfxScale} />
                ))
              : null}
          </VfxSceneDepthProvider>
        </VfxSceneRaycastProvider>
      </Suspense>
    </>
  )
}

export type VfxViewportProps = {
  emitters: VfxEmitterPreviewEntry[]
  vfxScale?: number
  particleName?: string
  settings: VfxViewportSettings
  onSettingsChange: (patch: Partial<VfxViewportSettings>) => void
  character?: VfxViewportCharacterProps | null
  sceneRaycastRootsRef: MutableRefObject<Object3D[]>
}

export function VfxViewport({
  emitters,
  vfxScale = 0.01,
  particleName,
  settings,
  onSettingsChange,
  character = null,
  sceneRaycastRootsRef,
}: VfxViewportProps) {
  const { t } = useLanguage()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const pendingFramingRef = useRef<VfxViewportProjectionFraming | null>(null)
  const toggleProjectionRef = useRef<(() => void) | null>(null)

  const particleSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of emitters) {
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1)
    }
    return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  }, [emitters])

  const particlePanelTitle = `${emitters.length} partícula${emitters.length === 1 ? '' : 's'}`

  const setOrthographicProjection = (next: boolean) => {
    onSettingsChange({ orthographicProjection: next })
  }

  const registerProjectionToggle = useCallback((toggle: (() => void) | null) => {
    toggleProjectionRef.current = toggle
  }, [])

  const toggle = (key: keyof VfxViewportSettings) => {
    const current = settings[key]
    if (typeof current === 'boolean') {
      onSettingsChange({ [key]: !current })
    }
  }

  const patchGroundPosition = (next: [number, number, number]) => {
    onSettingsChange({ groundPosition: next })
  }

  const patchGroundScale2d = (next: [number, number]) => {
    onSettingsChange({
      groundScale2d: next,
      groundScale: (next[0] + next[1]) / 2,
    })
  }

  const patchGlobalRotationOffset = (next: [number, number, number]) => {
    onSettingsChange({ vfxGlobalRotationOffsetDegrees: next })
  }

  const patchVfxPositionOffset = (next: [number, number, number]) => {
    onSettingsChange({ vfxPositionOffset: next })
  }

  const patchAxisWorldScale = (next: [number, number, number]) => {
    onSettingsChange({ axisWorldScale: next })
  }

  const patchAxisWorldColors = (next: VfxAxisWorldColors) => {
    onSettingsChange({ axisWorldColors: next })
  }

  return (
    <div
      className={styles.host}
      tabIndex={-1}
      {...{ [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_VFX_VIEWPORT }}
    >
      <VfxScene3dDock
        onAxisWorldColorsChange={patchAxisWorldColors}
        onAxisWorldScaleChange={patchAxisWorldScale}
        onGlobalRotationOffsetChange={patchGlobalRotationOffset}
        onGroundPositionChange={patchGroundPosition}
        onGroundScale2dChange={patchGroundScale2d}
        onPositionOffsetChange={patchVfxPositionOffset}
        onSettingsChange={onSettingsChange}
        onToggleProjection={() => toggleProjectionRef.current?.()}
        onToggleSetting={toggle}
        settings={settings}
        toggleProjectionRef={toggleProjectionRef}
      />

      {particleName ? <div className={styles.particleLabel}>{particleName}</div> : null}
      <div
        className={styles.projectionBadge}
        title={settings.orthographicProjection ? 'Vista ortográfica (5)' : 'Vista perspectiva (5)'}
      >
        {settings.orthographicProjection ? 'ORTO' : 'PERSP'}
      </div>

      <Canvas
        camera={{
          fov: VFX_VIEWPORT_CAMERA_FOV,
          near: 0.01,
          far: 200,
          position: VFX_VIEWPORT_DEFAULT_CAMERA_POSITION,
          up: [0, 0, 1],
        }}
        orthographic={settings.orthographicProjection}
        className={styles.canvas}
        gl={{ alpha: true, antialias: true }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <VfxScene
          character={character}
          controlsRef={controlsRef}
          emitters={emitters}
          vfxScale={vfxScale}
          onOrthographicProjectionChange={setOrthographicProjection}
          onRegisterProjectionToggle={registerProjectionToggle}
          pendingFramingRef={pendingFramingRef}
          sceneRaycastRootsRef={sceneRaycastRootsRef}
          settings={settings}
        />
      </Canvas>

      <VfxCollapsiblePanel defaultOpen={false} placement="bottomRight" title={particlePanelTitle}>
        {particleSummary.length ? (
          <ul className={styles.particleList}>
            {particleSummary.map(([name, count]) => (
              <li className={styles.particleListItem} key={name}>
                <span className={styles.particleListName}>{name}</span>
                <span className={styles.particleListCount}>{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className={styles.particleListEmpty}>{t(LangId.VfxViewportNoParticles)}</span>
        )}
      </VfxCollapsiblePanel>
    </div>
  )
}
