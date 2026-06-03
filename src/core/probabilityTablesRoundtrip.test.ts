import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { canvasNodeSubtreeToRitual } from '@/core/canvasToClassGroupRitual'
import {
  finalizeNewNodeGraphScene,
  NewNodeGraphBuilder,
  prepareCodeToNewNodeGraph,
  schemasToRegistry,
} from '@/core/codeToNewNodeGraph'
import {
  MAIN_SCHEMA_ID,
  normalizeStandaloneClassGroupRitual,
  parseClassGroupRitualWithStack,
} from '@/core/classGroupRitualStackParser'
import { mergeParseSchemasIntoRegistry, resolvePackSchemaId, buildPackTypeIndex } from '@/core/codeToCanvasScene'
import { parseRitualVfxCatalog } from '@/core/vfx/ritualParseVfx'
import { computeEmitterFrameState } from '@/core/vfx/vfxWebAnimation'
import { getComposablePipeline } from '@/core/vfx/semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from '@/core/vfx/semantic/transformPipelineResolver'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../_probabilityTables_original.md',
)

function findProbabilityTableSchemas(
  registry: Map<string, { id: string; title: string; parameters: { name: string; defaultValue: string }[] }>,
) {
  return [...registry.values()].filter((schema) => schema.title === 'VfxProbabilityTableData')
}

function buildSceneFromRitual(ritual: string) {
  const normalized = normalizeStandaloneClassGroupRitual(ritual)
  const prepared = prepareCodeToNewNodeGraph(normalized)
  if (!prepared.ok) {
    throw new Error(prepared.error)
  }

  const builder = new NewNodeGraphBuilder(prepared.parseRegistry, prepared.warnings)
  builder.walkParsedNode(MAIN_SCHEMA_ID, 0, 0)
  const scene = finalizeNewNodeGraphScene(builder.buildScene())
  const rootCanvasId =
    builder.parsedToCanvas.get(MAIN_SCHEMA_ID) ??
    scene.nodes.find((node) => node.node.schema.id === MAIN_SCHEMA_ID)?.id
  if (!rootCanvasId) {
    throw new Error('Nó main não materializado na cena.')
  }
  return {
    scene,
    registry: schemasToRegistry(prepared.schemas),
    rootCanvasId,
  }
}

describe('probabilityTables roundtrip', () => {
  const ritual = readFileSync(fixturePath, 'utf8')

  it('parse grava keyValues nas instâncias VfxProbabilityTableData', () => {
    const parsed = parseClassGroupRitualWithStack(ritual)
    const tables = findProbabilityTableSchemas(parsed.registry)

    expect(tables.length).toBeGreaterThanOrEqual(3)

    const keyValuesList = tables.map(
      (schema) => schema.parameters.find((param) => param.name === 'keyValues')?.defaultValue ?? '',
    )
    const keyTimesList = tables.map(
      (schema) => schema.parameters.find((param) => param.name === 'keyTimes')?.defaultValue ?? '',
    )

    expect(keyTimesList.some((value) => value.includes('0'))).toBe(true)
    expect(keyValuesList.some((value) => value.includes('0.3'))).toBe(true)
    expect(keyValuesList.some((value) => value.includes('0.5'))).toBe(true)
    expect(keyValuesList).not.toContain('0\n360')
  })

  it('resolvePackSchemaId prefere id de instância parseada no registry', () => {
    const parsed = parseClassGroupRitualWithStack(ritual)
    const merged = mergeParseSchemasIntoRegistry({}, parsed)
    const index = buildPackTypeIndex([])

    const instance = findProbabilityTableSchemas(parsed.registry).find((schema) =>
      schema.parameters.some((param) => param.name === 'keyValues' && param.defaultValue.includes('0.3')),
    )
    expect(instance).toBeDefined()

    const resolved = resolvePackSchemaId(merged, index, instance!)
    expect(resolved).toBe(instance!.id)
  })

  it('export grafo→ritual preserva keyValues do prestige_up_star2 (sem 360)', () => {
    const { scene, registry, rootCanvasId } = buildSceneFromRitual(ritual)

    const exported = canvasNodeSubtreeToRitual(scene, registry, rootCanvasId)
    if (!exported.ok) {
      throw new Error(exported.error)
    }

    expect(exported.text).toContain('prestige_up_star2')
    expect(exported.text).toContain('0.3')
    expect(exported.text).toContain('0.5')
    expect(exported.text).not.toContain('360')

    const catalog = parseRitualVfxCatalog(exported.text)
    const emitter = catalog.entries[0]?.system.emitters.find((entry) => entry.name === 'prestige_up_star2')
    expect(emitter).toBeDefined()

    const composable = getComposablePipeline(emitter!)
    const transformPipeline = resolveTransformPipeline(emitter!, composable)
    const frame = computeEmitterFrameState(emitter!, 0.01, 0, 42, {
      particleTime: 0,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(frame.scale[0]).toBeLessThan(10)
    expect(frame.scale[1]).toBeLessThan(10)
    expect(frame.scale[2]).toBeLessThan(10)
  })
})
