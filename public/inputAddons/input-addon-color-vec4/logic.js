import {
  readLiteralFromColorDom,
  syncColorVec4FromLiteral,
} from '../../addons/shared/colorVec4Input.js'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} hostDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, hostDOM) {
  const literal = typeof inputs.value === 'string' ? inputs.value : '1, 1, 1, 1'
  syncColorVec4FromLiteral(hostDOM, literal)
  return { value: readLiteralFromColorDom(hostDOM, { literal }) }
}

export const logic = { execute }
