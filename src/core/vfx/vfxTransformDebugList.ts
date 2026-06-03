import type { VfxEmitterPreviewEntry } from '@/core/vfx/vfxPreviewEmitterEntries'
import type { ParsedVfxEmitterFull } from '@/core/vfx/vfxModel'
import type { LoLGroundQuadScaleKind } from '@/core/vfx/vfxWebAnimation'
import { birthRotationConstant } from '@/core/vfx/vfxPrimitives'

export type VfxTransformDebugRow = {
  label: string
  value: string
  /** Cor opcional para valor (ex.: classificação ground). */
  accent?: string
}

const GROUND_SCALE_ACCENTS: Record<LoLGroundQuadScaleKind, string> = {
  decal: '#5ec8be',
  flipbookSquare: '#e8b84a',
  strip: '#e85a5a',
  neutral: '#9a9a9a',
}

function fmtNum(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 100) return n.toFixed(1)
  if (abs >= 1) return n.toFixed(2)
  return n.toFixed(digits)
}

function fmtVec3(v: [number, number, number], digits = 3): string {
  return `${fmtNum(v[0], digits)}, ${fmtNum(v[1], digits)}, ${fmtNum(v[2], digits)}`
}

function fmtVec3DegRad(v: [number, number, number]): string {
  const deg = v.map((r) => (r * 180) / Math.PI)
  return `${fmtVec3(deg, 1)}°`
}

function embedConstantLabel(embed: { constant?: unknown } | null): string | null {
  if (!embed?.constant || !Array.isArray(embed.constant)) return null
  const value = embed.constant as number[]
  if (value.length < 3) return null
  return fmtVec3([Number(value[0]), Number(value[1]), Number(value[2])], 1)
}

function embedVec3Constant(embed: { constant?: unknown } | null): [number, number, number] | null {
  if (!embed?.constant || !Array.isArray(embed.constant)) return null
  const value = embed.constant as number[]
  if (value.length < 3) return null
  return [Number(value[0]), Number(value[1]), Number(value[2])]
}

function matrix44TranslationXYFromScalars(
  parsed?: ParsedVfxEmitterFull | null,
): [number, number] | null {
  for (const [name, , value] of parsed?.scalars ?? []) {
    if (!String(name).toLowerCase().includes('matrix44')) continue
    const matches = String(value).match(/-?\d+(?:\.\d+)?/g) ?? []
    if (matches.length < 16) continue
    const tx = Number(matches[12] ?? 0)
    const ty = Number(matches[13] ?? 0)
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null
    if (Math.abs(tx) <= 1e-6 && Math.abs(ty) <= 1e-6) return null
    return [tx, ty]
  }
  return null
}

/** Linhas birthScale0 por eixo LoL (X, Y, Z do ritual). */
export function birthScaleLoLAxisRows(
  parsed?: ParsedVfxEmitterFull | null,
): VfxTransformDebugRow[] {
  const vec = embedVec3Constant(parsed?.birthScale0 ?? null)
  if (!vec) return []
  return [
    { label: 'birthScale0 X (LoL)', value: fmtNum(vec[0], 1) },
    { label: 'birthScale0 Y (LoL)', value: fmtNum(vec[1], 1) },
    { label: 'birthScale0 Z (LoL)', value: fmtNum(vec[2], 1) },
  ]
}

function hasNonZeroVec3(vec: [number, number, number] | null): boolean {
  if (!vec) return false
  return vec.some((v) => Math.abs(Number(v)) > 1e-6)
}

/** Linhas birthOrbitalVelocity por eixo LoL (ω ritual em °/frame). */
export function birthOrbitalLoLAxisRows(
  parsed?: ParsedVfxEmitterFull | null,
): VfxTransformDebugRow[] {
  void parsed
  return []
}

/** ω acumulado (°) = ω °/frame × frames simulados. */
export function resolveOrbitalOmegaEffectiveLol(
  parsed: ParsedVfxEmitterFull,
  seed: number,
  particleTime: number,
  particleNormalized: number,
): [number, number, number] {
  void parsed
  void seed
  void particleTime
  void particleNormalized
  return [0, 0, 0]
}

/** Linhas ω acumulado (× frames) para o inspector. */
export function birthOrbitalEffectiveLoLAxisRows(
  parsed: ParsedVfxEmitterFull,
  seed: number,
  particleTime: number,
  particleNormalized: number,
): VfxTransformDebugRow[] {
  void parsed
  void seed
  void particleTime
  void particleNormalized
  return []
}

const SCALE_TRANSFORM_LABELS: Record<string, string> = {
  remapGroundDecal: 'remap decal (2 eixos grandes → plano)',
  remapFlipbookSquare: 'remap flipbook (L → quadrado)',
  fixBillboardZeroAxis: 'billboard (eixo 0 = normal)',
  preserveLoL: 'passthrough (eixo a eixo)',
}

