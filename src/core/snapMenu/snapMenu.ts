export type SnapMenuActionDefinition = {
  id: string
  label: string
  shortcut: string
  disabled?: boolean
  submenu?: readonly SnapMenuActionDefinition[]
}

export type SnapMenuLayoutItem = SnapMenuActionDefinition & {
  angleDeg: number
  vertexIndex: number
}

export type SnapMenuLayoutOptions = {
  startAngleDeg?: number
  vertexCount?: number
  skipVertexIndex?: number
  deadZonePx?: number
  itemWidthPx?: number
  itemGapPx?: number
  minOrbitRadiusPx?: number
}

export const SNAP_MENU_START_ANGLE_DEG = -90
export const SNAP_MENU_POLYGON_VERTEX_COUNT = 10
/** Vértice inferior livre — evita sobreposição com a faixa central. */
export const SNAP_MENU_POLYGON_SKIP_VERTEX_INDEX = 5
export const SNAP_MENU_DEAD_ZONE_PX = 21
export const SNAP_MENU_ITEM_WIDTH_PX = 126
export const SNAP_MENU_ITEM_GAP_PX = 14
export const SNAP_MENU_MIN_ORBIT_RADIUS_PX = 84

const DEFAULT_LAYOUT_OPTIONS: Required<SnapMenuLayoutOptions> = {
  startAngleDeg: SNAP_MENU_START_ANGLE_DEG,
  vertexCount: SNAP_MENU_POLYGON_VERTEX_COUNT,
  skipVertexIndex: SNAP_MENU_POLYGON_SKIP_VERTEX_INDEX,
  deadZonePx: SNAP_MENU_DEAD_ZONE_PX,
  itemWidthPx: SNAP_MENU_ITEM_WIDTH_PX,
  itemGapPx: SNAP_MENU_ITEM_GAP_PX,
  minOrbitRadiusPx: SNAP_MENU_MIN_ORBIT_RADIUS_PX,
}

function resolveLayoutOptions(options?: SnapMenuLayoutOptions): Required<SnapMenuLayoutOptions> {
  return {
    ...DEFAULT_LAYOUT_OPTIONS,
    ...options,
  }
}

export function resolveSnapMenuLayoutForActionCount(
  actionCount: number,
): Required<Pick<SnapMenuLayoutOptions, 'vertexCount' | 'skipVertexIndex'>> {
  const vertexCount = Math.max(actionCount + 1, 3)
  const skipVertexIndex = Math.floor(vertexCount / 2)

  return { vertexCount, skipVertexIndex }
}

export function resolveSnapMenuPolygonVertexAngleDeg(
  vertexIndex: number,
  vertexCount = SNAP_MENU_POLYGON_VERTEX_COUNT,
  startAngleDeg = SNAP_MENU_START_ANGLE_DEG,
): number {
  return startAngleDeg + vertexIndex * (360 / vertexCount)
}

export function listSnapMenuPolygonVertexIndices(
  vertexCount = SNAP_MENU_POLYGON_VERTEX_COUNT,
  skipVertexIndex = SNAP_MENU_POLYGON_SKIP_VERTEX_INDEX,
): number[] {
  const indices: number[] = []

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    if (vertexIndex === skipVertexIndex) {
      continue
    }

    indices.push(vertexIndex)
  }

  return indices
}

export function buildSnapMenuLayout(
  actions: readonly SnapMenuActionDefinition[],
  options?: SnapMenuLayoutOptions,
): SnapMenuLayoutItem[] {
  const autoLayout = resolveSnapMenuLayoutForActionCount(actions.length)
  const layout = resolveLayoutOptions({
    ...autoLayout,
    ...options,
  })
  const vertexIndices = listSnapMenuPolygonVertexIndices(
    layout.vertexCount,
    layout.skipVertexIndex,
  )

  if (actions.length === 0 || vertexIndices.length === 0) {
    return []
  }

  if (actions.length !== vertexIndices.length) {
    throw new Error(
      `Snap menu layout expects ${vertexIndices.length} actions for a ${layout.vertexCount}-gon, received ${actions.length}.`,
    )
  }

  return actions.map((entry, index) => {
    const vertexIndex = vertexIndices[index] ?? index

    return {
      ...entry,
      vertexIndex,
      angleDeg: resolveSnapMenuPolygonVertexAngleDeg(
        vertexIndex,
        layout.vertexCount,
        layout.startAngleDeg,
      ),
    }
  })
}

export function buildSnapMenuPolygonPoints(
  radiusPx: number,
  options?: SnapMenuLayoutOptions,
): ReadonlyArray<{ x: number; y: number }> {
  const layout = resolveLayoutOptions(options)

  return Array.from({ length: layout.vertexCount }, (_, vertexIndex) => {
    const angleRad =
      (resolveSnapMenuPolygonVertexAngleDeg(
        vertexIndex,
        layout.vertexCount,
        layout.startAngleDeg,
      ) *
        Math.PI) /
      180

    return {
      x: Math.cos(angleRad) * radiusPx,
      y: Math.sin(angleRad) * radiusPx,
    }
  })
}

export function resolveSnapMenuOrbitRadiusPx(options?: SnapMenuLayoutOptions): number {
  const layout = resolveLayoutOptions(options)

  if (layout.vertexCount <= 1) {
    return layout.minOrbitRadiusPx
  }

  const stepDeg = 360 / layout.vertexCount
  const chordTarget = layout.itemWidthPx + layout.itemGapPx
  const minRadius = chordTarget / (2 * Math.sin((stepDeg * Math.PI) / 360))

  return Math.max(layout.minOrbitRadiusPx, Math.round(minRadius))
}

function normalizeAngleDelta(pointerAngleDeg: number, targetAngleDeg: number): number {
  let delta = pointerAngleDeg - targetAngleDeg

  while (delta > 180) {
    delta -= 360
  }

  while (delta < -180) {
    delta += 360
  }

  return delta
}

export function resolveSnapMenuItemFromPointerDelta(
  dx: number,
  dy: number,
  menuLayout: readonly SnapMenuLayoutItem[],
  options?: SnapMenuLayoutOptions,
): string | null {
  const layout = resolveLayoutOptions(options)
  const distance = Math.hypot(dx, dy)

  if (distance < layout.deadZonePx || menuLayout.length === 0) {
    return null
  }

  const pointerAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const halfSliceDeg = 180 / layout.vertexCount

  let bestItemId: string | null = null
  let bestDelta = Number.POSITIVE_INFINITY

  for (const item of menuLayout) {
    const delta = Math.abs(normalizeAngleDelta(pointerAngleDeg, item.angleDeg))

    if (delta <= halfSliceDeg && delta < bestDelta) {
      bestDelta = delta
      bestItemId = item.id
    }
  }

  return bestItemId
}

export function resolveSnapMenuItemFromShortcut(
  shortcut: string,
  actions: readonly SnapMenuActionDefinition[],
): string | null {
  const entry = actions.find((item) => item.shortcut === shortcut)

  return entry?.id ?? null
}
