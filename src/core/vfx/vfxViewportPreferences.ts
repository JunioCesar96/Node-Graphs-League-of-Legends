export type VfxViewportSettings = {
  darkScene: boolean
  showGrid: boolean
  showGround: boolean
  /** Legado — espelhado em `groundScale2d` ao guardar. */
  groundScale: number
  groundScale2d: [number, number]
  groundPosition: [number, number, number]
  showGizmos: boolean
  showEmitterShapes: boolean
  /** Eixos locais + bbox por emitter (debug de escala/rotação). */
  showTransformDebug: boolean
  /** Malha 3D sem texturas nem shader VFX (preview de geometria). */
  meshOnlyEnabled: boolean
  /** Corrige rotação das partículas via matriz LoL→Three (leagueLocalToThree). */
  vfxGlobalRotationEnabled: boolean
  /** Offset Euler global (graus LoL) somado antes da conversão. */
  vfxGlobalRotationOffsetDegrees: [number, number, number]
  /** Partículas não se deslocam (sem velocidade/aceleração no preview). */
  vfxLockMotionEnabled: boolean
  /** Billboards seguem a orientação da câmara. */
  vfxCamLockEnabled: boolean
  vfxPositionEnabled: boolean
  /** Deslocamento Three.js aplicado a todas as partículas no preview. */
  vfxPositionOffset: [number, number, number]
}

export const STORAGE_VFX_VIEWPORT_KEY = 'node-graphs-lol:vfxViewport'

export const DEFAULT_VFX_VIEWPORT_SETTINGS: VfxViewportSettings = {
  darkScene: true,
  showGrid: true,
  showGround: true,
  groundScale: 0.375,
  groundScale2d: [0.25, 0.5],
  groundPosition: [0, 0, 0],
  showGizmos: true,
  showEmitterShapes: false,
  showTransformDebug: false,
  meshOnlyEnabled: false,
  vfxGlobalRotationEnabled: true,
  vfxGlobalRotationOffsetDegrees: [90, 0, 0],
  vfxLockMotionEnabled: false,
  vfxCamLockEnabled: true,
  vfxPositionEnabled: true,
  vfxPositionOffset: [0, 1.5, 0],
}

function parseVec3(raw: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(raw) || raw.length < 3) return fallback
  return [Number(raw[0]) || 0, Number(raw[1]) || 0, Number(raw[2]) || 0]
}

function parseVec2(raw: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(raw) || raw.length < 2) return fallback
  return [Math.max(0.05, Number(raw[0]) || 1), Math.max(0.05, Number(raw[1]) || 1)]
}

export function loadVfxViewportSettings(): VfxViewportSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_VFX_VIEWPORT_KEY)
    if (!raw) return { ...DEFAULT_VFX_VIEWPORT_SETTINGS }

    const parsed = JSON.parse(raw) as Partial<VfxViewportSettings>
    const legacyScale = typeof parsed.groundScale === 'number' ? parsed.groundScale : 1

    return {
      ...DEFAULT_VFX_VIEWPORT_SETTINGS,
      ...parsed,
      groundScale2d: parseVec2(parsed.groundScale2d, [legacyScale, legacyScale]),
      groundPosition: parseVec3(parsed.groundPosition, [0, 0, 0]),
      vfxPositionOffset: parseVec3(
        parsed.vfxPositionOffset,
        DEFAULT_VFX_VIEWPORT_SETTINGS.vfxPositionOffset,
      ),
      vfxPositionEnabled: parsed.vfxPositionEnabled === true,
      vfxGlobalRotationEnabled:
        parsed.vfxGlobalRotationEnabled !== undefined
          ? parsed.vfxGlobalRotationEnabled === true
          : DEFAULT_VFX_VIEWPORT_SETTINGS.vfxGlobalRotationEnabled,
      vfxGlobalRotationOffsetDegrees: parseVec3(
        parsed.vfxGlobalRotationOffsetDegrees,
        DEFAULT_VFX_VIEWPORT_SETTINGS.vfxGlobalRotationOffsetDegrees,
      ),
      vfxLockMotionEnabled: parsed.vfxLockMotionEnabled === true,
      vfxCamLockEnabled:
        parsed.vfxCamLockEnabled !== undefined
          ? parsed.vfxCamLockEnabled === true
          : DEFAULT_VFX_VIEWPORT_SETTINGS.vfxCamLockEnabled,
      meshOnlyEnabled: parsed.meshOnlyEnabled === true,
      showTransformDebug: parsed.showTransformDebug === true,
    }
  } catch {
    return { ...DEFAULT_VFX_VIEWPORT_SETTINGS }
  }
}

export function saveVfxViewportSettings(settings: VfxViewportSettings): void {
  try {
    window.localStorage.setItem(STORAGE_VFX_VIEWPORT_KEY, JSON.stringify(settings))
  } catch {
    /** quota / privado */
  }
}

export function applyVfxPositionOffset(
  position: [number, number, number],
  enabled: boolean,
  offset: [number, number, number],
): [number, number, number] {
  if (!enabled) return position
  return [position[0] + offset[0], position[1] + offset[1], position[2] + offset[2]]
}
