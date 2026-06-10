import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = 'u16'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  return executeAddonParamValue(RITUAL_TYPE, String(inputs.literal ?? ''), cardDOM)
}

export const logic = { execute }
