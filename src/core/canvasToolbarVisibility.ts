export type CanvasToolbarToolId =
  | 'addNode'
  | 'undo'
  | 'redo'
  | 'camera'
  | 'zoom'
  | 'resetViewport'
  | 'resetScene'
  | 'inspector'
  | 'legend'
  | 'linkStatus'
  | 'navigateHint'
  | 'sceneNodes'

export type CanvasToolbarVisibility = Record<CanvasToolbarToolId, boolean>

export const DEFAULT_CANVAS_TOOLBAR_VISIBILITY: CanvasToolbarVisibility = {
  addNode: true,
  undo: true,
  redo: true,
  camera: true,
  zoom: true,
  resetViewport: true,
  resetScene: true,
  inspector: true,
  legend: false,
  linkStatus: true,
  navigateHint: true,
  sceneNodes: true,
}

export const CANVAS_TOOLBAR_TOOL_LABELS: Record<CanvasToolbarToolId, string> = {
  addNode: 'Adicionar nó',
  undo: 'Desfazer',
  redo: 'Refazer',
  camera: 'Câmera',
  zoom: 'Zoom',
  resetViewport: 'Repor vista',
  resetScene: 'Repor cena',
  inspector: 'Inspector',
  legend: 'Legenda',
  linkStatus: 'Estado de ligação',
  navigateHint: 'Modo mover na grade',
  sceneNodes: 'Nodes em cena',
}

export function formatToolbarVisibilityLabel(toolId: CanvasToolbarToolId, visible: boolean): string {
  const status = visible ? 'mostrando' : 'oculto'
  return `${CANVAS_TOOLBAR_TOOL_LABELS[toolId]} — ${status}`
}

export function toggleToolbarVisibility(
  current: CanvasToolbarVisibility,
  toolId: CanvasToolbarToolId,
): CanvasToolbarVisibility {
  return { ...current, [toolId]: !current[toolId] }
}
