import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, SkinnedMesh } from 'three'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'

import type { ParsedLolAnm } from '@/core/vfx/lolAnmParse'
import { resolveAnmFrameIndex } from '@/core/vfx/lolAnmSampling'
import {
  applyAnmPoseToBones,
  applyBindPoseToBones,
  evaluateBoneWorldMatrices,
  evaluateSkeletonSegments,
  type LolSkinnedMeshBundle,
} from '@/core/vfx/lolSkinnedMesh'
import type { ParsedLolSkl } from '@/core/vfx/lolSklParse'
import type { VfxCharacterBoneApi, VfxCharacterMeshPoseMode } from '@/hooks/useVfxCharacterScene'

import { useVfxSceneRaycast } from './vfxSceneRaycast'

import { useVfxTextureMaps } from '@/hooks/useVfxTextureMaps'

type VfxCharacterInSceneProps = {
  bundle: LolSkinnedMeshBundle
  skl: ParsedLolSkl
  anm: ParsedLolAnm | null
  animTimeSeconds: number
  showSkeleton: boolean
  showWireframe: boolean
  flatLighting: boolean
  meshPoseMode: VfxCharacterMeshPoseMode
  referenceBoneName: string | null
  textureUrl?: string | null
  textureIsDds?: boolean
  onBoneApi: (api: VfxCharacterBoneApi | null) => void
}

function resolveBoneWorldFromMatrix(
  worldMatrices: Map<number, import('three').Matrix4>,
  jointId: number,
): [number, number, number] | null {
  const matrix = worldMatrices.get(jointId)
  if (!matrix) return null
  const point = new Vector3()
  matrix.decompose(point, new Quaternion(), new Vector3())
  return [point.x, point.y, point.z]
}

