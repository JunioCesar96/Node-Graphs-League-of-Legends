import { normalizeRitualAssetPath, resolveAssetCandidates } from './assetPaths'

export type VfxAssetFileIndex = {
  paths: Map<string, string>
  basenames: Map<string, string>
  ddsKeys: Set<string>
}

export type VfxTextureLookupHit = {
  url: string
  matchedKey: string
  matchKind: 'exact' | 'basename' | 'suffix'
  isDds: boolean
}

export function createEmptyAssetIndex(): VfxAssetFileIndex {
  return { paths: new Map(), basenames: new Map(), ddsKeys: new Set() }
}

export function assetIndexSize(index: VfxAssetFileIndex): number {
  return new Set([...index.paths.values(), ...index.basenames.values()]).size
}

/** Normaliza webkitRelativePath para chave ritual ASSETS/... */
export function ritualKeyFromRelativePath(relative: string): string | null {
  const normalized = relative.replace(/\\/g, '/').replace(/^\.\//, '')
  const lower = normalized.toLowerCase()

  const wadAssets = lower.indexOf('.wad.client/assets/')
  if (wadAssets >= 0) {
    const tail = normalized.slice(wadAssets + '.wad.client/assets/'.length)
    return `ASSETS/${tail}`
  }

  const assetsIndex = lower.indexOf('assets/')
  if (assetsIndex >= 0) {
    const tail = normalized.slice(assetsIndex + 'assets/'.length)
    return `ASSETS/${tail}`
  }

  const slashAssets = lower.indexOf('/assets/')
  if (slashAssets >= 0) {
    const tail = normalized.slice(slashAssets + '/assets/'.length)
    return `ASSETS/${tail}`
  }

  const markers = ['/characters/', '/shared/', '/particles/'] as const
  for (const marker of markers) {
    const markerIndex = lower.indexOf(marker)
    if (markerIndex >= 0) {
      return `ASSETS/${normalized.slice(markerIndex + 1)}`
    }
  }

  if (lower.startsWith('characters/') || lower.startsWith('shared/')) {
    return `ASSETS/${normalized}`
  }

  if (lower.includes('/')) {
    return `ASSETS/${normalized}`
  }

  return null
}

export function ensureAssetsRitualPath(ritualTexturePath: string): string {
  const normalized = normalizeRitualAssetPath(ritualTexturePath)
  if (/^assets\//i.test(normalized)) return normalized
  return `ASSETS/${normalized.replace(/^\//, '')}`
}

function basenameOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return (slash >= 0 ? normalized.slice(slash + 1) : normalized).toLowerCase()
}

function registerPath(index: VfxAssetFileIndex, ritualKey: string, url: string, isDds: boolean) {
  const normalized = normalizeRitualAssetPath(ritualKey)
  const lower = normalized.toLowerCase()

  index.paths.set(lower, url)
  if (isDds) index.ddsKeys.add(lower)

  const base = basenameOf(normalized)
  if (base) index.basenames.set(base, url)

  for (const candidate of resolveAssetCandidates(normalized)) {
    const candidateLower = candidate.toLowerCase()
    index.paths.set(candidateLower, url)
    if (isDds) index.ddsKeys.add(candidateLower)

    const candidateBase = basenameOf(candidate)
    if (candidateBase) index.basenames.set(candidateBase, url)
  }
}

export function registerAssetInIndex(
  index: VfxAssetFileIndex,
  ritualKey: string,
  url: string,
  options?: { isDds?: boolean },
) {
  registerPath(index, ritualKey, url, options?.isDds ?? false)
}

/** Regista só pelo nome do ficheiro (pasta Particles seleccionada directamente, etc.). */
export function registerBasenameInIndex(
  index: VfxAssetFileIndex,
  fileName: string,
  url: string,
  options?: { isDds?: boolean },
) {
  const base = basenameOf(fileName)
  if (!base) return
  index.basenames.set(base, url)
  index.paths.set(base, url)
  if (options?.isDds) index.ddsKeys.add(base)
}

export function lookupTextureForRitual(
  index: VfxAssetFileIndex,
  ritualTexturePath: string,
): VfxTextureLookupHit | null {
  if (!ritualTexturePath.trim()) return null
  if (!index.paths.size && !index.basenames.size) return null

  const normalized = ensureAssetsRitualPath(ritualTexturePath)

  for (const candidate of resolveAssetCandidates(normalized)) {
    const key = candidate.toLowerCase()
    const url = index.paths.get(key)
    if (url) {
      return {
        url,
        matchedKey: key,
        matchKind: 'exact',
        isDds: index.ddsKeys.has(key),
      }
    }
  }

  for (const candidate of resolveAssetCandidates(normalized)) {
    const base = basenameOf(candidate)
    const url = index.basenames.get(base)
    if (url) {
      return {
        url,
        matchedKey: base,
        matchKind: 'basename',
        isDds: base.endsWith('.dds') || index.ddsKeys.has(base),
      }
    }
  }

  const tail = normalized.replace(/^ASSETS\//i, '').toLowerCase()
  const tailBase = basenameOf(normalized)
  for (const [key, url] of index.paths) {
    if (key.endsWith(tail) || key.endsWith(`/${tailBase}`) || key === tailBase) {
      return {
        url,
        matchedKey: key,
        matchKind: 'suffix',
        isDds: index.ddsKeys.has(key),
      }
    }
  }

  return null
}

export function lookupTextureUrlForRitual(
  index: VfxAssetFileIndex,
  ritualTexturePath: string,
): string | null {
  return lookupTextureForRitual(index, ritualTexturePath)?.url ?? null
}

export function revokeAssetIndex(index: VfxAssetFileIndex) {
  for (const url of new Set(index.paths.values())) {
    URL.revokeObjectURL(url)
  }
  index.paths.clear()
  index.basenames.clear()
  index.ddsKeys.clear()
}
