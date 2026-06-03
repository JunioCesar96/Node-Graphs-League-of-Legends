import {
  copyTextToClipboard,
  getCurrentGalleryFile,
  resolveGalleryFullPath,
} from './galleryHelpers.js'

/**
 * Copia o caminho completo do ficheiro actual (usa Raiz / absolutePath da galeria).
 * @param {HTMLElement} cardDOM
 */
export default async function copyPath(cardDOM) {
  const entry = getCurrentGalleryFile(cardDOM)
  if (!entry) return

  const path = resolveGalleryFullPath(entry, cardDOM)
  if (!path) return

  await copyTextToClipboard(path)
}
