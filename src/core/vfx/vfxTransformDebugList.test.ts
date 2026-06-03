import { describe, expect, it } from 'vitest'

import type { ParsedVfxEmitterFull } from './vfxModel'
import type { VfxEmitterPreviewEntry } from './vfxPreviewEmitterEntries'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from './semantic/transformPipelineResolver'
import { computeParticleTransform } from './vfxTransformEngine'
import { buildShaderMaterialDescriptor } from './vfxWebMaterials'
import { extractEmitterFeatures } from './semantic/vfxEmitterFeatures'
import {
  birthOrbitalLoLAxisRows,
  buildVfxTransformDebugList,
  formatBirthOrbitalLoLAxesViewportLabel,
} from './vfxTransformDebugList'

function makeEntry(): { entry: VfxEmitterPreviewEntry; parsed: ParsedVfxEmitterFull } {
  const parsed: ParsedVfxEmitterFull = {
    name: 'cracks2',
    isSingleParticle: true,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isRotationEnabled: false,
    isUniformScale: true,
    isGroundLayer: true,
    useNavmeshMask: true,
    depthBiasFactors: null,
    meshRenderFlags: 0,
    particleIsLocalOrientation: false,
    particleUVScrollRate: null,
    disableBackfaceCull: false,
    miscRenderFlags: 1,
    lifetime: 1,
    particleLifetime: 11,
    particleLinger: 0.4,
    emitterLinger: 0,
    timeBeforeFirstEmission: 0,
    rate: 1,
    blendMode: 1,
    pass: 2,
    importance: 0,
    alphaRef: 0,
    numFrames: null,
    texDiv: null,
    uvRotation: 0,
    emitterPosition: [0, 0, 0],
    spawnOffset: [0, 0, 0],
    spawnShape: null,
    birthScale0: { constant: [55, 600, 600], dynamics: null },
    scale0: null,
    birthRotation0: { constant: [-90, -90, 0], dynamics: null },
    rotation0: null,
    birthVelocity: null,
    birthOrbitalVelocity: null,
    birthDrag: null,
    worldAcceleration: null,
    birthRotationalVelocity0: null,
    bindWeight: null,
    attachBoneName: null,
    birthAcceleration: null,
    color: null,
    birthColor: null,
    colorLookUpScales: null,
    colorLookUpTypeX: 0,
    colorLookUpTypeY: 0,
    startFrame: null,
    isDirectionOriented: false,
    alphaErosion: null,
    distortionDefinition: null,
    trailBirthTilingSize: null,
    texture: 'tex',
    particleColorTexture: '',
    textureMult: null,
    birthUvScrollRate: null,
    birthUvOffset: null,
    meshPath: null,
    skeletonPath: null,
    animationPath: null,
    primitiveKind: 'arbitrary_quad',
    paletteDefinition: null,
    reflection: null,
    flexShape: null,
    uvScale: null,
    emitOffset: null,
    scalars: [],
  }

  const composable = getComposablePipeline(parsed)
  const transformPipeline = resolveTransformPipeline(parsed, composable)
  const particle = computeParticleTransform({
    emitter: parsed,
    vfxScale: 0.01,
    particleTime: 0,
    particleNormalized: 0,
    seed: 1,
    lockMotion: false,
    composablePipeline: composable,
    transformPipeline,
  })

  const frame = {
    position: particle.position,
    scale: particle.scale,
    rotation: particle.rotation,
    color: [1, 1, 1, 1] as [number, number, number, number],
    spriteOffset: [0, 0] as [number, number],
    uvScroll: [0, 0] as [number, number],
    opacity: 1,
    erosionDrive: 1,
    distortionDrive: 0,
    visible: true,
    groundScaleKind: composable.profile.groundScaleKind,
    transformPipeline: particle.transformPipeline,
    worldMatrix: particle.worldMatrix,
    rotationLolDeg: particle.rotationLolDeg,
    rotationViewLolDeg: particle.rotationViewLolDeg,
    birthRotationBaselineLol: particle.birthRotationBaselineLol,
  }

  const material = buildShaderMaterialDescriptor({
    emitter: parsed,
    frame,
    pipeline: composable,
    features: extractEmitterFeatures(parsed),
    textureUrl: null,
    textureIsDds: false,
    colorTextureUrl: null,
    colorTextureIsDds: false,
    textureMultUrl: null,
    textureMultIsDds: false,
    reflectionCubeUrl: null,
    reflectionCubeIsDds: false,
    paletteTextureUrl: null,
    paletteTextureIsDds: false,
    erosionTextureUrl: null,
    erosionTextureIsDds: false,
    distortionTextureUrl: null,
    distortionTextureIsDds: false,
    renderOptions: { particleIndex: 0, particleNormalized: 0 },
  })

  const entry: VfxEmitterPreviewEntry = {
    parsed,
    id: 'e-p0',
    name: 'cracks2',
    particleIndex: 0,
    particleTime: 0,
    particleNormalized: 0,
    visible: true,
    frame,
    semanticProfile: composable.profile,
    composablePipeline: composable,
    transformPipeline,
    material,
    meshGeometry: null,
    meshPath: null,
    skeletonPath: null,
    animationPath: null,
    skinnedBundle: null,
    skl: null,
    anm: null,
    skinnedAnimFrame: 0,
  }

  return { entry, parsed }
}

