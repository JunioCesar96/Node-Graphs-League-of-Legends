/** Leitor binário little-endian — port de Aventurine binary_utils.BinaryStream. */

export class LolBinaryStream {
  private offset = 0

  constructor(
    private readonly bytes: Uint8Array,
    private readonly view: DataView,
  ) {}

  static fromBuffer(buffer: ArrayBuffer | Uint8Array): LolBinaryStream {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    return new LolBinaryStream(bytes, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  }

  get position(): number {
    return this.offset
  }

  get remaining(): number {
    return this.bytes.byteLength - this.offset
  }

  seek(position: number) {
    this.offset = Math.max(0, Math.min(position, this.bytes.byteLength))
  }

  skip(length: number) {
    this.offset += length
  }

  readUint8(): number {
    const value = this.bytes[this.offset] ?? 0
    this.offset += 1
    return value
  }

  readBytes(length: number): Uint8Array {
    const slice = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  readUint16(count = 1): number | number[] {
    if (count === 1) {
      const value = this.view.getUint16(this.offset, true)
      this.offset += 2
      return value
    }
    return this.readUint16Array(count)
  }

  /** Sempre devolve array (inclui count === 1). */
  readUint16Array(count: number): number[] {
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(this.view.getUint16(this.offset, true))
      this.offset += 2
    }
    return values
  }

  readInt16(count = 1): number | number[] {
    if (count === 1) {
      const value = this.view.getInt16(this.offset, true)
      this.offset += 2
      return value
    }
    const values: number[] = []
    for (let i = 0; i < count; i++) values.push(this.readInt16() as number)
    return values
  }

  readUint32(count = 1): number | number[] {
    if (count === 1) {
      const value = this.view.getUint32(this.offset, true)
      this.offset += 4
      return value
    }
    const values: number[] = []
    for (let i = 0; i < count; i++) values.push(this.readUint32() as number)
    return values
  }

  readInt32(count = 1): number | number[] {
    if (count === 1) {
      const value = this.view.getInt32(this.offset, true)
      this.offset += 4
      return value
    }
    const values: number[] = []
    for (let i = 0; i < count; i++) values.push(this.readInt32() as number)
    return values
  }

  readFloat(count = 1): number | number[] {
    if (count === 1) {
      const value = this.view.getFloat32(this.offset, true)
      this.offset += 4
      return value
    }
    const values: number[] = []
    for (let i = 0; i < count; i++) values.push(this.readFloat() as number)
    return values
  }

  readVec2(): [number, number] {
    const x = this.readFloat() as number
    const y = this.readFloat() as number
    return [x, y]
  }

  readVec3(): [number, number, number] {
    const x = this.readFloat() as number
    const y = this.readFloat() as number
    const z = this.readFloat() as number
    return [x, y, z]
  }

  readQuat(): [number, number, number, number] {
    const x = this.readFloat() as number
    const y = this.readFloat() as number
    const z = this.readFloat() as number
    const w = this.readFloat() as number
    return [x, y, z, w]
  }

  readAscii(length: number): string {
    return new TextDecoder('ascii')
      .decode(this.readBytes(length))
      .replace(/\0/g, '')
  }

  readPaddedAscii(length: number): string {
    return this.readAscii(length).trim()
  }

  readCharUntilZero(): string {
    const chars: string[] = []
    while (this.offset < this.bytes.byteLength) {
      const byte = this.readUint8()
      if (byte === 0) break
      chars.push(String.fromCharCode(byte))
    }
    return chars.join('')
  }
}
