export type VfxWindowIsolationTarget = 'workspace' | 'timeline'

export type VfxWindowIsolationState = null | VfxWindowIsolationTarget

export const VFX_ISOLATION_REGION_ATTR = 'data-vfx-isolation-region'

export type VfxIsolationRegion = VfxWindowIsolationTarget

export type ResolveVfxIsolationTargetParams = {
  clientX: number
  clientY: number
  workspaceEl: HTMLElement | null
  timelineEl: HTMLElement | null
  shellEl: HTMLElement | null
  activeElement?: Element | null
  elementFromPoint?: (x: number, y: number) => Element | null
}

function containsElement(container: HTMLElement | null, target: Element | null): boolean {
  if (!container || !target) {
    return false
  }
  return container.contains(target)
}

function pointInRect(clientX: number, clientY: number, rect: DOMRect): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

/** Região pelo retângulo na tela — mais fiável que elementFromPoint na timeline. */
export function resolveVfxIsolationTargetFromBounds(
  clientX: number,
  clientY: number,
  workspaceEl: HTMLElement | null,
  timelineEl: HTMLElement | null,
): VfxWindowIsolationTarget | null {
  if (timelineEl) {
    const timelineRect = timelineEl.getBoundingClientRect()
    if (pointInRect(clientX, clientY, timelineRect)) {
      return 'timeline'
    }
  }

  if (workspaceEl) {
    const workspaceRect = workspaceEl.getBoundingClientRect()
    if (pointInRect(clientX, clientY, workspaceRect)) {
      return 'workspace'
    }
  }

  return null
}

function readIsolationRegionFromElement(element: Element | null): VfxWindowIsolationTarget | null {
  if (!(element instanceof HTMLElement)) {
    return null
  }

  const regionHost = element.closest(`[${VFX_ISOLATION_REGION_ATTR}]`)
  if (!(regionHost instanceof HTMLElement)) {
    return null
  }

  const region = regionHost.getAttribute(VFX_ISOLATION_REGION_ATTR)
  if (region === 'workspace' || region === 'timeline') {
    return region
  }

  return null
}

export function resolveVfxIsolationTarget(params: ResolveVfxIsolationTargetParams): VfxWindowIsolationTarget {
  const hitTest = params.elementFromPoint ?? ((x, y) => document.elementFromPoint(x, y))
  const hit = hitTest(params.clientX, params.clientY)

  const regionFromBounds = resolveVfxIsolationTargetFromBounds(
    params.clientX,
    params.clientY,
    params.workspaceEl,
    params.timelineEl,
  )
  if (regionFromBounds) {
    return regionFromBounds
  }

  const regionFromHit = readIsolationRegionFromElement(hit)
  if (regionFromHit) {
    return regionFromHit
  }

  if (containsElement(params.timelineEl, hit)) {
    return 'timeline'
  }

  if (containsElement(params.workspaceEl, hit)) {
    return 'workspace'
  }

  const regionFromFocus = readIsolationRegionFromElement(params.activeElement ?? null)
  if (regionFromFocus) {
    return regionFromFocus
  }

  if (containsElement(params.shellEl, hit)) {
    return 'workspace'
  }

  return 'workspace'
}