function resolveScaleRemapRow(
  entry: VfxEmitterPreviewEntry,
  parsed?: ParsedVfxEmitterFull | null,
): VfxTransformDebugRow | null {
  const { frame, composablePipeline, transformPipeline } = entry
  const tp = frame.transformPipeline ?? transformPipeline
  const groundKind = frame.groundScaleKind
  const strategy = composablePipeline?.scaleTransform

  if (groundKind) {
    return {
      label: 'Remap escala',
      value: `ground · ${groundKind}`,
      accent: GROUND_SCALE_ACCENTS[groundKind],
    }
  }

  if (tp?.scaleSpace === 'GroundPlane') {
    return {
      label: 'Remap escala',
      value: 'GroundPlane (sem classificação ground)',
      accent: '#9a9a9a',
    }
  }

  if (strategy && strategy in SCALE_TRANSFORM_LABELS) {
    return {
      label: 'Remap escala',
      value: SCALE_TRANSFORM_LABELS[strategy] ?? strategy,
    }
  }

  if (parsed?.isGroundLayer) {
    return { label: 'Remap escala', value: 'ground layer (sem kind)' }
  }

  return { label: 'Remap escala', value: SCALE_TRANSFORM_LABELS.preserveLoL }
}

/** Linhas label/valor para Inspector e resumo no viewport 3D. */
export function buildVfxTransformDebugList(
  entry: VfxEmitterPreviewEntry,
  parsed?: ParsedVfxEmitterFull | null,
): VfxTransformDebugRow[] {
  const { frame, material, semanticProfile, composablePipeline, transformPipeline } = entry
  const tp = frame.transformPipeline ?? transformPipeline

  const sf = material.shaderFeatures
  const shaderFlags = [
    sf.flipbook ? 'flipbook' : null,
    sf.erosion ? 'erosion' : null,
    sf.softAlpha ? 'softα' : null,
    sf.distortion ? 'distort' : null,
    sf.groundNavmeshClip ? 'navmesh' : null,
    sf.depthBias ? 'depthBias' : null,
  ]
    .filter(Boolean)
    .join(', ')

  const rows: VfxTransformDebugRow[] = []

  if (entry.particleIndex > 0) {
    rows.push({ label: 'Partícula', value: `#${entry.particleIndex}` })
  }

  if (tp) {
    rows.push({
      label: 'Orientação',
      value: tp.orientationMode,
    })
    rows.push({
      label: 'Ordem transform',
      value: tp.transformOrder,
    })
  }

  const traits = composablePipeline.traits.slice(0, 5).join(', ')
  if (traits) {
    rows.push({ label: 'Traits', value: traits })
  }

  const matStrategies = composablePipeline.material.slice(0, 4).join(', ')
  if (matStrategies) {
    rows.push({ label: 'Material', value: matStrategies })
  }

  rows.push({
    label: 'Geometria',
    value: `${semanticProfile.geometry.kind} · ${material.geometryKind}`,
  })

  if (shaderFlags) {
    rows.push({ label: 'Shader', value: shaderFlags })
  }

  rows.push({ label: 'Intent', value: material.materialIntent })

  if (material.planeFacing) {
    rows.push({ label: 'Plane facing', value: material.planeFacing })
  }

  const groundKind = frame.groundScaleKind
  if (groundKind) {
    rows.push({
      label: 'Escala ground',
      value: groundKind,
      accent: GROUND_SCALE_ACCENTS[groundKind],
    })
  }

  if (material.polygonOffset && material.shaderFeatures.depthBias) {
    rows.push({
      label: 'Depth bias',
      value: `${material.polygonOffsetFactor} / ${material.polygonOffsetUnits}`,
    })
  }

  if (material.groundClipZ != null) {
    rows.push({
      label: 'Ground clip Z',
      value: fmtNum(material.groundClipZ, 3),
    })
  }

  rows.push({ label: 'Posição', value: fmtVec3(frame.position) })
  rows.push({ label: 'Escala preview (Three.js)', value: fmtVec3(frame.scale) })
  rows.push({ label: 'Rotação mesh', value: fmtVec3DegRad(frame.rotation) })
  rows.push({
    label: 'Plane base',
    value: fmtVec3DegRad(material.planeBaseRotation),
  })

  const birthRotRitual = birthRotationConstant(parsed?.birthRotation0 ?? null)
  if (birthRotRitual) {
    rows.push({
      label: 'birthRotation0 (ritual LoL)',
      value: fmtVec3(birthRotRitual, 1),
    })
  }

  const rotationView = entry.frame.rotationViewLolDeg
  if (rotationView) {
    rows.push({
      label: 'birthRotation view 3D',
      value: fmtVec3(rotationView, 1),
    })
  }
  const baseline = entry.frame.birthRotationBaselineLol
  if (baseline && baseline.some((v) => Math.abs(v) > 1e-6)) {
    rows.push({
      label: 'birthRotation baseline LoL',
      value: fmtVec3(baseline, 1),
    })
  }

  const birthScaleRitual = embedConstantLabel(parsed?.birthScale0 ?? null)
  if (birthScaleRitual) {
    rows.push({ label: 'birthScale0 (ritual vec3)', value: birthScaleRitual })
    rows.push(...birthScaleLoLAxisRows(parsed))
  }

  const birthVelocityRaw = embedVec3Constant(parsed?.birthVelocity ?? null)
  if (birthVelocityRaw && hasNonZeroVec3(birthVelocityRaw)) {
    const effective: [number, number, number] = [0, Number(birthVelocityRaw[1] ?? 0), 0]
    rows.push({ label: 'birthVelocity (ritual vec3)', value: `${fmtVec3(birthVelocityRaw, 2)} {X,Z,Y}` })
    rows.push({ label: 'birthVelocity efetivo (Z-only)', value: fmtVec3(effective, 2) })
  }

  const matrix44XY = matrix44TranslationXYFromScalars(parsed)
  rows.push({
    label: 'matrix44 posição',
    value: matrix44XY ? `XY only (${fmtNum(matrix44XY[0], 2)}, ${fmtNum(matrix44XY[1], 2)})` : 'ausente',
  })


  const scaleRemap = resolveScaleRemapRow(entry, parsed)
  if (scaleRemap) {
    rows.push(scaleRemap)
  }

  if (tp?.scaleSpace) {
    rows.push({ label: 'Espaço escala', value: tp.scaleSpace })
  }

  if (parsed?.isGroundLayer) {
    rows.push({ label: 'Ground layer', value: 'sim' })
  }
  if (parsed?.useNavmeshMask) {
    rows.push({ label: 'Navmesh mask', value: 'sim' })
  }

  rows.push({
    label: 'World matrix',
    value: frame.worldMatrix && frame.worldMatrix.length >= 16 ? '16×4' : '—',
  })

  return rows
}

