import { copyTextToClipboard, getCurrentGalleryFile, resolveGalleryFileName } from './galleryHelpers.js'

/**
 * Copia só o nome do ficheiro da imagem actual.
 * @param {HTMLElement} cardDOM
 */
export default async function copyName(cardDOM) {
  const file = getCurrentGalleryFile(cardDOM)
  if (!file) return
  const name = resolveGalleryFileName(file)
  await copyTextToClipboard(name)
}
