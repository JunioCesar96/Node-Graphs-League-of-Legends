import type { ShortcutDockId, ShortcutScopeId } from './shortcutScopes'

export type ShortcutModifier = 'ctrl' | 'shift' | 'alt' | 'meta'

export type ShortcutScopeDefinition = {
  id: ShortcutScopeId
  label: string
}

export type ShortcutBindingDefinition = {
  id: string
  scopeId: ShortcutScopeId
  key: string
  modifiers?: ShortcutModifier[]
  requiresOpen?: ShortcutDockId[]
  allowInFormControls?: boolean
  priority?: number
  /** Por defeito só `keydown`. */
  eventTypes?: Array<'keydown' | 'keyup'>
}

export type ShortcutsRegistry = {
  scopes: ShortcutScopeDefinition[]
  bindings: ShortcutBindingDefinition[]
}

export type ShortcutHandlerResult = boolean | void

export type ShortcutHandler = (
  event: KeyboardEvent,
  ctx: ShortcutHandlerContext,
) => ShortcutHandlerResult

export type ShortcutHandlerContext = {
  activeScopeId: ShortcutScopeId
  openDocks: Readonly<Record<ShortcutDockId, boolean>>
}
