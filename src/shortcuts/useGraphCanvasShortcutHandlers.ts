import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

import type { CanvasScene } from '@/core/canvasScene'
import { isNodeLocked } from '@/core/canvasNodePresentation'
import { isNeekoSchemaId } from '@/core/neekoNodeTransform'
import { SHORTCUT_DOCK_NODE_PALETTE, SHORTCUT_SCOPE_GRAPH_CANVAS } from '@/core/shortcuts/shortcutScopes'
import { SHORTCUT_SCOPE_ATTR } from '@/core/shortcuts/shortcutScopes'

import { useShortcutScope } from './ShortcutScopeProvider'

export type GraphCanvasShortcutRefs = {
  pendingLink: unknown
  selectedNodeIds: readonly string[]
  selectedNodeId: string | null
  glueTargetId: string | null
  glueNodeId: string | null
  viewportNavigateMode: boolean
  scene: CanvasScene
}

export function useGraphCanvasShortcutHandlers(options: {
  refs: GraphCanvasShortcutRefs
  isPaletteOpen: boolean
  endLinkDraft: () => void
  openPalette: () => void
  onClearSelection?: () => void
  onSelectAllNodesShortcut?: () => void
  focusSelectionIntoView: (nodeIds: readonly string[]) => void
  setGlueNodeId: Dispatch<SetStateAction<string | null>>
  setViewportNavigateMode: Dispatch<SetStateAction<boolean>>
  onCloseCodePanelShortcut?: () => void
  onNeekoDropCode?: (nodeId: string, text: string) => void
  setStructureCardResizeModifierActive?: Dispatch<SetStateAction<boolean>>
}) {
  const { registerShortcutHandlers, setOpenDocks } = useShortcutScope()
  const refs = useRef(options.refs)
  refs.current = options.refs

  useEffect(() => {
    setOpenDocks({ [SHORTCUT_DOCK_NODE_PALETTE]: options.isPaletteOpen })
  }, [options.isPaletteOpen, setOpenDocks])

  useEffect(() => {
    const setModifier = options.setStructureCardResizeModifierActive
    const modifierHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Control' && event.key !== 'Meta') {
        return false
      }
      if (!setModifier) {
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
        const { glueTargetId } = refs.current
        options.setGlueNodeId((existingGlue) =>
          glueTargetId === null ? null : existingGlue === glueTargetId ? null : glueTargetId,
        )
        return true
      },
      'graph-escape': () => {
        const state = refs.current
        if (state.pendingLink) {
          options.endLinkDraft()
          return true
        }
        if (state.viewportNavigateMode) {
          options.setViewportNavigateMode(false)
          return true
        }
        options.onCloseCodePanelShortcut?.()
        options.setGlueNodeId(null)
        return true
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
    options.onSelectAllNodesShortcut,
    options.openPalette,
    options.setGlueNodeId,
    options.setViewportNavigateMode,
    options.setStructureCardResizeModifierActive,
    registerShortcutHandlers,
  ])
}

export const GRAPH_CANVAS_SCOPE_ATTR = SHORTCUT_SCOPE_ATTR
export const GRAPH_CANVAS_SCOPE_ID = SHORTCUT_SCOPE_GRAPH_CANVAS
