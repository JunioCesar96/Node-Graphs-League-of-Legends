export type CodeDockFloatingRect = {
  /** px */
  height: number
  /** viewport px */
  left: number
  /** viewport px */
  top: number
  /** px */
  width: number
}

const FLOAT_MIN_HEIGHT = 220
const FLOAT_MIN_WIDTH = 280
const DEFAULT_FLOAT_WIDTH = 480
const DEFAULT_FLOAT_HEIGHT = 520

export function createDefaultFloatingCodeDockRect(): CodeDockFloatingRect {
  const vw =
    typeof globalThis.window !== 'undefined' ? Math.max(globalThis.window.innerWidth, 320) : DEFAULT_FLOAT_WIDTH + 48
  const vh =
    typeof globalThis.window !== 'undefined' ? Math.max(globalThis.window.innerHeight, 240) : DEFAULT_FLOAT_HEIGHT + 48

  const width = Math.min(DEFAULT_FLOAT_WIDTH, vw - 32)
  const height = Math.min(DEFAULT_FLOAT_HEIGHT, vh - 32)

  return {
    height,
    width,
    left: Math.max(8, vw - width - 24),
    top: Math.max(8, Math.round((vh - height) / 2)),
  }
}

/** Limita ao viewport mantendo mins. */
export function clampFloatingDockRect(rect: CodeDockFloatingRect): CodeDockFloatingRect {
  if (typeof globalThis.window === 'undefined') {
    return rect
  }

  const vw = Math.max(globalThis.window.innerWidth, FLOAT_MIN_WIDTH + 24)
  const vh = Math.max(globalThis.window.innerHeight, FLOAT_MIN_HEIGHT + 24)

  let width = Math.min(Math.max(rect.width, FLOAT_MIN_WIDTH), vw - 16)
  let height = Math.min(Math.max(rect.height, FLOAT_MIN_HEIGHT), vh - 16)

  width = Math.min(width, vw - 16)
  height = Math.min(height, vh - 16)

  let left = rect.left
  let top = rect.top

  left = Math.min(Math.max(left, 8), vw - width - 8)
  top = Math.min(Math.max(top, 8), vh - height - 8)

  return {
    height: Math.round(height),
    width: Math.round(width),
    left: Math.round(left),
    top: Math.round(top),
  }
}
