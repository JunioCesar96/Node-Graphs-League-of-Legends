/**
 * Helpers partilhados pelas acções do menu de contexto da galeria.
 */

/** @param {string} path */
export function normalizeGalleryPath(path) {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
}

/** @param {string} base */
export function prefersWindowsPathStyle(base) {
  return /\\/.test(base) || /^[A-Za-z]:/.test(base.trim())
}

const GALLERY_TEXTURE_EXTENSIONS = new Set(['.tex', '.dds', '.dss'])
const GALLERY_WEB_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.gif',
  '.tga',
])

function galleryPathExtension(path) {
  const value = String(path || '')
  const dot = value.lastIndexOf('.')
  return dot < 0 ? '' : value.slice(dot).toLowerCase()
}

/** @param {string} path */
export function isGalleryTexturePath(path) {
  const ext = galleryPathExtension(path)
  if (GALLERY_TEXTURE_EXTENSIONS.has(ext)) return true
  if (GALLERY_WEB_IMAGE_EXTENSIONS.has(ext)) return true
  return false
}

/** @param {string} path */
export function isAbsoluteGalleryPath(path) {
  const value = String(path || '').trim()
  if (!value) return false
  if (/^[A-Za-z]:[\\/]/.test(value)) return true
  if (value.startsWith('\\\\')) return true
  if (value.startsWith('/')) return true
  return false
}

/**
 * @param {string} base
 * @param {string} relative
 */
