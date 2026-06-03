import { useEffect } from 'react'

import { useShortcutScope } from './ShortcutScopeProvider'

export function useCodeDockShortcutHandlers(options: {
  onFind: () => void
  onReplace: () => void
  onUndo: () => void
  onRedo: () => void
  onGeneralEdit: () => void
  onParticlePanel: () => void
}) {
  const { registerShortcutHandlers } = useShortcutScope()

  useEffect(() => {
    return registerShortcutHandlers({
      'code-find': () => {
        options.onFind()
        return true
      },
      'code-replace': () => {
        options.onReplace()
        return true
      },
      'code-undo': (event) => {
        if (event.shiftKey) {
          return false
        }
        options.onUndo()
        return true
      },
      'code-redo-shift': () => {
        options.onRedo()
        return true
      },
      'code-redo-y': () => {
        options.onRedo()
        return true
      },
      'code-general-edit': () => {
        options.onGeneralEdit()
        return true
      },
      'code-particle-panel': () => {
        options.onParticlePanel()
        return true
      },
    })
  }, [
    options.onFind,
    options.onGeneralEdit,
    options.onParticlePanel,
    options.onRedo,
    options.onReplace,
    options.onUndo,
    registerShortcutHandlers,
  ])
}
