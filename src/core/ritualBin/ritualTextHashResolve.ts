import {
  humanizeVfxPropRitualText,
  ritualTextNeedsHumanize,
} from '@/core/vfx/humanizeVfxPropRitualText'

/** Segunda passagem local (FNV + overrides) sobre texto ritual ainda com hashes. */
export function applyRitualTextLexiconPass(text: string): { text: string; changed: boolean } {
  if (!ritualTextNeedsHumanize(text)) {
    return { text, changed: false }
  }

  const lexicon = humanizeVfxPropRitualText(text)
  return { text: lexicon.text, changed: lexicon.changed }
}
