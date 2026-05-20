import type { MouseEvent as ReactMouseEvent } from 'react'

/** Props para duplo clique no título retraír o elemento. */
export function elementTitleDoubleClickRetractProps(onRetract?: () => void): {
  onDoubleClick?: (event: ReactMouseEvent) => void
} {
  if (!onRetract) {
    return {}
  }

  return {
    onDoubleClick: (event) => {
      event.stopPropagation()
      event.preventDefault()
      onRetract()
    },
  }
}
