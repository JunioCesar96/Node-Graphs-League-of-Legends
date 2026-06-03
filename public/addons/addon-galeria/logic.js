import { onContextMenuAction } from './contexMenu/index.js'
import {
  readCurrentIndex,
  unwrapGalleryFile,
  updateGalleryFolderPathLabel,
} from './contexMenu/galleryHelpers.js'
import {
  classifyGalleryTargetPath,
  loadGalleryCharactersList,
  resolveGalleryTargetPath,
} from './galleryPaths.js'
import {
  fetchGalleryEntryFile,
  isGalleryNativePickerAvailable,
  pickGalleryRootFolder,
  scanGalleryDirectory,
} from './galleryNativeFolder.js'
import {
  decodeGalleryFileToObjectUrl,
  isGalleryTextureEntry,
  revokeObjectUrls,
} from './lolTextures.js'

function galleryLoadingLabel(cardDOM) {
  if (cardDOM.dataset.galleryLoadingText) return cardDOM.dataset.galleryLoadingText
  const label =
    cardDOM.querySelector('[name="loading-text"]')?.textContent?.trim() ||
    cardDOM.querySelector('[name="loading-label"]')?.textContent?.trim()
  cardDOM.dataset.galleryLoadingText = label || 'A carregar…'
  return cardDOM.dataset.galleryLoadingText
}

function galleryNoImageLabel(cardDOM) {
  if (cardDOM.dataset.galleryNoImageText) return cardDOM.dataset.galleryNoImageText
  const el = cardDOM.querySelector('[name="no-image-text"]')
  const fromDom = el?.getAttribute('data-empty-text')?.trim() || el?.textContent?.trim() || ''
  cardDOM.dataset.galleryNoImageText = fromDom || 'Nenhuma imagem'
  return cardDOM.dataset.galleryNoImageText
}

/** @param {HTMLElement} cardDOM */
function setGalleryLoadingProgress(cardDOM, current, total) {
  const panel = cardDOM.querySelector('[name="loading-panel"]')
  const fill = cardDOM.querySelector('[name="loading-progress"]')
  const track = cardDOM.querySelector('.gallery-progress-track')
  const label = cardDOM.querySelector('[name="loading-label"]')
  const noImageTextEl = cardDOM.querySelector('[name="no-image-text"]')
  const displayEl = cardDOM.querySelector('[name="image-display"]')

  if (!(panel instanceof HTMLElement) || !(fill instanceof HTMLElement)) {
    return
  }

  if (displayEl) displayEl.style.display = 'none'
  if (noImageTextEl) noImageTextEl.style.display = 'none'

  panel.hidden = false
  const safeTotal = Math.max(0, total)
  const safeCurrent = Math.max(0, Math.min(current, safeTotal))
  const percent = safeTotal > 0 ? Math.round((safeCurrent / safeTotal) * 100) : 0

  fill.style.width = `${percent}%`
  if (track instanceof HTMLElement) {
    track.setAttribute('aria-valuenow', String(percent))
    track.setAttribute('aria-valuemax', '100')
  }

  if (label) {
    const base = galleryLoadingLabel(cardDOM)
    label.textContent = safeTotal > 0 ? `${base} ${safeCurrent}/${safeTotal}` : base
  }
}

/** @param {HTMLElement} cardDOM */
function hideGalleryLoadingPanel(cardDOM) {
  const panel = cardDOM.querySelector('[name="loading-panel"]')
  const fill = cardDOM.querySelector('[name="loading-progress"]')
  if (panel instanceof HTMLElement) {
    panel.hidden = true
  }
  if (fill instanceof HTMLElement) {
    fill.style.width = '0%'
  }
}

function readDomValue(cardDOM, name) {
  const el = cardDOM.querySelector(`[name="${name}"]`)
  if (!el) return ''
  if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
    return String(el.value ?? '').trim()
  }
  return ''
}

/**
 * @param {HTMLElement} cardDOM
 * @param {Record<string, unknown> | undefined} inputs
 */
function readGalleryConfig(cardDOM, inputs) {
  const character =
    inputs?.character !== undefined && inputs?.character !== ''
      ? String(inputs.character).trim()
      : readDomValue(cardDOM, 'character')

  const loadSourceRaw =
    inputs?.loadSource !== undefined && inputs?.loadSource !== ''
      ? String(inputs.loadSource).trim()
      : readDomValue(cardDOM, 'loadSource') || 'particles'

  const loadSource =
    loadSourceRaw === 'base' || loadSourceRaw === 'path' ? loadSourceRaw : 'particles'

  const pathValue =
    loadSource === 'path' && inputs?.path !== undefined && inputs?.path !== ''
      ? String(inputs.path).trim()
      : loadSource === 'path'
        ? String(inputs?.path ?? '').trim()
        : ''

  return {
    raiz: String(cardDOM._galleryProjectRoot || '').trim(),
    character,
    loadSource,
    path: pathValue,
  }
}

