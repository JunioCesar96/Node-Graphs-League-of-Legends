const STORAGE_VFX_DOCK_TIMELINE_HEIGHT_KEY = 'vfx-dock-timeline-height'
const STORAGE_VFX_TIMELINE_LAYER_COLUMN_WIDTH_KEY = 'vfx-timeline-layer-column-width'

export const VFX_TIMELINE_LAYER_COLUMN_WIDTH_DEFAULT = 148
export const VFX_TIMELINE_LAYER_COLUMN_WIDTH_MIN = 96
export const VFX_TIMELINE_LAYER_COLUMN_WIDTH_MAX = 360

export function loadVfxDockTimelineHeight(): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_VFX_DOCK_TIMELINE_HEIGHT_KEY)
  if (!raw) {
    return null
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function saveVfxDockTimelineHeight(height: number): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_VFX_DOCK_TIMELINE_HEIGHT_KEY, String(Math.round(height)))
}

export function loadVfxTimelineLayerColumnWidth(): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_VFX_TIMELINE_LAYER_COLUMN_WIDTH_KEY)
  if (!raw) {
    return null
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function saveVfxTimelineLayerColumnWidth(width: number): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    STORAGE_VFX_TIMELINE_LAYER_COLUMN_WIDTH_KEY,
    String(Math.round(width)),
  )
}

export function clampVfxTimelineLayerColumnWidth(width: number): number {
  return Math.min(
    VFX_TIMELINE_LAYER_COLUMN_WIDTH_MAX,
    Math.max(VFX_TIMELINE_LAYER_COLUMN_WIDTH_MIN, Math.round(width)),
  )
}
