import { addonManifestInfoSearchText } from '@/core/addonManifestInfo'
import type { InputAddonManifest, InputAddonPackage } from '@/services/inputAddonLoader.service'
import {
  InputAddonLoaderService,
  normalizeInputAddonManifest,
  validateInputAddonManifest,
} from '@/services/inputAddonLoader.service'

const INPUT_ADDONS_LIST_ENDPOINT = '/api/input-addons-list'
const INPUT_ADDONS_INDEX_PATH = '/inputAddons/index.json'

type CachedEntry = {
  manifest: InputAddonManifest
  package?: InputAddonPackage
}

const cache = new Map<string, CachedEntry>()
const inflightPackages = new Map<string, Promise<InputAddonPackage>>()
let catalogManifests: InputAddonManifest[] = []

export function registerInputAddonManifest(manifest: InputAddonManifest): void {
  const normalized = normalizeInputAddonManifest(manifest)
  cache.set(normalized.id, { manifest: normalized })
  const idx = catalogManifests.findIndex((m) => m.id === normalized.id)
  if (idx >= 0) {
    catalogManifests[idx] = normalized
  } else {
    catalogManifests = [...catalogManifests, normalized]
  }
}

export function registerInputAddonPackage(pkg: InputAddonPackage): void {
  cache.set(pkg.manifest.id, { manifest: pkg.manifest, package: pkg })
  registerInputAddonManifest(pkg.manifest)
}

export function getInputAddonManifest(inputAddonId: string): InputAddonManifest | undefined {
  return cache.get(inputAddonId)?.manifest
}

export function getInputAddonPackage(inputAddonId: string): InputAddonPackage | undefined {
  return cache.get(inputAddonId)?.package
}

function inputAddonPackageCacheKey(inputAddonId: string, locale: string): string {
  return `${inputAddonId}::${locale.trim().toLowerCase().slice(0, 2)}`
}

export async function preloadInputAddonPackage(
  inputAddonId: string,
  locale = 'pt',
): Promise<InputAddonPackage> {
  const cacheKey = inputAddonPackageCacheKey(inputAddonId, locale)
  const pending = inflightPackages.get(cacheKey)
  if (pending) {
    return pending
  }

  const loadPromise = InputAddonLoaderService.loadFromSandbox(inputAddonId, locale)
    .then((pkg) => {
      registerInputAddonPackage(pkg)
      return pkg
    })
    .finally(() => {
      inflightPackages.delete(cacheKey)
    })

  inflightPackages.set(cacheKey, loadPromise)
  return loadPromise
}

export function listInputAddonManifests(): readonly InputAddonManifest[] {
  return catalogManifests
}

export function listInputAddonIds(): string[] {
  return catalogManifests.map((m) => m.id)
}

export function matchesInputAddonQuery(manifest: InputAddonManifest, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }
  return (
    manifest.id.toLowerCase().includes(q) ||
    manifest.name.toLowerCase().includes(q) ||
    manifest.category.toLowerCase().includes(q) ||
    manifest.input.block.toLowerCase().includes(q) ||
    manifest.input.parameter.toLowerCase().includes(q) ||
    addonManifestInfoSearchText(manifest.info).includes(q)
  )
}

export type FetchInputAddonsFromDiskResult =
  | { ok: true; manifests: InputAddonManifest[] }
  | { ok: false; error: string }

export async function fetchInputAddonsFromDisk(): Promise<FetchInputAddonsFromDiskResult> {
  try {
    const res = await fetch(INPUT_ADDONS_LIST_ENDPOINT, {
      headers: { Accept: 'application/json' },
    })
    const payload: unknown = await res.json().catch(() => null)

    if (res.ok && typeof payload === 'object' && payload !== null && Reflect.get(payload, 'ok') === true) {
      const rawManifests = Reflect.get(payload, 'manifests')
      if (Array.isArray(rawManifests)) {
        const manifests: InputAddonManifest[] = []
        for (const entry of rawManifests) {
          if (validateInputAddonManifest(entry)) {
            const normalized = normalizeInputAddonManifest(entry)
            manifests.push(normalized)
            registerInputAddonManifest(normalized)
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
    const indexRes = await fetch(INPUT_ADDONS_INDEX_PATH)
    if (!indexRes.ok) {
      return { ok: false, error: 'Índice de input add-ons indisponível.' }
    }
    const ids: unknown = await indexRes.json()
    if (!Array.isArray(ids)) {
      return { ok: false, error: 'index.json inválido.' }
    }

    const manifests: InputAddonManifest[] = []
    for (const id of ids) {
      if (typeof id !== 'string' || !id.trim()) {
        continue
      }
      try {
        const manifest = await InputAddonLoaderService.loadManifestOnly(id.trim())
        manifests.push(manifest)
        registerInputAddonManifest(manifest)
      } catch (err) {
        console.warn('[inputAddonRegistry] skip', id, err)
      }
    }
    catalogManifests = manifests
    return { ok: true, manifests }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao listar input add-ons.',
    }
  }
}
