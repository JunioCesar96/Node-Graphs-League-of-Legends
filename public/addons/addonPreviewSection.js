/**
 * @param {string} code
 * @returns {string | null}
 */
export function extractPreviewLabel(code) {
  for (const raw of code.split('\n')) {
    const match = /^\s*#\s*Preview:\s*(.+)\s*$/i.exec(raw)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {HTMLElement | null}
 */
export function previewSectionElement(cardDOM) {
  const el = cardDOM.querySelector('.addon-preview-section')
  return el instanceof HTMLElement ? el : null
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {boolean}
 */
export function isPreviewSectionOpen(cardDOM) {
  const section = previewSectionElement(cardDOM)
  return section?.getAttribute('data-open') !== 'false'
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {HTMLElement | null}
 */
export function addonRootElement(cardDOM) {
  const el = cardDOM.querySelector('[class*="-ui"]')
  return el instanceof HTMLElement ? el : null
}

/**
 * @param {HTMLElement} cardDOM
 * @param {boolean} open
 */
function syncRootPreviewLayout(cardDOM, open) {
  const root = addonRootElement(cardDOM)
  if (!root) {
    return
  }
  root.setAttribute('data-preview-open', open ? 'true' : 'false')
}

/**
 * @param {HTMLElement} cardDOM
 * @param {boolean} open
 */
export function setPreviewSectionOpen(cardDOM, open) {
  const section = previewSectionElement(cardDOM)
  if (!section) {
    return
  }

  section.setAttribute('data-open', open ? 'true' : 'false')
  syncRootPreviewLayout(cardDOM, open)

  const button = section.querySelector('.addon-preview-section-head')
  if (button instanceof HTMLButtonElement) {
    button.setAttribute('aria-expanded', open ? 'true' : 'false')
  }

  const chevron = section.querySelector('.addon-preview-chevron')
  if (chevron instanceof HTMLElement) {
    chevron.setAttribute('data-open', open ? '1' : '0')
  }
}

/**
 * @param {HTMLElement} cardDOM
 */
export function togglePreviewSection(cardDOM) {
  setPreviewSectionOpen(cardDOM, !isPreviewSectionOpen(cardDOM))
}

/**
 * @param {HTMLElement} cardDOM
 * @param {string} code
 */
export function syncPreviewSectionLabel(cardDOM, code) {
  const root = cardDOM.querySelector('[class*="-ui"]')
  const emptyLabel = root instanceof HTMLElement ? root.dataset.labelEmpty ?? '' : ''
  const labelEl = cardDOM.querySelector('[name="preview-label"]')
  if (!(labelEl instanceof HTMLElement)) {
    return
  }

  const preview = extractPreviewLabel(code)
  labelEl.textContent = preview ?? emptyLabel
}

/**
 * @param {HTMLElement} cardDOM
 */
export function ensurePreviewSectionToggle(cardDOM) {
  const button = cardDOM.querySelector('#preview-toggle-btn')
  if (!(button instanceof HTMLButtonElement)) {
    return
  }
  if (button.dataset.bound === '1') {
    return
  }

  button.dataset.bound = '1'
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    togglePreviewSection(cardDOM)
  })
}
