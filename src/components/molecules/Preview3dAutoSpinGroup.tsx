import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

import { PREVIEW_3D_SPIN_SPEED_RAD_PER_SEC, type Preview3dSpinAxis } from '@/core/vfx/preview3dSpin'

type Preview3dAutoSpinGroupProps = {
  spinAxis: Preview3dSpinAxis
  children: ReactNode
}

export function Preview3dAutoSpinGroup({ spinAxis, children }: Preview3dAutoSpinGroupProps) {
  const groupRef = useRef<Group>(null)

  useEffect(() => {
    groupRef.current?.rotation.set(0, 0, 0)
  }, [spinAxis])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!spinAxis || !group) return

    const deltaAngle = PREVIEW_3D_SPIN_SPEED_RAD_PER_SEC * delta
    if (spinAxis === 'x') group.rotation.x += deltaAngle
    else if (spinAxis === 'y') group.rotation.y += deltaAngle
    else group.rotation.z += deltaAngle
  })

  return <group ref={groupRef}>{children}</group>
}
