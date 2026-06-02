/** Ajustes de frame por estratégias de movimento (Fase 3–4). */

import type { VfxGroundHitResolver } from '../../vfxGroundHit'
import { resolveGroundHit, VFX_GROUND_PLANE_Z } from '../../vfxGroundHit'
import {
  groundEulerFromSurfaceNormal,
  shouldTiltToGroundNormal,
} from '../../vfxGroundNormalAlign'
import type { VfxEmitterFrameState } from '../../vfxWebAnimation'
import type { ComposableRenderPipeline } from '../vfxSemanticTypes'

export { VFX_GROUND_PLANE_Z }

export type MotionFrameAdjustments = {
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** Altura de clip no eixo Three Z (equiv. LoL Y). */
  groundClipZ?: number
}

export type MotionStrategyOptions = {
  groundHitResolver?: VfxGroundHitResolver | null
}

export function executeMotionStrategies(
  pipeline: ComposableRenderPipeline,
  frame: VfxEmitterFrameState,
  options?: MotionStrategyOptions,
): MotionFrameAdjustments {
  const adjustments: MotionFrameAdjustments = {}

  if (pipeline.motion.includes('groundNavmeshSnap') || pipeline.material.includes('groundNavmeshClip')) {
    const hit = resolveGroundHit(frame.position[0], frame.position[1], options?.groundHitResolver)
    adjustments.position = [frame.position[0], frame.position[1], hit.z]
    adjustments.groundClipZ = hit.z

    const tiltGround =
      (pipeline.traits.includes('NavmeshGroundClip') ||
        pipeline.traits.includes('GroundProjected')) &&
      hit.fromMesh &&
      shouldTiltToGroundNormal(hit.normal)
    // Decals ground projetados no preview: só snap Z (malha alinhada ao debug / grelha).
    if (tiltGround && !pipeline.traits.includes('GroundProjected')) {
      adjustments.rotation = groundEulerFromSurfaceNormal(hit.normal, frame.rotation[2])
    }
  }

  return adjustments
}

export function applyMotionAdjustments(
  frame: VfxEmitterFrameState,
  adjustments: MotionFrameAdjustments,
): VfxEmitterFrameState {
  if (!adjustments.position && !adjustments.rotation) return frame
  return {
    ...frame,
    position: adjustments.position ?? frame.position,
    rotation: adjustments.rotation ?? frame.rotation,
  }
}
