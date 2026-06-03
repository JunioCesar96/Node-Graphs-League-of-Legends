/** VfxDistortionDefinitionData — warp UV via normal map. */

import type { VfxDistortionDefinition, VfxEmbedValue } from './vfxModel'

const DISTORTION_RE = /^\s*distortion\s*:\s*f32\s*=\s*([^\s]+)\s*$/i
const DISTORTION_MODE_RE = /^\s*distortionMode\s*:\s*u8\s*=\s*(\d+)\s*$/i
const NORMAL_MAP_RE = /^\s*normalMapTexture\s*:\s*string\s*=\s*"([^"]*)"\s*$/i

export function parseDistortionBlock(body: string[]): VfxDistortionDefinition {
  const result: VfxDistortionDefinition = {
    distortion: 0,
    distortionMode: 0,
    normalMapTexture: '',
  }

  for (const raw of body) {
    const line = raw.trim()
    const d = DISTORTION_RE.exec(line)
    if (d) {
      result.distortion = Number.parseFloat(d[1] ?? '0')
      continue
    }
    const mode = DISTORTION_MODE_RE.exec(line)
    if (mode) {
      result.distortionMode = Number.parseInt(mode[1] ?? '0', 10)
      continue
    }
    const map = NORMAL_MAP_RE.exec(line)
    if (map) {
      result.normalMapTexture = map[1] ?? ''
    }
  }

  return result
}

export function distortionStrength(def: VfxDistortionDefinition | null, drive = 1): number {
  if (!def) return 0
  const base = Math.max(0, Math.min(def.distortion * 20, 0.15))
  return base * Math.max(0, Math.min(drive, 1))
}

/** Drive animado — constante ou curva (MVP: usa distortion scalar). */
export function sampleDistortionDrive(
  def: VfxDistortionDefinition | null,
  _particleNormalized: number,
  _time: number,
): number {
  if (!def) return 0
  return Math.max(0, Math.min(def.distortion, 1))
}
