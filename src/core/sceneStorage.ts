import type { CanvasScene } from '@/core/canvasScene'
import { emptyCanvasScene, hydrateScene } from '@/core/canvasScene'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'

export const SCENE_STORAGE_KEY = 'node-graphs-lol:scene'

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
