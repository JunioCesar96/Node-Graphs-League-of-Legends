import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { DoubleSide, Matrix4, Vector3 } from 'three'

import { decomposeWorldMatrix } from '@/core/vfx/vfxWorldMatrix'

import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'
import {
  buildVfxTransformDebugList,
  buildVfxTransformDebugViewportLabel,
  formatBirthScaleLoLAxesViewportLabel,
} from '@/core/vfx/vfxTransformDebugList'
import type { LoLGroundQuadScaleKind } from '@/core/vfx/vfxWebAnimation'

type VfxTransformDebugProps = {
  entry: VfxEmitterPreviewEntry
  vfxScale?: number
}

const GROUND_SCALE_RING_COLORS: Record<LoLGroundQuadScaleKind, string> = {
  decal: '#5ec8be',
  flipbookSquare: '#e8b84a',
  strip: '#e85a5a',
  neutral: '#9a9a9a',
}

/** Eixos locais + bbox + classificação semântica (pipeline de transform). */
export function VfxTransformDebug({ entry, vfxScale = 0.01 }: VfxTransformDebugProps) {
  const { frame, material } = entry
  const axisLen = Math.max(frame.scale[0], frame.scale[1], frame.scale[2], 0.05) * 0.2
  const groundKind = frame.groundScaleKind
  const ringColor = groundKind ? GROUND_SCALE_RING_COLORS[groundKind] : '#5ec8be'

  const debugRows = buildVfxTransformDebugList(entry, entry.parsed)
  const viewportLabel = buildVfxTransformDebugViewportLabel(entry, debugRows)
  const birthScaleAxesLabel = formatBirthScaleLoLAxesViewportLabel(entry.parsed)
  const orbitalAxesLabel = null

  const basisArrows = useMemo(() => {
    if (!frame.worldMatrix || frame.worldMatrix.length < 16) return null
    const m = new Matrix4().fromArray(frame.worldMatrix)
    const origin = new Vector3().setFromMatrixPosition(m)
    const right = new Vector3(1, 0, 0).transformDirection(m).normalize().multiplyScalar(axisLen)
    const up = new Vector3(0, 1, 0).transformDirection(m).normalize().multiplyScalar(axisLen)
    const normal = new Vector3(0, 0, 1).transformDirection(m).normalize().multiplyScalar(axisLen)
    return { origin, right, up, normal }
  }, [frame.worldMatrix, axisLen])

  const bboxTrs = useMemo(() => {
    const scale: [number, number, number] = [
      frame.scale[0],
      frame.scale[1],
      Math.max(frame.scale[2], 0.02),
    ]
    if (!frame.worldMatrix || frame.worldMatrix.length < 16) {
      return {
        position: frame.position,
        quaternion: null as ReturnType<typeof decomposeWorldMatrix>['quaternion'] | null,
        scale,
      }
    }
    const m = new Matrix4().fromArray(frame.worldMatrix)
    const { quaternion } = decomposeWorldMatrix(m)
    return {
      position: frame.position,
      quaternion,
      scale,
    }
  }, [frame.position, frame.scale, frame.worldMatrix])

  return (
    <group
      position={[bboxTrs.position[0], bboxTrs.position[1], bboxTrs.position[2]]}
      quaternion={bboxTrs.quaternion ?? undefined}
      scale={[bboxTrs.scale[0], bboxTrs.scale[1], bboxTrs.scale[2]]}
    >
      {basisArrows ? (
        <>
          <arrowHelper args={[basisArrows.right, basisArrows.origin, axisLen, '#ff6b6b']} />
          <arrowHelper args={[basisArrows.up, basisArrows.origin, axisLen, '#6bffb8']} />
          <arrowHelper args={[basisArrows.normal, basisArrows.origin, axisLen, '#6b9fff']} />
          <Html
            position={[
              basisArrows.origin.x + basisArrows.right.x * 1.15,
              basisArrows.origin.y + basisArrows.right.y * 1.15,
              basisArrows.origin.z + basisArrows.right.z * 1.15,
            ]}
            center
            style={{
              pointerEvents: 'none',
              fontSize: 9,
              fontFamily: 'monospace',
              color: '#ff6b6b',
              textShadow: '0 0 4px #000',
            }}
          >
            X LoL
          </Html>
          <Html
            position={[
              basisArrows.origin.x + basisArrows.up.x * 1.15,
              basisArrows.origin.y + basisArrows.up.y * 1.15,
              basisArrows.origin.z + basisArrows.up.z * 1.15,
            ]}
            center
            style={{
              pointerEvents: 'none',
              fontSize: 9,
              fontFamily: 'monospace',
              color: '#6bffb8',
              textShadow: '0 0 4px #000',
            }}
          >
            Y LoL
          </Html>
          <Html
            position={[
              basisArrows.origin.x + basisArrows.normal.x * 1.15,
              basisArrows.origin.y + basisArrows.normal.y * 1.15,
              basisArrows.origin.z + basisArrows.normal.z * 1.15,
            ]}
            center
            style={{
              pointerEvents: 'none',
              fontSize: 9,
              fontFamily: 'monospace',
              color: '#6b9fff',
              textShadow: '0 0 4px #000',
            }}
          >
            Z LoL
          </Html>
        </>
      ) : (
        <axesHelper args={[axisLen]} />
      )}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#e8b84a" depthTest={false} transparent wireframe opacity={0.85} />
      </mesh>
      {material.isGroundLayer ? (
        <>
          <mesh position={[0, 0, 0.01]} scale={[frame.scale[0], frame.scale[1], 1]}>
            <ringGeometry args={[0.95, 1, 32]} />
            <meshBasicMaterial color={ringColor} depthTest={false} transparent opacity={0.35} side={DoubleSide} />
          </mesh>
          {viewportLabel || birthScaleAxesLabel || orbitalAxesLabel ? (
            <Html
              position={[0, 0.15, 0]}
              center
              style={{
                pointerEvents: 'none',
                fontSize: 10,
                fontFamily: 'monospace',
                color: ringColor,
                whiteSpace: 'nowrap',
                textShadow: '0 0 4px #000',
                textAlign: 'center',
              }}
            >
              {viewportLabel}
              {birthScaleAxesLabel ? (
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.9 }}>{birthScaleAxesLabel}</div>
              ) : null}
              {orbitalAxesLabel ? (
                <div style={{ fontSize: 9, marginTop: 2, color: '#9b7bff' }}>{orbitalAxesLabel}</div>
              ) : null}
            </Html>
          ) : null}
        </>
      ) : (
        viewportLabel || birthScaleAxesLabel || orbitalAxesLabel ? (
          <Html
            position={[0, axisLen * 1.2, 0]}
            center
            style={{
              pointerEvents: 'none',
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#c8c8c8',
              whiteSpace: 'nowrap',
              textShadow: '0 0 4px #000',
              textAlign: 'center',
            }}
          >
            {viewportLabel}
            {birthScaleAxesLabel ? (
              <div style={{ fontSize: 9, marginTop: 2, color: '#e8b84a' }}>{birthScaleAxesLabel}</div>
            ) : null}
            {orbitalAxesLabel ? (
              <div style={{ fontSize: 9, marginTop: 2, color: '#9b7bff' }}>{orbitalAxesLabel}</div>
            ) : null}
          </Html>
        ) : null
      )}
    </group>
  )
}
