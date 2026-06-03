import { resolveWiredAddonInputSlotNames } from '@/core/addonSlotConnections'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { resolveAddonInputs } from '@/nodeStructures/instanceEvaluator'
import type { AddonManifest } from '@/services/addonLoader.service'

/** Chave estável do feed ligado — muda só quando valores upstream mudam. */
export function buildAddonWiredInputsFeedKey(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  manifest: AddonManifest,
): string {
  const wired = resolveWiredAddonInputSlotNames(scene, canvasNode, manifest)
  const inputs = resolveAddonInputs(scene, canvasNode, manifest)
  return [...wired]
    .sort()
    .map((name) => `${name}:${JSON.stringify(inputs[name] ?? '')}`)
    .join('|')
}
