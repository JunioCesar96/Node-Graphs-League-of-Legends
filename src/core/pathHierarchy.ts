import type { NomenclaturePathSegment } from '@/core/nodeSchema'

/** Cópia defensiva da pilha no momento em que o nó é criado (nome `fx_pathHierarchy` do doc). */
export function fx_pathHierarchy(stack: readonly NomenclaturePathSegment[]): NomenclaturePathSegment[] {
  return stack.map((s) => ({ id: s.id, type: s.type }))
}

/** Mesmo formato que os JSON existentes: só os `type`, unidos por ` > `. */
export function segmentsToPathHierarchyString(segments: readonly NomenclaturePathSegment[]): string {
  return segments.map((s) => s.type.trim()).join(' > ')
}
