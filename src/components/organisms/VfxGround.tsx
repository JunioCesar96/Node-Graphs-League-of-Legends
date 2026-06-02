import { useEffect, useRef, useState } from 'react'
import { useLoader } from '@react-three/fiber'
import { DoubleSide, SRGBColorSpace, TextureLoader, type BufferGeometry, type Mesh } from 'three'

import {
  GROUND_SCALE2D_WORLD_UNIT,
  loadVfxGroundGeometry,
  VFX_GROUND_MESH_THICKNESS,
  VFX_GROUND_TEXTURE_URL,
} from '@/core/vfx/vfxGround'

import { useVfxSceneRaycast } from './vfxSceneRaycast'

type VfxGroundProps = {
  visible: boolean
  scale2d: [number, number]
  groundPosition: [number, number, number]
}

export function VfxGround({ visible, scale2d, groundPosition }: VfxGroundProps) {
  const meshRef = useRef<Mesh>(null)
  const raycast = useVfxSceneRaycast()
  const [sourceGeometry, setSourceGeometry] = useState<BufferGeometry | null>(null)
  const texture = useLoader(TextureLoader, VFX_GROUND_TEXTURE_URL)

  useEffect(() => {
    if (!raycast) return
    raycast.registerRaycastRoot('ground', visible ? meshRef.current : null)
    return () => raycast.registerRaycastRoot('ground', null)
  }, [raycast, visible, sourceGeometry])

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  useEffect(() => {
    let cancelled = false
    let cloned: BufferGeometry | null = null

    void loadVfxGroundGeometry()
      .then((geometry) => {
        if (cancelled) return
        cloned = geometry.clone()
        setSourceGeometry(cloned)
      })
      .catch(() => {
        if (!cancelled) setSourceGeometry(null)
      })

    return () => {
      cancelled = true
      cloned?.dispose()
    }
  }, [])

  /** Malha normalizada 1×1 em XY — scale2d = tamanho mundial em X e Y (ex. 2×2 → quadrado). */
  const worldScaleX = GROUND_SCALE2D_WORLD_UNIT * scale2d[0]
  const worldScaleY = GROUND_SCALE2D_WORLD_UNIT * scale2d[1]
  const worldScaleZ = GROUND_SCALE2D_WORLD_UNIT * VFX_GROUND_MESH_THICKNESS

  if (!visible || !sourceGeometry) return null

  return (
    <mesh
      ref={meshRef}
      geometry={sourceGeometry}
      position={groundPosition}
      renderOrder={-1}
      rotation={[0, 0, 0]}
      scale={[worldScaleX, worldScaleY, worldScaleZ]}
    >
      <meshBasicMaterial
        attach="material"
        depthWrite={false}
        map={texture}
        side={DoubleSide}
        transparent
      />
    </mesh>
  )
}