function galleryConfigSignature(config) {
  return `${config.raiz}|${config.character}|${config.loadSource}|${config.path}`
}

function syncPathSlotVisibility(cardDOM, loadSource) {
  const isPath = loadSource === 'path'

  const gridRow = cardDOM.querySelector('[data-addon-grid-row="path"]')
  if (gridRow instanceof HTMLElement) {
    gridRow.hidden = !isPath
    gridRow.style.display = isPath ? '' : 'none'
  }

  const pinHost = cardDOM.querySelector('[data-addon-slot-pin-host="path"]')
  if (pinHost instanceof HTMLElement) {
    pinHost.hidden = !isPath
    pinHost.style.display = isPath ? '' : 'none'
    if (isPath) {
      pinHost.removeAttribute('data-addon-slot-hidden')
    } else {
      pinHost.setAttribute('data-addon-slot-hidden', '1')
    }
  }
}

async function ensureCharactersDatalist(cardDOM) {
  const list = cardDOM.querySelector('#gallery-characters-list')
  if (!list) return

  if (!cardDOM._galleryCharactersCache) {
    cardDOM._galleryCharactersCache = await loadGalleryCharactersList()
  }

  const characters = cardDOM._galleryCharactersCache
  if (!characters.length) return

  if (list.childElementCount === characters.length) return

  list.replaceChildren(
    ...characters.map((name) => {
      const option = document.createElement('option')
      option.value = name
      return option
    }),
  )
}

function scheduleGalleryReload(cardDOM) {
  cardDOM._galleryConfigSig = ''
  const trigger =
    cardDOM.querySelector('#index-input') ||
    cardDOM.querySelector('[name="index"]') ||
    cardDOM.querySelector('#character-input') ||
    cardDOM.querySelector('[name="character"]')
  if (trigger instanceof HTMLElement) {
    trigger.dispatchEvent(new Event('input', { bubbles: true }))
    trigger.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

async function resolveGalleryEntryForDecode(entry) {
  let file = unwrapGalleryFile(entry)
  if (!file && entry?.absolutePath) {
    file = await fetchGalleryEntryFile(entry)
  }
  return file
}

async function loadGalleryEntries(cardDOM, entries, signature, options = {}) {
  const { activeDirectory = '', openFolderPath = '' } = options
  revokeObjectUrls(cardDOM._imageUrls)

  const sorted = entries
    .filter((entry) => isGalleryTextureEntry(entry))
    .sort((a, b) =>
      (a.relativePath || unwrapGalleryFile(a)?.name || '').localeCompare(
        b.relativePath || unwrapGalleryFile(b)?.name || '',
      ),
    )

  const total = sorted.length
  setGalleryLoadingProgress(cardDOM, 0, total)

  const urls = []
  const loadedFiles = []
  for (let index = 0; index < sorted.length; index++) {
    const entry = sorted[index]
    const file = await resolveGalleryEntryForDecode(entry)
    if (file) {
      const url = await decodeGalleryFileToObjectUrl(file)
      if (url) {
        urls.push(url)
        loadedFiles.push(entry)
      }
    }
    setGalleryLoadingProgress(cardDOM, index + 1, total)
  }

  hideGalleryLoadingPanel(cardDOM)

  cardDOM._folderSig = signature
  cardDOM._imageUrls = urls
  cardDOM._galleryFiles = loadedFiles
  cardDOM._galleryActiveDirectory = activeDirectory
  cardDOM._galleryOpenFolderPath = openFolderPath || activeDirectory

  updateGalleryFolderPathLabel(cardDOM)

  return urls.length > 0
}

async function reloadGalleryFromConfig(cardDOM, config) {
  if (!config.raiz) {
    revokeObjectUrls(cardDOM._imageUrls)
    cardDOM._imageUrls = []
    cardDOM._galleryFiles = []
    cardDOM._folderSig = ''
    cardDOM._galleryActiveDirectory = ''
    cardDOM._galleryOpenFolderPath = ''
    updateGalleryFolderPathLabel(cardDOM)
    return false
  }

  if (config.loadSource !== 'path' && !config.character) {
    return false
  }

  if (config.loadSource === 'path' && !config.path) {
    return false
  }

  const targetPath = resolveGalleryTargetPath(
    config.raiz,
    config.loadSource,
    config.character,
    config.path,
  )
  if (!targetPath) {
    return false
  }

  if (!(await isGalleryNativePickerAvailable())) {
    return false
  }

  const scanned = await scanGalleryDirectory(targetPath)
  if (!scanned?.entries?.length) {
    cardDOM._galleryActiveDirectory = targetPath
    cardDOM._galleryOpenFolderPath = targetPath
    updateGalleryFolderPathLabel(cardDOM)
    return false
  }

  const kind = classifyGalleryTargetPath(targetPath)
  const signature = `scan:${targetPath}:${scanned.entries.length}:${kind}`
  return loadGalleryEntries(cardDOM, scanned.entries, signature, {
    activeDirectory: scanned.base,
    openFolderPath: scanned.base,
  })
}

async function pickAndStoreRootFolder(cardDOM) {
  if (!(await isGalleryNativePickerAvailable())) {
    return false
  }

  const root = await pickGalleryRootFolder()
  if (!root) {
    return false
  }

  cardDOM._galleryProjectRoot = root
  updateGalleryFolderPathLabel(cardDOM)
  cardDOM._galleryConfigSig = ''
  return true
}

function ensureGalleryDomBindings(cardDOM) {
  if (cardDOM._galleryDelegationBound) return
  cardDOM._galleryDelegationBound = true

  cardDOM.addEventListener(
    'click',
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const rootBtn = target.closest('[name="root-folder"]')
      if (!rootBtn || !cardDOM.contains(rootBtn)) return

      event.preventDefault()
      event.stopPropagation()

      void (async () => {
        const picked = await pickAndStoreRootFolder(cardDOM)
        if (!picked) return
        cardDOM._galleryConfigSig = ''
        const config = readGalleryConfig(cardDOM, undefined)
        updateGalleryFolderPathLabel(cardDOM)
        await reloadGalleryFromConfig(cardDOM, config)
        updateGalleryView(cardDOM, 0)
        scheduleGalleryReload(cardDOM)
      })()
    },
    true,
  )

  cardDOM.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || !cardDOM.contains(target)) return

    if (target.getAttribute('name') === 'loadSource') {
      syncPathSlotVisibility(
        cardDOM,
        target instanceof HTMLSelectElement ? target.value : 'particles',
      )
    }

    if (target.getAttribute('name') === 'character' || target.getAttribute('name') === 'loadSource') {
      scheduleGalleryReload(cardDOM)
    }
  })

  cardDOM.addEventListener('input', (event) => {
    const target = event.target
    if (
      target instanceof HTMLInputElement &&
      target.getAttribute('name') === 'character' &&
      cardDOM.contains(target)
    ) {
      scheduleGalleryReload(cardDOM)
    }
  })
}

