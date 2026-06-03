import { parseVector3RitualInput } from '@/core/vector3Value'
import {
  collectBlock,
  collectOptionBody,
  extractEmitterBlocks,
  findAllVfxSystemBlocks,
  labelFromMapKey,
  normalizeLineEndings,
  parseScalarLine,
  stripInlineComment,
  STRUCTURAL_LINE_RE,
  countBrackets,
  PARTICLE_NAME_RE,
  PARTICLE_PATH_RE,
  OPTION_OPEN_RE,
} from './ritualParseHelpers'
import { resolveRitualFieldName, resolveRitualTypeName } from './vfxRitualFieldNames'
import { parseAlphaErosionBlock } from './vfxAlphaErosion'
import { parseDistortionBlock } from './vfxDistortion'
import type { VfxFlexShapeDefinition } from './vfxFlexShape'
import type {
  ParsedVfxEmitterFull,
  ParsedVfxSystemFull,
  VfxDynamics,
  VfxEmbedValue,
  VfxProbabilityTable,
  VfxReflectionDef,
  VfxPaletteDefinition,
  VfxSpawnShapeLegacy,
  VfxSpawnShapeBox,
  VfxSpawnShapeCylinder,
  VfxTextureMultDef,
  ParsedVfxRitualCatalog,
  VfxCatalogEntry,
} from './vfxModel'

const EMBED_OPEN_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*embed\s*=\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*\{\s*$/i
const POINTER_OPEN_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*pointer\s*=\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*\{\s*$/i
/** `primitive: pointer = VfxPrimitiveRay {}` numa linha (comum no export LoL). */
const POINTER_INLINE_RE =
  /^\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*:\s*pointer\s*=\s*(?:([A-Za-z_]\w*)|(0x[0-9a-fA-F]+))\s*\{\s*\}\s*$/i
const EMITTER_NAME_RE = /^\s*(?:emitterName|0x3d25b8ce)\s*:\s*string\s*=\s*"([^"]*)"\s*$/i
const CONSTANT_VALUE_RE =
  /^\s*(?:constantValue|0xb4b427aa)\s*:\s*([^=\n]+)=\s*(.+)$/i
const DYNAMICS_OPEN_RE = /^\s*dynamics\s*:\s*pointer\s*=\s*([A-Za-z_]\w*)\s*\{\s*$/i
const LIST_FIELD_RE = /^\s*(times|values|keyTimes|keyValues)\s*:\s*list\[[^\]]+\]\s*=\s*\{\s*$/i
const MESH_SIMPLE_RE = /^\s*mSimpleMeshName\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const MESH_NAME_RE = /^\s*mMeshName\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const MESH_SKELETON_RE = /^\s*mMeshSkeletonName\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const MESH_ANIMATION_RE = /^\s*mAnimationName\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const FLEX_BIRTH_SCALE_RE = /^\s*scaleBirthScaleByBoundObjectSize\s*:\s*f32\s*=\s*([^\s]+)\s*$/
const FLEX_EMIT_OFFSET_RE = /^\s*scaleEmitOffsetByBoundObjectSize\s*:\s*f32\s*=\s*([^\s]+)\s*$/
const REFLECTION_TEX_RE = /^\s*reflectionMapTexture\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const PALETTE_TEX_RE = /^\s*paletteTexture\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const TEXTURE_MULT_RE = /^\s*textureMult\s*:\s*string\s*=\s*"([^"]*)"\s*$/
const EMIT_OFFSET_RE = /^\s*emitOffset\s*:\s*vec3\s*=\s*\{([^}]+)\}\s*$/i
const COLOR_LOOKUP_SCALES_RE = /^\s*colorLookUpScales\s*:\s*vec2\s*=\s*\{([^}]+)\}\s*$/i
const START_FRAME_RE = /^\s*startFrame\s*:\s*u16\s*=\s*(\d+)\s*$/i
const COLOR_LOOKUP_TYPE_RE = /^\s*colorLookUpType([XY])\s*:\s*u8\s*=\s*(\d+)\s*$/i
const BOX_DIMENSIONS_RE = /^\s*dimensions\s*:\s*vec3\s*=\s*\{([^}]+)\}\s*$/i
const CYL_RADIUS_RE = /^\s*radius\s*:\s*f32\s*=\s*([^\s]+)\s*$/i
const CYL_HEIGHT_RE = /^\s*height\s*:\s*f32\s*=\s*([^\s]+)\s*$/i
const CYL_FLAGS_RE = /^\s*flags\s*:\s*u8\s*=\s*(\d+)\s*$/i
const TRAIL_TILING_RE = /^\s*mBirthTilingSize\s*:\s*embed\s*=\s*ValueVector3\s*\{/i
const TIME_BEFORE_RE = /^\s*timeBeforeFirstEmission\s*:\s*f32\s*=\s*([^\s]+)\s*$/i
const ATTACH_BONE_HASH_RE = /^\s*0x67425298\s*:\s*string\s*=\s*"([^"]*)"\s*$/i
const BONE_NAME_SCALAR_RE = /^\s*boneName\s*:\s*string\s*=\s*"([^"]*)"\s*$/i

