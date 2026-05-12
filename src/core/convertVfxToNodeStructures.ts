import {
  slugifyStructureId,
  type ConvertRitobinToStructuresResult,
} from '@/core/convertRitobinTextToNodeStructures'
import type { ParsedVfxData, Vec3, VfxEmitter, VfxSystem } from '@/core/jadeVfxParse'
import type { NodeEntityDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

function trimSchemaId(raw: string, maxLen = 118): string {
  if (raw.length <= maxLen) {
    return raw
  }
  return raw.slice(0, maxLen)
}

function escapeStringDefault(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function fmtVec3(v: Vec3): string {
  return `${v.x}, ${v.y}, ${v.z}`
}

function vec3Parameter(
  paramIdStem: string,
  displayName: string,
  prop: Vec3 | undefined,
): NodeParameterDefinition | undefined {
  if (!prop) {
    return undefined
  }
  return {
    id: slugifyStructureId(`${paramIdStem}-${displayName}`) || slugifyStructureId(displayName),
    name: displayName,
    type: 'vector3',
    defaultValue: fmtVec3(prop),
  }
}

function floatParameter(
  paramIdStem: string,
  displayName: string,
  value: number | undefined,
): NodeParameterDefinition | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined
  }
  return {
    id: slugifyStructureId(`${paramIdStem}-${displayName}`) || slugifyStructureId(displayName),
    name: displayName,
    type: 'float',
    defaultValue: String(value),
  }
}

/** Um schema por emitter (defaults iguais ao texto ritual). */
function emitterToSchema(systemSlug: string, index: number, em: VfxEmitter): NodeSchemaDefinition {
  const stem = slugifyStructureId(systemSlug) || 'sys'
  const nameSlug = slugifyStructureId(em.name) || `e${index}`

  const schemaId = trimSchemaId(`vfx-em-${stem}-${index}-${nameSlug}`)

  const paramStem = schemaId

  const params: NodeParameterDefinition[] = [
    {
      defaultValue: escapeStringDefault(em.name),
      id: `${schemaId}-emitter-name`,
      name: 'emitterName',
      type: 'string',
    },
  ]

  const add = (p?: NodeParameterDefinition) => {
    if (p) {
      params.push(p)
    }
  }

  add(vec3Parameter(paramStem, 'birthScale0', em.birthScale0?.constantValue))
  add(vec3Parameter(paramStem, 'scale0', em.scale0?.constantValue))
  add(vec3Parameter(paramStem, 'translationOverride', em.translationOverride?.constantValue))
  add(floatParameter(paramStem, 'bindWeight', em.bindWeight?.constantValue))
  add(floatParameter(paramStem, 'particleLifetime', em.particleLifetime?.constantValue))
  add(floatParameter(paramStem, 'particleLinger', em.particleLinger?.constantValue))
  add(floatParameter(paramStem, 'rate', em.rate?.constantValue))

  params.sort((a, b) => a.name.localeCompare(b.name))

  return {
    entities: [],
    id: schemaId,
    parameters: params,
    title: `Emitter · ${em.name}`,
  }
}

/** Sistema como nó com entities por emitter (mesma hierarquia que o Jade). */
function systemToSchema(system: VfxSystem, emitterSchemaIds: string[]): NodeSchemaDefinition {
  const slug = slugifyStructureId(system.name) || slugifyStructureId(system.displayName) || 'vfx-system'
  const schemaId = trimSchemaId(`vfx-sys-${slug}`)

  const entities: NodeEntityDefinition[] = []

  system.emitters.forEach((emitter, index) => {
    const sid = emitterSchemaIds[index]

    if (!sid) {
      return
    }

    const entIdRaw = slugifyStructureId(`${index}-${emitter.name}`) || `em-${index}`

    entities.push({
      id: trimSchemaId(`slot-${entIdRaw}`, 40),
      name: emitter.name || `emitter-${index}`,
      schemaId: sid,
    })
  })

  entities.sort((a, b) => a.name.localeCompare(b.name))

  const lines = system.emitters.map((e) => e.globalStartLine)

  const firstLine =
    lines.length === 0 ? '0' : String(Math.min(...lines.filter((n) => typeof n === 'number' && !Number.isNaN(n))))

  return {
    entities,
    id: schemaId,
    parameters: [
      {
        defaultValue: escapeStringDefault(system.displayName),
        id: `${schemaId}-particle-name`,
        name: 'particleName',
        type: 'string',
      },
      {
        defaultValue: escapeStringDefault(system.name),
        id: `${schemaId}-system-path`,
        name: 'systemPath',
        type: 'string',
      },
      {
        defaultValue: String(system.emitters.length),
        id: `${schemaId}-emitter-count`,
        name: 'emitterCount',
        type: 'integer',
      },
      {
        defaultValue: firstLine,
        id: `${schemaId}-emitter-start-line-first`,
        name: 'emitterStartLine(first)',
        type: 'integer',
      },
    ],
    title: `VFX · ${system.displayName}`,
  }
}

export function convertParsedVfxToNodeSchemas(parsed: ParsedVfxData): ConvertRitobinToStructuresResult {
  const warnings: string[] = []
  const schemas: NodeSchemaDefinition[] = []

  if (parsed.systemOrder.length === 0) {
    return {
      error:
        'Nenhum bloco `… = VfxSystemDefinitionData {` encontrado (formato esperado pelo Particle Editor Jade).',
      ok: false,
    }
  }

  for (const systemKey of parsed.systemOrder) {
    const system = parsed.systems[systemKey]

    if (!system) {
      continue
    }

    const systemSlug = slugifyStructureId(system.name) || `sys-${schemas.length}`
    const emitterIds: string[] = []

    for (let ei = 0; ei < system.emitters.length; ei += 1) {
      const emitterSchema = emitterToSchema(systemSlug, ei, system.emitters[ei]!)
      schemas.push(emitterSchema)
      emitterIds.push(emitterSchema.id)
    }

    schemas.push(systemToSchema(system, emitterIds))

    warnings.push(`Sistema «${system.displayName}»: ${String(system.emitters.length)} emitter(s)`)
  }

  warnings.unshift(
    `Particle Editor Jade: ${parsed.systemOrder.length} sistema(s) VFX (emitters ligados ao sistema pai).`,
  )

  return {
    ok: true,
    schemas,
    warnings,
  }
}
