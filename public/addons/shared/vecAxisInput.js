/**
 * Painel de eixos (X/Y/Z/…) para add-ons `addon-value-vec*` e `addon-value-rgba`.
 */

/**
 * @param {string} raw
 * @param {number} count
 * @returns {string[]}
 */
export function parseLiteralComponents(raw, count) {
  let inner = String(raw ?? '').trim()
  const braced = /^\{\s*([^}]*)\s*\}$/.exec(inner)
  if (braced?.[1] !== undefined) {
    inner = braced[1].trim()
  }
  const parts = inner.split(/[\s,]+/).filter(Boolean)
  const result = []
  for (let index = 0; index < count; index += 1) {
    result.push(parts[index] ?? '0')
  }
  return result
}

/**
 * @param {HTMLElement} panel
 * @returns {string}
 */
export function composeLiteralFromPanel(panel) {
  const inputs = [...panel.querySelectorAll('.addon-vec-axis-input')]
  if (inputs.length === 0) {
    return '0'
  }
  return inputs
    .map((input) => {
      if (!(input instanceof HTMLInputElement)) {
        return '0'
      }
      const trimmed = input.value.trim()
      return trimmed === '' ? '0' : trimmed
    })
    .join(', ')
}

/**
 * @param {HTMLElement} cardDOM
 * @param {string} literal
 */
export function syncVecAxisFromLiteral(cardDOM, literal) {
  const panel = cardDOM.querySelector('[data-addon-vec-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const inputs = [...panel.querySelectorAll('.addon-vec-axis-input')]
  const parts = parseLiteralComponents(literal, inputs.length)
  inputs.forEach((input, index) => {
    if (input instanceof HTMLInputElement) {
      input.value = parts[index] ?? '0'
    }
  })

  const hidden = panel.querySelector('input[name="literal"]')
  if (hidden instanceof HTMLInputElement) {
    hidden.value = parts.join(', ')
  }
}

/**
 * @param {HTMLElement} cardDOM
 * @param {Record<string, unknown>} inputs
 * @returns {string}
 */
export function readLiteralFromDom(cardDOM, inputs) {
  const panel = cardDOM.querySelector('[data-addon-vec-panel]')
  if (panel instanceof HTMLElement) {
    return composeLiteralFromPanel(panel)
  }

  const hidden = cardDOM.querySelector('input[name="literal"]')
  if (hidden instanceof HTMLInputElement) {
    return hidden.value
  }

  return String(inputs.literal ?? '')
}
