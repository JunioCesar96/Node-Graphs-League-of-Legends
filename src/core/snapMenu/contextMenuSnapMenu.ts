import type { ContextMenuItem } from '@/core/canvasContextMenuTypes'

import type { SnapMenuActionDefinition } from './snapMenu'

export type SnapMenuFrame = {
  title: string
  actions: readonly SnapMenuActionDefinition[]
}

export function resolveSnapMenuFrame(
  rootTitle: string,
  rootActions: readonly SnapMenuActionDefinition[],
  path: readonly string[],
): SnapMenuFrame {
  if (path.length === 0) {
    return { title: rootTitle, actions: rootActions }
  }

  let actions = rootActions
  let frameTitle = rootTitle

  for (const segmentId of path) {
    const parent = actions.find((entry) => entry.id === segmentId)

    if (!parent?.submenu || parent.submenu.length === 0) {
      break
    }

    frameTitle = parent.label
    actions = parent.submenu
  }

  return { title: frameTitle, actions }
}

export const SNAP_MENU_BACK_ACTION_ID = '__snap_menu_back__'

const SUBMENU_LABEL_SUFFIX_PATTERN = /\s*›\s*$/

function stripSubmenuLabelSuffix(label: string): string {
  return label.replace(SUBMENU_LABEL_SUFFIX_PATTERN, '').trim()
}

export function contextMenuItemsToSnapActions(
  items: readonly ContextMenuItem[],
  options?: { includeBack?: boolean; backLabel?: string },
): SnapMenuActionDefinition[] {
  const actions: SnapMenuActionDefinition[] = []

  if (options?.includeBack) {
    actions.push({
      id: SNAP_MENU_BACK_ACTION_ID,
      label: options.backLabel ?? 'Voltar',
      shortcut: '0',
    })
  }

  const maxItems = options?.includeBack ? 8 : 9
  let shortcutIndex = 1

  for (const item of items) {
    if (shortcutIndex > maxItems) {
      break
    }

    const action: SnapMenuActionDefinition = {
      id: item.id,
      label: stripSubmenuLabelSuffix(item.label),
      shortcut: String(shortcutIndex),
      disabled: item.disabled,
    }

    if (item.children && item.children.length > 0) {
      action.submenu = contextMenuItemsToSnapActions(item.children, {
        includeBack: true,
        backLabel: options?.backLabel,
      })
    }

    actions.push(action)
    shortcutIndex += 1
  }

  return actions
}
