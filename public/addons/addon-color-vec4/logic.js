import {
  readLiteralFromColorDom,
  syncColorVec4FromLiteral,
} from '../shared/colorVec4Input.js'
import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = 'vec4'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const literal = readLiteralFromColorDom(cardDOM, inputs)
  syncColorVec4FromLiteral(cardDOM, literal)
  return executeAddonParamValue(RITUAL_TYPE, literal, cardDOM)
}

export const logic = { execute }
