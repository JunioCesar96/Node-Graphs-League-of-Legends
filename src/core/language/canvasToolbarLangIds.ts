import { LangId } from './languageIds'
import type { CanvasToolbarToolId } from '@/core/canvasToolbarVisibility'

export const CANVAS_TOOLBAR_LANG_IDS: Record<CanvasToolbarToolId, number> = {
  addNode: LangId.GraphToolbarAddNode,
  undo: LangId.GraphToolbarUndo,
  redo: LangId.GraphToolbarRedo,
  camera: LangId.GraphToolbarCamera,
  zoom: LangId.GraphToolbarZoom,
  resetViewport: LangId.GraphToolbarResetViewport,
  resetScene: LangId.GraphToolbarResetScene,
  inspector: LangId.NodeInspectorEyebrow,
  legend: LangId.GraphToolbarLegend,
  linkStatus: LangId.GraphToolbarLinkStatus,
  navigateHint: LangId.GraphToolbarNavigateHint,
  sceneNodes: LangId.SceneNodesTitle,
}
