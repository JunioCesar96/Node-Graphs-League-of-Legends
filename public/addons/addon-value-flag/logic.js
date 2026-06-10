import { syncBoolToggleUi } from '../shared/boolToggle.js'
import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = 'flag'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const hidden = cardDOM.querySelector('input[name="literal"]')
  const literal =
    hidden instanceof HTMLInputElement
      ? hidden.value
      : String(inputs.literal ?? '')

  syncBoolToggleUi(cardDOM.querySelector('[data-addon-bool-toggle]'), literal)
  return executeAddonParamValue(RITUAL_TYPE, literal, cardDOM)
}

export const logic = { execute }
