import {
  resolveRitualTextForEditor,
  type JadeEditorResolveVia,
} from '@/core/jadeEditorTextResolve'

import { prepareRitualEditorText } from './prepareRitualEditorText'
import { shouldUseNativeRitualBinCodec } from './ritualBinCodec'
import type { RitualEditorTextVia } from './ritualBinTypes'

export type RitualEditorResolveMode = 'native' | 'jade'

export type RitualEditorResolveVia = RitualEditorTextVia | JadeEditorResolveVia

export type RitualEditorResolveResult = {
  text: string
  changed: boolean
  mode: RitualEditorResolveMode
  via: RitualEditorResolveVia
  notice?: string
  warning?: string
}

/**
 * Resolve hashes em texto ritual para o Code Dock — roteia entre motor Nativo (8791) e Jade.
 */
export async function resolveRitualEditorText(text: string): Promise<RitualEditorResolveResult> {
  if (shouldUseNativeRitualBinCodec()) {
    const native = await prepareRitualEditorText(text)
    return {
      text: native.text,
      changed: native.changed,
      mode: 'native',
      via: native.via,
      notice: native.notice,
    }
  }

  const jade = await resolveRitualTextForEditor(text)
  return {
    text: jade.text,
    changed: jade.changed,
    mode: 'jade',
    via: jade.via,
    warning: jade.warning,
  }
}
