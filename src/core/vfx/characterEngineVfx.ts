/** Defaults Engine VFX — escala sync timeline + rotação X LoL. */

export const DEFAULT_CHARACTER_ENGINE_ROTATION_X_LOL_DEG = 90

export function resolveCharacterEngineScale(enabled: boolean, vfxScale: number): number {
  return enabled ? vfxScale : 1
}

export function resolveCharacterEngineRotationXDeg(enabled: boolean): number {
  return enabled ? DEFAULT_CHARACTER_ENGINE_ROTATION_X_LOL_DEG : 0
}
