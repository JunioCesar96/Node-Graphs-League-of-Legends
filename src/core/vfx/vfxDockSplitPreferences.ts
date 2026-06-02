const STORAGE_VFX_DOCK_TIMELINE_HEIGHT_KEY = 'vfx-dock-timeline-height'

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
