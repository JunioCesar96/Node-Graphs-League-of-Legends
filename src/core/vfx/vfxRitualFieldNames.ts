import { lolFnv1aHash, normalizeRitualHashKey } from './lolFnv1aHash'

/** Tipos embed/classe conhecidos em rituais PROP (não derivam de fnv do nome da classe em todos os casos). */
export const RITUAL_VFX_TYPE_HASH: Record<string, number> = {
  VfxSystemDefinitionData: 0x45cd899f,
  VfxEmitterDefinitionData: 0x09cde442,
  ValueFloat: 0x04300058,
  ValueVector3: 0x68dc32b6,
  ValueColor: 0x074f91dd,
  ValueVector2: 0x69dc3449,
  VfxAnimatedFloatVariableData: 0xfe064c88,
  VfxAnimatedVector3fVariableData: 0xacd81180,
  VfxAnimatedColorVariableData: 0x4349c5f5,
  VfxAnimatedVector2fVariableData: 0x2e0ea245,
  VfxProbabilityTableData: 0x53a6c97e,
  VfxFlexShapeDefinitionData: 0xb13097f0,
  VfxPrimitiveArbitraryQuad: 0x4beb81fd,
  VfxPrimitiveMesh: 0x8594e839,
  VfxPrimitiveAttachedMesh: 0xa4aea2a5,
  VfxPrimitiveCamera: 0x9018dbf3,
  VfxPrimitiveRay: 0xa14bd4d0,
  VfxShapeLegacy: 0x4f4e2ed7,
  VfxShapeBox: 0xba945ee1,
  VfxShapeSphere: 0x3dbe415d,
  VfxShapeCylinder: 0x12ab94a6,
  VfxProjectionDefinitionData: 0x0f743d03,
  VfxMeshDefinitionData: 0x6a88780b,
  VfxAlphaErosionDefinitionData: 0x5e842b9b,
  VfxLingerDefinitionData: 0x9b19f2b5,
}

const VFX_SYSTEM_FIELDS = ['particleName', 'particlePath', 'complexEmitterDefinitionData', 'visibilityRadius', 'maxDuration'] as const

const VFX_EMITTER_FIELDS = [
  'emitterName',
  'texture',
  'particleColorTexture',
  'blendMode',
  'pass',
  'importance',
  'alphaRef',
  'miscRenderFlags',
  'meshRenderFlags',
  'numFrames',
  'startFrame',
  'texDiv',
  'uvMode',
  'texAddressModeBase',
  'useNavMeshMask',
  'timeBeforeFirstEmission',
  'isSingleParticle',
  'isRandomStartFrame',
  'isLocalOrientation',
  'isUniformScale',
  'isGroundLayer',
  'isDirectionOriented',
  'disableBackfaceCull',
  'particleIsLocalOrientation',
  'lifetime',
  'particleLinger',
  'emitterLinger',
  'rate',
  'birthScale0',
  'scale0',
  'birthRotation0',
  'birthVelocity',
  'birthOrbitalVelocity',
  'birthDrag',
  'worldAcceleration',
  'birthRotationalVelocity0',
  'bindWeight',
  'birthAcceleration',
  'color',
  'birthColor',
  'particleLifetime',
  'emitterPosition',
  'birthUvScrollRate',
  'birthUVOffset',
  'birthUvOffset',
  'uvRotation',
  'spawnShape',
  'alphaErosionDefinition',
  'textureMult',
  'flexShapeDefinition',
  'reflectionDefinition',
  'paletteDefinition',
  'primitive',
  'filtering',
  'distortionDefinition',
  'audio',
  'legacySimple',
  'colorLookUpTypeX',
  'colorLookUpTypeY',
  'colorLookUpScales',
  'flexShapeScale',
  'attachBoneName',
  'boneName',
  'constantValue',
  'dynamics',
  'birthUvOffsetMult',
] as const

const hashToFieldName = new Map<string, string>()

function registerField(name: string): void {
  hashToFieldName.set(`0x${lolFnv1aHash(name).toString(16)}`, name)
}

for (const name of VFX_SYSTEM_FIELDS) registerField(name)
for (const name of VFX_EMITTER_FIELDS) registerField(name)

for (const [typeName, hash] of Object.entries(RITUAL_VFX_TYPE_HASH)) {
  hashToFieldName.set(`0x${hash.toString(16)}`, typeName)
}

/** Converte chave textual ou hash PROP para nome legível (ex.: 0x3d25b8ce → emitterName). */
export function resolveRitualFieldName(key: string): string {
  const trimmed = key.trim()
  if (!/^0x[0-9a-fA-F]+$/i.test(trimmed)) return trimmed
  const normalized = normalizeRitualHashKey(trimmed)
  return hashToFieldName.get(normalized) ?? trimmed
}

/** Resolve tipo embed (ex.: 0x04300058 → ValueFloat) para parseEmbedBlock. */
export function resolveRitualTypeName(typeKey: string): string {
  if (!/^0x[0-9a-fA-F]+$/i.test(typeKey.trim())) return typeKey.trim()
  return resolveRitualFieldName(typeKey)
}