function parseFlexShapeBlock(body: string[]): VfxFlexShapeDefinition | null {
  let birth = 0
  let emit = 0
  for (const bline of body) {
    const line = stripInlineComment(bline).trim()
    const birthMatch = FLEX_BIRTH_SCALE_RE.exec(line)
    if (birthMatch) birth = Number(birthMatch[1])
    const emitMatch = FLEX_EMIT_OFFSET_RE.exec(line)
    if (emitMatch) emit = Number(emitMatch[1])
  }
  if (birth === 0 && emit === 0) return null
  return {
    scaleBirthScaleByBoundObjectSize: birth,
    scaleEmitOffsetByBoundObjectSize: emit,
  }
}

function parseNumber(token: string): number {
  return Number.parseFloat(token.trim().replace(/,$/, ''))
}

function parseVec2(text: string): [number, number] {
  const inner = text.trim().replace(/^\{/, '').replace(/\}$/, '').trim()
  const parts = inner.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return [0, 0]
  return [parseNumber(parts[0] ?? '0'), parseNumber(parts[1] ?? '0')]
}

function parseVec3(text: string): [number, number, number] {
  const parsed = parseVector3RitualInput(text)
  return [parsed.x, parsed.y, parsed.z]
}

function parseVec4(text: string): [number, number, number, number] {
  const inner = text.trim().replace(/^\{/, '').replace(/\}$/, '').trim()
  const parts = inner.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 4) return [1, 1, 1, 1]
  return [
    parseNumber(parts[0] ?? '1'),
    parseNumber(parts[1] ?? '1'),
    parseNumber(parts[2] ?? '1'),
    parseNumber(parts[3] ?? '1'),
  ]
}

function parseConstantValue(kind: string, raw: string): unknown {
  const value = raw.trim()
  if (value.startsWith('{')) {
    if (kind.includes('vec4') || kind.toLowerCase().includes('rgba')) return parseVec4(value)
    if (kind.includes('vec3')) return parseVec3(value)
    if (kind.includes('vec2')) return parseVec2(value)
    return value
  }
  if (kind.includes('f32') || ['f32', 'i16', 'u8', 'u16'].includes(kind.trim())) {
    return parseNumber(value)
  }
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return value.toLowerCase() === 'true'
  }
  if (value.startsWith('"')) return value.replace(/^"|"$/g, '')
  return value
}

function parseListBody(
  lines: string[],
  start: number,
  listKind: string,
): [unknown[], number] {
  const [body, end] = collectBlock(lines, start)
  const items: unknown[] = []

  for (const line of body) {
    const stripped = stripInlineComment(line).trim()
    if (!stripped || stripped === '}') continue
    if (stripped.startsWith('{')) {
      if (listKind.includes('vec4')) items.push(parseVec4(stripped))
      else if (listKind.includes('vec3')) items.push(parseVec3(stripped))
      else if (listKind.includes('vec2')) items.push(parseVec2(stripped))
      continue
    }
    if (listKind.includes('f32')) items.push(parseNumber(stripped))
  }

  return [items, end]
}

function parseProbabilityTable(block: string[]): VfxProbabilityTable {
  const table: VfxProbabilityTable = { keyTimes: [], keyValues: [] }
  let index = 0

  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()
    const listMatch = LIST_FIELD_RE.exec(stripped)
    if (listMatch) {
      const fieldName = (listMatch[1] ?? '').toLowerCase()
      const listKind = 'f32'
      const [items, end] = parseListBody(block, index, listKind)
      if (fieldName === 'keytimes') table.keyTimes = items.map((v) => Number(v))
      else table.keyValues = items.map((v) => Number(v))
      index = end + 1
      continue
    }
    index += 1
  }

  return table
}

function parseDynamicsBlock(block: string[]): VfxDynamics {
  const dynamics: VfxDynamics = {
    kind: '',
    times: [],
    values: [],
    probabilityTables: [],
  }

  let index = 0
  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()
    if (!stripped) {
      index += 1
      continue
    }

    if (stripped.startsWith('VfxProbabilityTableData')) {
      const [, end] = collectBlock(block, index)
      const inner = block.slice(index + 1, end)
      dynamics.probabilityTables.push(parseProbabilityTable(inner))
      index = end + 1
      continue
    }

    if (stripped.includes('list[pointer]') && stripped.includes('probabilityTables')) {
      const [, end] = collectBlock(block, index)
      const inner = block.slice(index + 1, end)
      let subIndex = 0
      while (subIndex < inner.length) {
        const sub = stripInlineComment(inner[subIndex] ?? '').trim()
        if (sub.startsWith('VfxProbabilityTableData')) {
          const [, tableEnd] = collectBlock(inner, subIndex)
          const tableBlock = inner.slice(subIndex + 1, tableEnd)
          dynamics.probabilityTables.push(parseProbabilityTable(tableBlock))
          subIndex = tableEnd + 1
        } else if (sub === '}' || !sub) {
          subIndex += 1
        } else {
          dynamics.probabilityTables.push(null)
          subIndex += 1
        }
      }
      index = end + 1
      continue
    }

    const listMatch = LIST_FIELD_RE.exec(stripped)
    if (listMatch) {
      const fieldName = (listMatch[1] ?? '').toLowerCase()
      const listKind = stripped.split('[')[1]?.split(']')[0] ?? 'f32'
      const [items, end] = parseListBody(block, index, listKind)
      if (fieldName === 'times') dynamics.times = items.map((v) => Number(v))
      else dynamics.values = items
      index = end + 1
      continue
    }

    if (DYNAMICS_OPEN_RE.test(stripped)) {
      const [, end] = collectBlock(block, index)
      const inner = block.slice(index + 1, end)
      const nested = parseDynamicsBlock(inner)
      if (!dynamics.times.length) dynamics.times = nested.times
      if (!dynamics.values.length) dynamics.values = nested.values
      dynamics.probabilityTables.push(...nested.probabilityTables)
      index = end + 1
      continue
    }

    index += 1
  }

  return dynamics
}

