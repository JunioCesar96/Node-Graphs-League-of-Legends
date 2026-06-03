import { describe, expect, it } from 'vitest'

import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import {
  prepareClassGroupRitualParse,
  resolveBlockBuildRootSchema,
  resolveNeekoRootParsedId,
} from '@/core/ritualCodePrepare'

const mainWithTwoEntries = `
#PROP_text
type: string = "PROP"
version: u32 = 3
entries: map[hash,embed] = {
  "path/a" = SampleType { name: string = "a" }
  "path/b" = SampleType { name: string = "b" }
}
`.trim()

describe('ritualCodePrepare', () => {
  it('normaliza e parseia ritual standalone', () => {
    const prepared = prepareClassGroupRitualParse(`
BankUnit {
  Name: string = "Vo"
}
`.trim())
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }
    expect(prepared.parse.registry.size).toBeGreaterThan(0)
  })

  it('block build usa Main como raiz quando entries existem', () => {
    const prepared = prepareClassGroupRitualParse(mainWithTwoEntries)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const root = resolveBlockBuildRootSchema(prepared.parse)
    expect(root?.id).toBe(MAIN_SCHEMA_ID)
    expect(root?.title).toBe('Main')
  })

  it('Neeko usa a primeira entrada do mapa, não Main', () => {
    const prepared = prepareClassGroupRitualParse(mainWithTwoEntries)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const resolved = resolveNeekoRootParsedId(prepared.parse.registry, prepared.parse.rootSchemaIds)
    expect('rootParsedId' in resolved).toBe(true)
    if ('rootParsedId' in resolved) {
      expect(resolved.rootParsedId).not.toBe(MAIN_SCHEMA_ID)
      expect(prepared.parse.registry.get(resolved.rootParsedId)?.title).toBe('SampleType')
    }
  })
})
