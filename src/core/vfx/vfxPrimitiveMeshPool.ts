/**
 * Malhas primitivas VFX pré-criadas com material transparente.
 * Evita flash branco ao instanciar emitters (R3F não usa material default).
 */

import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'

import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'
import { primitiveBoxArgs } from './vfxPrimitiveGeometry'
import {
  resolveUvRotationSafeMarginG,
  uvFromExpandedPlaneLocalPosition,
} from './vfxUvRotationSafeMargin'

const POOL_KINDS: EmitterPrimitiveGeometryKind[] = [
  'plane',
  'planar',
  'beam',
  'trail',
  'ray',
  'sphere',
  'cylinder',
  'ring',
]

let warmed = false
const templateMeshes = new Map<EmitterPrimitiveGeometryKind, Mesh>()
const rotSafeTemplateMeshes = new Map<'plane' | 'planar', Mesh>()
let placeholderMaterial: MeshBasicMaterial | null = null

export type CloneVfxPrimitiveGeometryOptions = {
  uvRotationSafe?: boolean
  /** texDiv do emitter — ajusta g em quads não quadrados. */
  texDiv?: [number, number] | null
}

/**
 * Centro 1×1 mantém UV [0,1]; bordas recebem UV estendida (padding) a partir da posição.
 */
function applyUvPaddingFromPositions(geometry: BufferGeometry): void {
  const posAttr = geometry.attributes.position
  const uvAttr = geometry.attributes.uv
  if (!posAttr || !uvAttr) return
  for (let i = 0; i < uvAttr.count; i++) {
    const baked = uvFromExpandedPlaneLocalPosition(posAttr.getX(i), posAttr.getY(i))
    uvAttr.setXY(i, baked[0], baked[1])
  }
  uvAttr.needsUpdate = true
}

/** Plano expandido ×g: geometria maior, UV central 0–1 + padding nas bordas. */
export function createUvRotationSafePlaneGeometry(
  g: number = resolveUvRotationSafeMarginG(null),
): BufferGeometry {
  const geometry = new PlaneGeometry(g, g)
  applyUvPaddingFromPositions(geometry)
  return geometry
}

export function createEmitterPrimitiveGeometry(kind: EmitterPrimitiveGeometryKind): BufferGeometry {
  if (kind === 'beam') return new BoxGeometry(...primitiveBoxArgs('beam'))
  if (kind === 'trail') return new BoxGeometry(...primitiveBoxArgs('trail'))
  if (kind === 'planar') return new PlaneGeometry(1, 1)
  if (kind === 'ray') return new BoxGeometry(...primitiveBoxArgs('ray'))
  if (kind === 'sphere') return new SphereGeometry(0.5, 24, 24)
  if (kind === 'cylinder') return new CylinderGeometry(0.5, 0.5, 0.12, 32, 1, true)
  if (kind === 'ring') return new TorusGeometry(0.48, 0.04, 16, 48)
  return new PlaneGeometry(1, 1)
}

function resolvePoolKind(kind: EmitterPrimitiveGeometryKind): EmitterPrimitiveGeometryKind {
  if (kind === 'mesh') return 'plane'
  return POOL_KINDS.includes(kind) ? kind : 'plane'
}

/** Material placeholder partilhado (opacity 0) até o material do emitter estar pronto. */
export function getVfxPrimitivePlaceholderMaterial(): MeshBasicMaterial {
  warmVfxPrimitiveMeshPool()
  return placeholderMaterial!
}

/** Pré-instancia todas as primitivas ao abrir o VFX Editor. */
export function warmVfxPrimitiveMeshPool(): void {
  if (warmed) return

  placeholderMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
  })

  for (const kind of POOL_KINDS) {
    const geometry = createEmitterPrimitiveGeometry(kind)
    const mesh = new Mesh(geometry, placeholderMaterial)
    mesh.visible = false
    mesh.frustumCulled = false
    templateMeshes.set(kind, mesh)
  }

  for (const kind of ['plane', 'planar'] as const) {
    const geometry = createUvRotationSafePlaneGeometry()
    const mesh = new Mesh(geometry, placeholderMaterial)
    mesh.visible = false
    mesh.frustumCulled = false
    rotSafeTemplateMeshes.set(kind, mesh)
  }

  warmed = true
}

/** Cópia da geometria do template (material fica a cargo do emitter). */
export function cloneVfxPrimitiveGeometry(
  kind: EmitterPrimitiveGeometryKind,
  options?: CloneVfxPrimitiveGeometryOptions,
): BufferGeometry {
  warmVfxPrimitiveMeshPool()
  const poolKind = resolvePoolKind(kind)

  if (options?.uvRotationSafe && (poolKind === 'plane' || poolKind === 'planar')) {
    const g = resolveUvRotationSafeMarginG(options.texDiv ?? null)
    const rotSafe = rotSafeTemplateMeshes.get(poolKind)
    if (rotSafe && Math.abs(g - resolveUvRotationSafeMarginG(null)) < 1e-6) {
      return rotSafe.geometry.clone()
    }
    return createUvRotationSafePlaneGeometry(g)
  }

  const template = templateMeshes.get(poolKind) ?? templateMeshes.get('plane')
  if (!template) {
    return createEmitterPrimitiveGeometry(poolKind)
  }
  return template.geometry.clone()
}

export function isVfxPrimitiveMeshPoolWarmed(): boolean {
  return warmed
}

export function disposeVfxPrimitiveMeshPool(): void {
  if (!warmed) return
  for (const mesh of templateMeshes.values()) {
    mesh.geometry.dispose()
  }
  templateMeshes.clear()
  for (const mesh of rotSafeTemplateMeshes.values()) {
    mesh.geometry.dispose()
  }
  rotSafeTemplateMeshes.clear()
  placeholderMaterial?.dispose()
  placeholderMaterial = null
  warmed = false
}
