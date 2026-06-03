import { addonManifestInfoSearchText } from '@/core/addonManifestInfo'
import type { AddonManifest, AddonPackage } from '@/services/addonLoader.service'
import { AddonLoaderService, normalizeAddonManifest, validateAddonManifest } from '@/services/addonLoader.service'

const ADDONS_LIST_ENDPOINT = '/api/addons-list'
const ADDONS_INDEX_PATH = '/addons/index.json'

type CachedEntry = {
  manifest: AddonManifest
  package?: AddonPackage
}

const cache = new Map<string, CachedEntry>()
const inflightPackages = new Map<string, Promise<AddonPackage>>()
let catalogManifests: AddonManifest[] = []

export function registerAddonManifest(manifest: AddonManifest): void {
  const normalized = normalizeAddonManifest(manifest)
  cache.set(normalized.id, { manifest: normalized })
  const idx = catalogManifests.findIndex((m) => m.id === normalized.id)
  if (idx >= 0) {
    catalogManifests[idx] = normalized
  } else {
    catalogManifests = [...catalogManifests, normalized]
  }
}

export function registerAddonPackage(pkg: AddonPackage): void {
  cache.set(pkg.manifest.id, { manifest: pkg.manifest, package: pkg })
  registerAddonManifest(pkg.manifest)
}

export function getAddonManifest(addonId: string): AddonManifest | undefined {
  return cache.get(addonId)?.manifest
}

export function getAddonPackage(addonId: string): AddonPackage | undefined {
  return cache.get(addonId)?.package
}

function addonPackageCacheKey(addonId: string, locale: string): string {
  return `${addonId}::${locale.trim().toLowerCase().slice(0, 2)}`
}

export async function preloadAddonPackage(
  addonId: string,
  locale = 'pt',
): Promise<AddonPackage> {
  const cacheKey = addonPackageCacheKey(addonId, locale)
  const pending = inflightPackages.get(cacheKey)
  if (pending) {
    return pending
  }

  const loadPromise = AddonLoaderService.loadFromSandbox(addonId, locale)
    .then((pkg) => {
      registerAddonPackage(pkg)
      return pkg
    })
    .finally(() => {
      inflightPackages.delete(cacheKey)
    })

  inflightPackages.set(cacheKey, loadPromise)
  return loadPromise
}

export function listAddonManifests(): readonly AddonManifest[] {
  return catalogManifests
}

export function listAddonIds(): string[] {
  return catalogManifests.map((m) => m.id)
}

export function matchesAddonQuery(manifest: AddonManifest, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }
  return (
    manifest.id.toLowerCase().includes(q) ||
    manifest.name.toLowerCase().includes(q) ||
    manifest.category.toLowerCase().includes(q) ||
    addonManifestInfoSearchText(manifest.info).includes(q)
  )
}

export type FetchAddonsFromDiskResult =
  | { ok: true; manifests: AddonManifest[] }
  | { ok: false; error: string }

export async function fetchAddonsFromDisk(): Promise<FetchAddonsFromDiskResult> {
  try {
    const res = await fetch(ADDONS_LIST_ENDPOINT, {
      headers: { Accept: 'application/json' },
    })
    const payload: unknown = await res.json().catch(() => null)

    if (res.ok && typeof payload === 'object' && payload !== null && Reflect.get(payload, 'ok') === true) {
      const rawManifests = Reflect.get(payload, 'manifests')
      if (Array.isArray(rawManifests)) {
        const manifests: AddonManifest[] = []
        for (const entry of rawManifests) {
          if (validateAddonManifest(entry)) {
            const normalized = normalizeAddonManifest(entry)
            manifests.push(normalized)
            registerAddonManifest(normalized)
          }
        }
        catalogManifests = manifests
        return { ok: true, manifests }
      }
    }
  } catch {
    /* fallback to index.json */
  }

  try {
    const indexRes = await fetch(ADDONS_INDEX_PATH)
    if (!indexRes.ok) {
      return { ok: false, error: 'Índice de add-ons indisponível.' }
    }
    const ids: unknown = await indexRes.json()
    if (!Array.isArray(ids)) {
      return { ok: false, error: 'index.json inválido.' }
    }

    const manifests: AddonManifest[] = []
    for (const id of ids) {
      if (typeof id !== 'string' || !id.trim()) {
        continue
      }
      try {
        const manifest = await AddonLoaderService.loadManifestOnly(id.trim())
        manifests.push(manifest)
        registerAddonManifest(manifest)
      } catch (err) {
        console.warn('[addonRegistry] skip', id, err)
      }
    }
    catalogManifests = manifests
    return { ok: true, manifests }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao listar add-ons.',
    }
  }
}
