import { Suspense, useMemo, useRef, useState } from 'react'

import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { VfxCollapsiblePanel } from '@/components/molecules/VfxCollapsiblePanel'
import { VfxGlobalRotationContextMenu } from '@/components/molecules/VfxGlobalRotationContextMenu'
import { VfxGroundContextMenu } from '@/components/molecules/VfxGroundContextMenu'
import { VfxPositionContextMenu } from '@/components/molecules/VfxPositionContextMenu'
import type { VfxViewportSettings } from '@/core/vfx/vfxViewportPreferences'
import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'

import { VfxEmitterSurface } from './VfxTexturedEmitter'
import { VfxGround } from './VfxGround'
import { VfxTransformDebug } from './VfxTransformDebug'
import styles from './VfxViewport.module.css'

export type { VfxViewportSettings }

type VfxSceneProps = {
  emitters: VfxEmitterPreviewEntry[]
  settings: VfxViewportSettings
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

function VfxScene({ emitters, settings, controlsRef }: VfxSceneProps) {
  const bg = settings.darkScene ? '#06080c' : '#12161e'

  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={settings.darkScene ? 0.4 : 0.55} />
      <directionalLight intensity={settings.darkScene ? 0.95 : 1.15} position={[4, 8, 6]} />
      {settings.showGrid ? (
        <Grid
          args={[20, 20]}
          cellColor="#2a3344"
          fadeDistance={24}
          infiniteGrid
          sectionColor="#4a5a72"
        />
      ) : null}
      {settings.showGizmos ? (
        <OrbitControls
          ref={controlsRef}
          dampingFactor={0.08}
          enableDamping
          makeDefault
          target={[0, 0.5, 0]}
        />
      ) : null}
      <Suspense fallback={null}>
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
            vfxCamLockEnabled={settings.vfxCamLockEnabled}
            meshOnly={settings.meshOnlyEnabled}
            wireframe={settings.showEmitterShapes}
          />
        ))}
        {settings.showTransformDebug
          ? emitters.map((entry) => <VfxTransformDebug entry={entry} key={`debug-${entry.id}`} />)
          : null}
      </Suspense>
    </>
  )
}

export type VfxViewportProps = {
  emitters: VfxEmitterPreviewEntry[]
  particleName?: string
  settings: VfxViewportSettings
  onSettingsChange: (patch: Partial<VfxViewportSettings>) => void
}

export function VfxViewport({
  emitters,
  particleName,
  settings,
  onSettingsChange,
}: VfxViewportProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [groundMenu, setGroundMenu] = useState<{ x: number; y: number } | null>(null)
  const [globalRotationMenu, setGlobalRotationMenu] = useState<{ x: number; y: number } | null>(null)
  const [positionMenu, setPositionMenu] = useState<{ x: number; y: number } | null>(null)

  const particleSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of emitters) {
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1)
    }
    return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  }, [emitters])

  const particlePanelTitle = `${emitters.length} partícula${emitters.length === 1 ? '' : 's'}`

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

  return (
    <div className={styles.host}>
      <VfxCollapsiblePanel defaultOpen placement="topLeft" title="Cena 3D">
        <label className={styles.overlayItem}>
          <input checked={settings.darkScene} onChange={() => toggle('darkScene')} type="checkbox" />
          Cena escura
        </label>
        <label className={styles.overlayItem}>
          <input checked={settings.showGizmos} onChange={() => toggle('showGizmos')} type="checkbox" />
          Órbita
        </label>
        <label className={styles.overlayItem}>
          <input checked={settings.showGrid} onChange={() => toggle('showGrid')} type="checkbox" />
          Grelha
        </label>
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
            title="Clique direito: posição e escala 2D"
          >
            Chão
          </span>
        </div>
        <label className={styles.overlayItem}>
          <input
            checked={settings.showEmitterShapes}
            onChange={() => toggle('showEmitterShapes')}
            type="checkbox"
          />
          Wireframe
        </label>
        <label
          className={styles.overlayItem}
          title="Mostra só a geometria (.skn ou primitivo), sem texturas nem shader VFX"
        >
          <input
            checked={settings.meshOnlyEnabled}
            onChange={() => toggle('meshOnlyEnabled')}
            type="checkbox"
          />
          Somente mesh
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
            Rotação global VFX
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
            title="Clique direito: offset de posição no preview"
          >
            Posição VFX
          </span>
        </div>
        <label
          className={styles.overlayItem}
          title="Billboards deixam de seguir a câmara quando desactivado"
        >
          <input
            checked={settings.vfxCamLockEnabled}
            onChange={() => toggle('vfxCamLockEnabled')}
            type="checkbox"
          />
          VFX cam lock
        </label>
        <label
          className={styles.overlayItem}
          title="Partículas ficam fixas no espaço 3D (sem deslocamento por velocidade)"
        >
          <input
            checked={settings.vfxLockMotionEnabled}
            onChange={() => toggle('vfxLockMotionEnabled')}
            type="checkbox"
          />
          Trava movimentação
        </label>
        <label
          className={styles.overlayItem}
          title="Eixos locais e caixa de escala por emitter (debug transform)"
        >
          <input
            checked={settings.showTransformDebug}
            onChange={() => toggle('showTransformDebug')}
            type="checkbox"
          />
          Debug transform
        </label>
      </VfxCollapsiblePanel>

      {particleName ? <div className={styles.particleLabel}>{particleName}</div> : null}

      <Canvas
        camera={{ fov: 50, near: 0.01, far: 200, position: [2.5, 2, 3.5] }}
        className={styles.canvas}
        gl={{ alpha: true, antialias: true }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <VfxScene controlsRef={controlsRef} emitters={emitters} settings={settings} />
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
          <span className={styles.particleListEmpty}>Nenhuma partícula visível</span>
        )}
      </VfxCollapsiblePanel>
    </div>
  )
}
