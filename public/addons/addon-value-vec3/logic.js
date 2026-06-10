import { readLiteralFromDom, syncVecAxisFromLiteral } from '../shared/vecAxisInput.js'
import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = 'vec3'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const literal = readLiteralFromDom(cardDOM, inputs)
  syncVecAxisFromLiteral(cardDOM, literal)
  return executeAddonParamValue(RITUAL_TYPE, literal, cardDOM)
}

export const logic = { execute }
