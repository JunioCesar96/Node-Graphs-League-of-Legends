/** Modelo de dados VFX parseado a partir de ritual Class Group. */

export type VfxProbabilityTable = {
  keyTimes: number[]
  keyValues: number[]
}

export type VfxDynamics = {
  kind: string
  times: number[]
  values: unknown[]
  probabilityTables: (VfxProbabilityTable | null)[]
}

export type VfxEmbedValue = {
  kind: string
  constant: unknown
  dynamics: VfxDynamics | null
}

export type VfxTextureMultDef = {
  texturePath: string
  uvScale: [number, number]
  uvScroll: VfxEmbedValue | null
  birthUvOffset: VfxEmbedValue | null
}

export type VfxReflectionDef = {
  reflectionMapTexture: string
  reflectionOpacityDirect: number
  reflectionOpacityGlancing: number
  reflectionFresnel: number
  reflectionFresnelColor: [number, number, number, number]
}

/** VfxPaletteDefinitionData — gradiente 1D na textura, índice via selector + canal da sprite. */
export type VfxPaletteDefinition = {
  paletteTexture: string
  paletteSelector: VfxEmbedValue | null
  paletteCount: number
  paletteSrcMixColor: [number, number, number, number]
}

/** VfxShapeLegacy: offset radial + ângulo aleatório à volta de emitRotationAxes. */
export type VfxSpawnShapeLegacy = {
  kind: 'legacy'
  emitOffset: VfxEmbedValue | null
  emitRotationAngle: VfxEmbedValue | null
  emitRotationAxis: [number, number, number]
}

export type VfxSpawnShapeBox = {
  kind: 'box'
  emitOffset: [number, number, number]
  dimensions: [number, number, number]
}

export type VfxSpawnShapeCylinder = {
  kind: 'cylinder'
  emitOffset: [number, number, number]
  radius: number
  height: number
  flags: number
}

export type VfxSpawnShape =
  | VfxSpawnShapeLegacy
  | VfxSpawnShapeBox
  | VfxSpawnShapeCylinder
  | { kind: 'offset'; offset: [number, number, number] }

/** VfxDistortionDefinitionData — warp UV (normal map + strength). */
export type VfxDistortionDefinition = {
  distortion: number
  distortionMode: number
  normalMapTexture: string
}

/** VfxAlphaErosionDefinitionData — dissolve de alpha via mapa + drive curve. */
export type VfxAlphaErosionDefinition = {
  erosionMapName: string
  erosionDriveCurve: VfxEmbedValue | null
  erosionFeatherIn: number
  erosionFeatherOut: number
  erosionMapChannelMixer: [number, number, number, number]
}

export type ParsedVfxEmitterFull = {
  name: string
  isSingleParticle: boolean
  isRandomStartFrame: boolean
  isLocalOrientation: boolean
  isRotationEnabled: boolean
  isUniformScale: boolean
  isGroundLayer: boolean
  useNavmeshMask: boolean
  /** Slope + constant depth bias (Brand ground: `{-1, -200}`). */
  depthBiasFactors: [number, number] | null
  meshRenderFlags: number
  /** u8 ritual — bit 0: multiply particleColorTexture com sprite. */
  colorRenderFlags: number
  particleIsLocalOrientation: boolean
  particleUVScrollRate: VfxEmbedValue | null
  disableBackfaceCull: boolean
  miscRenderFlags: number
  lifetime: number
  particleLifetime: number
  particleLinger: number
  emitterLinger: number
  timeBeforeFirstEmission: number
  rate: number
  blendMode: number
  pass: number
  importance: number
  alphaRef: number
  numFrames: number | null
  texDiv: [number, number] | null
  uvRotation: number
  emitterPosition: [number, number, number]
  spawnOffset: [number, number, number]
  spawnShape: VfxSpawnShape | null
  birthScale0: VfxEmbedValue | null
  scale0: VfxEmbedValue | null
  birthRotation0: VfxEmbedValue | null
  /** Rotação integrada ao longo da vida da partícula (ex. FireCards2 Dance). */
  rotation0: VfxEmbedValue | null
  birthVelocity: VfxEmbedValue | null
  birthOrbitalVelocity: VfxEmbedValue | null
  birthDrag: VfxEmbedValue | null
  worldAcceleration: VfxEmbedValue | null
  birthRotationalVelocity0: VfxEmbedValue | null
  bindWeight: VfxEmbedValue | null
  /** Hash ritual `0x67425298` ou `boneName` — osso do personagem na cena. */
  attachBoneName: string | null
  birthAcceleration: VfxEmbedValue | null
  color: VfxEmbedValue | null
  birthColor: VfxEmbedValue | null
  colorLookUpScales: [number, number] | null
  colorLookUpTypeX: number
  colorLookUpTypeY: number
  startFrame: number | null
  isDirectionOriented: boolean
  alphaErosion: VfxAlphaErosionDefinition | null
  distortionDefinition: VfxDistortionDefinition | null
  trailBirthTilingSize: [number, number, number] | null
  texture: string
  particleColorTexture: string
  textureMult: VfxTextureMultDef | null
  birthUvScrollRate: VfxEmbedValue | null
  birthUvOffset: VfxEmbedValue | null
  meshPath: string | null
  skeletonPath: string | null
  animationPath: string | null
  primitiveKind: string
  flexShape: import('./vfxFlexShape').VfxFlexShapeDefinition | null
  reflection: VfxReflectionDef | null
  paletteDefinition: VfxPaletteDefinition | null
  scalars: [string, string, string][]
}

export type ParsedVfxSystemFull = {
  particleName: string
  particlePath: string
  emitters: ParsedVfxEmitterFull[]
  warnings: string[]
}

/** Um efeito VFX no catálogo do ritual (entrada de map ou bloco isolado). */
export type VfxCatalogEntry = {
  id: string
  label: string
  mapKey: string | null
  system: ParsedVfxSystemFull
}

export type ParsedVfxRitualCatalog = {
  entries: VfxCatalogEntry[]
  warnings: string[]
}
