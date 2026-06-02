import dockStyles from '@/styles/inspectorViewportDock.module.css'

export type DockTabKind =
  | 'block'
  | 'group'
  | 'node'
  | 'scene'
  | 'camera'
  | 'zoom'
  | 'addNode'
  | 'undo'
  | 'redo'
  | 'tools'

const GLYPH_CLASS_BY_KIND: Record<DockTabKind, string> = {
  block: dockStyles.dockTabGlyphBlock,
  group: dockStyles.dockTabGlyphGroup,
  node: dockStyles.dockTabGlyphNode,
  scene: dockStyles.dockTabGlyphScene,
  camera: dockStyles.dockTabGlyphCamera,
  zoom: dockStyles.dockTabGlyphZoom,
  addNode: dockStyles.dockTabGlyphAddNode,
  undo: dockStyles.dockTabGlyphUndo,
  redo: dockStyles.dockTabGlyphRedo,
  tools: dockStyles.dockTabGlyphTools,
}

type DockTabIconProps = {
  kind: DockTabKind
}

export function DockTabIcon({ kind }: DockTabIconProps) {
  return (
    <span
      aria-hidden
      className={[dockStyles.dockTabGlyph, GLYPH_CLASS_BY_KIND[kind]].join(' ')}
    />
  )
}

/** @deprecated use DockTabIcon */
export const InspectorDockTabIcon = DockTabIcon
export type InspectorDockKind = Extract<DockTabKind, 'block' | 'group' | 'node' | 'scene'>
