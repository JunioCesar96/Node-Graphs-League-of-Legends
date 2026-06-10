/**
 * Validação de literais para add-ons `addon-value-*`.
 * Manter alinhado com `src/core/addonParamValueValidation.ts`.
 */

const INTEGER_BOUNDS = {
  i8: { min: -128n, max: 127n, unsigned: false },
  u8: { min: 0n, max: 255n, unsigned: true },
  i16: { min: -32768n, max: 32767n, unsigned: false },
  u16: { min: 0n, max: 65535n, unsigned: true },
  i32: { min: -2147483648n, max: 2147483647n, unsigned: false },
  u32: { min: 0n, max: 4294967295n, unsigned: true },
  i64: { min: -9223372036854775808n, max: 9223372036854775807n, unsigned: false },
  u64: { min: 0n, max: 18446744073709551615n, unsigned: true },
}

const FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/
const VECTOR_PARTIAL = /^[0-9,.\s\-]*$/
const RGBA_PARTIAL = /^[0-9,.\s\-]*$/

function ritualToDataType(ritualType) {
  switch (ritualType) {
    case 'vec4':
      return 'vector4'
    case 'vec3':
    case 'vec':
      return 'vector3'
    case 'vec2':
      return 'vector2'
    case 'f32':
    case 'float':
      return 'f32'
    case 'double':
      return 'double'
    case 'bool':
      return 'bool'
    case 'flag':
      return 'flag'
    case 'rgba':
      return 'rgba'
    case 'mtx44':
      return 'mtx44'
    case 'string':
      return 'string'
    default:
      if (Object.prototype.hasOwnProperty.call(INTEGER_BOUNDS, ritualType)) {
        return ritualType
      }
      return 'string'
  }
}

function isPartialValue(dataType, value) {
  if (dataType === 'string') {
    return !/[\r\n]/.test(value)
  }
  if (dataType === 'bool' || dataType === 'flag') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return true
    if (normalized === 'true' || normalized === 'false') return true
    return 'true'.startsWith(normalized) || 'false'.startsWith(normalized)
  }
  if (Object.prototype.hasOwnProperty.call(INTEGER_BOUNDS, dataType)) {
    const spec = INTEGER_BOUNDS[dataType]
    return spec.unsigned ? /^\d*$/.test(value) : /^-?\d*$/.test(value)
  }
  if (dataType === 'f32' || dataType === 'float' || dataType === 'double') {
    return FLOAT_PARTIAL.test(value)
  }
  if (dataType === 'vector2' || dataType === 'vector3' || dataType === 'vector4') {
    return VECTOR_PARTIAL.test(value)
  }
  if (dataType === 'rgba' || dataType === 'mtx44') {
    return RGBA_PARTIAL.test(value)
  }
  return false
}

function isCommittedBool(value) {
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === 'false'
}

function isCommittedFloat(value) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return false
  }
  if (!FLOAT_PARTIAL.test(trimmed)) {
    return false
  }
  return Number.isFinite(Number.parseFloat(trimmed))
}

function isCommittedBoundedInteger(type, value) {
  const spec = INTEGER_BOUNDS[type]
  if (!spec) {
    return false
  }
  if (spec.unsigned ? !/^\d*$/.test(value) : !/^-?\d*$/.test(value)) {
    return false
  }
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') {
    return false
  }
  try {
    const parsed = spec.unsigned ? BigInt(trimmed.replace(/\D/g, '')) : BigInt(trimmed)
    return parsed >= spec.min && parsed <= spec.max
  } catch {
    return false
  }
}

function vectorInnerParts(raw) {
  let inner = raw.trim()
  const braced = /^\{\s*([^}]*)\s*\}$/.exec(inner)
  if (braced?.[1] !== undefined) {
    inner = braced[1].trim()
  }
  return inner.split(/[\s,]+/).filter(Boolean)
}

function isCommittedVector(value, count) {
  const parts = vectorInnerParts(value)
  if (parts.length < count) {
    return false
  }
  return parts.slice(0, count).every((part) => Number.isFinite(Number.parseFloat(part)))
}

function trimFloat(n) {
  return String(Math.round(n * 1000) / 1000)
}

function normalizeValue(dataType, raw) {
  const trimmed = raw.trim()
  if (dataType === 'bool' || dataType === 'flag') {
    const normalized = trimmed.toLowerCase()
    return normalized === 'true' || normalized === '1' ? 'true' : 'false'
  }
  if (Object.prototype.hasOwnProperty.call(INTEGER_BOUNDS, dataType)) {
    const spec = INTEGER_BOUNDS[dataType]
    const parsed = spec.unsigned ? BigInt(trimmed.replace(/\D/g, '')) : BigInt(trimmed)
    return String(parsed)
  }
  if (dataType === 'f32' || dataType === 'float' || dataType === 'double') {
    return trimFloat(Number.parseFloat(trimmed))
  }
  if (dataType === 'vector2') {
    const parts = vectorInnerParts(trimmed)
    const x = Number.parseFloat(parts[0] ?? '0')
    const y = Number.parseFloat(parts[1] ?? '0')
    return `${trimFloat(Number.isFinite(x) ? x : 0)}, ${trimFloat(Number.isFinite(y) ? y : 0)}`
  }
  if (dataType === 'vector3') {
    const parts = vectorInnerParts(trimmed)
    const x = Number.parseFloat(parts[0] ?? '0')
    const y = Number.parseFloat(parts[1] ?? '0')
    const z = Number.parseFloat(parts[2] ?? '0')
    return `${trimFloat(Number.isFinite(x) ? x : 0)}, ${trimFloat(Number.isFinite(y) ? y : 0)}, ${trimFloat(Number.isFinite(z) ? z : 0)}`
  }
  if (dataType === 'vector4' || dataType === 'rgba') {
    const parts = vectorInnerParts(trimmed)
    const x = Number.parseFloat(parts[0] ?? '0')
    const y = Number.parseFloat(parts[1] ?? '0')
    const z = Number.parseFloat(parts[2] ?? '0')
    const w = Number.parseFloat(parts[3] ?? '0')
    return `${trimFloat(Number.isFinite(x) ? x : 0)}, ${trimFloat(Number.isFinite(y) ? y : 0)}, ${trimFloat(Number.isFinite(z) ? z : 0)}, ${trimFloat(Number.isFinite(w) ? w : 0)}`
  }
  if (dataType === 'mtx44') {
    const parts = vectorInnerParts(trimmed)
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    return identity
      .map((fallback, index) => {
        const n = Number.parseFloat(parts[index] ?? String(fallback))
        return trimFloat(Number.isFinite(n) ? n : fallback)
      })
      .join(', ')
  }
  return raw
}

