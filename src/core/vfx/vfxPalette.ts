import type { VfxEmbedValue, VfxPaletteDefinition } from './vfxModel'

/** Índice ao longo da textura de gradiente (0…paletteCount). */
export function resolvePaletteSelectorIndex(
  palette: VfxPaletteDefinition,
  particleNormalized = 0,
): number {
  const embed = palette.paletteSelector
  if (!embed?.constant) return 0

  const value = embed.constant
  if (Array.isArray(value) && value.length >= 1) {
    let index = Number(value[0])
    if (embed.dynamics?.times.length) {
      const { times, values } = embed.dynamics
      let sampled = values[values.length - 1]
      if (particleNormalized <= (times[0] ?? 0)) sampled = values[0]
      else if (particleNormalized >= (times[times.length - 1] ?? 1)) sampled = values[values.length - 1]
      else {
        for (let i = 0; i < times.length - 1; i++) {
          const left = times[i] ?? 0
          const right = times[i + 1] ?? 1
          if (particleNormalized >= left && particleNormalized <= right) {
            const span = right - left
            const factor = span > 0 ? (particleNormalized - left) / span : 0
            const leftVal = values[i] as [number, number, number]
            const rightVal = values[i + 1] as [number, number, number]
            sampled = [
              leftVal[0] + (rightVal[0] - leftVal[0]) * factor,
              leftVal[1] + (rightVal[1] - leftVal[1]) * factor,
              leftVal[2] + (rightVal[2] - leftVal[2]) * factor,
            ]
            break
          }
        }
      }
      if (Array.isArray(sampled)) index = Number(sampled[0])
    }
    return index
  }

  return 0
}

/** Máscara para escolher canal da textura principal (palleteSrcMixColor). */
export function resolvePaletteSrcMixMask(palette: VfxPaletteDefinition): [number, number, number, number] {
  const value = palette.paletteSrcMixColor
  if (Array.isArray(value) && value.length >= 4) {
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])]
  }
  return [1, 0, 0, 0]
}

export function resolvePaletteUniforms(
  palette: VfxPaletteDefinition | null,
  particleNormalized = 0,
): {
  paletteCount: number
  paletteSelector: number
  paletteMixMask: [number, number, number, number]
} {
  if (!palette?.paletteTexture.trim()) {
    return { paletteCount: 1, paletteSelector: 0, paletteMixMask: [1, 0, 0, 0] }
  }

  return {
    paletteCount: Math.max(1, palette.paletteCount),
    paletteSelector: resolvePaletteSelectorIndex(palette, particleNormalized),
    paletteMixMask: resolvePaletteSrcMixMask(palette),
  }
}
