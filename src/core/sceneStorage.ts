import type { CanvasScene } from '@/core/canvasScene'
import { emptyCanvasScene, hydrateScene } from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import { stripNeekoTransientFromScene } from '@/core/neekoNodeTransform'

export const SCENE_STORAGE_KEY = 'node-graphs-lol:scene'

/** Margem abaixo do limite típico (~5 MB) do localStorage. */
export const SCENE_LEGACY_STORAGE_MAX_BYTES = 4_000_000

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.code === 22)
  )
}

export function clearStoredScene(): void {
  try {
    window.localStorage.removeItem(SCENE_STORAGE_KEY)
  } catch {
    /** ignore */
  }
}

/**
 * Espelho legacy da cena activa (`node-graphs-lol:scene`).
 * Com abas activas, omitir — o estado vive em `scene-tabs-v1`.
 */
export function persistStoredScene(scene: CanvasScene): boolean {
  try {
    const raw = JSON.stringify(stripNeekoTransientFromScene(scene))

    if (raw.length > SCENE_LEGACY_STORAGE_MAX_BYTES) {
      clearStoredScene()
      return false
    }

    window.localStorage.setItem(SCENE_STORAGE_KEY, raw)
    return true
  } catch (error) {
    if (isQuotaExceededError(error)) {
      clearStoredScene()
      return false
    }

    throw error
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isCanvasScene(value: unknown): value is CanvasScene {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.connections)
  )
}

export function loadStoredScene(): CanvasScene {
  try {
    const storedScene = window.localStorage.getItem(SCENE_STORAGE_KEY)

    if (!storedScene) {
      return emptyCanvasScene
    }

    const parsedScene: unknown = JSON.parse(storedScene)

    if (!isCanvasScene(parsedScene)) {
      return emptyCanvasScene
    }

    return syncSceneCollapsedBodyWireless(hydrateScene(parsedScene))
  } catch {
    return emptyCanvasScene
  }
}
