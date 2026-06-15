import { describe, expect, it } from 'vitest'

import {
  convertAllUndefinedHashesInDocument,
  findHashOccurrencesInLines,
} from './convertAllUndefinedHashes'
import { applyRitualHashEditToDocumentText } from './convertRitualHashToString'

describe('convertAllUndefinedHashes', () => {
  it('findHashOccurrencesInLines encontra tokens 0x em cada linha', () => {
    const lines = [
      '    0xabc = Foo {',
      '        0x3d25b8ce: string = "x"',
      '    "Idle1_Base"',
    ]
    const found = findHashOccurrencesInLines(lines)
    expect(found).toHaveLength(2)
    expect(found[0]?.hash).toBe('0xabc')
    expect(found[1]?.hash.toLowerCase()).toBe('0x3d25b8ce')
  })

  it('convertAllUndefinedHashesInDocument resolve hashes VFX locais', async () => {
    const doc = `#PROP_text
0x3d25b8ce: string = "Staff"
`
    const result = await convertAllUndefinedHashesInDocument(doc)
    expect(result.converted).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.edits[0]?.replacement).toBe('emitterName')
  })

  it('aplica conversões em sequência como «Convert to string» repetido', async () => {
    const doc = 'line: hash = 0x3d25b8ce, 0x3d25b8ce'
    const result = await convertAllUndefinedHashesInDocument(doc)
    expect(result.converted).toBe(2)
    let working = doc
    for (const edit of result.edits) {
      working = applyRitualHashEditToDocumentText(working, edit)
    }
    expect(working).toBe('line: hash = emitterName, emitterName')
  })
})