function parseEmbedBlock(block: string[], kind: string): VfxEmbedValue {
  const embed: VfxEmbedValue = { kind, constant: null, dynamics: null }
  let index = 0

  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()
    if (!stripped) {
      index += 1
      continue
    }

    const constMatch = CONSTANT_VALUE_RE.exec(stripped)
    if (constMatch) {
      const ritType = (constMatch[1] ?? '').trim()
      embed.constant = parseConstantValue(ritType, constMatch[2] ?? '')
      index += 1
      continue
    }

    if (DYNAMICS_OPEN_RE.test(stripped)) {
      const match = DYNAMICS_OPEN_RE.exec(stripped)
      const [, end] = collectBlock(block, index)
      const inner = block.slice(index + 1, end)
      embed.dynamics = parseDynamicsBlock(inner)
      if (match?.[1]) embed.dynamics.kind = match[1]
      index = end + 1
      continue
    }

    index += 1
  }

  return embed
}

function parseMeshAssetPaths(block: string[]): {
  meshPath: string | null
  skeletonPath: string | null
  animationPath: string | null
} {
  let meshPath: string | null = null
  let skeletonPath: string | null = null
  let animationPath: string | null = null

  for (const line of block) {
    const stripped = stripInlineComment(line).trim()
    const simple = MESH_SIMPLE_RE.exec(stripped)
    if (simple) meshPath = simple[1] ?? meshPath
    const mesh = MESH_NAME_RE.exec(stripped)
    if (mesh) meshPath = mesh[1] ?? meshPath
    const skel = MESH_SKELETON_RE.exec(stripped)
    if (skel) skeletonPath = skel[1] ?? skeletonPath
    const anim = MESH_ANIMATION_RE.exec(stripped)
    if (anim) animationPath = anim[1] ?? animationPath
  }

  return { meshPath, skeletonPath, animationPath }
}

function findMeshPath(block: string[]): string | null {
  return parseMeshAssetPaths(block).meshPath
}

function parseReflectionBlock(block: string[]): VfxReflectionDef {
  const reflection: VfxReflectionDef = {
    reflectionMapTexture: '',
    reflectionOpacityDirect: 0,
    reflectionOpacityGlancing: 0,
    reflectionFresnel: 0,
    reflectionFresnelColor: [1, 1, 1, 1],
  }

  for (const line of block) {
    const stripped = stripInlineComment(line).trim()
    const texMatch = REFLECTION_TEX_RE.exec(stripped)
    if (texMatch) {
      reflection.reflectionMapTexture = texMatch[1] ?? ''
      continue
    }
    const scalar = parseScalarLine(stripped)
    if (!scalar) continue
    const [name, , value] = scalar
    if (name === 'reflectionOpacityDirect') reflection.reflectionOpacityDirect = Number(value)
    else if (name === 'reflectionOpacityGlancing') reflection.reflectionOpacityGlancing = Number(value)
    else if (name === 'reflectionFresnel') reflection.reflectionFresnel = Number(value)
    else if (name === 'reflectionFresnelColor') {
      reflection.reflectionFresnelColor = parseVec4(`{${value}}`)
    }
  }

  return reflection
}

function parsePaletteDefinitionBlock(block: string[]): VfxPaletteDefinition {
  const palette: VfxPaletteDefinition = {
    paletteTexture: '',
    paletteSelector: null,
    paletteCount: 1,
    paletteSrcMixColor: [1, 0, 0, 0],
  }

  let index = 0
  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()
    const texMatch = PALETTE_TEX_RE.exec(stripped)
    if (texMatch) {
      palette.paletteTexture = texMatch[1] ?? ''
      index += 1
      continue
    }

    const embedMatch = EMBED_OPEN_RE.exec(stripped)
    if (embedMatch) {
      const fieldName = embedMatch[1] ?? ''
      const kind = embedMatch[2] ?? ''
      const [body, end] = collectBlock(block, index)
      const embed = parseEmbedBlock(body, kind)
      if (fieldName === 'paletteSelector') palette.paletteSelector = embed
      else if (fieldName === 'palleteSrcMixColor' || fieldName === 'paletteSrcMixColor') {
        const value = embed.constant
        if (Array.isArray(value) && value.length >= 4) {
          palette.paletteSrcMixColor = [
            Number(value[0]),
            Number(value[1]),
            Number(value[2]),
            Number(value[3]),
          ]
        }
      }
      index = end + 1
      continue
    }

    const scalar = parseScalarLine(stripped)
    if (scalar) {
      const [name, , value] = scalar
      if (name === 'paletteCount') palette.paletteCount = Number.parseInt(value, 10)
      index += 1
      continue
    }

    index += 1
  }

  return palette
}

