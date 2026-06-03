import {
  DEFAULT_SHORTCUT_SCOPE,
  SHORTCUT_SCOPE_ATTR,
  type ShortcutScopeId,
} from './shortcutScopes'

export function readShortcutScopeFromTarget(target: EventTarget | null): ShortcutScopeId | null {
  if (!(target instanceof HTMLElement)) {
    return null
  }

  const scopeEl = target.closest(`[${SHORTCUT_SCOPE_ATTR}]`)
  if (!(scopeEl instanceof HTMLElement)) {
    return null
  }

  const scopeId = scopeEl.getAttribute(SHORTCUT_SCOPE_ATTR)
  if (!scopeId) {
    return null
  }

  return scopeId as ShortcutScopeId
}

export function resolveShortcutScopeFromTarget(
  target: EventTarget | null,
): ShortcutScopeId {
  return readShortcutScopeFromTarget(target) ?? DEFAULT_SHORTCUT_SCOPE
}
