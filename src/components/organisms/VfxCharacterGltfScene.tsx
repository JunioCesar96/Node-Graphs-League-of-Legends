import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinnedScene } from 'three/addons/utils/SkeletonUtils.js'
import {
  AnimationMixer,
  LoopRepeat,
  MeshStandardMaterial,
  SkeletonHelper,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
} from 'three'

import {
  countGltfModelStats,
  normalizeGltfClips,
  animationNamesFromClips,
  type GltfModelStats,
} from '@/core/vfx/characterGltfClips'
import type { VfxCharacterBoneApi, VfxCharacterMeshPoseMode } from '@/hooks/useVfxCharacterScene'
import { getBoundObjectSizeLolFromObject3D } from '@/core/vfx/vfxCharacterBounds'

import { useVfxSceneRaycast } from './vfxSceneRaycast'

const DEG2RAD = Math.PI / 180

type VfxCharacterGltfSceneProps = {
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

function resolveBoneWorldFromObject(root: Object3D, boneName: string): [number, number, number] | null {
  let hit: Bone | null = null
  root.traverse((obj) => {
    if (hit) return
    if ((obj as Bone).isBone && obj.name === boneName) {
      hit = obj as Bone
    }
  })
  if (!hit) return null
  const point = new Vector3()
  hit.getWorldPosition(point)
  return [point.x, point.y, point.z]
}

function ReferenceBoneMarker({
  rootRef,
  boneName,
}: {
  rootRef: RefObject<Object3D | null>
  boneName: string
}) {
  const ref = useRef<Mesh>(null)

  useFrame(() => {
    const root = rootRef.current
    if (!ref.current || !root) return
    const pos = resolveBoneWorldFromObject(root, boneName)
    if (!pos) return
    ref.current.position.set(pos[0], pos[1], pos[2])
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshBasicMaterial color="#ffcc33" depthTest={false} />
    </mesh>
  )
}

function applyFlatLighting(root: Object3D, enabled: boolean) {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material) => {
      if (!(material instanceof MeshStandardMaterial)) return
      material.flatShading = enabled
      material.needsUpdate = true
    })
  })
}

function applyWireframe(root: Object3D, enabled: boolean) {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material: Material) => {
      if ('wireframe' in material) {
        ;(material as MeshStandardMaterial).wireframe = enabled
      }
    })
  })
}

function listBoneNames(root: Object3D): string[] {
  const names: string[] = []
  root.traverse((obj) => {
    if ((obj as Bone).isBone && obj.name) {
      names.push(obj.name)
    }
  })
  return [...new Set(names)]
}

function findSkinnedMesh(root: Object3D): SkinnedMesh | null {
  let skinned: SkinnedMesh | null = null
  root.traverse((obj) => {
    if ((obj as SkinnedMesh).isSkinnedMesh && !skinned) {
      skinned = obj as SkinnedMesh
    }
  })
  return skinned
}

function refreshSkeletonHelper(helper: SkeletonHelper | null) {
  if (!helper) return
  helper.updateMatrixWorld(true)
}

function applyClipPose(
  root: Object3D,
  mixer: AnimationMixer,
  action: AnimationAction,
  clip: AnimationClip,
  seconds: number,
) {
  const dur = clip.duration > 0 ? clip.duration : 0
  const t = dur > 0 ? Math.max(0, seconds % dur) : 0
  if (!action.isScheduled()) action.play()
  action.enabled = true
  action.setEffectiveWeight(1)
  action.paused = false
  action.time = t
  mixer.update(0)

  root.traverse((obj) => {
    const mesh = obj as SkinnedMesh
    if (mesh.isSkinnedMesh && mesh.skeleton) {
      mesh.skeleton.update()
    }
  })
}

