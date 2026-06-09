/** Color picker → vec4 (0–1) nos add-ons `addon-color-vec4`. */

import {
  formatColorVec4Display,
  formatColorVec4Component,
  readColorVec4DisplayFormat,
  type ColorVec4DisplayFormat,
} from '@/core/colorVec4DisplayFormat'
import { parseLiteralComponents } from '@/core/addonVecAxisInput'
import { rgbaToCss, type RgbaColor } from '@/core/rgbaColor'

const wiredContainers = new WeakSet<HTMLElement>()
const ALPHA_FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/

export const ADDON_COLOR_VEC4_OPEN_EVENT = 'addon-color-vec4-open-picker'

export { formatColorVec4Component }

export function hexToRgb01(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) {
    return [1, 1, 1]
  }
  const numeric = Number.parseInt(match[1], 16)
  return [((numeric >> 16) & 255) / 255, ((numeric >> 8) & 255) / 255, (numeric & 255) / 255]
}

export function rgb01ToHex(r: number, g: number, b: number): string {
  const toByte = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel * 255)))
  const rr = toByte(r).toString(16).padStart(2, '0')
  const gg = toByte(g).toString(16).padStart(2, '0')
  const bb = toByte(b).toString(16).padStart(2, '0')
  return `#${rr}${gg}${bb}`
}

function parsePanelRgba(panel: HTMLElement, literalFallback = '1, 1, 1, 1'): RgbaColor {
  const hidden = panel.querySelector('input[name="literal"]')
  const parts = parseLiteralComponents(
    hidden instanceof HTMLInputElement ? hidden.value : literalFallback,
    4,
  ).map((part) => Number.parseFloat(part))
  return {
    r: Number.isFinite(parts[0]) ? parts[0]! : 1,
    g: Number.isFinite(parts[1]) ? parts[1]! : 1,
    b: Number.isFinite(parts[2]) ? parts[2]! : 1,
    a: Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3]!)) : 1,
  }
}

function syncPreviewDisplay(panel: HTMLElement, rgba: RgbaColor): void {
  const format = readColorVec4DisplayFormat(panel)
  const preview = panel.querySelector('[data-color-vec4-preview]')
  if (preview instanceof HTMLElement) {
    preview.textContent = formatColorVec4Display(format, rgba.r, rgba.g, rgba.b, rgba.a)
    preview.title = format.toUpperCase()
  }

  const swatch = panel.querySelector('[data-color-vec4-swatch]')
  if (swatch instanceof HTMLElement) {
    swatch.style.background = rgbaToCss(rgba)
  }
}

export function composeLiteralFromColorPanel(panel: HTMLElement): string {
  const alphaInput = panel.querySelector('[data-color-vec4-alpha]')
  const rgba = parsePanelRgba(panel)
  let alpha = rgba.a
  if (alphaInput instanceof HTMLInputElement) {
    const parsed = Number.parseFloat(alphaInput.value)
    alpha = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : rgba.a
  }
  return [rgba.r, rgba.g, rgba.b, alpha]
    .map((part) => formatColorVec4Component(part))
    .join(', ')
}

export function syncColorPanelFromLiteral(panel: HTMLElement, literal: string): void {
  const parts = parseLiteralComponents(literal, 4).map((part) => Number.parseFloat(part))
  const rgba: RgbaColor = {
    r: Number.isFinite(parts[0]) ? parts[0]! : 1,
    g: Number.isFinite(parts[1]) ? parts[1]! : 1,
    b: Number.isFinite(parts[2]) ? parts[2]! : 1,
    a: Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3]!)) : 1,
  }

  const alphaInput = panel.querySelector('[data-color-vec4-alpha]')
  if (alphaInput instanceof HTMLInputElement) {
    alphaInput.value = formatColorVec4Component(rgba.a)
  }

  const alphaRange = panel.querySelector('[data-color-vec4-alpha-range]')
  if (alphaRange instanceof HTMLInputElement) {
    alphaRange.value = formatColorVec4Component(rgba.a)
  }

  syncPreviewDisplay(panel, rgba)

  const hidden = panel.querySelector('input[name="literal"]')
  if (hidden instanceof HTMLInputElement) {
    hidden.value = [rgba.r, rgba.g, rgba.b, rgba.a]
      .map((part) => formatColorVec4Component(part))
      .join(', ')
  }
}

export function syncAddonColorVec4FromLiteral(cardDOM: HTMLElement, literal: string): void {
  const panel = cardDOM.querySelector('[data-addon-color-vec4-panel]')
  if (panel instanceof HTMLElement) {
    syncColorPanelFromLiteral(panel, literal)
  }
}

