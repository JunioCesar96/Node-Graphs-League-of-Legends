import { useEffect, useRef } from 'react'

import { shouldBlockWorkspaceShortcut } from '@/core/shortcuts/shortcutGuards'
import { resolveLogicalKey } from '@/core/shortcuts/normalizeKeyboardChord'

function isVfxIsolationChord(event: KeyboardEvent): boolean {
  if (event.type !== 'keydown') {
    return false
  }
  if (!event.ctrlKey || event.altKey) {
    return false
  }
  const key = resolveLogicalKey(event)
  return key === ' ' || event.code === 'Space'
}

export function useVfxDockShortcutHandlers(options: {
  enabled: boolean
  onToggleWindowIsolation: () => void
}) {
  const toggleRef = useRef(options.onToggleWindowIsolation)
  toggleRef.current = options.onToggleWindowIsolation

  useEffect(() => {
    if (!options.enabled) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isVfxIsolationChord(event)) {
        return
      }

      if (shouldBlockWorkspaceShortcut(event, { allowInFormControls: true })) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      toggleRef.current()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [options.enabled])
}
