import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { buildShortcutScopeIndex, dispatchShortcut } from '@/core/shortcuts/shortcutDispatcher'
import { resolveShortcutScopeFromTarget } from '@/core/shortcuts/shortcutFocus'
import {
  DEFAULT_SHORTCUT_SCOPE,
  SHORTCUT_DOCK_CODE,
  SHORTCUT_DOCK_NODE_PALETTE,
  SHORTCUT_DOCK_VFX,
  type ShortcutDockId,
  type ShortcutScopeId,
} from '@/core/shortcuts/shortcutScopes'
import shortcutsRegistry from '@/core/shortcuts/shortcuts.registry.json'
import type { ShortcutHandler, ShortcutsRegistry } from '@/core/shortcuts/shortcutTypes'

const registry = shortcutsRegistry as ShortcutsRegistry
const scopeIndex = buildShortcutScopeIndex(registry)

export type OpenShortcutDocks = Record<ShortcutDockId, boolean>

export type ShortcutScopeContextValue = {
  activeScopeId: ShortcutScopeId
  setActiveScopeId: (scopeId: ShortcutScopeId) => void
  setActiveScopeFromTarget: (target: EventTarget | null) => void
  setOpenDocks: (next: Partial<OpenShortcutDocks>) => void
  registerShortcutHandlers: (handlers: Partial<Record<string, ShortcutHandler>>) => () => void
}

const ShortcutScopeContext = createContext<ShortcutScopeContextValue | null>(null)

export function ShortcutScopeProvider({ children }: { children: ReactNode }) {
  const [activeScopeId, setActiveScopeId] = useState<ShortcutScopeId>(DEFAULT_SHORTCUT_SCOPE)
  const openDocksRef = useRef<OpenShortcutDocks>({
    [SHORTCUT_DOCK_VFX]: false,
    [SHORTCUT_DOCK_CODE]: false,
    [SHORTCUT_DOCK_NODE_PALETTE]: false,
  })
  const handlersRef = useRef<Partial<Record<string, ShortcutHandler>>>({})

  const setOpenDocks = useCallback((next: Partial<OpenShortcutDocks>) => {
    openDocksRef.current = { ...openDocksRef.current, ...next }
  }, [])

  const setActiveScopeFromTarget = useCallback((target: EventTarget | null) => {
    setActiveScopeId(resolveShortcutScopeFromTarget(target))
  }, [])

  const registerShortcutHandlers = useCallback(
    (handlers: Partial<Record<string, ShortcutHandler>>) => {
      handlersRef.current = { ...handlersRef.current, ...handlers }
      return () => {
        for (const id of Object.keys(handlers)) {
          delete handlersRef.current[id]
        }
      }
    },
    [],
  )

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const scope = resolveShortcutScopeFromTarget(event.target)
      setActiveScopeId(scope)
    }

    const onFocusIn = (event: FocusEvent) => {
      const scope = resolveShortcutScopeFromTarget(event.target)
      setActiveScopeId(scope)
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focusin', onFocusIn, true)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focusin', onFocusIn, true)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const handled = dispatchShortcut({
        event,
        registry,
        scopeIndex,
        activeScopeId,
        openDocks: openDocksRef.current,
        handlers: handlersRef.current,
      })

      if (handled) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyDown, true)

    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyDown, true)
    }
  }, [activeScopeId])

  const value = useMemo<ShortcutScopeContextValue>(
    () => ({
      activeScopeId,
      setActiveScopeId,
      setActiveScopeFromTarget,
      setOpenDocks,
      registerShortcutHandlers,
    }),
    [activeScopeId, registerShortcutHandlers, setActiveScopeFromTarget, setOpenDocks],
  )

  return <ShortcutScopeContext.Provider value={value}>{children}</ShortcutScopeContext.Provider>
}

export function useShortcutScope(): ShortcutScopeContextValue {
  const ctx = useContext(ShortcutScopeContext)
  if (!ctx) {
    throw new Error('useShortcutScope must be used within ShortcutScopeProvider')
  }
  return ctx
}
