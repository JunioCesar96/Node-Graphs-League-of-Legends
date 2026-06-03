import { useCallback, useRef, type FocusEvent, type PointerEvent, type RefObject } from 'react'

import { resolveShortcutScopeFromTarget } from './shortcutFocus'
import type { ShortcutScopeId } from './shortcutScopes'

export function useShortcutScopeRoot(
  scopeId: ShortcutScopeId,
  onScopeActivate: (scopeId: ShortcutScopeId) => void,
): {
  ref: RefObject<HTMLElement | null>
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onFocusIn: (event: FocusEvent<HTMLElement>) => void
} {
  const ref = useRef<HTMLElement | null>(null)

  const activate = useCallback(() => {
    onScopeActivate(scopeId)
  }, [onScopeActivate, scopeId])

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.target instanceof Node && ref.current?.contains(event.target)) {
        activate()
      }
    },
    [activate],
  )

  const onFocusIn = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (event.target instanceof Node && ref.current?.contains(event.target)) {
        activate()
      }
    },
    [activate],
  )

  return { ref, onPointerDown, onFocusIn }
}

export { resolveShortcutScopeFromTarget }
