import { useEffect } from 'react'

import { filterRemovableNodeIds, isNodeLocked } from '@/core/canvasNodePresentation'
import type { CanvasScene } from '@/core/canvasScene'
import { MESSENGER_TOAST_NODE_LOCKED } from '@/messenger_popup/messengerCatalog'
import { SHORTCUT_DOCK_CODE, SHORTCUT_DOCK_VFX } from '@/core/shortcuts/shortcutScopes'

import { useShortcutScope } from './ShortcutScopeProvider'

export function useAppShortcutHandlers(options: {
  scene: CanvasScene
  selectedNodeIds: readonly string[]
  undoScene: () => void
  redoScene: () => void
  deleteNodeIds: (ids: string[]) => void
  showToastByCatalogId: (catalogId: string) => void
  codeDockOpen: boolean
  vfxDockOpen: boolean
}) {
  const { registerShortcutHandlers, setOpenDocks } = useShortcutScope()
  const {
    scene,
    selectedNodeIds,
    undoScene,
    redoScene,
    deleteNodeIds,
    showToastByCatalogId,
    codeDockOpen,
    vfxDockOpen,
  } = options

  useEffect(() => {
    setOpenDocks({
      [SHORTCUT_DOCK_CODE]: codeDockOpen,
      [SHORTCUT_DOCK_VFX]: vfxDockOpen,
    })
  }, [codeDockOpen, setOpenDocks, vfxDockOpen])

  useEffect(() => {
    return registerShortcutHandlers({
      'graph-undo': () => {
        undoScene()
        return true
      },
      'graph-redo-shift': () => {
        redoScene()
        return true
      },
      'graph-redo-y': () => {
        redoScene()
        return true
      },
      'graph-delete-selection': (event) => {
        if (event.key !== 'Delete' && event.key !== 'Backspace') {
          return false
        }
        const deletableIds = filterRemovableNodeIds(scene, selectedNodeIds)
        if (deletableIds.length === 0) {
          const hasLocked = selectedNodeIds.some((id) => {
            const node = scene.nodes.find((entry) => entry.id === id)
            return node !== undefined && isNodeLocked(node)
          })
          if (hasLocked) {
            showToastByCatalogId(MESSENGER_TOAST_NODE_LOCKED)
            return true
          }
          return false
        }
        deleteNodeIds(deletableIds)
        return true
      },
      'graph-delete-selection-backspace': (event) => {
        if (event.key !== 'Backspace') {
          return false
        }
        const deletableIds = filterRemovableNodeIds(scene, selectedNodeIds)
        if (deletableIds.length === 0) {
          const hasLocked = selectedNodeIds.some((id) => {
            const node = scene.nodes.find((entry) => entry.id === id)
            return node !== undefined && isNodeLocked(node)
          })
          if (hasLocked) {
            showToastByCatalogId(MESSENGER_TOAST_NODE_LOCKED)
            return true
          }
          return false
        }
        deleteNodeIds(deletableIds)
        return true
      },
    })
  }, [
    deleteNodeIds,
    redoScene,
    registerShortcutHandlers,
    scene,
    selectedNodeIds,
    showToastByCatalogId,
    undoScene,
  ])
}
