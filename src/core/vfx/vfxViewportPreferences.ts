export type VfxAxisWorldColors = {
  x: string
  y: string
  z: string
}

export const DEFAULT_AXIS_WORLD_SCALE: [number, number, number] = [1.25, 1.25, 1.25]

export const DEFAULT_AXIS_WORLD_COLORS: VfxAxisWorldColors = {
  x: '#ff5555',
  y: '#55dd55',
  z: '#5599ff',
}

export type VfxViewportSettings = {
  darkScene: boolean
  showGrid: boolean
  /** Eixos X/Y/Z no origem da cena (espaço mundo Three.js). */
  showAxisWorld: boolean
  /** Comprimento de cada eixo (X, Y, Z). */
  axisWorldScale: [number, number, number]
  axisWorldColors: VfxAxisWorldColors
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
  /**
   * birthRotation0 com baseline LoL (ex. {-90,-90,0} → view neutra no chão).
   * Desligado: aplica graus ritual directamente na malha.
   */
  vfxBirthRotationLoLEnabled: boolean
  /** Offset Euler global (graus LoL) somado antes da conversão. */
  vfxGlobalRotationOffsetDegrees: [number, number, number]
  /** Partículas não se deslocam (sem velocidade/aceleração no preview). */
  vfxLockMotionEnabled: boolean
  /** Billboards seguem a orientação da câmara. */
  vfxCamLockEnabled: boolean
  vfxPositionEnabled: boolean
  /** Deslocamento Three.js aplicado a todas as partículas no preview. */
  vfxPositionOffset: [number, number, number]
  /** Soft particle contra depth buffer do chão/personagem (Fase 7). */
  sceneDepthFade: boolean
  /** Rebuild automático ao editar o ritual (desligado = só botão Rebuild). */
  vfxAutoRebuildEnabled: boolean
  /** Câmara ortográfica (tecla 5 estilo Blender). */
  orthographicProjection: boolean
}

export const STORAGE_VFX_VIEWPORT_KEY = 'node-graphs-lol:vfxViewport'

/** Migra posição guardada com altura no eixo Y (preview Y-up) para Z-up. */
/** Valores legados (0.25×0.5) → 11×11 após mudança de escala mundial. */
function migrateGroundScale2d(scale: [number, number]): [number, number] {
  if (scale[0] <= 1 && scale[1] <= 1) {
    return [...DEFAULT_VFX_VIEWPORT_SETTINGS.groundScale2d]
  }
  return scale
}

function migrateVfxPositionOffsetToZUp(offset: [number, number, number]): [number, number, number] {
  const [x, y, z] = offset
  if (Math.abs(z) < 1e-4 && Math.abs(y) > 1e-4 && Math.abs(x) < 1e-4) {
    return [0, 0, y]
  }
  return offset
}

function migrateGroundPositionToZUp(pos: [number, number, number]): [number, number, number] {
  const [x, y, z] = pos
  if (Math.abs(z) < 1e-4 && Math.abs(y) > 1e-4) {
    return [x, 0, y]
  }
  return pos
}

export const DEFAULT_VFX_VIEWPORT_SETTINGS: VfxViewportSettings = {
  darkScene: true,
  showGrid: true,
  showAxisWorld: false,
  axisWorldScale: [...DEFAULT_AXIS_WORLD_SCALE],
  axisWorldColors: { ...DEFAULT_AXIS_WORLD_COLORS },
  showGround: true,
  groundScale: 11,
  groundScale2d: [11, 11],
  groundPosition: [0, 0, 0.02],
  showGizmos: true,
  showEmitterShapes: false,
  showTransformDebug: false,
  meshOnlyEnabled: false,
  vfxGlobalRotationEnabled: true,
  vfxBirthRotationLoLEnabled: true,
  vfxGlobalRotationOffsetDegrees: [90, 0, 0],
  vfxLockMotionEnabled: false,
  vfxCamLockEnabled: true,
  vfxPositionEnabled: true,
  vfxPositionOffset: [0, 0, 1.5],
  sceneDepthFade: false,
  vfxAutoRebuildEnabled: false,
  orthographicProjection: false,
}

