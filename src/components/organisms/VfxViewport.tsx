import { Suspense, useCallback, useMemo, useRef, useState, type MutableRefObject } from 'react'

import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { VfxCollapsiblePanel } from '@/components/molecules/VfxCollapsiblePanel'
import { VfxGlobalRotationContextMenu } from '@/components/molecules/VfxGlobalRotationContextMenu'
import { VfxGroundContextMenu } from '@/components/molecules/VfxGroundContextMenu'
import { VfxAxisWorldContextMenu } from '@/components/molecules/VfxAxisWorldContextMenu'
import { VfxPositionContextMenu } from '@/components/molecules/VfxPositionContextMenu'
import type { VfxAxisWorldColors, VfxViewportSettings } from '@/core/vfx/vfxViewportPreferences'
import { LangId } from '@/core/language/languageIds'
import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'
import { useLanguage } from '@/language/LanguageProvider'

import type { ParsedLolAnm } from '@/core/vfx/lolAnmParse'
import type { LolSkinnedMeshBundle } from '@/core/vfx/lolSkinnedMesh'
import type { ParsedLolSkl } from '@/core/vfx/lolSklParse'
import type { VfxCharacterBoneApi } from '@/hooks/useVfxCharacterScene'

import { VfxCharacterInScene } from './VfxCharacterInScene'
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
  bundle: LolSkinnedMeshBundle
  skl: ParsedLolSkl
  anm: ParsedLolAnm | null
  animTimeSeconds: number
  showSkeleton: boolean
  showWireframe: boolean
  flatLighting: boolean
  referenceBoneName: string | null
  onBoneApi: (api: VfxCharacterBoneApi | null) => void
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
              <VfxCharacterInScene
                anm={character.anm}
                animTimeSeconds={character.animTimeSeconds}
                bundle={character.bundle}
                flatLighting={character.flatLighting}
                onBoneApi={character.onBoneApi}
                referenceBoneName={character.referenceBoneName}
                showSkeleton={character.showSkeleton}
                showWireframe={character.showWireframe}
                skl={character.skl}
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
  const [groundMenu, setGroundMenu] = useState<{ x: number; y: number } | null>(null)
  const [globalRotationMenu, setGlobalRotationMenu] = useState<{ x: number; y: number } | null>(null)
  const [positionMenu, setPositionMenu] = useState<{ x: number; y: number } | null>(null)
  const [axisWorldMenu, setAxisWorldMenu] = useState<{ x: number; y: number } | null>(null)

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
      <VfxCollapsiblePanel defaultOpen placement="topLeft" title={t(LangId.VfxViewportScene3d)}>
        <label className={styles.overlayItem}>
          <input checked={settings.darkScene} onChange={() => toggle('darkScene')} type="checkbox" />
          {t(LangId.VfxViewportDarkScene)}
        </label>
        <label className={styles.overlayItem}>
          <input checked={settings.showGizmos} onChange={() => toggle('showGizmos')} type="checkbox" />
          {t(LangId.VfxViewportOrbit)}
        </label>
        <div className={styles.viewHints} title={t(LangId.VfxViewportShortcutsTitle)}>
          <span className={styles.viewHintsTitle}>{t(LangId.VfxViewportViewsBlender)}</span>
          <span>7 Top · 3 Right · 1 Front · 5 Persp/Ortho</span>
          <span>Ctrl+7 Bottom · Ctrl+3 Left · Ctrl+1 Back</span>
          <span>MMB órbita · botão direito pan · roda zoom</span>
        </div>
        <label className={styles.overlayItem} title="Alternar com a tecla 5">
          <input
            checked={settings.orthographicProjection}
            onChange={() => toggleProjectionRef.current?.()}
            type="checkbox"
          />
          {t(LangId.VfxViewportOrthographic)}
        </label>
        <label className={styles.overlayItem}>
          <input checked={settings.showGrid} onChange={() => toggle('showGrid')} type="checkbox" />
          {t(LangId.VfxViewportGrid)}
        </label>
        <div className={styles.overlayItem}>
          <label className={styles.overlayCheckboxOnly}>
            <input
              checked={settings.showAxisWorld}
              onChange={() => toggle('showAxisWorld')}
              type="checkbox"
            />
          </label>
          <span
            className={styles.overlayContextLabel}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setAxisWorldMenu({ x: event.clientX, y: event.clientY })
            }}
            title="Clique direito: escala e cor por eixo (X, Y, Z)"
          >
            {t(LangId.VfxViewportAxisWorld)}
          </span>
        </div>
        <div className={styles.overlayItem}>
          <label className={styles.overlayCheckboxOnly}>
            <input checked={settings.showGround} onChange={() => toggle('showGround')} type="checkbox" />
          </label>
          <span
            className={styles.overlayContextLabel}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setGroundMenu({ x: event.clientX, y: event.clientY })
            }}
            title={t(LangId.VfxViewportGroundTitle)}
          >
            {t(LangId.VfxViewportGround)}
          </span>
        </div>
        <label className={styles.overlayItem}>
          <input
            checked={settings.showEmitterShapes}
            onChange={() => toggle('showEmitterShapes')}
            type="checkbox"
          />
          {t(LangId.VfxViewportWireframe)}
        </label>
        <label
          className={styles.overlayItem}
          title={t(LangId.VfxViewportMeshOnlyTitle)}
        >
          <input
            checked={settings.meshOnlyEnabled}
            onChange={() => toggle('meshOnlyEnabled')}
            type="checkbox"
          />
          {t(LangId.VfxViewportMeshOnly)}
        </label>
        <div className={styles.overlayItem}>
          <label className={styles.overlayCheckboxOnly}>
            <input
              checked={settings.vfxGlobalRotationEnabled}
              onChange={() => toggle('vfxGlobalRotationEnabled')}
              type="checkbox"
            />
          </label>
          <span
            className={styles.overlayContextLabel}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setGlobalRotationMenu({ x: event.clientX, y: event.clientY })
            }}
            title="Clique direito: correção e offset Euler global"
          >
            {t(LangId.VfxViewportGlobalRotation)}
          </span>
        </div>
        <div className={styles.overlayItem}>
          <label className={styles.overlayCheckboxOnly}>
            <input
              checked={settings.vfxPositionEnabled}
              onChange={() => toggle('vfxPositionEnabled')}
              type="checkbox"
            />
          </label>
          <span
            className={styles.overlayContextLabel}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setPositionMenu({ x: event.clientX, y: event.clientY })
            }}
            title={t(LangId.VfxViewportPositionTitle)}
          >
            {t(LangId.VfxViewportPosition)}
          </span>
        </div>
        <label
          className={styles.overlayItem}
          title={t(LangId.VfxViewportCamLockTitle)}
        >
          <input
            checked={settings.vfxCamLockEnabled}
            onChange={() => toggle('vfxCamLockEnabled')}
            type="checkbox"
          />
          {t(LangId.VfxViewportCamLock)}
        </label>
        <label
          className={styles.overlayItem}
          title={t(LangId.VfxViewportLockMotionTitle)}
        >
          <input
            checked={settings.vfxLockMotionEnabled}
            onChange={() => toggle('vfxLockMotionEnabled')}
            type="checkbox"
          />
          {t(LangId.VfxViewportLockMotion)}
        </label>
        <label
          className={styles.overlayItem}
          title={t(LangId.VfxViewportTransformDebugTitle)}
        >
          <input
            checked={settings.showTransformDebug}
            onChange={() => toggle('showTransformDebug')}
            type="checkbox"
          />
          {t(LangId.VfxViewportTransformDebug)}
        </label>
        <label
          className={styles.overlayItem}
          title={t(LangId.VfxViewportSceneDepthTitle)}
        >
          <input
            checked={settings.sceneDepthFade}
            onChange={() => toggle('sceneDepthFade')}
            type="checkbox"
          />
          {t(LangId.VfxViewportSceneDepth)}
        </label>
      </VfxCollapsiblePanel>

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

      {groundMenu ? (
        <VfxGroundContextMenu
          anchor={groundMenu}
          groundPosition={settings.groundPosition}
          groundScale2d={settings.groundScale2d}
          onClose={() => setGroundMenu(null)}
          onGroundPositionChange={patchGroundPosition}
          onGroundScale2dChange={patchGroundScale2d}
        />
      ) : null}

      {globalRotationMenu ? (
        <VfxGlobalRotationContextMenu
          anchor={globalRotationMenu}
          enabled={settings.vfxGlobalRotationEnabled}
          offsetDegrees={settings.vfxGlobalRotationOffsetDegrees}
          onClose={() => setGlobalRotationMenu(null)}
          onEnabledChange={(enabled) => onSettingsChange({ vfxGlobalRotationEnabled: enabled })}
          onOffsetDegreesChange={patchGlobalRotationOffset}
        />
      ) : null}

      {positionMenu ? (
        <VfxPositionContextMenu
          anchor={positionMenu}
          enabled={settings.vfxPositionEnabled}
          offset={settings.vfxPositionOffset}
          onClose={() => setPositionMenu(null)}
          onEnabledChange={(enabled) => onSettingsChange({ vfxPositionEnabled: enabled })}
          onOffsetChange={patchVfxPositionOffset}
        />
      ) : null}

      {axisWorldMenu ? (
        <VfxAxisWorldContextMenu
          anchor={axisWorldMenu}
          colors={settings.axisWorldColors}
          onClose={() => setAxisWorldMenu(null)}
          onColorsChange={patchAxisWorldColors}
          onScaleChange={patchAxisWorldScale}
          scale={settings.axisWorldScale}
        />
      ) : null}

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
