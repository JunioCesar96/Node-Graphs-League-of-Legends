import { resolveAddonI18nText, type AddonLanguagePack } from '@/core/addonLanguage'

import { resolveAddonManifestInfo } from '@/core/addonManifestInfo'

import type { AddonManifest } from '@/services/addonLoader.service'



/** Etiquetas visíveis no card da paleta: categoria + tags de `info` resolvidas. */

export function collectAddonPaletteFilterLabelsForManifest(

  manifest: AddonManifest,

  languagePack: AddonLanguagePack,

): string[] {

  const labels: string[] = []

  const category = manifest.category?.trim()

  if (category) {

    labels.push(category)

  }



  const info = resolveAddonManifestInfo(manifest.info, languagePack)

  if (info?.tags.length) {

    labels.push(...info.tags)

  }



  return labels

}



function normalizeAddonPaletteFilterLabel(label: string): string {

  return label.trim()

}



/** Etiquetas únicas para o filtro da paleta (o que o utilizador vê nos cards). */

export function collectAddonPaletteFilterLabels(

  manifests: readonly AddonManifest[],

  languagePackByManifestId: Readonly<Record<string, AddonLanguagePack>>,

): string[] {

  const seen = new Set<string>()

  const labels: string[] = []



  for (const manifest of manifests) {

    const languagePack = languagePackByManifestId[manifest.id] ?? {}

    for (const rawLabel of collectAddonPaletteFilterLabelsForManifest(manifest, languagePack)) {

      const label = normalizeAddonPaletteFilterLabel(rawLabel)

      if (!label || seen.has(label)) {

        continue

      }

      seen.add(label)

      labels.push(label)

    }

  }



  return labels.sort((a, b) => a.localeCompare(b, 'pt'))

}



export function addonManifestMatchesPaletteTagFilter(

  manifest: AddonManifest,

  selectedLabels: readonly string[],

  languagePackByManifestId: Readonly<Record<string, AddonLanguagePack>>,

): boolean {

  if (selectedLabels.length === 0) {

    return true

  }



  const languagePack = languagePackByManifestId[manifest.id] ?? {}

  const manifestLabels = new Set(

    collectAddonPaletteFilterLabelsForManifest(manifest, languagePack)

      .map((label) => normalizeAddonPaletteFilterLabel(label))

      .filter(Boolean),

  )



  return selectedLabels.some((label) => manifestLabels.has(normalizeAddonPaletteFilterLabel(label)))

}



/** Add-on visível na paleta: não pode ter tag em «ocultas na lista» e tem de passar o filtro activo. */

export function addonManifestShouldShowInPaletteList(

  manifest: AddonManifest,

  hiddenInListLabels: readonly string[],

  activeFilterLabels: readonly string[],

  languagePackByManifestId: Readonly<Record<string, AddonLanguagePack>>,

): boolean {

  if (

    hiddenInListLabels.length > 0 &&

    addonManifestMatchesPaletteTagFilter(manifest, hiddenInListLabels, languagePackByManifestId)

  ) {

    return false

  }



  return addonManifestMatchesPaletteTagFilter(

    manifest,

    activeFilterLabels,

    languagePackByManifestId,

  )

}



/** @deprecated Usar `collectAddonPaletteFilterLabels` — mantido só para migração de testes legados. */

export function collectAddonPaletteTagKeys(manifests: readonly AddonManifest[]): string[] {

  const seen = new Set<string>()

  const tags: string[] = []



  for (const manifest of manifests) {

    for (const raw of manifest.info?.tags ?? []) {

      const tag = raw.trim()

      if (!tag || seen.has(tag)) {

        continue

      }

      seen.add(tag)

      tags.push(tag)

    }

  }



  return tags.sort((a, b) => a.localeCompare(b, 'pt'))

}



/** Resolve chaves i18n antigas guardadas em localStorage para etiquetas visíveis. */

export function migrateLegacyAddonPaletteHiddenTagKeys(

  hiddenKeys: readonly string[],

  manifests: readonly AddonManifest[],

  languagePackByManifestId: Readonly<Record<string, AddonLanguagePack>>,

): string[] {

  const allLabels = collectAddonPaletteFilterLabels(manifests, languagePackByManifestId)

  const labelSet = new Set(allLabels)

  const migrated: string[] = []

  const seen = new Set<string>()



  for (const rawKey of hiddenKeys) {

    const key = rawKey.trim()

    if (!key) {

      continue

    }



    if (labelSet.has(key)) {

      if (!seen.has(key)) {

        seen.add(key)

        migrated.push(key)

      }

      continue

    }



    if (!key.includes('{')) {

      continue

    }



    for (const manifest of manifests) {

      const hasRawTag = (manifest.info?.tags ?? []).some((tag) => tag.trim() === key)

      if (!hasRawTag) {

        continue

      }

      const languagePack = languagePackByManifestId[manifest.id] ?? {}

      const resolved = normalizeAddonPaletteFilterLabel(resolveAddonI18nText(key, languagePack))

      if (!resolved || !labelSet.has(resolved) || seen.has(resolved)) {

        continue

      }

      seen.add(resolved)

      migrated.push(resolved)

    }

  }



  return migrated

}


