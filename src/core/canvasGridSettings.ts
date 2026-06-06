export const DEFAULT_CANVAS_GRID_SIZE = 32
export const DEFAULT_CANVAS_GRID_OPACITY = 7
export const MIN_CANVAS_GRID_SIZE = 16
export const MAX_CANVAS_GRID_SIZE = 80
export const MIN_CANVAS_GRID_OPACITY = 0
export const MAX_CANVAS_GRID_OPACITY = 40

import {
  buildCanvasGridThemeLinePaint,
  CANVAS_GRID_THEME_CHECKER_A_VAR,
  CANVAS_GRID_THEME_CHECKER_B_VAR,
} from '@/core/canvasGridThemeColors'

export type CanvasGridChrome = {
  showCanvasGrid?: boolean
  canvasGridSize?: number
  canvasGridOpacity?: number
  canvasGridLineColorEnabled?: boolean
  canvasGridHorizontalLineColor?: string
  canvasGridVerticalLineColor?: string
  canvasGridCheckerEnabled?: boolean
  canvasGridCheckerColorA?: string
  canvasGridCheckerColorB?: string
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export function resolveCanvasGridSize(raw: unknown): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CANVAS_GRID_SIZE
  }
  return Math.min(MAX_CANVAS_GRID_SIZE, Math.max(MIN_CANVAS_GRID_SIZE, Math.round(parsed)))
}

export function resolveCanvasGridOpacity(raw: unknown): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CANVAS_GRID_OPACITY
  }
  return Math.min(MAX_CANVAS_GRID_OPACITY, Math.max(MIN_CANVAS_GRID_OPACITY, Math.round(parsed)))
}

export function resolveCanvasGridHexColor(
  raw: unknown,
  fallback: string,
): string {
  if (typeof raw !== 'string') {
    return fallback
  }

  const normalized = raw.trim().toLowerCase()

  return HEX_COLOR_PATTERN.test(normalized) ? normalized : fallback
}

export function canvasGridHexToRgba(hex: string, alpha: number): string {
  const normalized = resolveCanvasGridHexColor(hex, '#000000')
  const clampedAlpha = Math.min(1, Math.max(0, alpha))
  const red = Number.parseInt(normalized.slice(1, 3), 16)
  const green = Number.parseInt(normalized.slice(3, 5), 16)
  const blue = Number.parseInt(normalized.slice(5, 7), 16)

  return `rgb(${red} ${green} ${blue} / ${clampedAlpha})`
}

export function parseCanvasGridChrome(raw: unknown): CanvasGridChrome | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }

  const record = raw as Record<string, unknown>
  const showCanvasGrid = record.showCanvasGrid === false ? false : undefined
  const canvasGridSize =
    record.canvasGridSize !== undefined ? resolveCanvasGridSize(record.canvasGridSize) : undefined
  const canvasGridOpacity =
    record.canvasGridOpacity !== undefined
      ? resolveCanvasGridOpacity(record.canvasGridOpacity)
      : undefined
  const canvasGridLineColorEnabled =
    record.canvasGridLineColorEnabled === true ? true : undefined
  const canvasGridHorizontalLineColor =
    typeof record.canvasGridHorizontalLineColor === 'string'
      ? resolveCanvasGridHexColor(record.canvasGridHorizontalLineColor, '#ffffff')
      : undefined
  const canvasGridVerticalLineColor =
    typeof record.canvasGridVerticalLineColor === 'string'
      ? resolveCanvasGridHexColor(record.canvasGridVerticalLineColor, '#ffffff')
      : undefined
  const canvasGridCheckerEnabled = record.canvasGridCheckerEnabled === true ? true : undefined
  const canvasGridCheckerColorA =
    typeof record.canvasGridCheckerColorA === 'string'
      ? resolveCanvasGridHexColor(record.canvasGridCheckerColorA, '#000000')
      : undefined
  const canvasGridCheckerColorB =
    typeof record.canvasGridCheckerColorB === 'string'
      ? resolveCanvasGridHexColor(record.canvasGridCheckerColorB, '#ffffff')
      : undefined

  const hasGridSize = canvasGridSize !== undefined && canvasGridSize !== DEFAULT_CANVAS_GRID_SIZE
  const hasGridOpacity =
    canvasGridOpacity !== undefined && canvasGridOpacity !== DEFAULT_CANVAS_GRID_OPACITY
  const hasHorizontalLineColor = canvasGridHorizontalLineColor !== undefined
  const hasVerticalLineColor = canvasGridVerticalLineColor !== undefined
  const hasCheckerColorA = canvasGridCheckerColorA !== undefined
  const hasCheckerColorB = canvasGridCheckerColorB !== undefined

  if (
    showCanvasGrid === undefined &&
    !hasGridSize &&
    !hasGridOpacity &&
    canvasGridLineColorEnabled === undefined &&
    !hasHorizontalLineColor &&
    !hasVerticalLineColor &&
    canvasGridCheckerEnabled === undefined &&
    !hasCheckerColorA &&
    !hasCheckerColorB
  ) {
    return undefined
  }

  return {
    ...(showCanvasGrid === false ? { showCanvasGrid: false } : {}),
    ...(hasGridSize ? { canvasGridSize } : {}),
    ...(hasGridOpacity ? { canvasGridOpacity } : {}),
    ...(canvasGridLineColorEnabled ? { canvasGridLineColorEnabled: true } : {}),
    ...(hasHorizontalLineColor ? { canvasGridHorizontalLineColor } : {}),
    ...(hasVerticalLineColor ? { canvasGridVerticalLineColor } : {}),
    ...(canvasGridCheckerEnabled ? { canvasGridCheckerEnabled: true } : {}),
    ...(hasCheckerColorA ? { canvasGridCheckerColorA } : {}),
    ...(hasCheckerColorB ? { canvasGridCheckerColorB } : {}),
  }
}