/** Texto compacto para etiqueta 3D (resumo legível no viewport). */
export function buildVfxTransformDebugViewportLabel(
  entry: VfxEmitterPreviewEntry,
  rows: VfxTransformDebugRow[],
): string {
  const { material, semanticProfile, composablePipeline, transformPipeline, frame } = entry
  const tp = frame.transformPipeline ?? transformPipeline
  const byLabel = new Map(rows.map((row) => [row.label, row.value]))

  const sf = material.shaderFeatures
  const shaderShort = [
    sf.flipbook ? 'fb' : null,
    sf.erosion ? 'ero' : null,
    sf.softAlpha ? 'soft' : null,
    sf.distortion ? 'dist' : null,
    sf.groundNavmeshClip ? 'nav' : null,
  ]
    .filter(Boolean)
    .join('+')

  const parts = [
    tp ? `${tp.orientationMode}·${tp.transformOrder}` : null,
    byLabel.get('Traits') || semanticProfile.geometry.kind,
    byLabel.get('Material') || semanticProfile.material.kind,
    shaderShort || null,
    material.geometryKind,
    byLabel.get('Depth bias') ? `bias:${byLabel.get('Depth bias')}` : null,
    byLabel.get('Ground clip Z') ? `z:${byLabel.get('Ground clip Z')}` : null,
    material.materialIntent,
    frame.groundScaleKind ? `scale:${frame.groundScaleKind}` : null,
    byLabel.get('birthScale0 (ritual vec3)')
      ? `bs:${byLabel.get('birthScale0 (ritual vec3)')}`
      : null,
    byLabel.get('Remap escala') ? `remap:${byLabel.get('Remap escala')}` : null,
    byLabel.get('birthOrbitalVelocity (ritual vec3)')
      ? `ω:${byLabel.get('birthOrbitalVelocity (ritual vec3)')}`
      : null,
  ].filter(Boolean)

  return parts.join(' · ')
}

/** Etiqueta compacta dos eixos birthScale0 para o viewport 3D. */
export function formatBirthScaleLoLAxesViewportLabel(
  parsed?: ParsedVfxEmitterFull | null,
): string | null {
  const vec = embedVec3Constant(parsed?.birthScale0 ?? null)
  if (!vec) return null
  return `LoL X=${fmtNum(vec[0], 0)} Y=${fmtNum(vec[1], 0)} Z=${fmtNum(vec[2], 0)}`
}

/** Etiqueta compacta de ω (°/frame ritual ou ° acumulados) para o viewport 3D. */
export function formatBirthOrbitalLoLAxesViewportLabel(
  parsed?: ParsedVfxEmitterFull | null,
  particleTime = 0,
  seed = 5,
  particleNormalized = 0,
): string | null {
  void parsed
  void particleTime
  void seed
  void particleNormalized
  return null
}
