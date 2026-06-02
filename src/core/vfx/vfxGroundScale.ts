/** Remapeamento de escala ground quad (partilhado animation + transform engine). */

import {
  deriveGroundScaleKind,
  sortedAbsScale,
} from './semantic/vfxEmitterFeatures'

function normalizeLoLQuadScale(
  scale: [number, number, number],
  minimum = 0.01,
): [number, number, number] {
  return scale.map((component) => {
    const value = Math.abs(Number(component))
    if (value < 1e-6) return 0
    return Math.max(value, minimum)
  }) as [number, number, number]
}

export function remapLoLQuadScaleForPlane(
  scale: [number, number, number],
  minimum = 0.01,
  texDiv?: [number, number] | null,
): [number, number, number] {
  const values = normalizeLoLQuadScale(scale, minimum)
  const kind = deriveGroundScaleKind(scale, texDiv)

  if (kind === 'neutral' || kind === 'strip') return values

  if (kind === 'flipbookSquare') {
    const [max1] = sortedAbsScale(scale)
    const planeSize = Math.max(max1, minimum)
    return [planeSize, planeSize, 1]
  }

  const indexed = values.map((value, index) => ({ value, index }))
  const sorted = [...indexed].sort((a, b) => b.value - a.value)
  const smallest = sorted[2]!
  const largest = sorted[0]!.value

  if (largest <= 0) return [minimum, minimum, 1]

  const plane: number[] = []
  for (let index = 0; index < 3; index++) {
    if (index !== smallest.index) plane.push(values[index]!)
  }
  return [plane[0]!, plane[1]!, 1]
}