function parseVec3(raw: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(raw) || raw.length < 3) return fallback
  return [Number(raw[0]) || 0, Number(raw[1]) || 0, Number(raw[2]) || 0]
}

function parseVec2(raw: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(raw) || raw.length < 2) return fallback
  return [Math.max(0.05, Number(raw[0]) || 1), Math.max(0.05, Number(raw[1]) || 1)]
}

function clampAxisScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(20, Math.max(0.05, value))
}

function parseAxisWorldScale(raw: unknown): [number, number, number] {
  if (!Array.isArray(raw) || raw.length < 3) return [...DEFAULT_AXIS_WORLD_SCALE]
  return [
    clampAxisScale(Number(raw[0])),
    clampAxisScale(Number(raw[1])),
    clampAxisScale(Number(raw[2])),
  ]
}

function normalizeHexColor(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

function parseAxisWorldColors(raw: unknown): VfxAxisWorldColors {
  const source = raw && typeof raw === 'object' ? (raw as Partial<VfxAxisWorldColors>) : {}
  return {
    x: normalizeHexColor(source.x, DEFAULT_AXIS_WORLD_COLORS.x),
    y: normalizeHexColor(source.y, DEFAULT_AXIS_WORLD_COLORS.y),
    z: normalizeHexColor(source.z, DEFAULT_AXIS_WORLD_COLORS.z),
  }
}

export function loadVfxViewportSettings(): VfxViewportSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_VFX_VIEWPORT_KEY)
    if (!raw) return { ...DEFAULT_VFX_VIEWPORT_SETTINGS }

    const parsed = JSON.parse(raw) as Partial<VfxViewportSettings>

    return {
      ...DEFAULT_VFX_VIEWPORT_SETTINGS,
      ...parsed,
      groundScale2d: migrateGroundScale2d(
        parseVec2(parsed.groundScale2d, DEFAULT_VFX_VIEWPORT_SETTINGS.groundScale2d),
      ),
      groundScale: migrateGroundScale2d(
        parseVec2(parsed.groundScale2d, DEFAULT_VFX_VIEWPORT_SETTINGS.groundScale2d),
      )[0],
      groundPosition: migrateGroundPositionToZUp(
        parseVec3(parsed.groundPosition, DEFAULT_VFX_VIEWPORT_SETTINGS.groundPosition),
      ),
      vfxPositionOffset: migrateVfxPositionOffsetToZUp(
        parseVec3(
          parsed.vfxPositionOffset,
          DEFAULT_VFX_VIEWPORT_SETTINGS.vfxPositionOffset,
        ),
      ),
      vfxPositionEnabled: parsed.vfxPositionEnabled === true,
      vfxGlobalRotationEnabled:
        parsed.vfxGlobalRotationEnabled !== undefined
          ? parsed.vfxGlobalRotationEnabled === true
          : DEFAULT_VFX_VIEWPORT_SETTINGS.vfxGlobalRotationEnabled,
      vfxBirthRotationLoLEnabled:
        parsed.vfxBirthRotationLoLEnabled !== undefined
          ? parsed.vfxBirthRotationLoLEnabled === true
          : DEFAULT_VFX_VIEWPORT_SETTINGS.vfxBirthRotationLoLEnabled,
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
      sceneDepthFade: parsed.sceneDepthFade === true,
      showAxisWorld: parsed.showAxisWorld === true,
      axisWorldScale: parseAxisWorldScale(parsed.axisWorldScale),
      axisWorldColors: parseAxisWorldColors(parsed.axisWorldColors),
      orthographicProjection: parsed.orthographicProjection === true,
      vfxAutoRebuildEnabled: parsed.vfxAutoRebuildEnabled === true,
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
