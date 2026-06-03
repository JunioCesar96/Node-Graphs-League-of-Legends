/** FlexShapeDefinition — escala/offset proporcionais ao bound do personagem (Fase 8). */

export type VfxFlexShapeDefinition = {
  scaleBirthScaleByBoundObjectSize: number
  scaleEmitOffsetByBoundObjectSize: number
}

export function boundObjectMagnitudeLol(size: [number, number, number]): number {
  return Math.max(Math.abs(size[0]), Math.abs(size[1]), Math.abs(size[2]), 1e-6)
}

/** Multiplicador de birthScale (1 = sem flex). */
export function resolveFlexShapeScaleMultiplier(
  flex: VfxFlexShapeDefinition | null | undefined,
  boundSizeLol: [number, number, number] | null | undefined,
): number {
  if (!flex || !boundSizeLol) return 1
  const magnitude = boundObjectMagnitudeLol(boundSizeLol)
  return 1 + flex.scaleBirthScaleByBoundObjectSize * magnitude
}

/** Multiplicador de emitOffset / spawn offset (1 = sem flex). */
export function resolveFlexShapeEmitOffsetMultiplier(
  flex: VfxFlexShapeDefinition | null | undefined,
  boundSizeLol: [number, number, number] | null | undefined,
): number {
  if (!flex || !boundSizeLol) return 1
  const magnitude = boundObjectMagnitudeLol(boundSizeLol)
  const coeff = flex.scaleEmitOffsetByBoundObjectSize
  if (Math.abs(coeff) < 1e-9) return 1
  return 1 + coeff * magnitude
}

export function scaleVec3ByFactor(
  vec: [number, number, number],
  factor: number,
): [number, number, number] {
  if (Math.abs(factor - 1) < 1e-9) return vec
  return [vec[0] * factor, vec[1] * factor, vec[2] * factor]
}