function parseTextureMultBlock(block: string[]): VfxTextureMultDef {
  const mult: VfxTextureMultDef = {
    texturePath: '',
    uvScale: [1, 1],
    uvScroll: null,
    birthUvOffset: null,
  }

  let index = 0
  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()
    const texMatch = TEXTURE_MULT_RE.exec(stripped)
    if (texMatch) {
      mult.texturePath = texMatch[1] ?? ''
      index += 1
      continue
    }

    const embedMatch = EMBED_OPEN_RE.exec(stripped)
    if (embedMatch) {
      const fieldName = embedMatch[1] ?? ''
      const kind = embedMatch[2] ?? ''
      const [body, end] = collectBlock(block, index)
      const embed = parseEmbedBlock(body, kind)
      if (fieldName === 'uvScaleMult' && embed.constant) {
        mult.uvScale = embed.constant as [number, number]
      } else if (
        fieldName === 'ParticleIntegratedUvScrollMult' ||
        fieldName === 'birthUVScrollRateMult'
      ) {
        mult.uvScroll = embed
      } else if (fieldName === 'birthUVOffsetMult') {
        mult.birthUvOffset = embed
      }
      index = end + 1
      continue
    }

    index += 1
  }

  return mult
}

function vec3FromEmbed(embed: VfxEmbedValue | null): [number, number, number] {
  if (!embed?.constant) return [0, 0, 0]
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return [0, 0, 0]
}

function parseFirstFloatEmbedInBlock(block: string[]): VfxEmbedValue | null {
  let index = 0
  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()
    if (/^ValueFloat\s*\{/.test(stripped)) {
      const [body, end] = collectBlock(block, index)
      return parseEmbedBlock(body, 'ValueFloat')
    }
    const embedMatch = EMBED_OPEN_RE.exec(stripped)
    if (embedMatch) {
      const [body, end] = collectBlock(block, index)
      return parseEmbedBlock(body, embedMatch[2] ?? 'ValueFloat')
    }
    index += 1
  }
  return null
}

function parseSpawnShapeLegacyBlock(block: string[]): VfxSpawnShapeLegacy {
  const shape: VfxSpawnShapeLegacy = {
    kind: 'legacy',
    emitOffset: null,
    emitRotationAngle: null,
    emitRotationAxis: [0, 1, 0],
  }

  let index = 0
  while (index < block.length) {
    const stripped = stripInlineComment(block[index] ?? '').trim()

    const embedMatch = EMBED_OPEN_RE.exec(stripped)
    if (embedMatch && (embedMatch[1] ?? '') === 'emitOffset') {
      const [body, end] = collectBlock(block, index)
      shape.emitOffset = parseEmbedBlock(body, embedMatch[2] ?? 'ValueVector3')
      index = end + 1
      continue
    }

    const vecMatch = EMIT_OFFSET_RE.exec(stripped)
    if (vecMatch) {
      shape.emitOffset = {
        kind: 'vec3',
        constant: parseVec3(`{${vecMatch[1] ?? ''}}`),
        dynamics: null,
      }
      index += 1
      continue
    }

    if (/emitRotationAxes/i.test(stripped)) {
      const listKind = 'vec3'
      const [items, end] = parseListBody(block, index, listKind)
      const first = items[0]
      if (Array.isArray(first) && first.length >= 3) {
        shape.emitRotationAxis = [Number(first[0]), Number(first[1]), Number(first[2])]
      }
      index = end + 1
      continue
    }

    if (/emitRotationAngles/i.test(stripped)) {
      const [, end] = collectBlock(block, index)
      shape.emitRotationAngle = parseFirstFloatEmbedInBlock(block.slice(index + 1, end))
      index = end + 1
      continue
    }

    index += 1
  }

  if (!shape.emitRotationAngle) {
    shape.emitRotationAngle = parseFirstFloatEmbedInBlock(block)
  }

  return shape
}

function parseSpawnShapeBlock(block: string[]): [number, number, number] | null {
  for (const line of block) {
    const match = EMIT_OFFSET_RE.exec(stripInlineComment(line).trim())
    if (match) return parseVec3(`{${match[1] ?? ''}}`)
  }
  return null
}

function parseSpawnShapeBoxBlock(block: string[]): VfxSpawnShapeBox {
  let emitOffset: [number, number, number] = [0, 0, 0]
  let dimensions: [number, number, number] = [1, 1, 1]
  for (const line of block) {
    const stripped = stripInlineComment(line).trim()
    const offsetMatch = EMIT_OFFSET_RE.exec(stripped)
    if (offsetMatch) emitOffset = parseVec3(`{${offsetMatch[1] ?? ''}}`)
    const dimMatch = BOX_DIMENSIONS_RE.exec(stripped)
    if (dimMatch) dimensions = parseVec3(`{${dimMatch[1] ?? ''}}`)
  }
  return { kind: 'box', emitOffset, dimensions }
}

