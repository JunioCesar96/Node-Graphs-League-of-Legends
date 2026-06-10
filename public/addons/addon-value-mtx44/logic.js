import { readMtx44LiteralFromDom, syncMtx44GridFromLiteral } from '../shared/mtx44GridInput.js'
import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = 'mtx44'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const literal = readMtx44LiteralFromDom(cardDOM, inputs)
  syncMtx44GridFromLiteral(cardDOM, literal)
  return executeAddonParamValue(RITUAL_TYPE, literal, cardDOM)
}

export const logic = { execute }
