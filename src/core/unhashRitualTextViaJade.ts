import {
  resolveRitualTextForEditor,
  type JadeEditorResolveResult,
  type JadeEditorResolveVia,
} from '@/core/jadeEditorTextResolve'

export type UnhashRitualTextVia = JadeEditorResolveVia
export type UnhashRitualTextResult = JadeEditorResolveResult

/** @deprecated Prefer `resolveRitualTextForEditor` from `@/core/jadeEditorTextResolve`. */
export async function unhashRitualText(text: string): Promise<UnhashRitualTextResult> {
  return resolveRitualTextForEditor(text)
}
