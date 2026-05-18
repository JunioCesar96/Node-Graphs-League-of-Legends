/** Tipos inteiros com intervalo fixo (clamp no commit). */
export const BOUNDED_INTEGER_TYPES = [
  'i8',
  'u8',
  'i16',
  'u16',
  'i32',
  'u32',
  'i64',
  'u64',
] as const

export type BoundedIntegerType = (typeof BOUNDED_INTEGER_TYPES)[number]

export const U32_MAX = 4_294_967_295

type BoundedSpec = {
  min: bigint
  max: bigint
  unsigned: boolean
}

export const INTEGER_TYPE_BOUNDS: Record<BoundedIntegerType, BoundedSpec> = {
  i8: { min: -128n, max: 127n, unsigned: false },
  u8: { min: 0n, max: 255n, unsigned: true },
  i16: { min: -32_768n, max: 32_767n, unsigned: false },
  u16: { min: 0n, max: 65_535n, unsigned: true },
  i32: { min: -2_147_483_648n, max: 2_147_483_647n, unsigned: false },
  u32: { min: 0n, max: 4_294_967_295n, unsigned: true },
  i64: { min: -9_223_372_036_854_775_808n, max: 9_223_372_036_854_775_807n, unsigned: false },
  u64: { min: 0n, max: 18_446_744_073_709_551_615n, unsigned: true },
}

export function isBoundedIntegerType(type: string): type is BoundedIntegerType {
  return (BOUNDED_INTEGER_TYPES as readonly string[]).includes(type)
}

export function boundedIntegerInputHint(type: BoundedIntegerType): string {
  const { min, max, unsigned } = INTEGER_TYPE_BOUNDS[type]
  return unsigned
    ? `Inteiro sem sinal (${min} a ${max}): só dígitos.`
    : `Inteiro com sinal (${min} a ${max}): dígitos e «-» no início.`
}

export function boundedIntegerRejectionMessage(type: BoundedIntegerType): string {
  const { unsigned } = INTEGER_TYPE_BOUNDS[type]
  return unsigned
    ? 'Este campo só aceita dígitos dentro do intervalo do tipo.'
    : 'Este campo só aceita dígitos e «-» no início, dentro do intervalo do tipo.'
}

export function isValidPartialBoundedInteger(type: BoundedIntegerType, value: string): boolean {
  if (INTEGER_TYPE_BOUNDS[type].unsigned) {
    return /^\d*$/.test(value)
  }
  return /^-?\d*$/.test(value)
}

export function normalizeBoundedIntegerForCommit(type: BoundedIntegerType, value: string): string {
  const { min, max, unsigned } = INTEGER_TYPE_BOUNDS[type]
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-') {
    return ''
  }

  try {
    let n: bigint
    if (unsigned) {
      const digitsOnly = trimmed.replace(/\D/g, '')
      if (digitsOnly === '') {
        return ''
      }
      n = BigInt(digitsOnly)
    } else {
      n = BigInt(trimmed)
    }

    if (n < min) {
      n = min
    }
    if (n > max) {
      n = max
    }
    return n.toString()
  } catch {
    return '0'
  }
}
