import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  resolveSnapMenuFrame,
  SNAP_MENU_BACK_ACTION_ID,
} from '@/core/snapMenu/contextMenuSnapMenu'
import {
  isSnapMenuHoldReleaseKey,
  matchesSnapMenuOpenChord,
  type SnapMenuOpenChord,
} from '@/core/snapMenu/snapMenuChord'
import type { SnapMenuActionDefinition } from '@/core/snapMenu/snapMenu'
import {
  SHORTCUT_DOCK_SNAP_MENU,
  SHORTCUT_SCOPE_GRAPH_CANVAS,
  type ShortcutScopeId,
} from '@/core/shortcuts/shortcutScopes'

import { useShortcutScope } from '@/shortcuts/ShortcutScopeProvider'

import type { SnapMenuAnchor } from './SnapMenu'

export type UseSnapMenuOptions<T extends string = string> = {
  actions: readonly SnapMenuActionDefinition[]
  canOpen?: () => boolean
  enabled?: boolean
  holdRelease?: boolean
  isActionDisabled?: (actionId: T) => boolean
  onSelect: (actionId: T) => void
  openChord: SnapMenuOpenChord
  resolveAnchor: () => SnapMenuAnchor
  scopeId?: ShortcutScopeId
  showActiveBar?: boolean
  showPolygonVisual?: boolean
  title: string
  titleUpdatesWithActiveAction?: boolean
}

export function useSnapMenu<T extends string = string>({
  actions,
  canOpen,
  enabled = true,
  holdRelease = true,
  isActionDisabled,
  onSelect,
  openChord,
  resolveAnchor,
  scopeId = SHORTCUT_SCOPE_GRAPH_CANVAS,
  showActiveBar = true,
  showPolygonVisual = true,
  title,
  titleUpdatesWithActiveAction = false,
}: UseSnapMenuOptions<T>) {
  const { activeScopeId, setOpenDocks } = useShortcutScope()
  const [anchor, setAnchor] = useState<SnapMenuAnchor | null>(null)
  const [menuPath, setMenuPath] = useState<readonly string[]>([])
  const activeActionIdRef = useRef<T | null>(null)
  const menuPathRef = useRef<readonly string[]>([])
  const rootActionsRef = useRef(actions)
  const isOpen = anchor !== null

  rootActionsRef.current = actions

  useEffect(() => {
    menuPathRef.current = menuPath
  }, [menuPath])

  const currentFrame = useMemo(
    () => resolveSnapMenuFrame(title, actions, menuPath),
    [actions, menuPath, title],
  )

  const disabledActionIds = useMemo(() => {
    const disabled = new Set<string>()

    for (const action of currentFrame.actions) {
      if (action.disabled) {
        disabled.add(action.id)
      }

      if (isActionDisabled?.(action.id as T)) {
        disabled.add(action.id)
      }
    }

    return disabled
  }, [currentFrame.actions, isActionDisabled])

  const open = useCallback(() => {
    activeActionIdRef.current = null
    setMenuPath([])
    setAnchor(resolveAnchor())
  }, [resolveAnchor])

  const close = useCallback(() => {
    activeActionIdRef.current = null
    setMenuPath([])
    setAnchor(null)
  }, [])

  const handleSelect = useCallback(
    (actionId: string) => {
      if (actionId === SNAP_MENU_BACK_ACTION_ID) {
        setMenuPath((previous) => (previous.length > 0 ? previous.slice(0, -1) : previous))
        activeActionIdRef.current = null
        return
      }

      const frame = resolveSnapMenuFrame(title, rootActionsRef.current, menuPathRef.current)
      const selected = frame.actions.find((entry) => entry.id === actionId)

      if (selected?.submenu && selected.submenu.length > 0) {
        setMenuPath((previous) => [...previous, selected.id])
        activeActionIdRef.current = null
        return
      }

      onSelect(actionId as T)
      close()
    },
    [close, onSelect, title],
  )

  const setActiveActionId = useCallback((actionId: string | null) => {
    activeActionIdRef.current = actionId as T | null
  }, [])

  const commitHoldRelease = useCallback(() => {
    if (!anchor) {
      return
    }

    const actionId = activeActionIdRef.current

    if (actionId && !disabledActionIds.has(actionId)) {
      handleSelect(actionId)
      return
    }

    close()
  }, [anchor, close, disabledActionIds, handleSelect])

  useEffect(() => {
    setOpenDocks({
      [SHORTCUT_DOCK_SNAP_MENU]: isOpen,
    })
  }, [isOpen, setOpenDocks])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeScopeId !== scopeId) {
        return
      }

      if (event.repeat) {
        return
      }

      if (!matchesSnapMenuOpenChord(event, openChord)) {
        return
      }

      if (!isOpen) {
        if (canOpen && !canOpen()) {
          return
        }

        event.preventDefault()
        open()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!holdRelease || !isOpen) {
        return
      }

      if (activeScopeId !== scopeId) {
        return
      }

      if (!isSnapMenuHoldReleaseKey(event, openChord)) {
        return
      }

      event.preventDefault()
      commitHoldRelease()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    activeScopeId,
    commitHoldRelease,
    enabled,
    holdRelease,
    isOpen,
    open,
    canOpen,
    openChord,
    scopeId,
  ])

  return {
    actions: currentFrame.actions,
    anchor,
    canNavigateBack: menuPath.length > 0,
    close,
    commitHoldRelease,
    disabledActionIds,
    handleSelect,
    isOpen,
    menuPath,
    open,
    setActiveActionId,
    showActiveBar,
    showPolygonVisual,
    title: currentFrame.title,
    titleUpdatesWithActiveAction,
  }
}
