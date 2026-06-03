/**
 * @param {Record<string, unknown>} inputs — valores já fundidos (grafo + DOM)
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const prefix = String(inputs.prefix ?? '')
  const text = String(inputs.text ?? '')

  const resultEl = cardDOM.querySelector('[name="result"]')
  const logEl = cardDOM.querySelector('[name="console-log"]')
  const result = `${prefix}${text}`

  if (resultEl instanceof HTMLOutputElement || resultEl instanceof HTMLElement) {
    resultEl.textContent = result
  }
  if (logEl instanceof HTMLElement) {
    logEl.textContent = `prefix="${prefix}" text="${text}" → "${result}"`
  }

  return { result }
}

export const logic = { execute }