function parseSpawnShapeCylinderBlock(block: string[]): VfxSpawnShapeCylinder {
  let emitOffset: [number, number, number] = [0, 0, 0]
  let radius = 1
  let height = 1
  let flags = 0
  for (const line of block) {
    const stripped = stripInlineComment(line).trim()
    const offsetMatch = EMIT_OFFSET_RE.exec(stripped)
    if (offsetMatch) emitOffset = parseVec3(`{${offsetMatch[1] ?? ''}}`)
    const radiusMatch = CYL_RADIUS_RE.exec(stripped)
    if (radiusMatch) radius = Number.parseFloat(radiusMatch[1] ?? '1')
    const heightMatch = CYL_HEIGHT_RE.exec(stripped)
    if (heightMatch) height = Number.parseFloat(heightMatch[1] ?? '1')
    const flagsMatch = CYL_FLAGS_RE.exec(stripped)
    if (flagsMatch) flags = Number.parseInt(flagsMatch[1] ?? '0', 10)
  }
  return { kind: 'cylinder', emitOffset, radius, height, flags }
}

function parseTrailTilingFromPrimitiveBody(body: string[]): [number, number, number] | null {
  const lines = body
  for (let index = 0; index < lines.length; index++) {
    const stripped = stripInlineComment(lines[index] ?? '').trim()
    if (!TRAIL_TILING_RE.test(stripped)) continue
    const [embedBody, end] = collectBlock(lines, index)
    const embed = parseEmbedBlock(embedBody, 'ValueVector3')
    if (Array.isArray(embed.constant) && embed.constant.length >= 3) {
      return [Number(embed.constant[0]), Number(embed.constant[1]), Number(embed.constant[2])]
    }
    index = end + 1
  }

  for (let index = 0; index < lines.length; index++) {
    const stripped = stripInlineComment(lines[index] ?? '').trim()
    if (!stripped.endsWith('{')) continue
    const [nested, end] = collectBlock(lines, index)
    const nestedTiling = parseTrailTilingFromPrimitiveBody(nested)
    if (nestedTiling) return nestedTiling
    index = end
  }

  return null
}

function normalizeEmitterFieldName(fieldName: string): string {
  if (!fieldName) return fieldName
  return fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
}

function applyPrimitivePointer(emitter: ParsedVfxEmitterFull, fieldName: string, kind: string, body: string[]) {
  if (normalizeEmitterFieldName(fieldName) !== 'primitive') return

  if (kind === 'VfxPrimitiveMesh' || kind === 'VfxPrimitiveBeam') {
    const meshAssets = parseMeshAssetPaths(body)
    if (meshAssets.meshPath) {
      emitter.meshPath = meshAssets.meshPath
      emitter.primitiveKind = kind === 'VfxPrimitiveBeam' ? 'beam' : 'mesh'
    }
    if (meshAssets.skeletonPath) emitter.skeletonPath = meshAssets.skeletonPath
    if (meshAssets.animationPath) emitter.animationPath = meshAssets.animationPath
    if (kind === 'VfxPrimitiveBeam' && !meshAssets.meshPath) emitter.primitiveKind = 'beam'
  } else if (kind === 'VfxPrimitiveRay') {
    emitter.primitiveKind = 'ray'
  } else if (kind === 'VfxPrimitiveArbitraryQuad') {
    emitter.primitiveKind = 'arbitrary_quad'
  } else if (kind === 'VfxPrimitiveArbitraryTrail') {
    emitter.primitiveKind = 'trail'
    const tiling = parseTrailTilingFromPrimitiveBody(body)
    if (tiling) emitter.trailBirthTilingSize = tiling
  } else if (kind === 'VfxPrimitivePlanarProjection') {
    emitter.primitiveKind = 'planar_projection'
  }
}

