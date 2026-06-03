export const ADDON_DRAG_MIME = 'application/x-node-graphs-addon'

export function setAddonDragData(dataTransfer: DataTransfer, addonId: string): void {
  dataTransfer.setData(ADDON_DRAG_MIME, addonId)
  dataTransfer.setData('text/plain', addonId)
  dataTransfer.effectAllowed = 'copy'
}

export function resolveAddonDropFromDataTransfer(dataTransfer: DataTransfer): string | null {
  const fromMime = dataTransfer.getData(ADDON_DRAG_MIME).trim()
  if (fromMime) {
    return fromMime
  }
  const fromText = dataTransfer.getData('text/plain').trim()
  return fromText || null
}