export function VfxCharacterGltfScene({
  url,
  modelBaseName,
  animationName,
  animTimeSeconds,
  engineScale,
  rotationXLolDeg,
  showSkeleton,
  showWireframe,
  flatLighting,
  meshPoseMode,
  referenceBoneName,
  onBoneApi,
  onGltfReady,
  onEngineBoundSize,
  setActiveClipDuration,
}: VfxCharacterGltfSceneProps) {
  const { scene, animations } = useGLTF(url)
  const groupRef = useRef<Group>(null)
  const rootRef = useRef<Object3D | null>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const actionRef = useRef<AnimationAction | null>(null)
  const clipsRef = useRef<AnimationClip[]>([])
  const clipByNameRef = useRef<Map<string, AnimationClip>>(new Map())
  const skeletonHelperRef = useRef<SkeletonHelper | null>(null)
  const raycast = useVfxSceneRaycast()

  const animTimeRef = useRef(animTimeSeconds)
  animTimeRef.current = animTimeSeconds

  const clonedScene = useMemo(() => {
    let hasSkinned = false
    scene.traverse((obj) => {
      if ((obj as SkinnedMesh).isSkinnedMesh) hasSkinned = true
    })
    return hasSkinned ? cloneSkinnedScene(scene) : scene.clone(true)
  }, [scene])

  const rotationXRad = rotationXLolDeg * DEG2RAD

  useEffect(() => {
    if (!clonedScene) return
    onEngineBoundSize(getBoundObjectSizeLolFromObject3D(clonedScene, engineScale))
  }, [clonedScene, engineScale, onEngineBoundSize])

  useLayoutEffect(() => {
    if (!raycast) return
    raycast.registerRaycastRoot('character', groupRef.current)
    return () => raycast.registerRaycastRoot('character', null)
  }, [raycast, clonedScene])

  useEffect(() => {
    onBoneApi({
      resolveBoneWorld: (boneName) => {
        if (!rootRef.current) return null
        return resolveBoneWorldFromObject(rootRef.current, boneName)
      },
    })
    return () => onBoneApi(null)
  }, [onBoneApi, clonedScene])

  useEffect(() => {
    rootRef.current = clonedScene
    applyFlatLighting(clonedScene, flatLighting)
    applyWireframe(clonedScene, showWireframe)

    const sourceClips = animations.map((clip) => clip.clone())
    const clips = normalizeGltfClips(sourceClips, modelBaseName)
    const clipNames =
      clips.length === 1 && sourceClips.length > 1
        ? animationNamesFromClips(clips)
        : animationNamesFromClips(sourceClips)
    const nameToClip = new Map<string, AnimationClip>()
    if (clips.length === 1 && sourceClips.length > 1) {
      for (const name of clipNames) {
        nameToClip.set(name, clips[0]!)
      }
    } else {
      sourceClips.forEach((source, index) => {
        const name = animationNamesFromClips([source])[0]
        const playback = clips[index] ?? clips.find((clip) => clip.name === source.name)
        if (name && playback) nameToClip.set(name, playback)
      })
    }
    clipByNameRef.current = nameToClip
    clipsRef.current = clips

    if (mixerRef.current) {
      mixerRef.current.stopAllAction()
    }
    mixerRef.current = clips.length ? new AnimationMixer(clonedScene) : null
    actionRef.current = clips.length && mixerRef.current
      ? mixerRef.current.clipAction(clips[0]!)
      : null
    if (actionRef.current && mixerRef.current) {
      actionRef.current.setLoop(LoopRepeat, Infinity)
      actionRef.current.clampWhenFinished = false
      actionRef.current.play()
      actionRef.current.paused = false
      const clip = actionRef.current.getClip()
      setActiveClipDuration(clip.duration)
      applyClipPose(clonedScene, mixerRef.current, actionRef.current, clip, animTimeRef.current)
    }

    if (skeletonHelperRef.current && groupRef.current) {
      groupRef.current.remove(skeletonHelperRef.current)
      skeletonHelperRef.current = null
    }

    const skinned = findSkinnedMesh(clonedScene)
    if (skinned && groupRef.current) {
      const helper = new SkeletonHelper(skinned)
      helper.visible = showSkeleton
      groupRef.current.add(helper)
      skeletonHelperRef.current = helper
    }

    onGltfReady({
      clipNames,
      stats: countGltfModelStats(clonedScene),
      boneNames: listBoneNames(clonedScene),
      boundObjectSizeLol: getBoundObjectSizeLolFromObject3D(clonedScene, engineScale),
    })
  }, [animations, clonedScene, engineScale, flatLighting, modelBaseName, onGltfReady, setActiveClipDuration, showWireframe, url])

  useEffect(() => {
    if (skeletonHelperRef.current) {
      skeletonHelperRef.current.visible = showSkeleton
      if (showSkeleton) refreshSkeletonHelper(skeletonHelperRef.current)
    }
  }, [showSkeleton])

  useEffect(() => {
    applyWireframe(clonedScene, showWireframe)
  }, [clonedScene, showWireframe])

  useEffect(() => {
    applyFlatLighting(clonedScene, flatLighting)
  }, [clonedScene, flatLighting])

  useEffect(() => {
    const mixer = mixerRef.current
    const clips = clipsRef.current
    if (!mixer || !clips.length || !animationName) return

    const clip = clipByNameRef.current.get(animationName) ?? clips[0]
    if (!clip) return

    mixer.stopAllAction()
    const action = mixer.clipAction(clip)
    action.setLoop(LoopRepeat, Infinity)
    action.reset()
    action.play()
    action.paused = false
    actionRef.current = action
    setActiveClipDuration(clip.duration)
    applyClipPose(clonedScene, mixer, action, clip, animTimeSeconds)
  }, [animationName, animTimeSeconds, clonedScene, setActiveClipDuration])

  useFrame(() => {
    const mixer = mixerRef.current
    const action = actionRef.current
    const clip = action?.getClip()
    const root = rootRef.current
    const skinned = root ? findSkinnedMesh(root) : null

    if (meshPoseMode === 'rest') {
      skinned?.skeleton.pose()
      refreshSkeletonHelper(skeletonHelperRef.current)
      return
    }

    if (mixer && action && clip && root) {
      applyClipPose(root, mixer, action, clip, animTimeRef.current)
      refreshSkeletonHelper(skeletonHelperRef.current)
    }
  })

  return (
    <group
      ref={groupRef}
      rotation={[rotationXRad, 0, 0]}
      scale={[engineScale, engineScale, engineScale]}
    >
      <primitive object={clonedScene} />
      {referenceBoneName ? (
        <ReferenceBoneMarker boneName={referenceBoneName} rootRef={rootRef} />
      ) : null}
    </group>
  )
}
