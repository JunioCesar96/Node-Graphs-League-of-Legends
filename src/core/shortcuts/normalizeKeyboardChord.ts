import type { ShortcutModifier } from './shortcutTypes'

export type NormalizedKeyboardChord = {
  key: string
  modifiers: ShortcutModifier[]
  /** Identificador estável para índice (`ctrl+7`, `delete`, …). */
  chordId: string
}

const MODIFIER_ORDER: ShortcutModifier[] = ['ctrl', 'shift', 'alt', 'meta']

function readModifiers(event: KeyboardEvent): ShortcutModifier[] {
  const modifiers: ShortcutModifier[] = []
  if (event.ctrlKey) modifiers.push('ctrl')
  if (event.shiftKey) modifiers.push('shift')
  if (event.altKey) modifiers.push('alt')
  if (event.metaKey) modifiers.push('meta')
  return modifiers
}

function sortModifiers(modifiers: ShortcutModifier[]): ShortcutModifier[] {
  return MODIFIER_ORDER.filter((entry) => modifiers.includes(entry))
}

function buildChordId(key: string, modifiers: ShortcutModifier[]): string {
  if (modifiers.length === 0) {
    return key
  }
  return `${modifiers.join('+')}+${key}`
}

/** Mapeia `Digit7` / `Numpad7` → `7`, preserva `Delete`, `Escape`, `Control`, etc. */
export function resolveLogicalKey(event: KeyboardEvent): string {
  const { key, code } = event

  if (key === 'Control' || key === 'Meta' || key === 'Shift' || key === 'Alt') {
    return key
  }

  if (key.length === 1) {
    return key.toLowerCase()
  }

  const digitMatch = /^Digit(\d)$/.exec(code)
  if (digitMatch) {
    return digitMatch[1]
  }

  const numpadMatch = /^Numpad(\d)$/.exec(code)
  if (numpadMatch) {
    return numpadMatch[1]
  }

  if (key === 'Delete' || key === 'Backspace' || key === 'Escape' || key === 'Enter') {
    return key
  }

  return key.length > 0 ? key : code
}

export function normalizeKeyboardChord(event: KeyboardEvent): NormalizedKeyboardChord {
  const key = resolveLogicalKey(event)
  const modifiers = sortModifiers(readModifiers(event))
  return { key, modifiers, chordId: buildChordId(key, modifiers) }
}

export function chordIdFromBinding(key: string, modifiers: ShortcutModifier[] = []): string {
  return buildChordId(key.toLowerCase(), sortModifiers(modifiers))
}

/** Alias de acordes para a mesma tecla física (ex.: 7 superior e numpad). */
export function chordAliasesFromEvent(event: KeyboardEvent): string[] {
  const primary = normalizeKeyboardChord(event)
  const aliases = new Set<string>([primary.chordId])

  const logical = resolveLogicalKey(event)
  if (/^\d$/.test(logical)) {
    aliases.add(chordIdFromBinding(logical, primary.modifiers))
    aliases.add(chordIdFromBinding(logical, []))
    if (primary.modifiers.length > 0) {
      aliases.add(buildChordId(logical, primary.modifiers))
    }
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    aliases.add('Delete')
    aliases.add('Backspace')
  }

  return [...aliases]
}

export function modifiersMatch(
  expected: ShortcutModifier[],
  actual: ShortcutModifier[],
): boolean {
  if (expected.length !== actual.length) {
    return false
  }
  return expected.every((entry, index) => entry === actual[index])
}