export function applyAddonColorVec4FieldInteraction(
  wiredSlotNames: ReadonlySet<string>,
  cardDOM: HTMLElement,
): void {
  const panel = cardDOM.querySelector('[data-addon-color-vec4-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const wired = wiredSlotNames.has('literal')
  panel.querySelectorAll<HTMLButtonElement>('[data-color-vec4-swatch]').forEach((button) => {
    button.disabled = wired
    button.dataset.addonWired = wired ? '1' : '0'
  })
  panel.querySelectorAll<HTMLInputElement>('[data-color-vec4-alpha]').forEach((input) => {
    input.readOnly = wired
    input.dataset.addonWired = wired ? '1' : '0'
  })
  panel.querySelectorAll<HTMLInputElement>('[data-color-vec4-alpha-range]').forEach((input) => {
    input.disabled = wired
    input.dataset.addonWired = wired ? '1' : '0'
  })
  panel.querySelectorAll<HTMLSelectElement>('[data-color-vec4-format]').forEach((select) => {
    select.disabled = wired
    select.dataset.addonWired = wired ? '1' : '0'
  })
}

export function emitAddonColorVec4PanelChange(panel: HTMLElement): void {
  const hidden = panel.querySelector('input[name="literal"]')
  if (!(hidden instanceof HTMLInputElement)) {
    return
  }
  hidden.dispatchEvent(new Event('input', { bubbles: true }))
  hidden.dispatchEvent(new Event('change', { bubbles: true }))
}

export function commitAddonColorVec4Panel(panel: HTMLElement): void {
  emitLiteralFromPanel(panel)
}

function emitLiteralFromPanel(panel: HTMLElement): void {
  const hidden = panel.querySelector('input[name="literal"]')
  if (!(hidden instanceof HTMLInputElement)) {
    return
  }
  const next = composeLiteralFromColorPanel(panel)
  if (hidden.value === next) {
    syncPreviewDisplay(panel, parsePanelRgba(panel))
    return
  }
  hidden.value = next
  syncColorPanelFromLiteral(panel, next)
  hidden.dispatchEvent(new Event('input', { bubbles: true }))
  hidden.dispatchEvent(new Event('change', { bubbles: true }))
}

function resolveAlphaInput(target: EventTarget | null): HTMLInputElement | null {
  if (!(target instanceof HTMLInputElement)) {
    return null
  }
  if (!target.matches('[data-color-vec4-alpha]')) {
    return null
  }
  if (target.readOnly || target.dataset.addonWired === '1') {
    return null
  }
  return target
}

function isValidAlphaPartial(value: string): boolean {
  if (!ALPHA_FLOAT_PARTIAL.test(value)) {
    return false
  }
  if (value.trim() === '' || value === '-' || value.endsWith('.')) {
    return true
  }
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed >= 0 && parsed <= 1 : true
}

function handleColorPanelInput(cardDOM: HTMLElement, event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLElement) || !cardDOM.contains(target)) {
    return
  }

  const panel = target.closest('[data-addon-color-vec4-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  if (target instanceof HTMLSelectElement && target.matches('[data-color-vec4-format]')) {
    if (target.dataset.addonWired === '1' || target.disabled) {
      return
    }
    syncPreviewDisplay(panel, parsePanelRgba(panel))
    return
  }

  if (target instanceof HTMLInputElement && target.matches('[data-color-vec4-alpha-range]')) {
    const alphaText = panel.querySelector<HTMLInputElement>('[data-color-vec4-alpha]')
    if (alphaText && !alphaText.readOnly) {
      alphaText.value = target.value
    }
  }

  if (target instanceof HTMLInputElement && target.matches('[data-color-vec4-alpha]')) {
    const alphaRange = panel.querySelector<HTMLInputElement>('[data-color-vec4-alpha-range]')
    const parsed = Number.parseFloat(target.value)
    if (alphaRange && Number.isFinite(parsed)) {
      alphaRange.value = String(Math.max(0, Math.min(1, parsed)))
    }
  }

  if (
    target instanceof HTMLInputElement &&
    (target.matches('[data-color-vec4-alpha]') || target.matches('[data-color-vec4-alpha-range]'))
  ) {
    if (target.dataset.addonWired === '1' || target.disabled || target.readOnly) {
      return
    }
    emitLiteralFromPanel(panel)
  }
}

function handleSwatchClick(cardDOM: HTMLElement, event: Event): void {
  const target = event.target
  if (!(target instanceof Element) || !cardDOM.contains(target)) {
    return
  }

  const swatch = target.closest('[data-color-vec4-swatch]')
  if (!(swatch instanceof HTMLButtonElement)) {
    return
  }
  if (swatch.disabled || swatch.dataset.addonWired === '1') {
    return
  }

  const panel = swatch.closest('[data-addon-color-vec4-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  cardDOM.dispatchEvent(
    new CustomEvent(ADDON_COLOR_VEC4_OPEN_EVENT, {
      bubbles: true,
      detail: { panel, swatch },
    }),
  )
}

function handleAlphaBeforeInput(cardDOM: HTMLElement, event: InputEvent): void {
  const input = resolveAlphaInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length
  let nextValue: string | null = null

  switch (event.inputType) {
    case 'insertText':
    case 'insertReplacementText':
    case 'insertFromPaste':
    case 'insertFromDrop':
      nextValue = value.slice(0, start) + (event.data ?? '') + value.slice(end)
      break
    default:
      return
  }

  if (nextValue !== null && !isValidAlphaPartial(nextValue)) {
    event.preventDefault()
  }
}

/** Liga color picker e alpha ao `input[name="literal"]` como vec4. */
export function ensureAddonColorVec4InputWired(cardDOM: HTMLElement): void {
  if (!(cardDOM instanceof HTMLElement)) {
    return
  }

  cardDOM.querySelectorAll<HTMLElement>('[data-addon-color-vec4-panel]').forEach((panel) => {
    const hidden = panel.querySelector('input[name="literal"]')
    if (hidden instanceof HTMLInputElement) {
      syncColorPanelFromLiteral(panel, hidden.value)
    }
  })

  if (wiredContainers.has(cardDOM)) {
    return
  }

  wiredContainers.add(cardDOM)
  cardDOM.addEventListener('click', (event) => {
    handleSwatchClick(cardDOM, event)
  })
  cardDOM.addEventListener('beforeinput', (event) => {
    if (event instanceof InputEvent) {
      handleAlphaBeforeInput(cardDOM, event)
    }
  })
  cardDOM.addEventListener('input', (event) => {
    handleColorPanelInput(cardDOM, event)
  })
  cardDOM.addEventListener('change', (event) => {
    handleColorPanelInput(cardDOM, event)
  })
}

export type { ColorVec4DisplayFormat }
