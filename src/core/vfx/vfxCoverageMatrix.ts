/**
 * Matriz de cobertura: campos VfxEmitterDefinitionData em parameters_list.json
 * vs parse (ritualParseVfx), runtime (vfxWebAnimation / vfxSpawnShape) e shader.
 */

import parametersList from '@/nodeStructures/default/temp/parameters_list.json'

export type VfxCoverageLayer = 'parse' | 'animation' | 'shader' | 'geometry' | 'semantic'

export type VfxFieldCoverageStatus = 'full' | 'partial' | 'missing'

export type VfxFieldCoverageRow = {
  field: string
  schemaKey: string
  parse: VfxFieldCoverageStatus
  animation: VfxFieldCoverageStatus
  shader: VfxFieldCoverageStatus
  geometry: VfxFieldCoverageStatus
  /** Inferência semântica (EmitterSemanticClassifier / extractEmitterFeatures). */
  semantic: VfxFieldCoverageStatus
}

const EMITTER_PARAM_PREFIX = 'VfxEmitterDefinitionData_'

/** Campos com suporte declarado no pipeline web (atualizado com o plano de auditoria). */
type FieldImpl = {
  parse: VfxFieldCoverageStatus
  animation: VfxFieldCoverageStatus
  shader: VfxFieldCoverageStatus
  geometry: VfxFieldCoverageStatus
  semantic?: VfxFieldCoverageStatus
}

const IMPLEMENTATION: Record<string, FieldImpl> = {
  rate: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  particleLifetime: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  lifetime: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  particleLinger: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  emitterLinger: { parse: 'full', animation: 'partial', shader: 'missing', geometry: 'missing' },
  timeBeforeFirstEmission: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  isSingleParticle: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  importance: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  emitterName: { parse: 'full', animation: 'missing', shader: 'missing', geometry: 'missing' },
  birthVelocity: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  birthDrag: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  worldAcceleration: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  birthOrbitalVelocity: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  birthRotationalVelocity0: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  bindWeight: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing', semantic: 'full' },
  attachBoneName: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing', semantic: 'partial' },
  birthAcceleration: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  EmitterPosition: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  SpawnShape: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  birthScale0: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing', semantic: 'full' },
  scale0: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  birthRotation0: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  isUniformScale: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing' },
  isGroundLayer: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'full', semantic: 'full' },
  isLocalOrientation: { parse: 'full', animation: 'partial', shader: 'missing', geometry: 'missing' },
  isDirectionOriented: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'full', semantic: 'full' },
  FlexShapeDefinition: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing', semantic: 'partial' },
  texture: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  particleColorTexture: { parse: 'full', animation: 'partial', shader: 'full', geometry: 'missing' },
  colorRenderFlags: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  textureMult: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing', semantic: 'full' },
  miscRenderFlags: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing', semantic: 'full' },
  Color: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing' },
  birthColor: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing' },
  blendMode: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing', semantic: 'full' },
  pass: { parse: 'full', animation: 'partial', shader: 'missing', geometry: 'missing' },
  alphaRef: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  disableBackfaceCull: { parse: 'full', animation: 'missing', shader: 'partial', geometry: 'missing' },
  uvRotation: { parse: 'full', animation: 'full', shader: 'full', geometry: 'full' },
  texDiv: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing', semantic: 'full' },
  numFrames: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing', semantic: 'full' },
  isRandomStartFrame: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing' },
  startFrame: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing' },
  birthUvScrollRate: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing', semantic: 'full' },
  birthUVOffset: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing' },
  reflectionDefinition: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  paletteDefinition: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing', semantic: 'full' },
  colorLookUpScales: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  colorLookUpTypeX: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  colorLookUpTypeY: { parse: 'full', animation: 'missing', shader: 'full', geometry: 'missing' },
  alphaErosionDefinition: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing', semantic: 'full' },
  primitive: { parse: 'full', animation: 'missing', shader: 'partial', geometry: 'full', semantic: 'full' },
  Filtering: { parse: 'missing', animation: 'missing', shader: 'missing', geometry: 'missing' },
  distortionDefinition: { parse: 'full', animation: 'partial', shader: 'partial', geometry: 'missing', semantic: 'full' },
  Audio: { parse: 'missing', animation: 'missing', shader: 'missing', geometry: 'missing' },
  LegacySimple: { parse: 'missing', animation: 'missing', shader: 'missing', geometry: 'missing' },
  useNavmeshMask: { parse: 'full', animation: 'full', shader: 'partial', geometry: 'missing', semantic: 'full' },
  depthBiasFactors: { parse: 'full', animation: 'missing', shader: 'partial', geometry: 'missing', semantic: 'full' },
  meshRenderFlags: { parse: 'full', animation: 'missing', shader: 'missing', geometry: 'missing', semantic: 'partial' },
  censorModulateValue: { parse: 'missing', animation: 'missing', shader: 'missing', geometry: 'missing' },
  particleIsLocalOrientation: { parse: 'full', animation: 'partial', shader: 'missing', geometry: 'missing', semantic: 'partial' },
  particleUVScrollRate: { parse: 'full', animation: 'full', shader: 'full', geometry: 'missing', semantic: 'partial' },
  uvScale: { parse: 'partial', animation: 'partial', shader: 'partial', geometry: 'missing' },
  emitOffset: { parse: 'partial', animation: 'full', shader: 'missing', geometry: 'missing' },
  rotation0: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing', semantic: 'full' },
  isRotationEnabled: { parse: 'full', animation: 'full', shader: 'missing', geometry: 'missing', semantic: 'full' },
}

