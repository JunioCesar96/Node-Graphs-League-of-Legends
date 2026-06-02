export const VFX_DOCK_SPLIT_HANDLE_HEIGHT = 6
export const VFX_DOCK_MIN_WORKSPACE_HEIGHT = 140
export const VFX_DOCK_DEFAULT_TIMELINE_HEIGHT = 220
/** Fallback quando a barra de transporte ainda não foi medida. */
export const VFX_DOCK_FALLBACK_TRANSPORT_MIN_HEIGHT = 72

export type ClampVfxDockTimelineHeightParams = {
  requestedHeight: number
  splitHeight: number
  minTimelineHeight: number
  minWorkspaceHeight?: number
  handleHeight?: number
}

export function clampVfxDockTimelineHeight({
  requestedHeight,
  splitHeight,
  minTimelineHeight,
  minWorkspaceHeight = VFX_DOCK_MIN_WORKSPACE_HEIGHT,
  handleHeight = VFX_DOCK_SPLIT_HANDLE_HEIGHT,
}: ClampVfxDockTimelineHeightParams): number {
  const maxTimelineHeight = Math.max(
    minTimelineHeight,
    splitHeight - minWorkspaceHeight - handleHeight,
  )
  return Math.min(maxTimelineHeight, Math.max(minTimelineHeight, requestedHeight))
}

export function resolveDefaultVfxDockTimelineHeight(
  splitHeight: number,
  minTimelineHeight: number,
): number {
  const preferred = Math.round(splitHeight * 0.38)
  return clampVfxDockTimelineHeight({
    requestedHeight: Math.max(preferred, VFX_DOCK_DEFAULT_TIMELINE_HEIGHT),
    splitHeight,
    minTimelineHeight,
  })
}