function parseEmitterFull(lines: string[]): ParsedVfxEmitterFull {
  const emitter: ParsedVfxEmitterFull = {
    name: '',
    isSingleParticle: false,
    isRandomStartFrame: false,
    isLocalOrientation: false,
    isRotationEnabled: false,
    isUniformScale: false,
    isGroundLayer: false,
    useNavmeshMask: false,
    depthBiasFactors: null,
    meshRenderFlags: 0,
    colorRenderFlags: 0,
    particleIsLocalOrientation: false,
    particleUVScrollRate: null,
    disableBackfaceCull: false,
    miscRenderFlags: 0,
    lifetime: 1,
    particleLifetime: 1,
    particleLinger: 0,
    emitterLinger: 0,
    timeBeforeFirstEmission: 0,
    rate: 1,
    blendMode: 1,
    pass: 0,
    importance: 0,
    alphaRef: 0,
    numFrames: null,
    texDiv: null,
    uvRotation: 0,
    emitterPosition: [0, 0, 0],
    spawnOffset: [0, 0, 0],
    spawnShape: null,
    birthScale0: null,
    scale0: null,
    birthRotation0: null,
    rotation0: null,
    birthVelocity: null,
    birthOrbitalVelocity: null,
    birthDrag: null,
    worldAcceleration: null,
    birthRotationalVelocity0: null,
    color: null,
    birthColor: null,
    texture: '',
    particleColorTexture: '',
    textureMult: null,
    birthUvScrollRate: null,
    birthUvOffset: null,
    meshPath: null,
    skeletonPath: null,
    animationPath: null,
    primitiveKind: 'plane',
    flexShape: null,
    reflection: null,
    paletteDefinition: null,
    bindWeight: null,
    attachBoneName: null,
    birthAcceleration: null,
    colorLookUpScales: null,
    colorLookUpTypeX: 0,
    colorLookUpTypeY: 0,
    startFrame: null,
    isDirectionOriented: false,
    alphaErosion: null,
    distortionDefinition: null,
    trailBirthTilingSize: null,
    scalars: [],
  }

  let depth = 0
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    const stripped = stripInlineComment(line.trimEnd())
    const [opens, closes] = countBrackets(stripped)

    if (depth === 0) {
      if (!stripped.trim() || stripped.trim() === '}') {
        index += 1
        continue
      }

      const nameMatch = EMITTER_NAME_RE.exec(stripped)
      if (nameMatch) {
        emitter.name = nameMatch[1] ?? ''
        emitter.scalars.push(['emitterName', 'string', `"${emitter.name}"`])
        index += 1
        continue
      }

      if (OPTION_OPEN_RE.test(stripped)) {
        const [name, ritType, body, endIndex] = collectOptionBody(lines, index)
        if (name === 'lifetime') emitter.lifetime = Number(body || 1)
        else if (name === 'particleLinger') emitter.particleLinger = Number(body || 0)
        else if (name === 'emitterLinger') emitter.emitterLinger = Number(body || 0)
        emitter.scalars.push([name, ritType, body])
        index = endIndex + 1
        continue
      }

      const embedMatch = EMBED_OPEN_RE.exec(stripped)
      if (embedMatch) {
        const fieldName = normalizeEmitterFieldName(
          resolveRitualFieldName(embedMatch[1] ?? embedMatch[2] ?? ''),
        )
        const kind = resolveRitualTypeName(embedMatch[3] ?? embedMatch[4] ?? '')
        const [body, end] = collectBlock(lines, index)
        const embed = parseEmbedBlock(body, kind)
        if (fieldName === 'rate') emitter.rate = Number(embed.constant ?? 1)
        else if (fieldName === 'birthScale0') emitter.birthScale0 = embed
        else if (fieldName === 'scale0') emitter.scale0 = embed
        else if (fieldName === 'birthRotation0') emitter.birthRotation0 = embed
        else if (fieldName === 'rotation0') emitter.rotation0 = embed
        else if (fieldName === 'birthVelocity') emitter.birthVelocity = embed
        else if (fieldName === 'birthOrbitalVelocity') emitter.birthOrbitalVelocity = embed
        else if (fieldName === 'birthDrag') emitter.birthDrag = embed
        else if (fieldName === 'worldAcceleration') emitter.worldAcceleration = embed
        else if (fieldName === 'birthRotationalVelocity0') emitter.birthRotationalVelocity0 = embed
        else if (fieldName === 'bindWeight') emitter.bindWeight = embed
        else if (fieldName === 'birthAcceleration') emitter.birthAcceleration = embed
        else if (fieldName === 'color') emitter.color = embed
        else if (fieldName === 'birthColor') emitter.birthColor = embed
        else if (fieldName === 'particleLifetime') emitter.particleLifetime = Number(embed.constant ?? 1)
        else if (fieldName === 'emitterPosition') {
          emitter.emitterPosition = (embed.constant as [number, number, number]) ?? [0, 0, 0]
        }         else if (fieldName === 'birthUvScrollRate') emitter.birthUvScrollRate = embed
        else if (fieldName === 'particleUVScrollRate') emitter.particleUVScrollRate = embed
        else if (fieldName === 'birthUVOffset' || fieldName === 'birthUvOffset') emitter.birthUvOffset = embed
        else if (fieldName === 'uvRotation') emitter.uvRotation = Number(embed.constant ?? 0)
        index = end + 1
        continue
      }

      const pointerInline = POINTER_INLINE_RE.exec(stripped)
      if (pointerInline) {
        applyPrimitivePointer(
          emitter,
          resolveRitualFieldName(pointerInline[1] ?? pointerInline[2] ?? ''),
          resolveRitualTypeName(pointerInline[3] ?? pointerInline[4] ?? ''),
          [],
        )
        index += 1
        continue
      }

      const pointerMatch = POINTER_OPEN_RE.exec(stripped)
      if (pointerMatch) {
        const fieldName = normalizeEmitterFieldName(
          resolveRitualFieldName(pointerMatch[1] ?? pointerMatch[2] ?? ''),
        )
        const kind = resolveRitualTypeName(pointerMatch[3] ?? pointerMatch[4] ?? '')
        const [body, end] = collectBlock(lines, index)
        applyPrimitivePointer(emitter, fieldName, kind, body)
        if (fieldName === 'spawnShape') {
          if (/legacy/i.test(kind)) {
            const legacy = parseSpawnShapeLegacyBlock(body)
            emitter.spawnShape = legacy
            emitter.spawnOffset = vec3FromEmbed(legacy.emitOffset)
          } else if (/VfxShapeBox/i.test(kind)) {
            const box = parseSpawnShapeBoxBlock(body)
            emitter.spawnShape = box
            emitter.spawnOffset = box.emitOffset
          } else if (/VfxShapeCylinder/i.test(kind)) {
            const cylinder = parseSpawnShapeCylinderBlock(body)
            emitter.spawnShape = cylinder
            emitter.spawnOffset = cylinder.emitOffset
          } else {
            const offset = parseSpawnShapeBlock(body)
            if (offset) {
              emitter.spawnOffset = offset
              emitter.spawnShape = { kind: 'offset', offset }
            } else {
              const legacy = parseSpawnShapeLegacyBlock(body)
              if (legacy.emitOffset || legacy.emitRotationAngle) {
                emitter.spawnShape = legacy
                emitter.spawnOffset = vec3FromEmbed(legacy.emitOffset)
              }
            }
          }
        } else if (fieldName === 'alphaErosionDefinition' && /VfxAlphaErosionDefinitionData/i.test(kind)) {
          emitter.alphaErosion = parseAlphaErosionBlock(body, parseEmbedBlock, collectBlock, EMBED_OPEN_RE)
        } else if (fieldName === 'distortionDefinition' && /VfxDistortionDefinitionData/i.test(kind)) {
          emitter.distortionDefinition = parseDistortionBlock(body)
        } else if (fieldName === 'textureMult' && kind === 'VfxTextureMultDefinitionData') {
          emitter.textureMult = parseTextureMultBlock(body)
        } else if (fieldName === 'flexShapeDefinition') {
          emitter.flexShape = parseFlexShapeBlock(body)
        } else if (fieldName === 'reflectionDefinition') {
          emitter.reflection = parseReflectionBlock(body)
        } else if (fieldName === 'paletteDefinition' && kind === 'VfxPaletteDefinitionData') {
          emitter.paletteDefinition = parsePaletteDefinitionBlock(body)
        }
        index = end + 1
        continue
      }

      const lookupScales = COLOR_LOOKUP_SCALES_RE.exec(stripped)
      if (lookupScales) {
        emitter.colorLookUpScales = parseVec2(`{${lookupScales[1] ?? ''}}`)
        index += 1
        continue
      }

      const startFrameMatch = START_FRAME_RE.exec(stripped)
      if (startFrameMatch) {
        emitter.startFrame = Number.parseInt(startFrameMatch[1] ?? '0', 10)
        index += 1
        continue
      }

      const lookupType = COLOR_LOOKUP_TYPE_RE.exec(stripped)
      if (lookupType) {
        const axis = lookupType[1] ?? 'X'
        const val = Number.parseInt(lookupType[2] ?? '0', 10)
        if (axis === 'X') emitter.colorLookUpTypeX = val
        else emitter.colorLookUpTypeY = val
        index += 1
        continue
      }

      const attachBoneHash = ATTACH_BONE_HASH_RE.exec(stripped)
      if (attachBoneHash) {
        emitter.attachBoneName = attachBoneHash[1] ?? null
        index += 1
        continue
      }

      const boneNameScalar = BONE_NAME_SCALAR_RE.exec(stripped)
      if (boneNameScalar) {
        emitter.attachBoneName = boneNameScalar[1] ?? null
        index += 1
        continue
      }

      const scalar = parseScalarLine(stripped)
      if (scalar) {
        const [name, ritType, value] = scalar
        const scalarName = normalizeEmitterFieldName(name)
        emitter.scalars.push([name, ritType, value])
        if (scalarName === 'blendMode') emitter.blendMode = Number.parseInt(value, 10)
        else if (scalarName === 'pass') emitter.pass = Number.parseInt(value, 10)
        else if (scalarName === 'importance') emitter.importance = Number.parseInt(value, 10)
        else if (scalarName === 'alphaRef') emitter.alphaRef = Number.parseInt(value, 10)
        else if (scalarName === 'isSingleParticle') emitter.isSingleParticle = value.toLowerCase() === 'true'
        else if (scalarName === 'isRandomStartFrame') emitter.isRandomStartFrame = value.toLowerCase() === 'true'
        else if (scalarName === 'isLocalOrientation') emitter.isLocalOrientation = value.toLowerCase() === 'true'
        else if (scalarName === 'isRotationEnabled') emitter.isRotationEnabled = value.toLowerCase() === 'true'
        else if (scalarName === 'isUniformScale') emitter.isUniformScale = value.toLowerCase() === 'true'
        else if (scalarName === 'isGroundLayer') emitter.isGroundLayer = value.toLowerCase() === 'true'
        else if (scalarName === 'useNavmeshMask') emitter.useNavmeshMask = value.toLowerCase() === 'true'
        else if (scalarName === 'particleIsLocalOrientation') {
          emitter.particleIsLocalOrientation = value.toLowerCase() === 'true'
        } else if (scalarName === 'meshRenderFlags') emitter.meshRenderFlags = Number.parseInt(value, 10)
        else if (scalarName === 'colorRenderFlags') emitter.colorRenderFlags = Number.parseInt(value, 10)
        else if (scalarName === 'depthBiasFactors') emitter.depthBiasFactors = parseVec2(`{${value}}`)
        else if (scalarName === 'isDirectionOriented') emitter.isDirectionOriented = value.toLowerCase() === 'true'
        else if (scalarName === 'disableBackfaceCull') emitter.disableBackfaceCull = value.toLowerCase() === 'true'
        else if (scalarName === 'miscRenderFlags') emitter.miscRenderFlags = Number.parseInt(value, 10)
        else if (scalarName === 'numFrames') emitter.numFrames = Number.parseInt(value, 10)
        else if (scalarName === 'startFrame') emitter.startFrame = Number.parseInt(value, 10)
        else if (scalarName === 'texture') emitter.texture = value.replace(/^"|"$/g, '')
        else if (scalarName === 'particleColorTexture') emitter.particleColorTexture = value.replace(/^"|"$/g, '')
        else if (scalarName === 'texDiv') emitter.texDiv = parseVec2(`{${value}}`)
        index += 1
        continue
      }

      const timeMatch = TIME_BEFORE_RE.exec(stripped)
      if (timeMatch) {
        emitter.timeBeforeFirstEmission = Number(timeMatch[1])
        index += 1
        continue
      }

      if (STRUCTURAL_LINE_RE.test(stripped)) {
        depth = Math.max(opens - closes, 1)
        index += 1
        continue
      }

      index += 1
      continue
    }

    depth += opens - closes
    if (depth < 0) depth = 0
    index += 1
  }

  if (!emitter.name) emitter.name = 'Emitter'
  if (!emitter.birthScale0) {
    emitter.birthScale0 = { kind: 'ValueVector3', constant: [1, 1, 1], dynamics: null }
  }

  return emitter
}

