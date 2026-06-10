import { describe, expect, it } from 'vitest'

import type { AddonManifest } from '@/services/addonLoader.service'
import {
  parseAddonSystemFunctionNames,
  preprocessAddonSystemFunctionRegions,
} from './addonSystemFunctionTemplate'

const manifest: AddonManifest = {
  id: 'addon-code-to-block',
  name: '[{0}]',
  category: 'Utility',
  drive: 'inputChange',
  get: true,
  set: false,
  functions: ['codeToNodeBlock'],
  data: [],
}

describe('addonSystemFunctionTemplate', () => {
  it('parseAddonSystemFunctionNames extrai nomes do ui.html', () => {
    const html = `{function:codeToNodeBlock}<button>Gerar</button>{/function}`
    expect(parseAddonSystemFunctionNames(html)).toEqual(new Set(['codeToNodeBlock']))
  })

  it('preprocessAddonSystemFunctionRegions envolve região autorizada', () => {
    const html = `{function:codeToNodeBlock}<button>Gerar</button>{/function}`
    const processed = preprocessAddonSystemFunctionRegions(html, manifest)
    expect(processed).toContain('data-addon-system-function="codeToNodeBlock"')
    expect(processed).not.toContain('{function:')
  })

  it('preprocessAddonSystemFunctionRegions remove marker se função não declarada', () => {
    const html = `{function:unknownFn}<button>X</button>{/function}`
    const processed = preprocessAddonSystemFunctionRegions(html, manifest)
    expect(processed).toBe('<button>X</button>')
    expect(processed).not.toContain('data-addon-system-function')
  })
})
