const SYNTAX_ACCENT_VARS = [
  '--syntax-property',
  '--syntax-keyword',
  '--syntax-string',
  '--syntax-float',
  '--syntax-vector2',
  '--syntax-vector3',
  '--syntax-vector4',
  '--syntax-link',
] as const

function hashName(name: string): number {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }
  return hash
}

/** Token `--syntax-*` para barras da timeline VFX (segue paleta Jade / SyntaxType). */
export function timelineLayerSyntaxAccentVar(name: string): string {
  const lower = name.toLowerCase()

  if (
    lower.includes('color') ||
    lower.includes('rgba') ||
    lower.includes('glow') ||
    lower.includes('core') ||
    lower.includes('light')
  ) {
    return 'var(--syntax-vector4)'
  }

  if (lower.includes('ring') || lower.includes('orbit') || lower.includes('trail')) {
    return 'var(--syntax-vector3)'
  }

  if (
    lower.includes('rot') ||
    lower.includes('velocity') ||
    lower.includes('scale') ||
    lower.includes('birth') ||
    lower.includes('pos')
  ) {
    return 'var(--syntax-vector3)'
  }

  if (
    lower.includes('tex') ||
    lower.includes('splat') ||
    lower.includes('juice') ||
    lower.includes('mesh') ||
    lower.includes('particle')
  ) {
    return 'var(--syntax-string)'
  }

  if (lower.includes('flag') || lower.includes('bool') || lower.includes('enable')) {
    return 'var(--syntax-keyword)'
  }

  if (lower.includes('embed') || lower.includes('pointer') || lower.includes('link')) {
    return 'var(--syntax-link)'
  }

  return `var(${SYNTAX_ACCENT_VARS[hashName(name) % SYNTAX_ACCENT_VARS.length]})`
}