function updateGalleryView(cardDOM, rawIndex) {
  const images = cardDOM._imageUrls || []
  const displayEl = cardDOM.querySelector('[name="image-display"]')
  const noImageTextEl = cardDOM.querySelector('[name="no-image-text"]')

  hideGalleryLoadingPanel(cardDOM)

  if (images.length === 0) {
    if (displayEl) displayEl.style.display = 'none'
    if (noImageTextEl) {
      noImageTextEl.textContent = galleryNoImageLabel(cardDOM)
      noImageTextEl.style.display = 'block'
    }
    return { currentImage: '' }
  }

  const safeIndex = Math.max(0, Math.min(rawIndex, images.length - 1))
  const indexInputEl = cardDOM.querySelector('[name="index"]')
  if (indexInputEl && parseInt(indexInputEl.value, 10) !== safeIndex) {
    indexInputEl.value = String(safeIndex)
  }

  const selectedImage = images[safeIndex]
  if (displayEl) {
    displayEl.src = selectedImage
    displayEl.style.display = 'block'
  }
  if (noImageTextEl) noImageTextEl.style.display = 'none'

  return { currentImage: selectedImage }
}

async function execute(inputs, cardDOM) {
  if (!cardDOM._galleryInitialized) {
    cardDOM._galleryInitialized = true
    cardDOM._imageUrls = []
    cardDOM._galleryFiles = []
    cardDOM._folderSig = ''
    cardDOM._galleryProjectRoot = ''
    cardDOM._galleryActiveDirectory = ''
    cardDOM._galleryOpenFolderPath = ''
    cardDOM._galleryConfigSig = ''
  }

  ensureGalleryDomBindings(cardDOM)
  await ensureCharactersDatalist(cardDOM)

  const config = readGalleryConfig(cardDOM, inputs)
  syncPathSlotVisibility(cardDOM, config.loadSource)
  updateGalleryFolderPathLabel(cardDOM)

  const sig = galleryConfigSignature(config)
  if (sig !== cardDOM._galleryConfigSig) {
    cardDOM._galleryConfigSig = sig
    const loaded = await reloadGalleryFromConfig(cardDOM, config)
    if (loaded) {
      const indexInput = cardDOM.querySelector('[name="index"]')
      if (indexInput) indexInput.value = '0'
    }
  }

  return updateGalleryView(cardDOM, readCurrentIndex(cardDOM, inputs))
}

export const logic = { execute, onContextMenuAction }