describe('buildVfxTransformDebugList', () => {
  it('lista campos de transform para cracks2', () => {
    const { entry, parsed } = makeEntry()
    const rows = buildVfxTransformDebugList(entry, parsed)
    const labels = rows.map((row) => row.label)

    expect(labels).toContain('Orientação')
    expect(labels).toContain('Posição')
    expect(labels).toContain('birthRotation0 (ritual LoL)')
    expect(labels).toContain('Escala ground')
    expect(labels).toContain('birthScale0 X (LoL)')
    expect(labels).toContain('birthScale0 Y (LoL)')
    expect(labels).toContain('birthScale0 Z (LoL)')
    expect(labels).toContain('Remap escala')

    const orient = rows.find((row) => row.label === 'Orientação')
    expect(orient?.value).toBe('GroundAligned')

    const birthRot = rows.find((row) => row.label === 'birthRotation0 (ritual LoL)')
    expect(birthRot?.value).toContain('-90')

    const birthX = rows.find((row) => row.label === 'birthScale0 X (LoL)')
    expect(birthX?.value).toBe('55.00')

    const remap = rows.find((row) => row.label === 'Remap escala')
    expect(remap?.value).toContain('ground')

    expect(labels).not.toContain('ω orbital X (LoL °/frame)')
  })

  it.skip('hoop2: linhas ω orbital e viewport label', () => {
    const parsed = makeEntry().parsed
    parsed.birthOrbitalVelocity = { constant: [0, 2, 0], dynamics: null }
    const orbitalRows = birthOrbitalLoLAxisRows(parsed)
    expect(orbitalRows.map((r) => r.label)).toEqual([
      'ω orbital X (LoL °/frame)',
      'ω orbital Y (LoL °/frame)',
      'ω orbital Z (LoL °/frame)',
    ])
    expect(orbitalRows[1]?.value).toBe('0.00')
    expect(orbitalRows[2]?.value).toBe('2.00')
    expect(formatBirthOrbitalLoLAxesViewportLabel(parsed)).toBe('ω X=0.0 Y=0.0 Z=2.00 °/fr')
    expect(formatBirthOrbitalLoLAxesViewportLabel(parsed, 1, 5, 0.5)).toBe('ω X=0.0 Y=0.0 Z=60.00 °')
  })

  it.skip('ω=12 °/frame: label acumulado Y=720 quando particleTime=2 (60 fr)', () => {
    const parsed = makeEntry().parsed
    parsed.birthOrbitalVelocity = { constant: [0, 12, 0], dynamics: null }
    expect(formatBirthOrbitalLoLAxesViewportLabel(parsed, 2, 5, 1)).toBe('ω X=0.0 Y=0.0 Z=720.0 °')
  })

  it('mostra birthVelocity efetivo Z-only e matrix44 XY', () => {
    const { entry, parsed } = makeEntry()
    parsed.birthVelocity = { constant: [45, 30, 60], dynamics: null }
    parsed.scalars = [['matrix44', 'mat4', '1 0 0 0 0 1 0 0 0 0 1 0 10 20 0 1']]
    const rows = buildVfxTransformDebugList(entry, parsed)
    const byLabel = new Map(rows.map((r) => [r.label, r.value]))
    expect(byLabel.get('birthVelocity (ritual vec3)')).toContain('{X,Z,Y}')
    expect(byLabel.get('birthVelocity efetivo (Z-only)')).toBe('0.00, 30.00, 0.00')
    expect(byLabel.get('matrix44 posição')).toContain('XY only')
  })
})
