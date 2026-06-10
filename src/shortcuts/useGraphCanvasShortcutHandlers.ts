import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

import {
  DEFAULT_CANVAS_INTERACTION_MODE,
  type CanvasInteractionMode,
} from '@/core/canvasInteractionMode'
import type { CanvasScene } from '@/core/canvasScene'
import { isNodeLocked } from '@/core/canvasNodePresentation'
import { isNeekoSchemaId } from '@/core/neekoNodeTransform'
import {
  SHORTCUT_DOCK_NODE_PALETTE,
  SHORTCUT_DOCK_SNAP_MENU,
  SHORTCUT_SCOPE_GRAPH_CANVAS,
} from '@/core/shortcuts/shortcutScopes'
import { SHORTCUT_SCOPE_ATTR } from '@/core/shortcuts/shortcutScopes'

import { useShortcutScope } from './ShortcutScopeProvider'

export type GraphCanvasShortcutRefs = {
  pendingLink: unknown
  selectedNodeIds: readonly string[]
  selectedNodeId: string | null
  glueTargetId: string | null
  glueNodeId: string | null
  canvasInteractionMode: CanvasInteractionMode
  scene: CanvasScene
}

export function useGraphCanvasShortcutHandlers(options: {
  refs: GraphCanvasShortcutRefs
  isPaletteOpen: boolean
  isSlashCommandPickerOpen?: boolean
  isSnapMenuOpen?: boolean
  endLinkDraft: () => void
  openPalette: () => void
  openSlashCommandPicker?: () => void
  closeSnapMenu?: () => void
  onClearSelection?: () => void
  onSelectAllNodesShortcut?: () => void
  focusSelectionIntoView: (nodeIds: readonly string[]) => void
  activateGlueNode: (nodeId: string) => void
  deactivateGlueNode: () => void
  setCanvasInteractionMode: Dispatch<SetStateAction<CanvasInteractionMode>>
  onCloseCodePanelShortcut?: () => void
  onNeekoDropCode?: (nodeId: string, text: string) => void
  onCopySelectedNodes?: () => void
  onPasteCopiedNodes?: () => boolean
  setStructureCardResizeModifierActive?: Dispatch<SetStateAction<boolean>>
}) {
  const { registerShortcutHandlers, setOpenDocks } = useShortcutScope()
  const refs = useRef(options.refs)
  refs.current = options.refs

  useEffect(() => {
    setOpenDocks({
      [SHORTCUT_DOCK_NODE_PALETTE]:
        options.isPaletteOpen || options.isSlashCommandPickerOpen === true,
      [SHORTCUT_DOCK_SNAP_MENU]: options.isSnapMenuOpen === true,
    })
  }, [options.isPaletteOpen, options.isSlashCommandPickerOpen, options.isSnapMenuOpen, setOpenDocks])

  useEffect(() => {
    const setModifier = options.setStructureCardResizeModifierActive
    const modifierHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Control' && event.key !== 'Meta') {
        return false
      }
      if (!setModifier) {
        return false
      }
      if (refs.current.glueNodeId !== null) {
        if (event.type === 'keyup') {
          setModifier(false)
        }
        return false
      }
      if (event.type === 'keydown' && event.repeat) {
        return false
      }
      setModifier(event.type === 'keydown')
      return false
    }

    return registerShortcutHandlers({
      'graph-structure-card-resize-modifier': modifierHandler,
      'graph-structure-card-resize-modifier-meta': modifierHandler,
      'graph-open-palette': () => {
        options.openPalette()
        return true
      },
      'graph-open-slash-commands': () => {
        options.openSlashCommandPicker?.()
        return true
      },
      'graph-select-all-toggle': () => {
        const { selectedNodeIds } = refs.current
        if (selectedNodeIds.length > 0) {
          options.onClearSelection?.()
        } else {
          options.onSelectAllNodesShortcut?.()
        }
        return true
      },
      'graph-focus-selection': () => {
        options.focusSelectionIntoView(refs.current.selectedNodeIds)
        return true
      },
      'graph-glue-toggle': () => {
        const { glueTargetId, glueNodeId } = refs.current
        if (glueNodeId !== null) {
          options.deactivateGlueNode()
          return true
        }
        if (glueTargetId === null) {
          return false
        }
        options.activateGlueNode(glueTargetId)
        return true
      },
      'graph-set-interaction-navigate': () => {
        options.setCanvasInteractionMode('navigate')
        return true
      },
      'graph-set-interaction-tweak': () => {
        options.setCanvasInteractionMode(DEFAULT_CANVAS_INTERACTION_MODE)
        return true
      },
      'graph-escape': () => {
        const state = refs.current
        if (options.isSnapMenuOpen) {
          options.closeSnapMenu?.()
          return true
        }
        if (state.pendingLink) {
          options.endLinkDraft()
          return true
        }
        if (state.glueNodeId !== null) {
          options.deactivateGlueNode()
          return true
        }
        if (state.canvasInteractionMode !== DEFAULT_CANVAS_INTERACTION_MODE) {
          options.setCanvasInteractionMode(DEFAULT_CANVAS_INTERACTION_MODE)
          return true
        }
        options.onCloseCodePanelShortcut?.()
        return true
      },
      'graph-copy-nodes': () => {
        const { selectedNodeIds } = refs.current
        if (selectedNodeIds.length === 0 || !options.onCopySelectedNodes) {
          return false
        }
        options.onCopySelectedNodes()
        return true
      },
      'graph-paste-nodes': () => {
        if (!options.onPasteCopiedNodes) {
          return false
        }
        return options.onPasteCopiedNodes()
      },
      'graph-neeko-paste': async () => {
        const { selectedNodeId, scene } = refs.current
        if (!options.onNeekoDropCode || !selectedNodeId) {
          return false
        }
        const canvasNode = scene.nodes.find((node) => node.id === selectedNodeId)
        if (!canvasNode || !isNeekoSchemaId(canvasNode.node.schema.id) || isNodeLocked(canvasNode)) {
          return false
        }
        try {
          const text = (await navigator.clipboard.readText()).trim()
          if (text.length > 0) {
            options.onNeekoDropCode(selectedNodeId, text)
          }
          return true
        } catch {
          return false
        }
      },
    })
  }, [
    options.endLinkDraft,
    options.focusSelectionIntoView,
    options.onClearSelection,
    options.onCloseCodePanelShortcut,
    options.onNeekoDropCode,
    options.onCopySelectedNodes,
    options.onPasteCopiedNodes,
    options.onSelectAllNodesShortcut,
    options.closeSnapMenu,
    options.isSnapMenuOpen,
    options.openPalette,
    options.openSlashCommandPicker,
    options.activateGlueNode,
    options.deactivateGlueNode,
    options.setCanvasInteractionMode,
    options.setStructureCardResizeModifierActive,
    registerShortcutHandlers,
  ])
}

export const GRAPH_CANVAS_SCOPE_ATTR = SHORTCUT_SCOPE_ATTR
export const GRAPH_CANVAS_SCOPE_ID = SHORTCUT_SCOPE_GRAPH_CANVAS
