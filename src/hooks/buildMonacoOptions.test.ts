import { describe, expect, it } from 'vitest'

import { BIG_FILE_LINES, buildMonacoOptions, PERF_DEFAULTS } from './buildMonacoOptions'

describe('buildMonacoOptions', () => {
  it('desliga minimap em ficheiro grande com modo auto', () => {
    const opts = buildMonacoOptions(PERF_DEFAULTS, BIG_FILE_LINES + 1)
    expect(opts.minimap).toEqual({ enabled: false })
  })

  it('mantém minimap em ficheiro pequeno com modo auto', () => {
    const opts = buildMonacoOptions(PERF_DEFAULTS, 100)
    expect(opts.minimap).toEqual({ enabled: true })
  })

  it('força minimap ligado com modo on', () => {
    const opts = buildMonacoOptions({ ...PERF_DEFAULTS, minimap: 'on' }, BIG_FILE_LINES + 5000)
    expect(opts.minimap).toEqual({ enabled: true })
  })
})
