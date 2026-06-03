import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const parametersList = JSON.parse(
  readFileSync(join(root, 'src/nodeStructures/default/temp/parameters_list.json'), 'utf8'),
)

const PREFIX = 'VfxEmitterDefinitionData_'
const fields = [...new Set(
  parametersList
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => {
      const tail = k.slice(PREFIX.length).split('_').pop() ?? k
      if (tail === 'alphaErosionDefinition') return 'alphaErosionDefinition'
      if (tail === 'reflectionDefinition') return 'reflectionDefinition'
      if (tail === 'SpawnShape') return 'SpawnShape'
      if (tail === 'EmitterPosition') return 'EmitterPosition'
      if (tail === 'Color') return 'Color'
      return tail
    }),
)].sort()

console.log(`VfxEmitterDefinitionData fields in schema: ${fields.length}`)
console.log('Run `npm run vfx:coverage` for full matrix with implementation status.')
