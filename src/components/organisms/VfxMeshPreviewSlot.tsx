import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, type OrbitControls as OrbitControlsImpl } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import { Box3, PerspectiveCamera, Vector3 } from 'three'

import type { Preview3dSpinAxis } from '@/core/vfx/preview3dSpin'
import { Preview3dAutoSpinGroup } from '@/components/molecules/Preview3dAutoSpinGroup'
import { VfxPreview3dSlotFrame } from '@/components/molecules/VfxPreview3dSlotFrame'

import styles from './VfxMeshPreviewSlot.module.css'

type VfxMeshPreviewSlotProps = {
  ritualPath: string
  geometry: BufferGeometry | null
  meshCacheSize: number
}

function fitCameraToGeometry(
  geometry: BufferGeometry,
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
): Vector3 {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox ?? new Box3()
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

  return center
}

function PreviewMesh({
  geometry,
  spinAxis,
}: {
  geometry: BufferGeometry
  spinAxis: Preview3dSpinAxis
}) {
  const { camera, invalidate } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const previewGeometry = useMemo(() => geometry.clone(), [geometry])

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    fitCameraToGeometry(previewGeometry, camera, controlsRef.current)
    invalidate()
  }, [camera, invalidate, previewGeometry])

  useEffect(() => {
    return () => {
      previewGeometry.dispose()
    }
  }, [previewGeometry])

  return (
    <>
      <Preview3dAutoSpinGroup spinAxis={spinAxis}>
        <mesh geometry={previewGeometry}>
          <meshStandardMaterial
            color="#5ec8be"
            emissive="#1a4a44"
            emissiveIntensity={0.35}
            metalness={0.15}
            roughness={0.55}
          />
        </mesh>
      </Preview3dAutoSpinGroup>
      <OrbitControls ref={controlsRef} enablePan={false} makeDefault />
    </>
  )
}

function MeshPreviewCanvas({
  geometry,
  spinAxis,
}: {
  geometry: BufferGeometry
  spinAxis: Preview3dSpinAxis
}) {
  return (
    <Canvas
      className={styles.previewCanvas}
      camera={{ fov: 42, position: [1.2, 0.9, 1.4], near: 0.01, far: 100 }}
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
        <PreviewMesh geometry={geometry} spinAxis={spinAxis} />
      </Suspense>
    </Canvas>
  )
}

export function VfxMeshPreviewSlot({
  ritualPath,
  geometry,
  meshCacheSize,
}: VfxMeshPreviewSlotProps) {
  const displayPath = ritualPath.replace(/^ASSETS\//i, '').trim()

  let placeholder = 'Pré-visualização da mesh'
  if (!displayPath) placeholder = 'Sem caminho de mesh'
  else if (!geometry && meshCacheSize === 0) placeholder = 'A carregar…'
  else if (!geometry) placeholder = 'Mesh não encontrada'

  const vertexCount = geometry?.getAttribute('position')?.count ?? 0
  const indexCount = geometry?.index?.count ?? vertexCount

  return (
    <div className={styles.block}>
      {displayPath ? (
        <div className={styles.pathLine} title={ritualPath}>
          {displayPath}
        </div>
      ) : null}

      <VfxPreview3dSlotFrame
        ariaLabel="Pré-visualização da mesh"
        className={[styles.slot, geometry ? styles.slotFilled : styles.slotEmpty].join(' ')}
      >
        {(spinAxis) =>
          geometry ? (
            <MeshPreviewCanvas geometry={geometry} spinAxis={spinAxis} />
          ) : (
            <span className={styles.previewPlaceholder}>{placeholder}</span>
          )
        }
      </VfxPreview3dSlotFrame>

      {geometry ? (
        <span className={styles.metaLine}>
          {vertexCount} vértice(s) · {Math.floor(indexCount / 3) || 0} tri(s)
        </span>
      ) : null}
    </div>
  )
}
