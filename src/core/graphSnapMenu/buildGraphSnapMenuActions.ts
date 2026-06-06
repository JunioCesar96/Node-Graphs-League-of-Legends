import { GRAPH_SNAP_ACTIONS } from '@/core/graphSnapMenu/graphSnapActions'
import {
  GRAPH_NAVIGATION_MENU_TITLE,
  GRAPH_SNAP_ACTION_LANG,
} from '@/core/language/graphSnapMenuLangIds'
import type { SnapMenuActionDefinition } from '@/core/snapMenu/snapMenu'

export { GRAPH_NAVIGATION_MENU_TITLE, GRAPH_NAVIGATION_MENU_TITLE as GRAPH_SNAP_MENU_TITLE }

export function buildGraphSnapMenuActions(
  translate: (langId: number, fallback: string) => string,
): SnapMenuActionDefinition[] {
  return GRAPH_SNAP_ACTIONS.map((entry) => {
    const labelEntry = GRAPH_SNAP_ACTION_LANG[entry.action]

    return {
      id: entry.action,
      label: translate(labelEntry.langId, labelEntry.fallback),
      shortcut: entry.shortcut,
    }
  })
}
