import { formatRitualParseError, ritualCodeToJson } from './ritualToJson.js'
import {
  ensurePreviewSectionToggle,
  syncPreviewSectionLabel,
} from '../addonPreviewSection.js'

const FULLSCREEN_ROOT_PREFIX = 'addon-code-to-json-fullscreen-'
const FULLSCREEN_STYLE_ID = 'addon-code-to-json-fullscreen-styles'

/**
 * @param {string} code
 * @returns {string}
 */
function codeToPrettyJson(code) {
  const trimmed = code.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const parsed = ritualCodeToJson(code)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    return JSON.stringify(
      {
        error: formatRitualParseError(error),
      },
      null,
      2,
    )
  }
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {string}
 */
function instanceKey(cardDOM) {
  const card = cardDOM.closest('[data-instance-id]')
  const id = card?.getAttribute('data-instance-id')?.trim()
  return id || 'default'
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {string}
 */
function fullscreenRootId(cardDOM) {
  return `${FULLSCREEN_ROOT_PREFIX}${instanceKey(cardDOM)}`
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {HTMLElement | null}
 */
function rootElement(cardDOM) {
  const el = cardDOM.querySelector('.addon-code-to-json-ui')
  return el instanceof HTMLElement ? el : null
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {HTMLTextAreaElement | null}
 */
function jsonTextarea(cardDOM) {
  const el = cardDOM.querySelector('[name="json"]')
  return el instanceof HTMLTextAreaElement ? el : null
}

/**
 * @param {string} jsonText
 * @returns {string}
 */
function previewLabelFromJson(jsonText) {
  const trimmed = jsonText.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      return parsed.type.trim()
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.preview === 'string') {
      return parsed.preview.trim()
    }
  } catch {
    return 'JSON manual'
  }
  return 'JSON manual'
}

/**
 * @param {HTMLElement} cardDOM
 * @param {string} jsonText
 * @param {{ fromUser?: boolean }} [options]
 */
function syncJsonOutput(cardDOM, jsonText, options = {}) {
  const textarea = jsonTextarea(cardDOM)
  if (textarea && textarea.value !== jsonText) {
    if (options.fromUser || document.activeElement !== textarea) {
      textarea.value = jsonText
    }
  }

  const root = rootElement(cardDOM)
  if (root?.getAttribute('data-expanded') === 'true') {
    const overlay = document.getElementById(fullscreenRootId(cardDOM))
    const fullscreenTextarea = overlay?.querySelector('.addon-code-to-json-fullscreen-textarea')
    if (
      fullscreenTextarea instanceof HTMLTextAreaElement &&
      fullscreenTextarea.value !== jsonText &&
      (options.fromUser || document.activeElement !== fullscreenTextarea)
    ) {
      fullscreenTextarea.value = jsonText
    }
  }
}

/**
 * @param {HTMLElement} cardDOM
 */
function syncExpandButtonState(cardDOM) {
  const root = rootElement(cardDOM)
  const button = cardDOM.querySelector('#expand-json-btn')
  if (!root || !(button instanceof HTMLButtonElement)) {
    return
  }

  const expanded = root.getAttribute('data-expanded') === 'true'
  const expandLabel = root.dataset.labelExpand ?? 'Expand'
  const collapseLabel = root.dataset.labelCollapse ?? 'Collapse'
  const label = expanded ? collapseLabel : expandLabel

  button.setAttribute('aria-pressed', expanded ? 'true' : 'false')
  button.setAttribute('aria-label', label)
  button.title = label
}

function ensureFullscreenStyles() {
  if (document.getElementById(FULLSCREEN_STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = FULLSCREEN_STYLE_ID
  style.textContent = `
    [id^="${FULLSCREEN_ROOT_PREFIX}"] {
      position: fixed;
      inset: 0;
      z-index: 10060;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"][hidden] {
      display: none !important;
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-backdrop {
      position: absolute;
      inset: 0;
      background: rgb(0 0 0 / 72%);
      backdrop-filter: blur(4px);
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-panel {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(96vw, 1600px);
      height: min(92vh, 1200px);
      padding: 14px;
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #1e1e1e;
      box-shadow: 0 24px 64px rgb(0 0 0 / 45%);
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex: 0 0 auto;
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      color: #94a3b8;
      background: rgb(0 0 0 / 20%);
      border: 1px solid #334155;
      border-radius: 4px;
      cursor: pointer;
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-close:hover {
      color: #f8fafc;
      border-color: #60a5fa;
    }

    [id^="${FULLSCREEN_ROOT_PREFIX}"] .addon-code-to-json-fullscreen-textarea {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      box-sizing: border-box;
      resize: none;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #334155;
      background: #0f172a;
      color: #93c5fd;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: hidden;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
  `
  document.head.appendChild(style)
}

/**
 * @param {HTMLElement} cardDOM
 * @returns {HTMLElement}
 */
function ensureFullscreenOverlay(cardDOM) {
  const root = rootElement(cardDOM)
  const collapseLabel = root?.dataset.labelCollapse ?? 'Collapse'
  const overlayId = fullscreenRootId(cardDOM)

  ensureFullscreenStyles()

  let overlay = document.getElementById(overlayId)
  if (overlay instanceof HTMLElement) {
    return overlay
  }

  overlay = document.createElement('div')
  overlay.id = overlayId
  overlay.hidden = true
  overlay.innerHTML = `
    <div class="addon-code-to-json-fullscreen-backdrop" data-action="collapse"></div>
    <div class="addon-code-to-json-fullscreen-panel" role="dialog" aria-modal="true">
      <div class="addon-code-to-json-fullscreen-header">
        <span class="addon-code-to-json-fullscreen-title">Code to JSON</span>
        <button type="button" class="addon-code-to-json-fullscreen-close" data-action="collapse" aria-label="${collapseLabel}" title="${collapseLabel}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <textarea class="addon-code-to-json-fullscreen-textarea" spellcheck="false"></textarea>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }
    if (target.closest('[data-action="collapse"]')) {
      event.preventDefault()
      event.stopPropagation()
      setExpanded(cardDOM, false)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || overlay.hidden) {
      return
    }
    setExpanded(cardDOM, false)
  })

  return overlay
}

/**
 * @param {HTMLElement} cardDOM
 * @param {boolean} expanded
 */
function setExpanded(cardDOM, expanded) {
  const root = rootElement(cardDOM)
  const textarea = jsonTextarea(cardDOM)
  if (!root || !textarea) {
    return
  }

  root.setAttribute('data-expanded', expanded ? 'true' : 'false')
  syncExpandButtonState(cardDOM)

  const overlay = ensureFullscreenOverlay(cardDOM)
  const fullscreenTextarea = overlay.querySelector('.addon-code-to-json-fullscreen-textarea')

  if (expanded) {
    if (fullscreenTextarea instanceof HTMLTextAreaElement) {
      fullscreenTextarea.value = textarea.value
    }
    overlay.hidden = false
    document.body.style.overflow = 'hidden'
    return
  }

  if (fullscreenTextarea instanceof HTMLTextAreaElement && fullscreenTextarea.value !== textarea.value) {
    textarea.value = fullscreenTextarea.value
  }

  overlay.hidden = true
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = ''
  }
}

/**
 * @param {HTMLElement} cardDOM
 */
function toggleExpanded(cardDOM) {
  const root = rootElement(cardDOM)
  if (!root) {
    return
  }

  const expanded = root.getAttribute('data-expanded') === 'true'
  setExpanded(cardDOM, !expanded)
}

/**
 * @param {HTMLElement} cardDOM
 */
function ensureExpandBinding(cardDOM) {
  const button = cardDOM.querySelector('#expand-json-btn')
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
    toggleExpanded(cardDOM)
  })
}

/**
 * @param {HTMLElement} cardDOM
 */
function ensureJsonEditBinding(cardDOM) {
  const textarea = jsonTextarea(cardDOM)
  if (!textarea || textarea.dataset.boundEdit === '1') {
    return
  }

  textarea.dataset.boundEdit = '1'
  textarea.addEventListener('input', () => {
    const overlay = document.getElementById(fullscreenRootId(cardDOM))
    const fullscreenTextarea = overlay?.querySelector('.addon-code-to-json-fullscreen-textarea')
    if (
      fullscreenTextarea instanceof HTMLTextAreaElement &&
      rootElement(cardDOM)?.getAttribute('data-expanded') === 'true' &&
      fullscreenTextarea.value !== textarea.value
    ) {
      fullscreenTextarea.value = textarea.value
    }
    syncPreviewSectionLabel(cardDOM, previewLabelFromJson(textarea.value))
  })
}

/**
 * @param {HTMLElement} cardDOM
 */
function ensureFullscreenEditBinding(cardDOM) {
  const overlay = ensureFullscreenOverlay(cardDOM)
  const fullscreenTextarea = overlay.querySelector('.addon-code-to-json-fullscreen-textarea')
  if (!(fullscreenTextarea instanceof HTMLTextAreaElement) || fullscreenTextarea.dataset.boundEdit === '1') {
    return
  }

  fullscreenTextarea.dataset.boundEdit = '1'
  fullscreenTextarea.addEventListener('input', () => {
    const textarea = jsonTextarea(cardDOM)
    if (textarea && textarea.value !== fullscreenTextarea.value) {
      textarea.value = fullscreenTextarea.value
    }
    syncPreviewSectionLabel(cardDOM, previewLabelFromJson(fullscreenTextarea.value))
  })
}

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const code = String(inputs.code ?? '').trim()
  ensureExpandBinding(cardDOM)
  ensureJsonEditBinding(cardDOM)
  ensureFullscreenEditBinding(cardDOM)
  syncExpandButtonState(cardDOM)
  ensurePreviewSectionToggle(cardDOM)

  if (code) {
    const jsonText = codeToPrettyJson(code)
    syncJsonOutput(cardDOM, jsonText)
    syncPreviewSectionLabel(cardDOM, code)
    return { json: jsonText }
  }

  const jsonText = jsonTextarea(cardDOM)?.value ?? ''
  syncPreviewSectionLabel(cardDOM, previewLabelFromJson(jsonText))
  return { json: jsonText }
}

export const logic = { execute }
