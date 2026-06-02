const iconModules = import.meta.glob<string>('../groupStructures/icons/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

const iconUrlByFileName = new Map<string, string>()

for (const [path, url] of Object.entries(iconModules)) {
  const fileName = path.split(/[/\\]/).pop()?.toLowerCase()
  if (fileName && typeof url === 'string') {
    iconUrlByFileName.set(fileName, url)
  }
}

export type ResolvedGroupStructureIcon =
  | { kind: 'none' }
  | { kind: 'fontawesome'; className: string }
  | { kind: 'image'; url: string; alt: string }

function isFontAwesomeClass(icon: string): boolean {
  return /\bfa-[a-z0-9-]+\b/i.test(icon)
}

const IMAGE_EXTENSIONS = ['.png', '.svg', '.webp', '.jpg', '.jpeg'] as const

function imageExtensionsForBase(baseName: string): string[] {
  const lower = baseName.toLowerCase()
  const match = /^(.+?)(\.[a-z0-9]+)$/i.exec(lower)
  if (match) {
    const stem = match[1]
    const requestedExt = match[2]
    const alternates = IMAGE_EXTENSIONS.filter((ext) => ext !== requestedExt).map(
      (ext) => `${stem}${ext}`,
    )
    return [lower, ...alternates]
  }
  return IMAGE_EXTENSIONS.map((ext) => `${lower}${ext}`)
}

function resolveImageIconUrl(icon: string): string | undefined {
  const trimmed = icon.trim()
  const base = trimmed.includes('/') ? (trimmed.split('/').pop() ?? trimmed) : trimmed

  for (const candidate of imageExtensionsForBase(base)) {
    const url = iconUrlByFileName.get(candidate)
    if (url) {
      return url
    }
  }

  return undefined
}

export function isGroupStructureIconEmpty(icon: string | undefined): boolean {
  const trimmed = icon?.trim()
  return !trimmed || trimmed.toLowerCase() === 'none'
}

/** Interpreta `icon` de `groupStructures/*.json` (Font Awesome, ficheiro em `icons/`, ou `none`). */
export function resolveGroupStructureIcon(icon: string | undefined): ResolvedGroupStructureIcon {
  if (isGroupStructureIconEmpty(icon)) {
    return { kind: 'none' }
  }

  const trimmed = icon!.trim()

  if (isFontAwesomeClass(trimmed)) {
    return { kind: 'fontawesome', className: trimmed }
  }

  const url = resolveImageIconUrl(trimmed)
  if (url) {
    return { kind: 'image', url, alt: trimmed }
  }

  return { kind: 'none' }
}
