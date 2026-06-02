import {
  chordAliasesFromEvent,
  chordIdFromBinding,
  modifiersMatch,
  normalizeKeyboardChord,
  resolveLogicalKey,
} from './normalizeKeyboardChord'
import { shouldBlockWorkspaceShortcut } from './shortcutGuards'
import type { ShortcutDockId, ShortcutScopeId } from './shortcutScopes'
import type {
  ShortcutBindingDefinition,
  ShortcutHandler,
  ShortcutHandlerContext,
  ShortcutsRegistry,
} from './shortcutTypes'

type IndexedBinding = ShortcutBindingDefinition & {
  chordId: string
}

function indexRegistry(registry: ShortcutsRegistry): Map<ShortcutScopeId, IndexedBinding[]> {
  const byScope = new Map<ShortcutScopeId, IndexedBinding[]>()

  for (const binding of registry.bindings) {
    const chordId = chordIdFromBinding(binding.key, binding.modifiers ?? [])
    const indexed: IndexedBinding = { ...binding, chordId }
    const list = byScope.get(binding.scopeId) ?? []
    list.push(indexed)
    byScope.set(binding.scopeId, list)
  }

  for (const list of byScope.values()) {
    list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  return byScope
}

function docksSatisfied(
  binding: ShortcutBindingDefinition,
  openDocks: Readonly<Record<ShortcutDockId, boolean>>,
): boolean {
  const required = binding.requiresOpen
  if (!required || required.length === 0) {
    return true
  }
  return required.every((dockId) => openDocks[dockId] === true)
}

function eventModifiersForBindingMatch(event: KeyboardEvent): ReturnType<typeof normalizeKeyboardChord>['modifiers'][] {
  const normalized = normalizeKeyboardChord(event)
  const variants: ReturnType<typeof normalizeKeyboardChord>['modifiers'][] = [normalized.modifiers]

  const expectedCtrl = normalized.modifiers.includes('ctrl')
  const hasMetaOnly = event.metaKey && !event.ctrlKey

  if (expectedCtrl && hasMetaOnly) {
    const metaVariant = normalized.modifiers.map((entry) => (entry === 'ctrl' ? 'meta' : entry)) as typeof normalized.modifiers
    if (!variants.some((entry) => modifiersMatch(entry, metaVariant))) {
      variants.push(metaVariant)
    }
  }

  return variants
}

function resolveAllowedEventTypes(
  binding: ShortcutBindingDefinition,
  defaultTypes: ReadonlySet<'keydown' | 'keyup'>,
): ReadonlySet<'keydown' | 'keyup'> {
  if (!binding.eventTypes || binding.eventTypes.length === 0) {
    return defaultTypes
  }
  return new Set(binding.eventTypes)
}

function bindingMatchesChord(binding: IndexedBinding, chordId: string, event: KeyboardEvent): boolean {
  if (binding.chordId === chordId) {
    return true
  }

  const keyMatches = binding.key.toLowerCase() === resolveLogicalKey(event).toLowerCase() ||
    binding.key === resolveLogicalKey(event)

  if (!keyMatches) {
    return false
  }

  return eventModifiersForBindingMatch(event).some((modifiers) =>
    modifiersMatch(binding.modifiers ?? [], modifiers),
  )
}

export type ShortcutDispatchInput = {
  event: KeyboardEvent
  registry: ShortcutsRegistry
  scopeIndex: Map<ShortcutScopeId, IndexedBinding[]>
  activeScopeId: ShortcutScopeId
  openDocks: Readonly<Record<ShortcutDockId, boolean>>
  handlers: Readonly<Partial<Record<string, ShortcutHandler>>>
}

export function buildShortcutScopeIndex(registry: ShortcutsRegistry): Map<ShortcutScopeId, IndexedBinding[]> {
  return indexRegistry(registry)
}

export function dispatchShortcut(input: ShortcutDispatchInput): boolean {
  const { event, scopeIndex, activeScopeId, openDocks, handlers } = input

  const bindings = scopeIndex.get(activeScopeId)
  if (!bindings || bindings.length === 0) {
    return false
  }

  const defaultEventTypes = new Set<'keydown' | 'keyup'>(['keydown'])
  const aliases = chordAliasesFromEvent(event)

  for (const binding of bindings) {
    const allowedTypes = resolveAllowedEventTypes(binding, defaultEventTypes)
    if (!allowedTypes.has(event.type as 'keydown' | 'keyup')) {
      continue
    }

    if (!docksSatisfied(binding, openDocks)) {
      continue
    }

    const chordMatch = aliases.some((chordId) => bindingMatchesChord(binding, chordId, event))
    if (!chordMatch) {
      continue
    }

    if (shouldBlockWorkspaceShortcut(event, { allowInFormControls: binding.allowInFormControls })) {
      continue
    }

    const handler = handlers[binding.id]
    if (!handler) {
      continue
    }

    const ctx: ShortcutHandlerContext = { activeScopeId, openDocks }
    const handled = handler(event, ctx)
    if (handled !== false) {
      return true
    }
  }

  return false
}
