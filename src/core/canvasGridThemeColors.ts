export const CANVAS_GRID_THEME_LINE_VAR = '--canvas-grid-theme-line'
export const CANVAS_GRID_THEME_CHECKER_A_VAR = '--canvas-grid-theme-checker-a'
export const CANVAS_GRID_THEME_CHECKER_B_VAR = '--canvas-grid-theme-checker-b'

export type CanvasGridThemeColors = {
  horizontalLine: string
  verticalLine: string
  checkerA: string
  checkerB: string
}

const FALLBACK_THEME_COLORS: CanvasGridThemeColors = {
  horizontalLine: '#f4f4f5',
  verticalLine: '#f4f4f5',
  checkerA: '#1c2028',
  checkerB: '#282c34',
}

function rgbStringToHex(color: string): string | null {
  const modern = color.match(/rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (modern) {
    const [, red, green, blue] = modern
    return `#${[red, green, blue]
      .map((channel) => Number(channel).toString(16).padStart(2, '0'))
      .join('')}`
  }

  const legacy = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/)
  if (!legacy) {
    return null
  }

  const [, red, green, blue] = legacy
  return `#${[red, green, blue]
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

function readCssVarAsHex(cssVarName: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback
  }

  const probe = document.createElement('div')
  probe.style.setProperty('color', `var(${cssVarName})`)
  probe.style.display = 'none'
  document.documentElement.appendChild(probe)

  const resolved = getComputedStyle(probe).color
  document.documentElement.removeChild(probe)

  return rgbStringToHex(resolved) ?? fallback
}

export function readCanvasGridThemeColors(): CanvasGridThemeColors {
  const line = readCssVarAsHex(CANVAS_GRID_THEME_LINE_VAR, FALLBACK_THEME_COLORS.horizontalLine)

  return {
    horizontalLine: line,
    verticalLine: line,
    checkerA: readCssVarAsHex(CANVAS_GRID_THEME_CHECKER_A_VAR, FALLBACK_THEME_COLORS.checkerA),
    checkerB: readCssVarAsHex(CANVAS_GRID_THEME_CHECKER_B_VAR, FALLBACK_THEME_COLORS.checkerB),
  }
}

export function buildCanvasGridThemeLinePaint(opacityPercent: number): string {
  return `color-mix(in srgb, var(${CANVAS_GRID_THEME_LINE_VAR}) ${opacityPercent}%, transparent)`
}
