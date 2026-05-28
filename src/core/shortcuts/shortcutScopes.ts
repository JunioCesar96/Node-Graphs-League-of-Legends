/** Zona UI onde atalhos de workspace podem executar. */
export const SHORTCUT_SCOPE_GRAPH_CANVAS = 'graph-canvas' as const
export const SHORTCUT_SCOPE_CODE_DOCK = 'code-dock' as const
export const SHORTCUT_SCOPE_VFX_VIEWPORT = 'vfx-viewport' as const
export const SHORTCUT_SCOPE_NODE_PALETTE = 'node-palette' as const

export type ShortcutScopeId =
  | typeof SHORTCUT_SCOPE_GRAPH_CANVAS
  | typeof SHORTCUT_SCOPE_CODE_DOCK
  | typeof SHORTCUT_SCOPE_VFX_VIEWPORT
  | typeof SHORTCUT_SCOPE_NODE_PALETTE

export const SHORTCUT_SCOPE_ATTR = 'data-shortcut-scope'

/** Docks/painéis que precisam estar abertos (`requiresOpen` no registry). */
export const SHORTCUT_DOCK_VFX = 'vfx-dock' as const
export const SHORTCUT_DOCK_CODE = 'code-dock' as const
export const SHORTCUT_DOCK_NODE_PALETTE = 'node-palette' as const

export type ShortcutDockId =
  | typeof SHORTCUT_DOCK_VFX
  | typeof SHORTCUT_DOCK_CODE
  | typeof SHORTCUT_DOCK_NODE_PALETTE

export const DEFAULT_SHORTCUT_SCOPE: ShortcutScopeId = SHORTCUT_SCOPE_GRAPH_CANVAS
