import copyName from './copyName.js'
import copyPath from './copyPath.js'
import saveImage from './saveImage.js'

/** Mapa action (manifest) → handler(cardDOM). */
export const contextMenuActions = {
  saveImage,
  copyPath,
  copyName,
}
/**
 * @param {string} action
 * @param {HTMLElement} cardDOM
 * @param {{ menuName: string }} context
 */
export async function onContextMenuAction(action, cardDOM, context) {
  if (context.menuName !== 'img') return
  const handler = contextMenuActions[action]
  if (typeof handler === 'function') {
    await handler(cardDOM)
  }
}
