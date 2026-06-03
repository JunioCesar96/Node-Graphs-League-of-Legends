import { resolveAddonI18nText, type AddonLanguagePack } from '@/core/addonLanguage'
import type { AddonManifestInfo } from '@/services/addonLoader.service'

export type ResolvedAddonManifestInfo = {
  link: string
  author: string
  version: string
  description: string
  license: string
  tags: string[]
  docs: string
}

function resolveInfoText(value: string | undefined, languagePack: AddonLanguagePack): string {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return ''
  }
  return resolveAddonI18nText(trimmed, languagePack)
}

export function resolveAddonManifestInfo(
  info: AddonManifestInfo | undefined,
  languagePack: AddonLanguagePack,
): ResolvedAddonManifestInfo | null {
  if (!info) {
    return null
  }

  const description = resolveInfoText(info.description, languagePack)
  const tags = (info.tags ?? [])
    .map((tag) => resolveInfoText(tag, languagePack))
    .filter(Boolean)

  const resolved: ResolvedAddonManifestInfo = {
    link: String(info.link ?? '').trim(),
    author: String(info.author ?? '').trim(),
    version: String(info.version ?? '').trim(),
    description,
    license: String(info.license ?? '').trim(),
    tags,
    docs: String(info.docs ?? '').trim(),
  }

  const hasContent =
    resolved.link ||
    resolved.author ||
    resolved.version ||
    resolved.description ||
    resolved.license ||
    resolved.docs ||
    resolved.tags.length > 0

  return hasContent ? resolved : null
}

export function addonManifestInfoSearchText(info: AddonManifestInfo | undefined): string {
  if (!info) {
    return ''
  }
  return [
    info.link,
    info.author,
    info.version,
    info.description,
    info.license,
    info.docs,
    ...(info.tags ?? []),
  ]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
    .toLowerCase()
}
