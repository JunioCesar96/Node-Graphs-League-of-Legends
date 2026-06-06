export function clampFloatingPanelViewportPosition(
  left: number,
  top: number,
  width: number,
  height: number,
  margin = 8,
): { left: number; top: number } {
  let x = left
  let y = top

  if (x < margin) {
    x = margin
  }
  if (y < margin) {
    y = margin
  }
  if (x + width > window.innerWidth - margin) {
    x = Math.max(margin, window.innerWidth - width - margin)
  }
  if (y + height > window.innerHeight - margin) {
    y = Math.max(margin, window.innerHeight - height - margin)
  }

  return { left: x, top: y }
}
