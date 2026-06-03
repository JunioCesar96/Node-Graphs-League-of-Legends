export function sanitizeBlockParameterFileStem(id: string): string | null {
  const t = id
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')

  if (t === '' || t === '.' || t === '..' || t.length > 120) {
    return null
  }

  return t
}

/** Nome de subpasta por tipo de bloco (ex.: `VfxEmitterDefinitionData`). */
export function sanitizeBlockStructureFolderName(name: string): string | null {
  const t = name.normalize('NFKC').trim()
  if (!t || t === '.' || t === '..' || t.length > 80) {
    return null
  }
  if (/[/\\]/.test(t) || t.includes('..')) {
    return null
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(t)) {
    return null
  }
  return t
}
