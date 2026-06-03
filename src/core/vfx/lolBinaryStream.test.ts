import { describe, expect, it } from 'vitest'

import { LolBinaryStream } from './lolBinaryStream'

describe('LolBinaryStream', () => {
  it('readUint16Array devolve array mesmo com count === 1', () => {
    const bytes = new Uint8Array([0x2a, 0x00, 0x3c, 0x00])
    const stream = LolBinaryStream.fromBuffer(bytes)
    expect(stream.readUint16Array(1)).toEqual([42])
    expect(stream.readUint16Array(1)).toEqual([60])
  })
})
