/** Amostragem partilhada de embeds ValueVector3 / ValueColor (constant + dynamics). */

import type { VfxEmbedValue } from './vfxModel'

export function embedVec4(
  embed: VfxEmbedValue | null,
  fallback: [number, number, number, number],
): [number, number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 4) {
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])]
  }
  return fallback
}

/** Interpola `dynamics.times` / `values` (list[vec4]); sem keyframes usa `constant`. */
export function sampleDynamicsVec4(
  embed: VfxEmbedValue | null,
  normalizedT: number,
  fallback: [number, number, number, number] = [1, 1, 1, 1],
): [number, number, number, number] {
  if (!embed?.dynamics?.times?.length) return embedVec4(embed, fallback)

  const { times, values } = embed.dynamics
  let value: unknown = values[values.length - 1]

  if (normalizedT <= (times[0] ?? 0)) value = values[0]
  else if (normalizedT >= (times[times.length - 1] ?? 1)) value = values[values.length - 1]
  else {
    for (let index = 0; index < times.length - 1; index++) {
      const left = times[index] ?? 0
      const right = times[index + 1] ?? 1
      if (normalizedT >= left && normalizedT <= right) {
        const span = right - left
        const factor = span > 0 ? (normalizedT - left) / span : 0
        const leftVal = values[index] as [number, number, number, number]
        const rightVal = values[index + 1] as [number, number, number, number]
        value = [
          leftVal[0] + (rightVal[0] - leftVal[0]) * factor,
          leftVal[1] + (rightVal[1] - leftVal[1]) * factor,
          leftVal[2] + (rightVal[2] - leftVal[2]) * factor,
          leftVal[3] + (rightVal[3] - leftVal[3]) * factor,
        ]
        break
      }
    }
  }

  if (Array.isArray(value) && value.length >= 4) {
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])]
  }
  return embedVec4(embed, fallback)
}

export function embedVec3(
  embed: VfxEmbedValue | null,
  fallback: [number, number, number],
): [number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return fallback
}

/** Interpola `dynamics.times` / `values`; sem keyframes usa `constant`. */
export function sampleDynamicsVec3(
  embed: VfxEmbedValue | null,
  normalizedT: number,
  fallback: [number, number, number] = [1, 1, 1],
): [number, number, number] {
  if (!embed?.dynamics?.times?.length) return embedVec3(embed, fallback)

  const { times, values } = embed.dynamics
  let value: unknown = values[values.length - 1]

  if (normalizedT <= (times[0] ?? 0)) value = values[0]
  else if (normalizedT >= (times[times.length - 1] ?? 1)) value = values[values.length - 1]
  else {
    for (let index = 0; index < times.length - 1; index++) {
      const left = times[index] ?? 0
      const right = times[index + 1] ?? 1
      if (normalizedT >= left && normalizedT <= right) {
        const span = right - left
        const factor = span > 0 ? (normalizedT - left) / span : 0
        const leftVal = values[index] as [number, number, number]
        const rightVal = values[index + 1] as [number, number, number]
        value = [
          leftVal[0] + (rightVal[0] - leftVal[0]) * factor,
          leftVal[1] + (rightVal[1] - leftVal[1]) * factor,
          leftVal[2] + (rightVal[2] - leftVal[2]) * factor,
        ]
        break
      }
    }
  }

  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return fallback
}