function ReferenceBoneMarker({
  worldRef,
  jointId,
}: {
  worldRef: RefObject<Map<number, import('three').Matrix4> | null>
  jointId: number
}) {
  const ref = useRef<Mesh>(null)

  useFrame(() => {
    const worldMatrices = worldRef.current
    if (!ref.current || !worldMatrices) return
    const pos = resolveBoneWorldFromMatrix(worldMatrices, jointId)
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

function AnimatedCharacterMesh({
  bundle,
  skl,
  anm,
  animTimeSeconds,
  meshPoseMode,
  flatLighting,
  showWireframe,
  textureUrl,
  textureIsDds,
  onWorldMatrices,
}: {
  bundle: LolSkinnedMeshBundle
  skl: ParsedLolSkl
  anm: ParsedLolAnm | null
  animTimeSeconds: number
  meshPoseMode: VfxCharacterMeshPoseMode
  flatLighting: boolean
  showWireframe: boolean
  textureUrl?: string | null
  textureIsDds?: boolean
  onWorldMatrices: (matrices: Map<number, import('three').Matrix4> | null) => void
}) {
  const skinnedRef = useRef<SkinnedMesh>(null)
  const animTimeRef = useRef(animTimeSeconds)
  animTimeRef.current = animTimeSeconds
  const meshPoseModeRef = useRef(meshPoseMode)
  meshPoseModeRef.current = meshPoseMode

  const textureEntries = useMemo(
    () => (textureUrl ? [{ url: textureUrl, isDds: Boolean(textureIsDds) }] : []),
    [textureIsDds, textureUrl],
  )
  const loadedTextures = useVfxTextureMaps(textureEntries)

  const material = useMemo(() => {
    if (flatLighting) {
      return new MeshBasicMaterial({
        color: new Color('#9aa8c4'),
        side: DoubleSide,
        wireframe: showWireframe,
      })
    }
    return new MeshStandardMaterial({
      color: new Color('#9aa8c4'),
      emissive: new Color('#1a2030'),
      emissiveIntensity: 0.35,
      metalness: 0.12,
      roughness: 0.68,
      side: DoubleSide,
      wireframe: showWireframe,
    })
  }, [flatLighting, showWireframe])

  useEffect(() => {
    const map = loadedTextures?.[0] ?? null
    material.map = map
    material.color.set(map ? '#ffffff' : '#9aa8c4')
    material.needsUpdate = true
  }, [loadedTextures, material])

  useEffect(() => {
    const mesh = bundle.mesh
    mesh.material = material
    mesh.castShadow = true
    mesh.receiveShadow = true
    return () => {
      mesh.material = undefined as never
    }
  }, [bundle.mesh, material])

  useFrame(() => {
    const timeSeconds = animTimeRef.current
    const useRestMesh = meshPoseModeRef.current === 'rest'

    if (useRestMesh) {
      applyBindPoseToBones(bundle.bones, skl)
    } else if (anm) {
      const frame = resolveAnmFrameIndex(anm, timeSeconds, true)
      applyAnmPoseToBones(bundle.bones, skl, anm, frame)
    } else {
      applyBindPoseToBones(bundle.bones, skl)
    }

    bundle.skeleton.update()
    onWorldMatrices(evaluateBoneWorldMatrices(skl, anm, timeSeconds))
  })

  useEffect(() => () => material.dispose(), [material])

  return <primitive ref={skinnedRef} object={bundle.mesh} />
}

function SkeletonOverlay({
  skl,
  anm,
  animTimeSeconds,
}: {
  skl: ParsedLolSkl
  anm: ParsedLolAnm | null
  animTimeSeconds: number
}) {
  const lineGeometry = useMemo(() => new BufferGeometry(), [])
  const lineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: '#fbbf24',
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  )
  const positionAttrRef = useRef<BufferAttribute | null>(null)

  const animTimeRef = useRef(animTimeSeconds)
  animTimeRef.current = animTimeSeconds

  useFrame(() => {
    const segments = evaluateSkeletonSegments(skl, anm, animTimeRef.current)
    let attr = positionAttrRef.current
    if (!attr || attr.array.length !== segments.length) {
      attr = new BufferAttribute(segments, 3)
      positionAttrRef.current = attr
      lineGeometry.setAttribute('position', attr)
    } else {
      attr.array.set(segments)
      attr.needsUpdate = true
    }
    lineGeometry.computeBoundingSphere()
  })

  useEffect(
    () => () => {
      lineGeometry.dispose()
      lineMaterial.dispose()
    },
    [lineGeometry, lineMaterial],
  )

  return <lineSegments geometry={lineGeometry} material={lineMaterial} renderOrder={999} />
}

export function VfxCharacterInScene({
  bundle,
  skl,
  anm,
  animTimeSeconds,
  showSkeleton,
  showWireframe,
  flatLighting,
  meshPoseMode,
  referenceBoneName,
  textureUrl = null,
  textureIsDds = false,
  onBoneApi,
}: VfxCharacterInSceneProps) {
  const worldRef = useRef<Map<number, import('three').Matrix4> | null>(null)
  const groupRef = useRef<Group>(null)
  const raycast = useVfxSceneRaycast()

  useLayoutEffect(() => {
    if (!raycast) return
    raycast.registerRaycastRoot('character', groupRef.current)
    return () => raycast.registerRaycastRoot('character', null)
  }, [raycast, bundle])

  useEffect(() => {
    onBoneApi({
      resolveBoneWorld: (boneName) => {
        const joint = skl.joints.find((entry) => entry.name === boneName)
        if (!joint || !worldRef.current) return null
        return resolveBoneWorldFromMatrix(worldRef.current, joint.id)
      },
    })
    return () => onBoneApi(null)
  }, [onBoneApi, skl])

  return (
    <group ref={groupRef}>
      <AnimatedCharacterMesh
        anm={anm}
        animTimeSeconds={animTimeSeconds}
        bundle={bundle}
        flatLighting={flatLighting}
        meshPoseMode={meshPoseMode}
        onWorldMatrices={(matrices) => {
          worldRef.current = matrices
        }}
        showWireframe={showWireframe}
        skl={skl}
        textureIsDds={textureIsDds}
        textureUrl={textureUrl}
      />
      {showSkeleton ? <SkeletonOverlay anm={anm} animTimeSeconds={animTimeSeconds} skl={skl} /> : null}
      {referenceBoneName ? (
        (() => {
          const joint = skl.joints.find((entry) => entry.name === referenceBoneName)
          return joint ? <ReferenceBoneMarker jointId={joint.id} worldRef={worldRef} /> : null
        })()
      ) : null}
    </group>
  )
}
