import type { VfxProbabilityTable } from './vfxModel'

export function applyProbabilityToVec3(
  base: [number, number, number],
  tables: (VfxProbabilityTable | null)[],
  seed: number,
): [number, number, number] {
  const result: [number, number, number] = [...base]

  for (let axis = 0; axis < 3; axis++) {
    const table = tables[axis]
    if (!table) continue
    const factor = sampleProbabilityTable(table, seed + axis)
    result[axis] = result[axis] * factor
  }

  return result
}

export function sampleProbabilityTable(table: VfxProbabilityTable, seed: number): number {
  const times = table.keyTimes
  const values = table.keyValues
  if (!times.length) return 1

  const localSeed = (seed * 1103515245 + 12345) & 0x7fffffff
  const t = (localSeed % 10000) / 10000

  if (t <= (times[0] ?? 0)) return values[0] ?? 1
  if (t >= (times[times.length - 1] ?? 1)) return values[values.length - 1] ?? 1

  for (let index = 0; index < times.length - 1; index++) {
    const left = times[index] ?? 0
    const right = times[index + 1] ?? 1
    if (t >= left && t <= right) {
      const span = right - left
      const factor = span > 0 ? (t - left) / span : 0
      const v0 = values[index] ?? 1
      const v1 = values[index + 1] ?? 1
      return v0 + (v1 - v0) * factor
    }
  }

  return values[values.length - 1] ?? 1
}
