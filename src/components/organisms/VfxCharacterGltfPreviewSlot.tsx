import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, type OrbitControls as OrbitControlsImpl } from '@react-three/drei'
import { clone as cloneSkinnedScene } from 'three/addons/utils/SkeletonUtils.js'
import {
  AnimationMixer,
  Box3,
  LoopRepeat,
  PerspectiveCamera,
  Vector3,
  Group,
  type AnimationAction,
  type AnimationClip,
  Object3D,
  type SkinnedMesh,
} from 'three'

import { countGltfModelStats, normalizeGltfClips, type GltfModelStats } from '@/core/vfx/characterGltfClips'
import { DEFAULT_CHARACTER_ENGINE_ROTATION_X_LOL_DEG } from '@/core/vfx/characterEngineVfx'
import type { Preview3dSpinAxis } from '@/core/vfx/preview3dSpin'
import { formatModelStat } from '@/core/vfx/vfxCharacterModelStats'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'
import { Preview3dAutoSpinGroup } from '@/components/molecules/Preview3dAutoSpinGroup'
import { VfxPreview3dSlotFrame } from '@/components/molecules/VfxPreview3dSlotFrame'

import meshPreviewStyles from './VfxMeshPreviewSlot.module.css'

const DEG2RAD = Math.PI / 180
const PREVIEW_ROTATION_X_RAD = DEFAULT_CHARACTER_ENGINE_ROTATION_X_LOL_DEG * DEG2RAD

type VfxCharacterGltfPreviewSlotProps = {
  url: string
  baseName: string
  animationName?: string | null
}

function fitCameraToObject(
  root: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
): void {
  const box = new Box3().setFromObject(root)
  const center = new Vector3()
  const size = new Vector3()
  box.getCenter(center)
  box.getSize(size)

  const maxDim = Math.max(size.x, size.y, size.z, 0.0001)
  const distance = maxDim * 2.4
  camera.position.set(center.x + distance * 0.65, center.y + distance * 0.45, center.z + distance * 0.85)
  camera.near = Math.max(0.001, distance / 100)
  camera.far = distance * 20
  camera.lookAt(center)
  camera.updateProjectionMatrix()

  if (controls) {
    controls.target.copy(center)
    controls.update()
  }
}

function applyClipPose(
  root: Object3D,
  mixer: AnimationMixer,
  action: AnimationAction,
  clip: AnimationClip,
  seconds: number,
): void {
  const duration = clip.duration > 0 ? clip.duration : 0
  const time = duration > 0 ? Math.max(0, seconds % duration) : 0
  if (!action.isScheduled()) action.play()
  action.enabled = true
  action.setEffectiveWeight(1)
  action.paused = true
  action.time = time
  mixer.update(0)

  root.traverse((obj) => {
    const mesh = obj as SkinnedMesh
    if (mesh.isSkinnedMesh && mesh.skeleton) {
      mesh.skeleton.update()
    }
  })
}

function PreviewGltfModel({
  url,
  animationName,
  spinAxis,
  onStats,
}: {
  url: string
  animationName?: string | null
  spinAxis: Preview3dSpinAxis
  onStats: (stats: GltfModelStats | null) => void
}) {
  const { scene, animations } = useGLTF(url)
  const { camera, invalidate } = useThree()
  const groupRef = useRef<Group>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const actionRef = useRef<AnimationAction | null>(null)

  const clonedScene = useMemo(() => {
    let hasSkinned = false
    scene.traverse((obj) => {
      if ((obj as SkinnedMesh).isSkinnedMesh) hasSkinned = true
    })
    return hasSkinned ? cloneSkinnedScene(scene) : scene.clone(true)
  }, [scene])

  const clips = useMemo(() => normalizeGltfClips(animations), [animations])

  useEffect(() => {
    onStats(countGltfModelStats(clonedScene))
    return () => onStats(null)
  }, [clonedScene, onStats])

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !groupRef.current) return
    fitCameraToObject(groupRef.current, camera, controlsRef.current)
    invalidate()
  }, [camera, clonedScene, invalidate])

  useEffect(() => {
    mixerRef.current?.stopAllAction()
    mixerRef.current = null
    actionRef.current = null

    if (clips.length === 0) return

    const mixer = new AnimationMixer(clonedScene)
    mixerRef.current = mixer

    const clip =
      (animationName ? clips.find((entry) => entry.name === animationName) : null) ?? clips[0] ?? null
    if (!clip) return

    const action = mixer.clipAction(clip)
    action.setLoop(LoopRepeat, Infinity)
    actionRef.current = action
    applyClipPose(clonedScene, mixer, action, clip, 0)

    return () => {
      mixer.stopAllAction()
      mixerRef.current = null
      actionRef.current = null
    }
  }, [animationName, clonedScene, clips])

  return (
    <>
      <group ref={groupRef} rotation={[PREVIEW_ROTATION_X_RAD, 0, 0]}>
        <Preview3dAutoSpinGroup spinAxis={spinAxis}>
          <primitive object={clonedScene} />
        </Preview3dAutoSpinGroup>
      </group>
      <OrbitControls ref={controlsRef} enablePan={false} makeDefault />
    </>
  )
}

