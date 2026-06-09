/**

 * Color picker → literal vec4 (r, g, b, a) em 0–1 para add-ons `addon-color-vec4`.

 */



import { parseLiteralComponents } from './vecAxisInput.js'



/** @typedef {'hex' | 'rgb' | 'hsl' | 'vec4'} ColorVec4DisplayFormat */



/** @type {readonly ColorVec4DisplayFormat[]} */

export const COLOR_VEC4_DISPLAY_FORMATS = ['hex', 'rgb', 'hsl', 'vec4']



export const ADDON_COLOR_VEC4_OPEN_EVENT = 'addon-color-vec4-open-picker'



/**

 * @param {number} value

 * @returns {string}

 */

export function formatColorVec4Component(value) {

  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {

    return '0'

  }

  const rounded = Math.round(numeric * 10000) / 10000

  return String(rounded)

    .replace(/(\.\d*?)0+$/, '$1')

    .replace(/\.$/, '')

}



/**

 * @param {number} channel

 * @returns {number}

 */

function clamp01(channel) {

  const numeric = Number(channel)

  if (!Number.isFinite(numeric)) {

    return 0

  }

  return Math.min(1, Math.max(0, numeric))

}



/**

 * @param {number} channel

 * @returns {number}

 */

function toByte(channel) {

  return Math.round(clamp01(channel) * 255)

}



/**

 * @param {ColorVec4DisplayFormat} format

 * @param {number} r

 * @param {number} g

 * @param {number} b

 * @param {number} a

 * @returns {string}

 */