function rejectionMessage(dataType) {
  if (dataType === 'u8') return 'Valor inválido: use um inteiro entre 0 e 255.'
  if (dataType === 'i8') return 'Valor inválido: use um inteiro entre -128 e 127.'
  if (dataType === 'u16') return 'Valor inválido: use um inteiro entre 0 e 65535.'
  if (dataType === 'i16') return 'Valor inválido: use um inteiro entre -32768 e 32767.'
  if (dataType === 'u32') return 'Valor inválido: use um inteiro entre 0 e 4294967295.'
  if (dataType === 'i32') return 'Valor inválido: use um inteiro entre -2147483648 e 2147483647.'
  if (dataType === 'bool' || dataType === 'flag') return 'Valor inválido: use true ou false.'
  if (dataType === 'f32' || dataType === 'float' || dataType === 'double') {
    return 'Valor inválido: use um número decimal válido.'
  }
  if (dataType === 'vector2') return 'Valor inválido: use dois números separados por vírgula (x, y).'
  if (dataType === 'vector3') return 'Valor inválido: use três números separados por vírgula (x, y, z).'
  if (dataType === 'vector4') return 'Valor inválido: use quatro números separados por vírgula (x, y, z, w).'
  if (dataType === 'rgba') return 'Valor inválido: use quatro números separados por vírgula (r, g, b, a).'
  if (dataType === 'mtx44') return 'Valor inválido: use 16 números decimais (matriz 4×4).'
  return 'Valor inválido para este tipo.'
}

function isCommittedValue(dataType, value) {
  if (!isPartialValue(dataType, value)) {
    return false
  }
  if (dataType === 'string') {
    return !/[\r\n]/.test(value)
  }
  if (dataType === 'bool' || dataType === 'flag') {
    return isCommittedBool(value)
  }
  if (Object.prototype.hasOwnProperty.call(INTEGER_BOUNDS, dataType)) {
    return isCommittedBoundedInteger(dataType, value)
  }
  if (dataType === 'f32' || dataType === 'float' || dataType === 'double') {
    return isCommittedFloat(value)
  }
  if (dataType === 'vector2') {
    return isCommittedVector(value, 2)
  }
  if (dataType === 'vector3') {
    return isCommittedVector(value, 3)
  }
  if (dataType === 'vector4' || dataType === 'rgba') {
    return isCommittedVector(value, 4)
  }
  if (dataType === 'mtx44') {
    return isCommittedVector(value, 16)
  }
  return false
}

/**
 * @param {string} ritualType
 * @param {string} raw
 * @returns {{ ok: true, value: string } | { ok: false, reason: string }}
 */
export function validateAddonParamLiteral(ritualType, raw) {
  const dataType = ritualToDataType(ritualType)
  if (!isCommittedValue(dataType, raw)) {
    return { ok: false, reason: rejectionMessage(dataType) }
  }
  return { ok: true, value: normalizeValue(dataType, raw) }
}

/**
 * @param {HTMLElement | null | undefined} cardDOM
 * @param {{ ok: boolean, reason?: string }} result
 */
export function applyAddonParamValidationUi(cardDOM, result) {
  if (!cardDOM) {
    return
  }

  for (const panel of cardDOM.querySelectorAll('[data-addon-vec-panel], [data-addon-mtx44-panel]')) {
    if (!(panel instanceof HTMLElement)) {
      continue
    }
    if (result.ok) {
      panel.removeAttribute('data-invalid')
      panel.removeAttribute('aria-invalid')
      panel.removeAttribute('title')
    } else {
      panel.setAttribute('data-invalid', '1')
      panel.setAttribute('aria-invalid', 'true')
      panel.title = result.reason ?? 'Valor inválido.'
    }
  }

  const input = cardDOM.querySelector('input[name="literal"]')
  if (!(input instanceof HTMLInputElement)) {
    return
  }
  if (result.ok) {
    input.removeAttribute('data-invalid')
    input.removeAttribute('aria-invalid')
    input.removeAttribute('title')
    return
  }
  input.setAttribute('data-invalid', '1')
  input.setAttribute('aria-invalid', 'true')
  input.title = result.reason ?? 'Valor inválido.'
}

/**
 * @param {string} ritualType
 * @param {string} raw
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
export function executeAddonParamValue(ritualType, raw, cardDOM) {
  const result = validateAddonParamLiteral(ritualType, raw)
  applyAddonParamValidationUi(cardDOM, result)
  if (!result.ok) {
    return {}
  }
  return { value: result.value }
}
