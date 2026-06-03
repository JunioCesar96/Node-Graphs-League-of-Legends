/** Caminhos ritual e descoberta de mesh/animações de campeão na pasta Game. */

import type { VfxAssetFileIndex } from './vfxAssetLookup'
import { lookupTextureForRitual } from './vfxAssetLookup'
import type { VfxLolAssetCaches } from './vfxMeshCache'
import { lookupAnm, lookupSkinnedBundle, lookupSkl } from './vfxMeshCache'
import { ritualKeyFromRelativePath } from './vfxAssetLookup'
import type { LolSkinnedMeshBundle } from './lolSkinnedMesh'
import type { ParsedLolAnm } from './lolAnmParse'
import type { ParsedLolSkl } from './lolSklParse'

/** Pasta de skin relativa a `Characters/{champion}/`. */
export type VfxCharacterSkinFolder = 'skins/base' | 'Skins/Base' | 'Skins/Skin0'

export type VfxCharacterTextureHit = {
  ritualPath: string
  url: string
  isDds: boolean
}

export type VfxCharacterResolvedAssets = {
  champion: string
  skin: VfxCharacterSkinFolder
  sknPath: string
  sklPath: string
  bundle: LolSkinnedMeshBundle
  skl: ParsedLolSkl
  baseTexturePath: string
  loadscreenPath: string
}

/** Ordem: custom skins (assets/Characters/…/skins/base) → LoL oficial. */
export const SKIN_FOLDER_ORDER: VfxCharacterSkinFolder[] = ['skins/base', 'Skins/Base', 'Skins/Skin0']

const TEXTURE_EXTENSIONS = ['.tex', '.dds'] as const

export function championFilePrefix(champion: string): string {
  return champion.trim().toLowerCase()
}

/** Caminho relativo à raiz «assets» seleccionada em Assets path. */
export function buildChampionSknRelativePath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
): string {
  return `Characters/${champion}/${skinFolder}/${championFilePrefix(champion)}.skn`
}

export function buildChampionSklRelativePath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
): string {
  return `Characters/${champion}/${skinFolder}/${championFilePrefix(champion)}.skl`
}

/** Caminho ritual ASSETS/… usado nos caches e no ritual LoL. */
export function buildChampionSknPath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
): string {
  return `ASSETS/${buildChampionSknRelativePath(champion, skinFolder)}`
}

export function buildChampionSklPath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
): string {
  return `ASSETS/${buildChampionSklRelativePath(champion, skinFolder)}`
}

export function defaultChampionSknRelativePath(champion: string): string {
  return buildChampionSknRelativePath(champion, 'skins/base')
}

export function buildChampionAnimationsRelativePath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
): string {
  return `Characters/${champion}/${skinFolder}/animations`
}

/** Pasta `characters/{campeao}/{skin}/animations/` (lowercase, para matching). */
export function buildCharacterAnimationsFolderNeedle(
  champion: string,
  skinFolder: VfxCharacterSkinFolder,
): string {
  return `characters/${championFilePrefix(champion)}/${skinFolder.toLowerCase()}/animations/`
}

export function inferSkinFolderFromRelativePath(relativePath: string): VfxCharacterSkinFolder | null {
  const lower = relativePath.replace(/\\/g, '/').toLowerCase()
  for (const skinFolder of SKIN_FOLDER_ORDER) {
    if (lower.includes(`/${skinFolder.toLowerCase()}/`)) return skinFolder
  }
  return null
}

export function isFileInCharacterAnimationsFolder(
  relativePath: string,
  champion: string,
  skinFolder: VfxCharacterSkinFolder,
): boolean {
  const lower = relativePath.replace(/\\/g, '/').toLowerCase()
  return lower.includes(buildCharacterAnimationsFolderNeedle(champion, skinFolder))
}