function parseVfxSystemFromLines(
  systemLines: string[],
  mapKey: string | null = null,
): ParsedVfxSystemFull {
  const result: ParsedVfxSystemFull = {
    particleName: '',
    particlePath: '',
    emitters: [],
    warnings: [],
  }

  for (const line of systemLines) {
    const stripped = stripInlineComment(line.trimEnd())
    const matchName = PARTICLE_NAME_RE.exec(stripped)
    if (matchName) {
      result.particleName = matchName[1] ?? ''
      continue
    }
    const matchPath = PARTICLE_PATH_RE.exec(stripped)
    if (matchPath) result.particlePath = matchPath[1] ?? ''
  }

  for (const block of extractEmitterBlocks(systemLines)) {
    result.emitters.push(parseEmitterFull(block))
  }

  if (!result.particleName) {
    const fromMap = labelFromMapKey(mapKey)
    if (fromMap) result.particleName = fromMap
    else if (result.particlePath) result.particleName = labelFromMapKey(result.particlePath) ?? ''
  }

  if (!result.particlePath && mapKey) {
    result.particlePath = mapKey.replace(/^"/, '').replace(/"$/, '')
  }

  if (!result.particleName) result.warnings.push('particleName não encontrado.')
  if (!result.emitters.length) result.warnings.push('Nenhum emitter encontrado.')

  return result
}

