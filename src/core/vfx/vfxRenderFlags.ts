/**
 * miscRenderFlags (Runeforge): bit 1 inverte faces em blend alpha/normal.
 * @see https://github.com/runeforge-io/runeforge-wiki/blob/main/specific-guide/coding/particle-dictionary.md
 */

export function miscRenderFlagsInvertFaces(miscRenderFlags: number): boolean {
  return (miscRenderFlags & 1) !== 0
}

/** Inverter normais no shader (com DoubleSide). */
export function shouldFlipNormals(
  miscRenderFlags: number,
  blendMode: number,
  disableBackfaceCull: boolean,
): boolean {
  if (disableBackfaceCull) return false
  if (!miscRenderFlagsInvertFaces(miscRenderFlags)) return false
  return blendMode === 1 || blendMode === 3
}

/** alphaRef 0–255 → cutoff para alpha test (texel × particle alpha). */
export function resolveAlphaCutoff(alphaRef: number): number {
  return Math.min(Math.max(alphaRef / 255, 0), 1)
}

export function shouldAlphaTest(alphaRef: number, isAdditive: boolean): boolean {
  return !isAdditive && alphaRef > 0
}

export function resolveDepthWrite(isAdditive: boolean, alphaRef: number): boolean {
  if (isAdditive) return false
  return alphaRef > 0
}

/**
 * Ordem de desenho Three.js: pass (camada) → importance (desempate) → índice da partícula.
 * Valores maiores desenham por cima (transparentes).
 */
export function resolveRenderOrder(pass: number, particleIndex = 0, importance = 0): number {
  return pass * 1000 + importance * 10 + particleIndex
}
