import { LangId } from './languageIds'

export type GraphGridSnapMenuLabelDef = {
  fallback: string
  langId: number
}

/** Título do menu Snap do context menu da grade (Shift+G). */
export const GRAPH_GRID_CONTEXT_MENU_TITLE: GraphGridSnapMenuLabelDef = {
  langId: LangId.GraphGridContextMenuTitle,
  fallback: 'Menu da Grade',
}

/** Opção «Voltar» nos submenus do Snap Menu. */
export const SNAP_MENU_BACK_LABEL: GraphGridSnapMenuLabelDef = {
  langId: LangId.SnapMenuBack,
  fallback: 'Voltar',
}
