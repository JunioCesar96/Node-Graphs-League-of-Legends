/** Pseudoligações a partir do tipo Jade `Hash` quando o valor = `path_hash` de outro objecto neste BinTree (`VITE_LTK_HASH_AS_EDGE !== 'false'`). */
export function isHashPathHintGloballyEnabled(): boolean {
  try {
    return import.meta.env.VITE_LTK_HASH_AS_EDGE !== 'false'
  } catch {
    return true
  }
}