function GltfPreviewCanvas({
  url,
  animationName,
  spinAxis,
  onStats,
}: {
  url: string
  animationName?: string | null
  spinAxis: Preview3dSpinAxis
  onStats: (stats: GltfModelStats | null) => void
}) {
  return (
    <Canvas
      className={meshPreviewStyles.previewCanvas}
      camera={{ fov: 42, position: [1.2, 0.9, 1.4], near: 0.01, far: 100, up: [0, 0, 1] }}
      frameloop={spinAxis ? 'always' : 'demand'}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0c10')
      }}
    >
      <color attach="background" args={['#0a0c10']} />
      <ambientLight intensity={0.55} />
      <directionalLight intensity={1.1} position={[3, 5, 4]} />
      <directionalLight intensity={0.35} position={[-2, -1, -3]} />
      <Suspense fallback={null}>
        <PreviewGltfModel
          animationName={animationName}
          onStats={onStats}
          spinAxis={spinAxis}
          url={url}
        />
      </Suspense>
    </Canvas>
  )
}

export function VfxCharacterGltfPreviewSlot({
  url,
  baseName,
  animationName,
}: VfxCharacterGltfPreviewSlotProps) {
  const { t } = useLanguage()
  const [stats, setStats] = useState<GltfModelStats | null>(null)

  useEffect(() => {
    setStats(null)
  }, [url])

  useEffect(() => {
    useGLTF.preload(url)
  }, [url])

  const handleStats = useMemo(() => (next: GltfModelStats | null) => {
    setStats(next)
  }, [])

  const displayPath = `character-gltf/${baseName}.glb`

  return (
    <div className={meshPreviewStyles.block}>
      <div className={meshPreviewStyles.pathLine} title={displayPath}>
        {t(LangId.VfxCharacterGeometryModeGltf)} · {displayPath}
      </div>

      <VfxPreview3dSlotFrame
        ariaLabel={t(LangId.VfxCharacterGltfPreviewAria)}
        className={[meshPreviewStyles.slot, meshPreviewStyles.slotFilled].join(' ')}
      >
        {(spinAxis) => (
          <GltfPreviewCanvas
            animationName={animationName}
            onStats={handleStats}
            spinAxis={spinAxis}
            url={url}
          />
        )}
      </VfxPreview3dSlotFrame>

      {stats ? (
        <span className={meshPreviewStyles.metaLine}>
          {formatModelStat(stats.vertexCount)} {t(LangId.VfxCharacterStatVertices).toLowerCase()} ·{' '}
          {formatModelStat(stats.triangleCount)} {t(LangId.VfxCharacterStatTriangles).toLowerCase()} ·{' '}
          {stats.jointCount} {t(LangId.VfxCharacterStatBones).toLowerCase()}
        </span>
      ) : (
        <span className={meshPreviewStyles.metaLine}>{t(LangId.VfxCharacterGltfPreviewLoading)}</span>
      )}
    </div>
  )
}