export function formatColorVec4Display(format, r, g, b, a) {

  const red = clamp01(r)

  const green = clamp01(g)

  const blue = clamp01(b)

  const alpha = clamp01(a)



  if (format === 'vec4') {

    return [red, green, blue, alpha].map((part) => formatColorVec4Component(part)).join(', ')

  }



  if (format === 'hex') {

    const rr = toByte(red).toString(16).padStart(2, '0')

    const gg = toByte(green).toString(16).padStart(2, '0')

    const bb = toByte(blue).toString(16).padStart(2, '0')

    if (alpha < 1) {

      const aa = toByte(alpha).toString(16).padStart(2, '0')

      return `#${rr}${gg}${bb}${aa}`.toUpperCase()

    }

    return `#${rr}${gg}${bb}`.toUpperCase()

  }



  if (format === 'rgb') {

    const rr = toByte(red)

    const gg = toByte(green)

    const bb = toByte(blue)

    if (alpha < 1) {

      const aa = Number.parseFloat(alpha.toFixed(3))

      return `rgba(${rr}, ${gg}, ${bb}, ${aa})`

    }

    return `rgb(${rr}, ${gg}, ${bb})`

  }



  const max = Math.max(red, green, blue)

  const min = Math.min(red, green, blue)

  const delta = max - min



  let h = 0

  if (delta !== 0) {

    if (max === red) {

      h = ((green - blue) / delta) % 6

    } else if (max === green) {

      h = (blue - red) / delta + 2

    } else {

      h = (red - green) / delta + 4

    }

    h = Math.round(h * 60)

    if (h < 0) {

      h += 360

    }

  }



  const l = (max + min) / 2

  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  if (alpha < 1) {

    const aa = Number.parseFloat(alpha.toFixed(3))

    return `hsla(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${aa})`

  }

  return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`

}



/**

 * @param {HTMLElement} panel

 * @returns {ColorVec4DisplayFormat}

 */

export function readColorVec4DisplayFormat(panel) {

  const select = panel.querySelector('[data-color-vec4-format]')

  if (select instanceof HTMLSelectElement) {

    const value = select.value.trim().toLowerCase()

    if (COLOR_VEC4_DISPLAY_FORMATS.includes(/** @type {ColorVec4DisplayFormat} */ (value))) {

      return /** @type {ColorVec4DisplayFormat} */ (value)

    }

  }

  return 'vec4'

}



/**

 * @param {HTMLElement} panel

 * @param {number} r

 * @param {number} g

 * @param {number} b

 * @param {number} a

 */

function syncPreviewDisplay(panel, r, g, b, a) {

  const format = readColorVec4DisplayFormat(panel)

  const preview = panel.querySelector('[data-color-vec4-preview]')

  if (preview instanceof HTMLElement) {

    preview.textContent = formatColorVec4Display(format, r, g, b, a)

    preview.title = format.toUpperCase()

  }



  const swatch = panel.querySelector('[data-color-vec4-swatch]')

  if (swatch instanceof HTMLElement) {

    const rr = toByte(r)

    const gg = toByte(g)

    const bb = toByte(b)

    const aa = clamp01(a)

    swatch.style.background = `rgba(${rr}, ${gg}, ${bb}, ${aa})`

  }

}



/**

 * @param {HTMLElement} panel

 * @returns {string}

 */

export function composeLiteralFromColorPanel(panel) {

  const hidden = panel.querySelector('input[name="literal"]')

  const alphaInput = panel.querySelector('[data-color-vec4-alpha]')

  const parts = parseLiteralComponents(

    hidden instanceof HTMLInputElement ? hidden.value : '1, 1, 1, 1',

    4,

  ).map((part) => Number.parseFloat(part))

  const r = Number.isFinite(parts[0]) ? parts[0] : 1

  const g = Number.isFinite(parts[1]) ? parts[1] : 1

  const b = Number.isFinite(parts[2]) ? parts[2] : 1

  const baseAlpha = Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1

  let alpha = baseAlpha

  if (alphaInput instanceof HTMLInputElement) {

    const parsed = Number.parseFloat(alphaInput.value)

    alpha = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : baseAlpha

  }

  return [r, g, b, alpha].map((part) => formatColorVec4Component(part)).join(', ')

}



/**

 * @param {HTMLElement} panel

 * @param {string} literal

 */

export function syncColorPanelFromLiteral(panel, literal) {

  const parts = parseLiteralComponents(literal, 4).map((part) => Number.parseFloat(part))

  const r = Number.isFinite(parts[0]) ? parts[0] : 1

  const g = Number.isFinite(parts[1]) ? parts[1] : 1

  const b = Number.isFinite(parts[2]) ? parts[2] : 1

  const a = Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1



  const alphaInput = panel.querySelector('[data-color-vec4-alpha]')

  if (alphaInput instanceof HTMLInputElement) {

    alphaInput.value = formatColorVec4Component(a)

  }



  const alphaRange = panel.querySelector('[data-color-vec4-alpha-range]')

  if (alphaRange instanceof HTMLInputElement) {

    alphaRange.value = formatColorVec4Component(a)

  }



  syncPreviewDisplay(panel, r, g, b, a)



  const hidden = panel.querySelector('input[name="literal"]')

  if (hidden instanceof HTMLInputElement) {

    hidden.value = [r, g, b, a].map((part) => formatColorVec4Component(part)).join(', ')

  }

}



/**

 * @param {HTMLElement} cardDOM

 * @param {string} literal

 */

export function syncColorVec4FromLiteral(cardDOM, literal) {

  const panel = cardDOM.querySelector('[data-addon-color-vec4-panel]')

  if (panel instanceof HTMLElement) {

    syncColorPanelFromLiteral(panel, literal)

  }

}



/**

 * @param {HTMLElement} cardDOM

 * @param {Record<string, unknown>} inputs

 * @returns {string}

 */

export function readLiteralFromColorDom(cardDOM, inputs) {

  const panel = cardDOM.querySelector('[data-addon-color-vec4-panel]')

  if (panel instanceof HTMLElement) {

    return composeLiteralFromColorPanel(panel)

  }



  const hidden = cardDOM.querySelector('input[name="literal"]')

  if (hidden instanceof HTMLInputElement) {

    return hidden.value

  }



  return String(inputs.literal ?? '1, 1, 1, 1')

}


