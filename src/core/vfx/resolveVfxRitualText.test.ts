import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { extractVfxRitualFromText, resolveVfxRitualText } from './resolveVfxRitualText'
import { parseRitualVfxCatalog } from './ritualParseVfx'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const previewPath = join(fixtureDir, '../../../_preview.md')

describe('resolveVfxRitualText', () => {
  it('extrai VfxSystem de _preview.md standalone', () => {
    const text = readFileSync(previewPath, 'utf8')
    const extracted = extractVfxRitualFromText(text)
    expect(extracted).toBeTruthy()
    const catalog = parseRitualVfxCatalog(extracted!)
    expect(catalog.entries).toHaveLength(1)
    expect(catalog.warnings).not.toContain('Bloco VfxSystemDefinitionData não encontrado.')
    expect(catalog.entries[0]?.system.emitters).toHaveLength(3)
  })

  it('resolve com codeText = _preview.md', () => {
    const text = readFileSync(previewPath, 'utf8')
    const resolved = resolveVfxRitualText({
      codeText: text,
      vfxRitualOverride: null,
      scene: { nodes: [], links: [] },
      registry: {},
      primarySelectedId: null,
      nodeCodeBindings: {},
      activeCodeDockTabId: null,
    })
    const catalog = parseRitualVfxCatalog(resolved)
    expect(catalog.entries.length).toBeGreaterThan(0)
  })
})
