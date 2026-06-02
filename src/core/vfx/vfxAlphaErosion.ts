import type { VfxAlphaErosionDefinition, VfxEmbedValue } from './vfxModel'

const EROSION_MAP_RE = /^\s*erosionMapName\s*:\s*string\s*=\s*"([^"]*)"\s*$/i
const EROSION_FEATHER_IN_RE = /^\s*erosionFeatherIn\s*:\s*f32\s*=\s*([^\s]+)\s*$/i
const EROSION_FEATHER_OUT_RE = /^\s*erosionFeatherOut\s*:\s*f32\s*=\s*([^\s]+)\s*$/i
const CHANNEL_MIXER_RE = /^\s*constantValue\s*:\s*vec4\s*=\s*\{([^}]+)\}\s*$/i

function parseVec4Inline(inner: string): [number, number, number, number] {
  const parts = inner.split(',').map((p) => Number.parseFloat(p.trim()))
  return [parts[0] ?? 1, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0]
}

/** Extrai curva de drive (ValueFloat embed) dentro do bloco AlphaErosion. */
export function parseAlphaErosionBlock(
  body: string[],
  parseEmbed: (body: string[], kind: string) => VfxEmbedValue,
  collectBlock: (lines: string[], start: number) => [string[], number],
  embedOpenRe: RegExp,
): VfxAlphaErosionDefinition {
  const result: VfxAlphaErosionDefinition = {
    erosionMapName: '',
    erosionDriveCurve: null,
    erosionFeatherIn: 0.2,
    erosionFeatherOut: 0.2,
    erosionMapChannelMixer: [1, 0, 0, 0],
  }

  let index = 0
  while (index < body.length) {
    const line = (body[index] ?? '').trim()
    const mapMatch = EROSION_MAP_RE.exec(line)
    if (mapMatch) {
      result.erosionMapName = mapMatch[1] ?? ''
      index += 1
      continue
    }

    const featherIn = EROSION_FEATHER_IN_RE.exec(line)
    if (featherIn) {
      result.erosionFeatherIn = Number.parseFloat(featherIn[1] ?? '0.2')
      index += 1
      continue
    }

    const featherOut = EROSION_FEATHER_OUT_RE.exec(line)
    if (featherOut) {
      result.erosionFeatherOut = Number.parseFloat(featherOut[1] ?? '0.2')
      index += 1
      continue
    }

    const embedMatch = embedOpenRe.exec(line)
    if (embedMatch) {
      const field = embedMatch[1] ?? ''
      const kind = embedMatch[2] ?? ''
      const [embedBody, end] = collectBlock(body, index)
      if (/erosionDriveCurve/i.test(field)) {
        result.erosionDriveCurve = parseEmbed(embedBody, kind)
      } else if (/erosionMapChannelMixer/i.test(field)) {
        const embed = parseEmbed(embedBody, kind)
        if (Array.isArray(embed.constant) && embed.constant.length >= 4) {
          result.erosionMapChannelMixer = embed.constant as [number, number, number, number]
        }
      }
      index = end + 1
      continue
    }

    const mixerInline = CHANNEL_MIXER_RE.exec(line)
    if (mixerInline) {
      result.erosionMapChannelMixer = parseVec4Inline(mixerInline[1] ?? '1,0,0,0')
      index += 1
      continue
    }

    index += 1
  }

  return result
}

export function sampleErosionDrive(
  erosion: VfxAlphaErosionDefinition | null,
  particleNormalized: number,
): number {
  if (!erosion?.erosionDriveCurve) return 1

  const embed = erosion.erosionDriveCurve
  if (!embed.dynamics?.times?.length) {
    return Number(embed.constant ?? 1)
  }

  const { times, values } = embed.dynamics
  const t = particleNormalized
  if (t <= (times[0] ?? 0)) return Number(values[0] ?? 1)
  if (t >= (times[times.length - 1] ?? 1)) return Number(values[values.length - 1] ?? 0)

  for (let i = 0; i < times.length - 1; i++) {
    const left = times[i] ?? 0
    const right = times[i + 1] ?? 1
    if (t >= left && t <= right) {
      const span = right - left
      const factor = span > 0 ? (t - left) / span : 0
      const a = Number(values[i] ?? 0)
      const b = Number(values[i + 1] ?? 0)
      return a + (b - a) * factor
    }
  }

  return Number(values[values.length - 1] ?? 1)
}
