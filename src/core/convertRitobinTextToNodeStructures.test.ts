import { describe, expect, it } from 'vitest'

import { convertRitobinStructureTextToNodeSchemas, slugifyStructureId } from '@/core/convertRitobinTextToNodeStructures'

describe('convertRitobinStructureTextToNodeSchemas', () => {
  it('transforma linha só com `Tipo { … }` e campos simples num schema', () => {
    const text = `
BankUnit {
  Name: string = "Vo"
}
`.trim()

    const out = convertRitobinStructureTextToNodeSchemas(text)

    expect(out.ok).toBe(true)
    if (!out.ok) {
      return
    }

    const bankUnit = out.schemas.find((s) => s.title === 'BankUnit')

    expect(bankUnit).toBeDefined()
    expect(bankUnit!.parameters.some((p) => p.name === 'Name')).toBe(true)
    expect(slugifyStructureId('BankUnit')).toBeTruthy()
  })

  it('falha de forma útil quando não há structs no formato esperado', () => {
    const out = convertRitobinStructureTextToNodeSchemas(`apenas texto sem structs isolados`)

    expect(out.ok).toBe(false)
    if (out.ok) {
      throw new Error('expected failure')
    }
    expect(typeof out.error).toBe('string')
  })
})
