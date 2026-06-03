import { getCurrentGalleryFile, readCurrentIndex, safeGalleryIndex } from './galleryHelpers.js'

/**
 * Guarda a imagem actual da galeria (download).
 * @param {HTMLElement} cardDOM
 */
export default async function saveImage(cardDOM) {
  const index = safeGalleryIndex(cardDOM, readCurrentIndex(cardDOM))
  const url = cardDOM._imageUrls?.[index]
  const file = getCurrentGalleryFile(cardDOM)
  if (!url) return

  const response = await fetch(url)
  const blob = await response.blob()
  const ext = file?.name?.match(/\.[^.]+$/)?.[0] || '.png'
  const baseName = file?.name?.replace(/\.[^.]+$/, '') || `galeria-${index}`
  const downloadName = `${baseName}${ext === '.tex' || ext === '.dds' || ext === '.dss' ? '.png' : ext}`

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = downloadName
  link.click()
  URL.revokeObjectURL(link.href)
}
