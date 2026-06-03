/** Tipos do Transform Semantic Engine (Fase 5). */

export type OrientationMode =
  | 'GroundAligned'
  | 'BillboardCamera'
  | 'DirectionAligned'
  | 'LocalOrientation'
  | 'ShockwaveRadial'
  | 'MeshAttached'

export type ScaleSpace = 'PrimitiveLocal' | 'WorldUniform' | 'GroundPlane'

export type SimulationSpace = 'World' | 'Local' | 'EmitterAttached'

export type TransformOrder = 'OrientThenScale' | 'ScaleThenOrient' | 'GroundBasisFirst'

export type BillboardMode = 'none' | 'camera' | 'velocity'

export type TransformPipelineDefinition = {
  orientationMode: OrientationMode
  scaleSpace: ScaleSpace
  simulationSpace: SimulationSpace
  transformOrder: TransformOrder
  billboardMode: BillboardMode
  /** Usar leagueLocalToThree (matriz P) para rotação LoL → Three. */
  useLeagueMatrixP: boolean
}
