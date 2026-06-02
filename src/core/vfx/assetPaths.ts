const ASSETS_PREFIX_RE = /^ASSETS\//i
const BLENDER_IMAGE_EXTENSIONS = ['.dds', '.png', '.jpg', '.jpeg', '.tga', '.bmp', '.tif', '.tiff']
const FALLBACK_EXTENSIONS = ['.dds', '.png', '.tex', '.bin', '.scb', '.skn', '.skl', '.anm', '.sco']

export function stripRitualString(value: string): string {
  const text = value.trim()
  if (text.length >= 2 && text[0] === text[text.length - 1] && (text[0] === '"' || text[0] === "'")) {
    return text.slice(1, -1)
  }
  return text
}

export function normalizeRitualAssetPath(value: string): string {
  return stripRitualString(value).replace(/\\/g, '/')
}

export function isRitualAssetPath(value: string): boolean {
  return ASSETS_PREFIX_RE.test(normalizeRitualAssetPath(value))
}

/** Resolve caminho relativo ASSETS/... dentro de um mapa de ficheiros (browser). */
export function resolveAssetRelativePath(ritualValue: string): string | null {
  const ritualPath = normalizeRitualAssetPath(ritualValue)
  if (!ASSETS_PREFIX_RE.test(ritualPath)) return null
  return ritualPath
}

export function resolveAssetCandidates(ritualValue: string): string[] {
  const ritualPath = normalizeRitualAssetPath(ritualValue)
  if (!ASSETS_PREFIX_RE.test(ritualPath)) return []

  const candidates = [ritualPath]
  const dot = ritualPath.lastIndexOf('.')
  const base = dot >= 0 ? ritualPath.slice(0, dot) : ritualPath
  const currentExt = dot >= 0 ? ritualPath.slice(dot).toLowerCase() : ''

  if (currentExt === '.tex') {
    for (const ext of BLENDER_IMAGE_EXTENSIONS) {
      candidates.push(base + ext)
    }
  }

  for (const ext of FALLBACK_EXTENSIONS) {
    if (currentExt !== ext) candidates.push(base + ext)
  }

  return [...new Set(candidates)]
}

export function lookupAssetBlobUrl(
  fileIndex: Map<string, string>,
  ritualValue: string,
): string | null {
  if (!ritualValue.trim()) return null
  for (const candidate of resolveAssetCandidates(ritualValue)) {
    const key = candidate.replace(/\\/g, '/').toLowerCase()
    const hit = fileIndex.get(key)
    if (hit) return hit
  }
  return null
}
