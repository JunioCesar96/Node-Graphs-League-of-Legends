/** ELF hash de nomes de ossos LoL — port de Aventurine Hash.elf */

export function lolElfHash(name: string): number {
  let hash = 0
  const lower = name.toLowerCase()
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 4) + lower.charCodeAt(i)!
    let t = hash & 0xf0000000
    if (t !== 0) hash ^= t >>> 24
    hash &= ~t
  }
  return hash >>> 0
}
