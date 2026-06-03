import { isGalleryTexturePath, normalizeGalleryPath } from './contexMenu/galleryHelpers.js'

export const GALLERY_LOAD_SOURCES = ['particles', 'base', 'path']

/**
 * @param {string} raiz
 * @param {'particles' | 'base' | 'path'} loadSource
 * @param {string} character
 * @param {string} pathInput
 */
export function resolveGalleryTargetPath(raiz, loadSource, character, pathInput) {
  const root = String(raiz || '').trim()
  if (!root) return ''

  const normalizedRoot = normalizeGalleryPath(root).replace(/\/$/, '')
  const char = String(character || '').trim()
  if (loadSource === 'particles') {
    if (!char) return ''
    return `${normalizedRoot}/ASSETS/Characters/${char}/Skins/Base/Particles`
  }
  if (loadSource === 'base') {
    if (!char) return ''
    return `${normalizedRoot}/ASSETS/Characters/${char}/Skins/Base`
  }

  const rel = normalizeGalleryPath(pathInput).replace(/^\//, '')
  if (!rel) return ''

  if (/^[A-Za-z]:\//.test(rel) || rel.startsWith('//')) {
    return rel
  }

  return `${normalizedRoot}/${rel}`
}

/**
 * @param {string} targetPath
 * @returns {'file' | 'directory' | ''}
 */
export function classifyGalleryTargetPath(targetPath) {
  const value = String(targetPath || '').trim()
  if (!value) return ''
  if (isGalleryTexturePath(value)) return 'file'
  return 'directory'
}

/**
 * @returns {Promise<string[]>}
 */
export async function loadGalleryCharactersList() {
  try {
    const response = await fetch('/addons/addon-galeria/characters.json')
    if (!response.ok) return []
    const data = await response.json()
    if (Array.isArray(data)) {
      return data.map((item) => String(item).trim()).filter(Boolean)
    }
    if (Array.isArray(data?.characters)) {
      return data.characters.map((item) => String(item).trim()).filter(Boolean)
    }
    return []
  } catch {
    return []
  }
}
