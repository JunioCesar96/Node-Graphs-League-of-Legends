import type { AddonManifest } from '@/services/addonLoader.service'

export type AddonManifestAppearance = {
  headerColor?: string
  backgroundColor?: string
  backgroundImage?: string
  borderColor?: string
  borderRadius?: string
  borderWidth?: string
  borderStyle?: string
  headerFontSize?: string
  headerFontWeight?: string
  headerFontColor?: string
  headerBackgroundColor?: string
  headerBackgroundImage?: string
  icon?: string
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Converte caminho do manifest (`public/addons/...`) em URL servida pelo Vite. */
export function resolveAddonAssetUrl(addonId: string, assetPath: string): string {
  const trimmed = assetPath.trim()
  if (!trimmed || trimmed.toLowerCase() === 'none') {
    return ''
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }
  if (trimmed.startsWith('/')) {
    return trimmed
  }

  const normalized = trimmed.replace(/\\/g, '/')
  const addonsSegment = '/addons/'
  const idx = normalized.indexOf(addonsSegment)
  if (idx >= 0) {
    return normalized.slice(idx)
  }

  if (normalized.startsWith('public/')) {
    const withoutPublic = normalized.slice('public/'.length)
    if (withoutPublic.startsWith('addons/')) {
      return `/${withoutPublic}`
    }
  }

  const clean = normalized.replace(/^\.?\//, '')
  return `/addons/${encodeURIComponent(addonId)}/${clean}`
}

export function resolveAddonHeaderIconUrl(
  addonId: string,
  icon: string | undefined,
): string | null {
  const resolved = nonEmpty(icon)
  if (!resolved) {
    return null
  }
  if (resolved.length <= 2 || resolved.toLowerCase() === 'none') {
    return null
  }
  if (
    resolved.startsWith('http://') ||
    resolved.startsWith('https://') ||
    resolved.startsWith('/') ||
    resolved.includes('/') ||
    resolved.includes('.')
  ) {
    const url = resolveAddonAssetUrl(addonId, resolved)
    return url || null
  }
  return resolved
}

export function buildAddonCardAppearanceStyles(
  addonId: string,
  manifest: AddonManifest,
): {
  cardStyle: Record<string, string>
  headerStyle: Record<string, string>
} {
  const cardStyle: Record<string, string> = {}
  const headerStyle: Record<string, string> = {}

  const bg = nonEmpty(manifest.backgroundColor)
  if (bg) {
    cardStyle.backgroundColor = bg
  }

  const bgImage = nonEmpty(manifest.backgroundImage)
  if (bgImage) {
    const url = resolveAddonAssetUrl(addonId, bgImage)
    if (url) {
      cardStyle.backgroundImage = `url("${url}")`
      cardStyle.backgroundSize = 'cover'
      cardStyle.backgroundPosition = 'center'
    }
  }

  const borderColor = nonEmpty(manifest.borderColor)
  const borderWidth = nonEmpty(manifest.borderWidth)
  const borderStyle = nonEmpty(manifest.borderStyle)
  if (borderColor || borderWidth || borderStyle) {
    cardStyle.borderStyle = borderStyle ?? 'solid'
    cardStyle.borderWidth = borderWidth ?? '1px'
    if (borderColor) {
      cardStyle.borderColor = borderColor
    }
  }

  const borderRadius = nonEmpty(manifest.borderRadius)
  if (borderRadius) {
    cardStyle.borderRadius = borderRadius
  }

  const headerBg =
    nonEmpty(manifest.headerBackgroundColor) ?? nonEmpty(manifest.headerColor)
  if (headerBg) {
    headerStyle.backgroundColor = headerBg
  }

  const headerBgImage = nonEmpty(manifest.headerBackgroundImage)
  if (headerBgImage) {
    const url = resolveAddonAssetUrl(addonId, headerBgImage)
    if (url) {
      headerStyle.backgroundImage = `url("${url}")`
      headerStyle.backgroundSize = 'cover'
      headerStyle.backgroundPosition = 'center'
    }
  }

  const headerFontColor = nonEmpty(manifest.headerFontColor)
  if (headerFontColor) {
    headerStyle.color = headerFontColor
  }

  const headerFontSize = nonEmpty(manifest.headerFontSize)
  if (headerFontSize) {
    headerStyle.fontSize = headerFontSize
  }

  const headerFontWeight = nonEmpty(manifest.headerFontWeight)
  if (headerFontWeight) {
    headerStyle.fontWeight = headerFontWeight
  }

  return { cardStyle, headerStyle }
}

const ADDON_CATEGORY_ACCENT: Record<string, string> = {
  media: '#4a9fd4',
  utility: '#6a9955',
}

/** Cor de destaque no painel Ctrl+K (tema do manifest ou categoria). */
export function resolveAddonPaletteAccent(manifest: AddonManifest): string {
  const fromManifest =
    nonEmpty(manifest.headerBackgroundColor) ??
    nonEmpty(manifest.headerColor) ??
    nonEmpty(manifest.borderColor)
  if (fromManifest) {
    return fromManifest
  }
  return ADDON_CATEGORY_ACCENT[manifest.category.trim().toLowerCase()] ?? '#888888'
}
