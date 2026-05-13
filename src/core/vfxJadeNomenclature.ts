import type { NodeStructureNomenclature, NomenclaturePathSegment } from '@/core/nodeSchema'
import { normalizeLineEndings } from '@/core/jadeVfxParse'
import { fx_pathHierarchy, segmentsToPathHierarchyString } from '@/core/pathHierarchy'

/**
 * Separador entre rótulo categórico e nome nos títulos do conversor Jade.
 * Mesmo formato para qualquer tipo de nó: `«Categoria · Nome»` (ex.: `VFX · …`, `Emitter · …`).
 * Ver `convertVfxToNodeStructures.ts`: `VFX · ${displayName}` e `Emitter · ${em.name}`.
 */
export const VFX_JADE_TITLE_CATEGORY_SEPARATOR = ' · '

/**
 * Referência nomecratura.md — a preencher pela futura análise do texto `.bin` no CodeDock.
 * Mantidas exportadas para testes legados e para o analisador reutilizar os mesmos rótulos.
 */
/** Passo 4: instância VfxSystemDefinitionData → #2 VFX Definition Root. */
export const VFX_JADE_SYSTEM_ROOT_COLLECTION = '#2 VFX Definition Root'

/**
 * Passo 4 (ramo SENÃO, só entrada **directa** do Root Map): hipotético se `VfxEmitterDefinitionData`
 * fosse irmão de `VfxSystemDefinitionData` no mapa — raro; ver `texte_nomecratura.md`.
 */
export const VFX_JADE_EMITTER_ROOT_COLLECTION = '#2 Root Entry'

/** `VfxEmitterDefinitionData` **aninhado** sob `#2 VFX Definition Root` — texte_nomecratura.md / passo 5–7. */
export const VFX_JADE_EMITTER_EMBED_COLLECTION = '#3 Embed Block'

/** Passo 7: nível #2 (entidade no mapa raiz) ↔ #2 Entidades. */
export const VFX_JADE_SYSTEM_ROOT_GROUP = '#2 Entidades'

/** Mesmo que Root Entry directo no mapa (#2) — legado / caso teórico. */
export const VFX_JADE_EMITTER_ROOT_GROUP = VFX_JADE_SYSTEM_ROOT_GROUP

/** Passo 7: `#3` na classificação ↔ `#3 Internal Structures` nos conjuntos. */
export const VFX_JADE_EMITTER_EMBED_GROUP = '#3 Internal Structures'

/** Primeiro segmento quando existe `entries: map[` — trilho de packs (ex.: importado_2 / UI). */
export const VFX_JADE_PATH_SEGMENT_ENTRIES_CONTEXT = '#1 Root Entry'

export type BuildVfxJadePathHierarchyStepsOptions = {
  /** Chave da entrada no ritual (ex.: caminho hash do sistema). */
  systemKey?: string
  /** Nome lógico do emitter (`VfxEmitter.name`). */
  emitterName?: string
}

/**
 * Pilha `{ id, type }` alinhada a nomecratura.md / caminho_de_hierarquipa….
 * Mantém `#1 Root Entry` na string derivada (compatível com packs `importado_*`).
 */
export function buildVfxJadePathHierarchySteps(
  role: 'system' | 'emitter',
  ritualText: string,
  options?: BuildVfxJadePathHierarchyStepsOptions,
): NomenclaturePathSegment[] {
  const src = normalizeLineEndings(ritualText)
  const hasEntriesMap = /entries:\s*map\[/i.test(src)
  const systemKey = options?.systemKey?.trim() ?? ''
  const emitterName = options?.emitterName?.trim() ?? ''

  const steps: NomenclaturePathSegment[] = []
  if (hasEntriesMap) {
    steps.push({ id: 'entries', type: VFX_JADE_PATH_SEGMENT_ENTRIES_CONTEXT })
  }
  steps.push({ id: systemKey, type: VFX_JADE_SYSTEM_ROOT_COLLECTION })
  if (role === 'emitter') {
    steps.push({ id: '', type: VFX_JADE_EMITTER_EMBED_GROUP })
    steps.push({ id: emitterName, type: VFX_JADE_EMITTER_EMBED_COLLECTION })
  }
  return fx_pathHierarchy(steps)
}

/**
 * Trilho nominal da raiz (`entries: map`) até ao nó VFX Jade, derivado do texto ritual.
 * Sem `entries: map[` (ex.: só excerto Particle Editor), começa em `#2 VFX Definition Root`.
 * @deprecated Para nova lógica preferir `segmentsToPathHierarchyString(buildVfxJadePathHierarchySteps(…))`.
 */
export function buildVfxJadeNomenclaturePathHierarchy(role: 'system' | 'emitter', ritualText: string): string {
  return segmentsToPathHierarchyString(buildVfxJadePathHierarchySteps(role, ritualText))
}

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
    group: '',
    collection: '',
    collectionType: extractTitleCategoryPrefix(systemTitle),
  }
}

/**
 * Emitters no Jade são filhos do sistema (`buildVfxJadeEmitterSchemaNomenclature`).
 * Após «Aplicar nomeclatura», o analisador usa `VFX_JADE_EMITTER_EMBED_*`.
 * `collectionType` = primeira parte do `title` (ex.: «Emitter · spark» → «Emitter»).
 */
export function buildVfxJadeEmitterSchemaNomenclature(emitterTitle: string): NodeStructureNomenclature {
  return {
    group: '',
    collection: '',
    collectionType: extractTitleCategoryPrefix(emitterTitle),
  }
}