export function joinGalleryPath(base, relative) {
  const trimmedBase = String(base || '').trim()
  const rel = normalizeGalleryPath(relative).replace(/^\//, '')
  if (!trimmedBase) {
    return rel
  }
  const normalizedBase = normalizeGalleryPath(trimmedBase).replace(/\/$/, '')
  return rel ? `${normalizedBase}/${rel}` : normalizedBase
}

/**
 * @param {string} path
 * @param {string} [baseHint]
 */
export function formatGalleryPathForClipboard(path, baseHint = '') {
  const value = String(path || '').trim()
  if (!value) return ''
  if (prefersWindowsPathStyle(baseHint) || prefersWindowsPathStyle(value)) {
    return value.replace(/\//g, '\\')
  }
  return value
}

/**
 * @param {File | { file?: File, relativePath?: string }} entry
 */
export function unwrapGalleryFile(entry) {
  if (!entry) return null
  if (entry instanceof File) {
    return entry
  }
  return entry.file instanceof File ? entry.file : null
}

/**
 * @param {File | { file?: File, relativePath?: string }} entry
 */
export function galleryEntryRelativePath(entry) {
  if (!entry) return ''
  if (!(entry instanceof File) && entry.relativePath) {
    return normalizeGalleryPath(entry.relativePath)
  }
  if (!(entry instanceof File) && entry.absolutePath) {
    const abs = String(entry.absolutePath).replace(/\\/g, '/')
    const slash = abs.lastIndexOf('/')
    return slash >= 0 ? abs.slice(slash + 1) : abs
  }
  const file = unwrapGalleryFile(entry)
  if (!file) return ''
  return normalizeGalleryPath(file.webkitRelativePath || file.name || '')
}

/**
 * Pasta escolhida em «Abrir Pasta»: file.path menos webkitRelativePath.
 * @param {File | null | undefined} file
 */
export function inferGalleryOpenFolderPath(file) {
  if (!file) return ''

  const absPath = typeof file.path === 'string' ? file.path.trim() : ''
  const relative = normalizeGalleryPath(file.webkitRelativePath || file.name || '').replace(/^\//, '')
  if (!absPath) return ''
  if (!relative) return ''

  const normalizedAbs = absPath.replace(/\\/g, '/')
  if (normalizedAbs.endsWith('/' + relative) || normalizedAbs.endsWith(relative)) {
    const cut = normalizedAbs.endsWith('/' + relative)
      ? normalizedAbs.length - relative.length - 1
      : normalizedAbs.length - relative.length
    return normalizedAbs.slice(0, cut).replace(/\/$/, '')
  }

  const fileName = relative.includes('/') ? '' : relative
  if (fileName && (normalizedAbs.endsWith('/' + fileName) || normalizedAbs.endsWith(fileName))) {
    const cut = normalizedAbs.length - fileName.length - (normalizedAbs.endsWith('/' + fileName) ? 1 : 0)
    return normalizedAbs.slice(0, cut).replace(/\/$/, '')
  }

  const lowerAbs = normalizedAbs.toLowerCase()
  const lowerRel = relative.toLowerCase()
  if (lowerAbs.endsWith(lowerRel)) {
    return normalizedAbs.slice(0, normalizedAbs.length - relative.length).replace(/\/$/, '')
  }

  return ''
}

/**
 * @param {Array<File | { file: File, relativePath?: string }>} entries
 */
export function inferGalleryOpenFolderPathFromEntries(entries) {
  for (const entry of entries) {
    if (entry && !(entry instanceof File) && entry.absolutePath && entry.relativePath) {
      const abs = normalizeGalleryPath(entry.absolutePath)
      const rel = normalizeGalleryPath(entry.relativePath).replace(/^\//, '')
      if (rel && (abs.endsWith('/' + rel) || abs.endsWith(rel))) {
        const cut = abs.endsWith('/' + rel)
          ? abs.length - rel.length - 1
          : abs.length - rel.length
        return abs.slice(0, cut).replace(/\/$/, '')
      }
    }
    const base = inferGalleryOpenFolderPath(unwrapGalleryFile(entry))
    if (base) return base
  }
  return ''
}

/**
 * @param {Array<File | { file: File, relativePath?: string }>} files
 */
export function inferGalleryFolderRoot(files) {
  const paths = files
    .map((entry) => galleryEntryRelativePath(entry))
    .filter((path) => path.includes('/'))
  if (!paths.length) return ''

  const splitPaths = paths.map((path) => path.split('/'))
  const first = splitPaths[0]
  const shared = []
  for (let index = 0; index < first.length - 1; index++) {
    const segment = first[index]
    if (splitPaths.every((parts) => parts[index] === segment)) {
      shared.push(segment)
    } else {
      break
    }
  }
  return shared.join('/')
}

/**
 * @param {File | { file?: File, relativePath?: string }} entry
 * @param {HTMLElement} cardDOM
 */
export function resolveGalleryFullPath(entry, cardDOM) {
  const file = unwrapGalleryFile(entry)
  if (!file && !entry) return ''

  const storedAbsolute =
    entry && !(entry instanceof File) && entry.absolutePath
      ? String(entry.absolutePath).trim()
      : ''
  if (storedAbsolute) {
    return formatGalleryPathForClipboard(storedAbsolute, storedAbsolute)
  }

  const filePath = typeof file?.path === 'string' ? file.path.trim() : ''
  if (filePath) {
    return formatGalleryPathForClipboard(filePath, filePath)
  }

  const relative =
    entry && !(entry instanceof File) && entry.relativePath
      ? normalizeGalleryPath(entry.relativePath)
      : galleryEntryRelativePath(entry)
  const openFolder = String(cardDOM._galleryOpenFolderPath || '').trim()
  if (openFolder) {
    return formatGalleryPathForClipboard(joinGalleryPath(openFolder, relative), openFolder)
  }

  return relative
}

/**
 * @param {File | { file?: File, relativePath?: string }} entry
 */
export function resolveGalleryFileName(entry) {
  const relative = galleryEntryRelativePath(entry)
  const slash = relative.lastIndexOf('/')
  if (slash >= 0) {
    return relative.slice(slash + 1)
  }
  const file = unwrapGalleryFile(entry)
  return file?.name || relative
}

/**
 * @param {HTMLElement} cardDOM
 * @param {Record<string, unknown> | undefined} inputs
 */
export function readCurrentIndex(cardDOM, inputs) {
  if (inputs?.index !== undefined && inputs.index !== '') {
    return parseInt(String(inputs.index), 10)
  }
  const domIndex = cardDOM.querySelector('[name="index"]')?.value
  return parseInt(domIndex || '0', 10)
}

/** @param {HTMLElement} cardDOM */
export function safeGalleryIndex(cardDOM, rawIndex) {
  const images = cardDOM._imageUrls || []
  if (images.length === 0) return 0
  return Math.max(0, Math.min(rawIndex, images.length - 1))
}

/**
 * @param {HTMLElement} cardDOM
 * @param {string} selector
 * @param {string} datasetKey
 */
function galleryPathLabelEmptyText(cardDOM, selector, datasetKey) {
  if (cardDOM.dataset[datasetKey]) {
    return cardDOM.dataset[datasetKey]
  }
  const el = cardDOM.querySelector(selector)
  const fromDom = el?.getAttribute('data-empty-text')?.trim() || ''
  cardDOM.dataset[datasetKey] = fromDom
  return fromDom
}

/** @param {HTMLElement} cardDOM */
export function updateGalleryFolderPathLabel(cardDOM) {
  const rootEl = cardDOM.querySelector('[name="root-path"]')
  const activeEl = cardDOM.querySelector('[name="active-path"]')

  const root = String(cardDOM._galleryProjectRoot || '').trim()
  if (rootEl) {
    const rootEmpty = galleryPathLabelEmptyText(cardDOM, '[name="root-path"]', 'galleryEmptyRootText')
    if (root) {
      const display = formatGalleryPathForClipboard(root, root)
      rootEl.textContent = display
      rootEl.title = display
      rootEl.classList.add('is-set')
    } else {
      rootEl.textContent = rootEmpty
      rootEl.title = ''
      rootEl.classList.remove('is-set')
    }
  }

  if (!activeEl) return

  const activeEmpty = galleryPathLabelEmptyText(cardDOM, '[name="active-path"]', 'galleryEmptyActiveText')
  const activePath = String(cardDOM._galleryActiveDirectory || cardDOM._galleryOpenFolderPath || '').trim()

  if (activePath) {
    const display = formatGalleryPathForClipboard(activePath, activePath)
    activeEl.textContent = display
    activeEl.title = display
    activeEl.classList.add('is-set')
    return
  }

  activeEl.textContent = activeEmpty
  activeEl.title = ''
  activeEl.classList.remove('is-set')
}

/** @param {HTMLElement} cardDOM */
export function getCurrentGalleryFile(cardDOM) {
  const index = safeGalleryIndex(cardDOM, readCurrentIndex(cardDOM))
  const files = cardDOM._galleryFiles || []
  return files[index] ?? null
}

/** @param {string} text */
export async function copyTextToClipboard(text) {
  const value = String(text ?? '')
  if (!value) return

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
