import { normalizeKeyboardChord } from '@/core/shortcuts/normalizeKeyboardChord'
import type { ShortcutModifier } from '@/core/shortcuts/shortcutTypes'

export type SnapMenuOpenChord = {
  key: string
  modifiers: readonly ShortcutModifier[]
}

export function matchesSnapMenuOpenChord(
  event: KeyboardEvent,
  chord: SnapMenuOpenChord,
): boolean {
  const normalized = normalizeKeyboardChord(event)
  const expectedKey = chord.key.toLowerCase()

  if (normalized.key !== expectedKey) {
    return false
  }

  if (normalized.modifiers.length !== chord.modifiers.length) {
    return false
  }

  return chord.modifiers.every((modifier) => normalized.modifiers.includes(modifier))
}

export function isSnapMenuHoldReleaseKey(
  event: KeyboardEvent,
  chord: SnapMenuOpenChord,
): boolean {
  if (event.key === 'Shift') {
    return true
  }

  return matchesSnapMenuOpenChord(event, chord)
}