export function buildChampionBaseTextureRelativePath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
  extension: (typeof TEXTURE_EXTENSIONS)[number] = '.tex',
): string {
  return `Characters/${champion}/${skinFolder}/${championFilePrefix(champion)}_base_tx_cm${extension}`
}

export function buildChampionLoadscreenRelativePath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
  extension: (typeof TEXTURE_EXTENSIONS)[number] = '.tex',
): string {
  return `Characters/${champion}/${skinFolder}/${championFilePrefix(champion)}loadscreen${extension}`
}

export function buildChampionBaseTexturePath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
  extension: (typeof TEXTURE_EXTENSIONS)[number] = '.tex',
): string {
  return `ASSETS/${buildChampionBaseTextureRelativePath(champion, skinFolder, extension)}`
}

export function buildChampionLoadscreenPath(
  champion: string,
  skinFolder: VfxCharacterSkinFolder = 'skins/base',
  extension: (typeof TEXTURE_EXTENSIONS)[number] = '.tex',
): string {
  return `ASSETS/${buildChampionLoadscreenRelativePath(champion, skinFolder, extension)}`
}

function lookupCharacterTextureByRitualPaths(
  assetIndex: VfxAssetFileIndex | null,
  ritualPaths: string[],
): VfxCharacterTextureHit | null {
  if (!assetIndex) return null
  for (const ritualPath of ritualPaths) {
    const hit = lookupTextureForRitual(assetIndex, ritualPath)
    if (hit) {
      return { ritualPath, url: hit.url, isDds: hit.isDds }
    }
  }
  return null
}

export function resolveCharacterBaseTexture(
  assetIndex: VfxAssetFileIndex | null,
  champion: string,
  skinFolder: VfxCharacterSkinFolder,
): VfxCharacterTextureHit | null {
  const ritualPaths = TEXTURE_EXTENSIONS.map((extension) =>
    buildChampionBaseTexturePath(champion, skinFolder, extension),
  )
  return lookupCharacterTextureByRitualPaths(assetIndex, ritualPaths)
}

export function resolveCharacterLoadscreen(
  assetIndex: VfxAssetFileIndex | null,
  champion: string,
  skinFolder: VfxCharacterSkinFolder,
): VfxCharacterTextureHit | null {
  const ritualPaths = TEXTURE_EXTENSIONS.map((extension) =>
    buildChampionLoadscreenPath(champion, skinFolder, extension),
  )
  return lookupCharacterTextureByRitualPaths(assetIndex, ritualPaths)
}

function inferSkinFolderFromKey(key: string): VfxCharacterSkinFolder {
  const lower = key.toLowerCase()
  if (lower.includes('/skins/skin0/')) return 'Skins/Skin0'
  if (lower.includes('/skins/base/')) return 'skins/base'
  return 'skins/base'
}

function normalizeCacheKeyToRitualPath(key: string): string {
  const normalized = key.replace(/\\/g, '/')
  return ritualKeyFromRelativePath(normalized) ?? `ASSETS/${normalized.replace(/^\//, '')}`
}

export function resolveCharacterInCaches(
  caches: VfxLolAssetCaches | null,
  champion: string,
): VfxCharacterResolvedAssets | null {
  if (!caches || !champion.trim()) return null

  for (const skinFolder of SKIN_FOLDER_ORDER) {
    const sknPath = buildChampionSknPath(champion, skinFolder)
    const sklPath = buildChampionSklPath(champion, skinFolder)
    const bundle = lookupSkinnedBundle(caches, sknPath)
    const skl = lookupSkl(caches, sklPath)
    if (bundle && skl) {
      return {
        champion,
        skin: skinFolder,
        sknPath,
        sklPath,
        bundle,
        skl,
        baseTexturePath: buildChampionBaseTexturePath(champion, skinFolder),
        loadscreenPath: buildChampionLoadscreenPath(champion, skinFolder),
      }
    }
  }

  const championLower = champion.toLowerCase()
  for (const [key, bundle] of caches.skinned) {
    if (!key.includes(`characters/${championLower}/`) || !key.endsWith('.skn')) continue
    const sklPath = key.replace(/\.skn$/i, '.skl')
    const skl = lookupSkl(caches, sklPath)
    if (skl) {
      const sknRitual = normalizeCacheKeyToRitualPath(key)
      const sklRitual = normalizeCacheKeyToRitualPath(sklPath)
      return {
        champion,
        skin: inferSkinFolderFromKey(key),
        sknPath: sknRitual,
        sklPath: sklRitual,
        bundle,
        skl,
        baseTexturePath: buildChampionBaseTexturePath(champion, inferSkinFolderFromKey(key)),
        loadscreenPath: buildChampionLoadscreenPath(champion, inferSkinFolderFromKey(key)),
      }
    }
  }

  return null
}

