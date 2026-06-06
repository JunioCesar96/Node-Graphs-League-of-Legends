import type { GraphSnapActionId } from '@/core/graphSnapMenu/graphSnapActions'
import { GRAPH_SNAP_ACTIONS } from '@/core/graphSnapMenu/graphSnapActions'

import { LangId } from './languageIds'

export type GraphSnapMenuLabelDef = {
  fallback: string
  langId: number
}

/** Título do menu Snap de navegação na grade (Shift+S). */
export const GRAPH_NAVIGATION_MENU_TITLE: GraphSnapMenuLabelDef = {
  langId: LangId.GraphSnapMenuTitle,
  fallback: 'Navegação',
}

/** @deprecated Use GRAPH_NAVIGATION_MENU_TITLE */
export const GRAPH_SNAP_MENU_TITLE = GRAPH_NAVIGATION_MENU_TITLE

export const GRAPH_SNAP_ACTION_LANG: Record<GraphSnapActionId, GraphSnapMenuLabelDef> = {
  cursorToWorldOrigin: {
    langId: LangId.GraphSnapCursorToWorldOrigin,
    fallback: 'Cursor to World Origin',
  },
  cursorToSelected: {
    langId: LangId.GraphSnapCursorToSelected,
    fallback: 'Cursor to Selected',
  },
  cursorToCamera: {
    langId: LangId.GraphSnapCursorToCamera,
    fallback: 'Cursor to Camera',
  },
  cameraFocusSelection: {
    langId: LangId.GraphSnapCameraFocusSelection,
    fallback: 'Camera focus Selection',
  },
  cameraFocusCursor: {
    langId: LangId.GraphSnapCameraFocusCursor,
    fallback: 'Camera focus Cursor',
  },
  cameraFocusWorldOrigin: {
    langId: LangId.GraphSnapCameraFocusWorldOrigin,
    fallback: 'Camera focus World Origin',
  },
  selectionToCursor: {
    langId: LangId.GraphSnapSelectionToCursor,
    fallback: 'Selection to Cursor',
  },
  selectionToWorldOrigin: {
    langId: LangId.GraphSnapSelectionToWorldOrigin,
    fallback: 'Selection to World Origin',
  },
  selectionToCamera: {
    langId: LangId.GraphSnapSelectionToCamera,
    fallback: 'Selection to Camera',
  },
}

export function resolveGraphSnapActionLangId(action: GraphSnapActionId): number {
  return GRAPH_SNAP_ACTION_LANG[action].langId
}

export function listGraphSnapActionLangIds(): number[] {
  return GRAPH_SNAP_ACTIONS.map((entry) => GRAPH_SNAP_ACTION_LANG[entry.action].langId)
}
