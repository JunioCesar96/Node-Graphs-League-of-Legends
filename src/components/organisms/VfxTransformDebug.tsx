import { DoubleSide } from 'three'

import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'

type VfxTransformDebugProps = {
  entry: VfxEmitterPreviewEntry
}

/** Eixos locais + bbox aproximada da escala aplicada (preview de pipeline de transform). */
export function VfxTransformDebug({ entry }: VfxTransformDebugProps) {
  const { frame, material } = entry
  const axisLen = Math.max(frame.scale[0], frame.scale[1], frame.scale[2], 0.05) * 0.2

  return (
    <group position={frame.position}>
      <axesHelper args={[axisLen]} />
      <mesh scale={[frame.scale[0], frame.scale[1], Math.max(frame.scale[2], 0.02)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#e8b84a" depthTest={false} transparent wireframe opacity={0.85} />
      </mesh>
      {material.isGroundLayer ? (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[frame.scale[0], frame.scale[1], 1]}>
          <ringGeometry args={[0.95, 1, 32]} />
          <meshBasicMaterial color="#5ec8be" depthTest={false} transparent opacity={0.35} side={DoubleSide} />
        </mesh>
      ) : null}
    </group>
  )
}
