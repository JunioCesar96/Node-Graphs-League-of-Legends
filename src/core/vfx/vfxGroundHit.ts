/** Resolução de hit no chão do preview (plano horizontal XY, altura em Z). */



export type VfxGroundHit = {

  /** Altura no eixo Three Z (equiv. Y LoL / “cima” no jogo). */

  z: number

  normal: [number, number, number]

  /** Hit veio de raycast em malha (vs plano fallback). */

  fromMesh?: boolean

}



/** Amostra no plano horizontal Three (X, Y); devolve altura Z. */

export type VfxGroundHitResolver = (x: number, y: number) => VfxGroundHit | null



/** Plano horizontal em Z fixo (chão decorativo do viewport). */

export function groundPlaneHitResolver(groundZ: number): VfxGroundHitResolver {

  return (x: number, y: number) => ({

    z: groundZ,

    normal: [0, 0, 1],

  })

}



/** Fallback quando não há chão visível. */

export const VFX_GROUND_PLANE_Z = 0.02



/** @deprecated Use `VFX_GROUND_PLANE_Z` — mantido para testes legados. */

export const VFX_GROUND_PLANE_Y = VFX_GROUND_PLANE_Z



export function resolveGroundHit(

  x: number,

  y: number,

  resolver?: VfxGroundHitResolver | null,

): VfxGroundHit {

  return resolver?.(x, y) ?? { z: VFX_GROUND_PLANE_Z, normal: [0, 0, 1] }

}


