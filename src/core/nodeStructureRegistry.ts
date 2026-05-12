import type { NodeInstance, NodeSchemaDefinition } from './nodeSchema'
import { nodeSchemaFromStructureJson } from './nodeStructureJson'

const modules = import.meta.glob<{ default: unknown }>('../nodeStructures/**/*.json', { eager: true })

function packFolderFromModulePath(modulePath: string): string {
  const normalized = modulePath.replace(/\\/g, '/')
  const marker = 'nodeStructures/'
  const idx = normalized.indexOf(marker)
  if (idx === -1) {
    return 'unknown'
  }
  const rest = normalized.slice(idx + marker.length)
  const segments = rest.split('/').filter(Boolean)
  if (segments.length < 2) {
    return 'unknown'
  }
  return segments[0] ?? 'unknown'
}

function validateEntityRefs(registry: Record<string, NodeSchemaDefinition>): void {
  for (const schema of Object.values(registry)) {
    for (const ent of schema.entities) {
      if (!registry[ent.schemaId]) {
        console.warn(
          `[nodeStructures] schema "${schema.id}" referencia entity desconhecida: "${ent.schemaId}"`,
        )
      }
    }
  }
}

function buildRegistry(): {
  registry: Record<string, NodeSchemaDefinition>
  packFolderBySchemaId: Record<string, string>
} {
  const registry: Record<string, NodeSchemaDefinition> = {}
  const packFolderBySchemaId: Record<string, string> = {}

  for (const [path, mod] of Object.entries(modules)) {
    const parsed = nodeSchemaFromStructureJson(mod.default)
    if (!parsed) {
      console.warn(`[nodeStructures] estrutura inválida ignorada (${path})`)
      continue
    }

    const packFolder = packFolderFromModulePath(path)
    const existing = registry[parsed.id]
    if (existing) {
      console.warn(`[nodeStructures] id duplicado "${parsed.id}", sobrescrito (${path})`)
    }
    registry[parsed.id] = parsed
    packFolderBySchemaId[parsed.id] = packFolder
  }

  validateEntityRefs(registry)
  return { registry, packFolderBySchemaId }
}

const { registry: builtRegistry, packFolderBySchemaId: builtPackMap } = buildRegistry()

export const schemaRegistry: Record<string, NodeSchemaDefinition> = builtRegistry

/** Pasta imediata sob `src/nodeStructures/` onde o JSON foi carregado (ex.: `default`). */
export const schemaPackFolderBySchemaId: Record<string, string> = builtPackMap

export function createNodeInstanceFromRegistry(
  registry: Record<string, NodeSchemaDefinition>,
  schemaId: string,
  instanceId: string,
): NodeInstance | null {
  const schema = registry[schemaId]

  if (!schema) {
    return null
  }

  const schemaClone = structuredClone(schema)

  return {
    id: instanceId,
    schema: schemaClone,
    values: schemaClone.parameters.map((parameter) => ({
      parameterId: parameter.id,
      value: parameter.defaultValue,
    })),
  }
}

export function createNodeInstance(schemaId: string, instanceId: string): NodeInstance | null {
  return createNodeInstanceFromRegistry(schemaRegistry, schemaId, instanceId)
}
