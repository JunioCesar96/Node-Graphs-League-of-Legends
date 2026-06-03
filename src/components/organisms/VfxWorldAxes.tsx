/** Eixos mundiais customizáveis (escala e cor por eixo). */

import { Line } from '@react-three/drei'

import type { VfxAxisWorldColors } from '@/core/vfx/vfxViewportPreferences'

type VfxWorldAxesProps = {
  scale: [number, number, number]
  colors: VfxAxisWorldColors
}

export function VfxWorldAxes({ scale, colors }: VfxWorldAxesProps) {
  return (
    <group renderOrder={1000}>
      <Line
        color={colors.x}
        lineWidth={2}
        points={[
          [0, 0, 0],
          [scale[0], 0, 0],
        ]}
      />
      <Line
        color={colors.y}
        lineWidth={2}
        points={[
          [0, 0, 0],
          [0, scale[1], 0],
        ]}
      />
      <Line
        color={colors.z}
        lineWidth={2}
        points={[
          [0, 0, 0],
          [0, 0, scale[2]],
        ]}
      />
    </group>
  )
}
