import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { buildBlockAutoBuildPlanFromRitualCode } from './blockAutoBuild'
import { flattenAutoBuildWorkItems } from './blockAutoBuildExecutor'
import { schemaRegistry } from './nodeStructureRegistry'
import { validateBlockParameterDocument } from './blockParameterRegistry'

describe('blockAutoBuild codigo teste', () => {
  it('plano completo do codigo teste.md (como Code Build Block + extendSchemaLookup)', () => {
    const text = readFileSync('src/blockStructures/codigo teste.md', 'utf8')
    const plan = buildBlockAutoBuildPlanFromRitualCode(text, schemaRegistry)
    const items = flattenAutoBuildWorkItems(plan)

    const paramItems = items.filter((i) => i.kind === 'parameter')
    const blockItems = items.filter((i) => i.kind === 'block')
    const invalid: string[] = []

    for (const item of paramItems) {
      const validated = validateBlockParameterDocument(item.parameterDocument, item.documentId)
      if (!validated.ok) {
        invalid.push(`${item.label}: ${validated.errors.join('; ')}`)
      }
    }

    const blockParamRefs = new Set<string>()
    for (const block of plan.blockDocuments) {
      for (const name of block.parameters) {
        blockParamRefs.add(`${block.blockName}::${name}`)
      }
    }
    const docKeys = new Set(
      plan.parameterDocuments.map((doc) => `${doc.block}::${doc.parameterName}`),
    )
    const missing = [...blockParamRefs].filter((key) => !docKeys.has(key))

    expect(plan.blockDocuments.length).toBeGreaterThan(10)
    expect(plan.parameterDocuments.length).toBeGreaterThan(50)
    expect(paramItems.length).toBeGreaterThan(50)
    expect(blockItems.length).toBeGreaterThan(10)
    expect(missing).toEqual([])
    expect(invalid).toEqual([])
    expect(plan.nodeResults).toHaveLength(1)
  })
})