export type ResolvedCanvasGridPresentation = {
  showCanvasGrid: boolean
  canvasGridSize: number
  canvasGridOpacity: number
  canvasGridLineColorEnabled: boolean
  canvasGridHorizontalLineColor?: string
  canvasGridVerticalLineColor?: string
  canvasGridCheckerEnabled: boolean
  canvasGridCheckerColorA?: string
  canvasGridCheckerColorB?: string
  resolvedCheckerColorA: string
  resolvedCheckerColorB: string
  horizontalLinePaint: string
  verticalLinePaint: string
}

export function resolveCanvasGridPresentation(chrome: CanvasGridChrome | undefined): ResolvedCanvasGridPresentation {
  const canvasGridSize = resolveCanvasGridSize(chrome?.canvasGridSize)
  const canvasGridOpacity = resolveCanvasGridOpacity(chrome?.canvasGridOpacity)
  const customHorizontalLineColor =
    typeof chrome?.canvasGridHorizontalLineColor === 'string'
      ? resolveCanvasGridHexColor(chrome.canvasGridHorizontalLineColor, '#ffffff')
      : undefined
  const customVerticalLineColor =
    typeof chrome?.canvasGridVerticalLineColor === 'string'
      ? resolveCanvasGridHexColor(chrome.canvasGridVerticalLineColor, '#ffffff')
      : undefined
  const customCheckerColorA =
    typeof chrome?.canvasGridCheckerColorA === 'string'
      ? resolveCanvasGridHexColor(chrome.canvasGridCheckerColorA, '#000000')
      : undefined
  const customCheckerColorB =
    typeof chrome?.canvasGridCheckerColorB === 'string'
      ? resolveCanvasGridHexColor(chrome.canvasGridCheckerColorB, '#ffffff')
      : undefined
  const lineAlpha = canvasGridOpacity / 100
  const themeLinePaint = buildCanvasGridThemeLinePaint(canvasGridOpacity)

  return {
    showCanvasGrid: chrome?.showCanvasGrid !== false,
    canvasGridSize,
    canvasGridOpacity,
    canvasGridLineColorEnabled: chrome?.canvasGridLineColorEnabled === true,
    canvasGridHorizontalLineColor: customHorizontalLineColor,
    canvasGridVerticalLineColor: customVerticalLineColor,
    canvasGridCheckerEnabled: chrome?.canvasGridCheckerEnabled === true,
    canvasGridCheckerColorA: customCheckerColorA,
    canvasGridCheckerColorB: customCheckerColorB,
    horizontalLinePaint: customHorizontalLineColor
      ? canvasGridHexToRgba(customHorizontalLineColor, lineAlpha)
      : themeLinePaint,
    verticalLinePaint: customVerticalLineColor
      ? canvasGridHexToRgba(customVerticalLineColor, lineAlpha)
      : themeLinePaint,
    resolvedCheckerColorA:
      customCheckerColorA ?? `var(${CANVAS_GRID_THEME_CHECKER_A_VAR})`,
    resolvedCheckerColorB:
      customCheckerColorB ?? `var(${CANVAS_GRID_THEME_CHECKER_B_VAR})`,
  }
}
