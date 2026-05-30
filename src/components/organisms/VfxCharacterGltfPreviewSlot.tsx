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
  type AnimationAction,
  type AnimationClip,
  Object3D,
  type SkinnedMesh,
} from 'three'

import { countGltfModelStats, normalizeGltfClips, type GltfModelStats } from '@/core/vfx/characterGltfClips'
import { formatModelStat } from '@/core/vfx/vfxCharacterModelStats'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import meshPreviewStyles from './VfxMeshPreviewSlot.module.css'

const DEG2RAD = Math.PI / 180

type VfxCharacterGltfPreviewSlotProps = {
  url: string
  baseName: string
  animationName?: string | null
  engineScale?: number
  rotationXLolDeg?: number
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
  engineScale,
  rotationXLolDeg,
  onStats,
}: {
  url: string
  animationName?: string | null
  engineScale: number
  rotationXLolDeg: number
  onStats: (stats: GltfModelStats | null) => void
}) {
  const { scene, animations } = useGLTF(url)
  const { camera, invalidate } = useThree()
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
    if (!(camera instanceof PerspectiveCamera)) return
    const wrapper = new Object3D()
    wrapper.add(clonedScene)
    wrapper.scale.setScalar(engineScale)
    wrapper.rotation.x = rotationXLolDeg * DEG2RAD
    fitCameraToObject(wrapper, camera, controlsRef.current)
    wrapper.remove(clonedScene)
    invalidate()
  }, [camera, clonedScene, engineScale, invalidate, rotationXLolDeg])

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
      <group rotation={[rotationXLolDeg * DEG2RAD, 0, 0]} scale={[engineScale, engineScale, engineScale]}>
        <primitive object={clonedScene} />
      </group>
      <OrbitControls ref={controlsRef} enablePan={false} makeDefault />
    </>
  )
}

function GltfPreviewCanvas({
  url,
  animationName,
  engineScale,
  rotationXLolDeg,
  onStats,
}: {
  url: string
  animationName?: string | null
  engineScale: number
  rotationXLolDeg: number
  onStats: (stats: GltfModelStats | null) => void
}) {
  return (
    <Canvas
      className={meshPreviewStyles.previewCanvas}
      camera={{ fov: 42, position: [1.2, 0.9, 1.4], near: 0.01, far: 100, up: [0, 0, 1] }}
      frameloop="demand"
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
          engineScale={engineScale}
          onStats={onStats}
          rotationXLolDeg={rotationXLolDeg}
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
  engineScale = 0.01,
  rotationXLolDeg = 0,
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

      <div
        aria-label={t(LangId.VfxCharacterGltfPreviewAria)}
        className={[meshPreviewStyles.slot, meshPreviewStyles.slotFilled].join(' ')}
      >
        <GltfPreviewCanvas
          animationName={animationName}
          engineScale={engineScale}
          onStats={handleStats}
          rotationXLolDeg={rotationXLolDeg}
          url={url}
        />
      </div>

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
