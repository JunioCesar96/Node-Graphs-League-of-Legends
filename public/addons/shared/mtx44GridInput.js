/**
 * Grelha 4×4 para add-on `addon-value-mtx44`.
 */

const CELL_COUNT = 16

/**
 * @param {string} raw
 * @returns {string[]}
 */
export function parseMtx44LiteralComponents(raw) {
  let inner = String(raw ?? '').trim()
  const braced = /^\{\s*([\s\S]*)\s*\}$/.exec(inner)
  if (braced?.[1] !== undefined) {
    inner = braced[1].trim()
  }
  const parts = inner.split(/[\s,]+/).filter(Boolean)
  const result = []
  for (let index = 0; index < CELL_COUNT; index += 1) {
    result.push(parts[index] ?? '0')
  }
  return result
}

/**
 * @param {HTMLElement} panel
 * @returns {string}
 */
export function composeLiteralFromMtx44Panel(panel) {
  const inputs = [...panel.querySelectorAll('.addon-mtx44-cell-input')]
  if (inputs.length === 0) {
    return '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1'
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
export function syncMtx44GridFromLiteral(cardDOM, literal) {
  const panel = cardDOM.querySelector('[data-addon-mtx44-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const parts = parseMtx44LiteralComponents(literal)
  panel.querySelectorAll('.addon-mtx44-cell-input').forEach((input, index) => {
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
export function readMtx44LiteralFromDom(cardDOM, inputs) {
  const panel = cardDOM.querySelector('[data-addon-mtx44-panel]')
  if (panel instanceof HTMLElement) {
    return composeLiteralFromMtx44Panel(panel)
  }

  const hidden = cardDOM.querySelector('input[name="literal"]')
  if (hidden instanceof HTMLInputElement) {
    return hidden.value
  }

  return String(inputs.literal ?? '')
}