export function listCharacterAnimationPaths(
  caches: VfxLolAssetCaches | null,
  champion: string,
): string[] {
  if (!caches) return []
  const needle = `characters/${champion.trim().toLowerCase()}/`
  const paths = new Set<string>()

  for (const key of caches.anm.keys()) {
    const normalized = key.replace(/\\/g, '/').toLowerCase()
    if (normalized.includes(needle) && normalized.endsWith('.anm')) {
      paths.add(key)
    }
  }

  const all = [...paths].sort((a, b) => a.localeCompare(b))
  const inAnimationsFolder = all.filter((path) => path.replace(/\\/g, '/').toLowerCase().includes('/animations/'))
  return inAnimationsFolder.length ? inAnimationsFolder : all
}

/** Preferência: Base_Dance / Dance / Idle; senão primeira .anm listada. */
export function pickDefaultCharacterAnimationPath(paths: string[]): string | null {
  if (!paths.length) return null
  const lower = paths.map((path) => ({ path, key: path.toLowerCase() }))
  const dance = lower.find(
    (entry) =>
      entry.key.includes('base_dance') ||
      entry.key.includes('_dance') ||
      entry.key.endsWith('dance.anm'),
  )
  if (dance) return dance.path
  const idle = lower.find((entry) => entry.key.includes('idle'))
  if (idle) return idle.path
  return paths[0] ?? null
}

export function animationDisplayName(ritualPath: string): string {
  const base = ritualPath.split('/').pop() ?? ritualPath
  return base.replace(/\.anm$/i, '')
}

export function lookupCharacterAnimation(
  caches: VfxLolAssetCaches | null,
  ritualPath: string,
): ParsedLolAnm | null {
  if (!caches) return null
  return lookupAnm(caches, ritualPath)
}

/** Paths para indexar mesh do campeão a partir da raiz assets (File System Access). */
export function collectCharacterIndexPaths(champion: string): string[] {
  const paths: string[] = []
  for (const skinFolder of SKIN_FOLDER_ORDER) {
    paths.push(buildChampionSknPath(champion, skinFolder))
    paths.push(buildChampionSklPath(champion, skinFolder))
  }
  return paths
}

/** Paths relativos à pasta assets (sem prefixo ASSETS/). */
export function collectCharacterIndexRelativePaths(champion: string): string[] {
  const paths: string[] = []
  for (const skinFolder of SKIN_FOLDER_ORDER) {
    paths.push(buildChampionSknRelativePath(champion, skinFolder))
    paths.push(buildChampionSklRelativePath(champion, skinFolder))
    for (const extension of TEXTURE_EXTENSIONS) {
      paths.push(buildChampionBaseTextureRelativePath(champion, skinFolder, extension))
      paths.push(buildChampionLoadscreenRelativePath(champion, skinFolder, extension))
    }
  }
  return paths
}

export function collectCharacterAnimationDirectoryRelativePaths(champion: string): string[] {
  return SKIN_FOLDER_ORDER.map((skinFolder) => buildChampionAnimationsRelativePath(champion, skinFolder))
}
