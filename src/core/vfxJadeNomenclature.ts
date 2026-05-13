import type { NodeStructureNomenclature } from '@/core/nodeSchema'

/**
 * Separador entre rótulo categórico e nome nos títulos do conversor Jade.
 * Mesmo formato para qualquer tipo de nó: `«Categoria · Nome»` (ex.: `VFX · …`, `Emitter · …`).
 * Ver `convertVfxToNodeStructures.ts`: `VFX · ${displayName}` e `Emitter · ${em.name}`.
 */
export const VFX_JADE_TITLE_CATEGORY_SEPARATOR = ' · '

/** nomecratura.md — passo 4: instância VfxSystemDefinitionData → #2 VFX Definition Root. */
export const VFX_JADE_SYSTEM_ROOT_COLLECTION = '#2 VFX Definition Root'

/** nomecratura.md — passo 4 (ramo SENÃO): outras entradas no Root Map → #2 Root Entry. */
export const VFX_JADE_EMITTER_ROOT_COLLECTION = '#2 Root Entry'

/** nomecratura.md — passo 7: nível #2 (entidade no mapa raiz) ↔ #2 Entidades. */
export const VFX_JADE_SYSTEM_ROOT_GROUP = '#2 Entidades'

/** Alias: emitters são também entidades nível #2 (mesmo `group` que o sistema). */
export const VFX_JADE_EMITTER_ROOT_GROUP = VFX_JADE_SYSTEM_ROOT_GROUP

/**
 * Parte antes do primeiro ` · ` em títulos Jade (`extractTitleCategoryPrefix` é genérica: VFX, Emitter, futuros).
 * Sem separador, devolve o título inteiro trimado.
 */
export function extractTitleCategoryPrefix(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    return ''
  }
  const sep = VFX_JADE_TITLE_CATEGORY_SEPARATOR
  const idx = trimmed.indexOf(sep)
  if (idx === -1) {
    return trimmed
  }
  const prefix = trimmed.slice(0, idx).trim()
  return prefix.length > 0 ? prefix : trimmed
}

/**
 * nomecratura.md passos 4 e 7 — `VfxSystemDefinitionData` na raiz.
 * `collectionType` = primeira parte do `title` (ex.: «VFX · X» → «VFX»).
 */
export function buildVfxJadeSystemSchemaNomenclature(systemTitle: string): NodeStructureNomenclature {
  return {
    group: VFX_JADE_SYSTEM_ROOT_GROUP,
    collection: VFX_JADE_SYSTEM_ROOT_COLLECTION,
    collectionType: extractTitleCategoryPrefix(systemTitle),
  }
}

/**
 * nomecratura.md — entradas do mapa que não são `VfxSystemDefinitionData` (ex.: `VfxEmitterDefinitionData`).
 * `collectionType` = primeira parte do `title` (ex.: «Emitter · spark» → «Emitter»).
 */
export function buildVfxJadeEmitterSchemaNomenclature(emitterTitle: string): NodeStructureNomenclature {
  return {
    group: VFX_JADE_EMITTER_ROOT_GROUP,
    collection: VFX_JADE_EMITTER_ROOT_COLLECTION,
    collectionType: extractTitleCategoryPrefix(emitterTitle),
  }
}
