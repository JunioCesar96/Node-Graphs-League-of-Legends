import type { NomenclaturePathSegment } from './nodeSchema'

/** Cópia defensiva da pilha no momento em que o nó é criado (nome `fx_pathHierarchy` do doc). */
export function fx_pathHierarchy(stack: readonly NomenclaturePathSegment[]): NomenclaturePathSegment[] {
  return stack.map((s) => ({ id: s.id, type: s.type }))
}

/** Mesmo formato que os JSON existentes: só os `type`, unidos por ` > `. */
export function segmentsToPathHierarchyString(segments: readonly NomenclaturePathSegment[]): string {
  return segments.map((s) => s.type.trim()).join(' > ')
}

/** Class Group: trilho só com `id` dos segmentos da pilha (`especificacao_recursividade_infinita.md`). */
export function segmentsToPathHierarchyIdString(segments: readonly NomenclaturePathSegment[]): string {
  return segments.map((s) => s.id.trim()).filter((id) => id.length > 0).join(' > ')
}
