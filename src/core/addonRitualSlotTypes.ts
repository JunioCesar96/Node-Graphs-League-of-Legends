/** Tipos de slot legados (add-ons genéricos). */
export const LEGACY_ADDON_SLOT_TYPES = [
  'string',
  'number',
  'boolean',
  'object',
  'code',
  'json',
] as const

/** Tipos ritual de parâmetro suportados em slots de add-on. */
export const RITUAL_ADDON_SLOT_TYPES = [
  'u8',
  'i8',
  'u16',
  'i16',
  'u32',
  'i32',
  'u64',
  'i64',
  'f32',
  'float',
  'double',
  'vec2',
  'vec3',
  'vec4',
  'vec',
  'bool',
  'flag',
  'rgba',
  'mtx44',
] as const

export const ADDON_SLOT_TYPES = [...LEGACY_ADDON_SLOT_TYPES, ...RITUAL_ADDON_SLOT_TYPES] as const

export type LegacyAddonSlotType = (typeof LEGACY_ADDON_SLOT_TYPES)[number]
export type RitualAddonSlotType = (typeof RITUAL_ADDON_SLOT_TYPES)[number]

const ADDON_SLOT_TYPE_SET: ReadonlySet<string> = new Set(ADDON_SLOT_TYPES)

const INTEGER_RITUAL_TYPES = new Set([
  'u8',
  'i8',
  'u16',
  'i16',
  'u32',
  'i32',
  'u64',
  'i64',
  'integer',
])

const FLOAT_RITUAL_TYPES = new Set(['f32', 'float', 'double'])

const VECTOR_ALIASES: Record<string, string> = {
  vector2: 'vec2',
  vector3: 'vec3',
  vector4: 'vec4',
  vec: 'vec3',
  boolean: 'bool',
  number: 'number',
}

export function isAllowedAddonSlotType(type: string): boolean {
  return ADDON_SLOT_TYPE_SET.has(type.trim())
}

/** Normaliza aliases ritual/legado para comparação de ligações. */
export function canonicalAddonSlotType(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  return VECTOR_ALIASES[trimmed] ?? trimmed
}

export function addonSlotTypesAreCompatible(outputType: string, inputType: string): boolean {
  const out = canonicalAddonSlotType(outputType)
  const input = canonicalAddonSlotType(inputType)

  if (out === input) {
    return true
  }

  if (
    (out === 'bool' || out === 'flag') &&
    (input === 'bool' || input === 'flag')
  ) {
    return true
  }

  if (out === 'number' || input === 'number') {
    const other = out === 'number' ? input : out
    return (
      other === 'number' ||
      INTEGER_RITUAL_TYPES.has(other) ||
      FLOAT_RITUAL_TYPES.has(other)
    )
  }

  if (
    (out === 'bool' && input === 'boolean') ||
    (out === 'boolean' && input === 'bool')
  ) {
    return true
  }

  return false
}

export function formatAddonSlotTypeLabel(type: string): string {
  const canonical = canonicalAddonSlotType(type)
  if (canonical === 'number') {
    return 'number'
  }
  if (canonical === 'boolean') {
    return 'boolean'
  }
  return type.trim() || type
}