function fieldNameFromSchemaKey(key: string): string {
  const parts = key.replace(EMITTER_PARAM_PREFIX, '').split('_')
  const tail = parts[parts.length - 1] ?? key
  if (tail === 'alphaErosionDefinition') return 'alphaErosionDefinition'
  if (tail === 'reflectionDefinition') return 'reflectionDefinition'
  if (tail === 'SpawnShape') return 'SpawnShape'
  if (tail === 'EmitterPosition') return 'EmitterPosition'
  if (tail === 'Color') return 'Color'
  if (tail === 'FlexShapeDefinition') return 'FlexShapeDefinition'
  if (tail === 'textureMult') return 'textureMult'
  return tail
}

function uniqueEmitterFields(): string[] {
  const fields = new Set<string>()
  for (const key of parametersList as string[]) {
    if (!key.startsWith(EMITTER_PARAM_PREFIX)) continue
    fields.add(fieldNameFromSchemaKey(key))
  }
  return [...fields].sort()
}

/** Campos implementados mas ausentes do parameters_list exportado. */
const EXTRA_SCHEMA_FIELDS = ['startFrame', 'colorLookUpScales', 'birthOrbitalVelocity', 'colorRenderFlags']

export function buildVfxCoverageMatrix(): VfxFieldCoverageRow[] {
  const fields = [...new Set([...uniqueEmitterFields(), ...EXTRA_SCHEMA_FIELDS])].sort()
  return fields.map((field) => {
    const impl = IMPLEMENTATION[field] ?? {
      parse: 'missing' as const,
      animation: 'missing' as const,
      shader: 'missing' as const,
      geometry: 'missing' as const,
    }
    return {
      field,
      schemaKey: `${EMITTER_PARAM_PREFIX}${field}`,
      parse: impl.parse,
      animation: impl.animation,
      shader: impl.shader,
      geometry: impl.geometry,
      semantic: impl.semantic ?? 'missing',
    }
  })
}

export function summarizeVfxCoverage(matrix: VfxFieldCoverageRow[] = buildVfxCoverageMatrix()) {
  const countLayer = (
    layer: keyof Pick<VfxFieldCoverageRow, 'parse' | 'animation' | 'shader' | 'geometry' | 'semantic'>,
    status: VfxFieldCoverageStatus,
  ) =>
    matrix.filter((row) => row[layer] === status).length

  return {
    totalFields: matrix.length,
    parseFull: countLayer('parse', 'full'),
    parsePartial: countLayer('parse', 'partial'),
    parseMissing: countLayer('parse', 'missing'),
    animationFull: countLayer('animation', 'full'),
    shaderFull: countLayer('shader', 'full'),
    geometryFull: countLayer('geometry', 'full'),
    semanticFull: countLayer('semantic', 'full'),
  }
}

/** Texto tabular para CI / `npm run vfx:coverage`. */
export function formatVfxCoverageReport(matrix: VfxFieldCoverageRow[] = buildVfxCoverageMatrix()): string {
  const summary = summarizeVfxCoverage(matrix)
  const lines = [
    'VFX Emitter coverage (parameters_list.json vs web pipeline)',
    `Fields: ${summary.totalFields} | parse full: ${summary.parseFull} | anim full: ${summary.animationFull} | shader full: ${summary.shaderFull} | semantic full: ${summary.semanticFull}`,
    '',
    'field\tparse\tanimation\tshader\tgeometry\tsemantic',
    ...matrix.map(
      (r) => `${r.field}\t${r.parse}\t${r.animation}\t${r.shader}\t${r.geometry}\t${r.semantic}`,
    ),
  ]
  return lines.join('\n')
}