function catalogEntryId(mapKey: string | null, system: ParsedVfxSystemFull, index: number): string {
  if (mapKey) return `map:${mapKey}`
  if (system.particleName) return `particle:${system.particleName}`
  if (system.particlePath) return `path:${system.particlePath}`
  return `effect-${index}`
}

function catalogEntryLabel(mapKey: string | null, system: ParsedVfxSystemFull, index: number): string {
  if (system.particleName) return system.particleName
  const fromMap = labelFromMapKey(mapKey)
  if (fromMap) return fromMap
  if (system.particlePath) {
    const fromPath = labelFromMapKey(system.particlePath)
    if (fromPath) return fromPath
  }
  return `Efeito ${index + 1}`
}

/** Parse um único bloco `VfxEmitterDefinitionData { ... }` (golden tests / estrutura_bin). */
export function parseVfxEmitterFromBlock(block: string): ParsedVfxEmitterFull {
  const lines = normalizeLineEndings(block).split('\n')
  const inner = extractEmitterBlocks(lines)[0]
  return parseEmitterFull(inner ?? lines)
}

export function parseRitualVfxCatalog(content: string): ParsedVfxRitualCatalog {
  const normalized = normalizeLineEndings(content)
  const catalog: ParsedVfxRitualCatalog = { entries: [], warnings: [] }

  if (!normalized.trim()) {
    catalog.warnings.push('Código ritual vazio.')
    return catalog
  }

  const blocks = findAllVfxSystemBlocks(normalized)
  if (!blocks.length) {
    catalog.warnings.push('Bloco VfxSystemDefinitionData não encontrado.')
    return catalog
  }

  blocks.forEach((block, index) => {
    const system = parseVfxSystemFromLines(block.lines, block.mapKey)
    const label = catalogEntryLabel(block.mapKey, system, index)
    catalog.entries.push({
      id: catalogEntryId(block.mapKey, system, index),
      label,
      mapKey: block.mapKey,
      system,
    })
    catalog.warnings.push(...system.warnings)
  })

  if (blocks.length > 1) {
    catalog.warnings.push(`${blocks.length} efeitos VFX encontrados no ritual.`)
  }

  return catalog
}

export function parseRitualVfx(content: string): ParsedVfxSystemFull {
  const catalog = parseRitualVfxCatalog(content)
  if (catalog.entries.length) return catalog.entries[0].system

  return {
    particleName: '',
    particlePath: '',
    emitters: [],
    warnings: [...catalog.warnings],
  }
}

export function ritualContainsVfxSystem(content: string): boolean {
  return findAllVfxSystemBlocks(normalizeLineEndings(content)).length > 0
}
