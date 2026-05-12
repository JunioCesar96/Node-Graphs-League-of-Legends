import { describe, expect, it } from 'vitest'

import {
  buildJadePropertyTableText,
  collectJadePropertyRows,
  collectObjectLinksFromBinProperties,
  discriminantToKindLabel,
  normalizePropertyKind,
} from '@/core/ltkBinTreePropertyFormat'
import { binTreeJsonToCanvasScene, isLikelyLtkBinTreeJson } from '@/core/ltkBinTreeScene'

const targetHash = 0x00ab_cdef
const referrerHash = 0xdead_beef

const minimalTreeFixture = {
  dependencies: [],
  is_override: false,
  objects: {
    AAA: {
      class_hash: 305419896,
      path_hash: 3735928559,
      properties: {
        AAA: {
          inline: null,
          kind: 6,
          name_hash: 10,
          value: { Signed: [-7] },
        },
      },
    },
  },
  version: 3,
}

describe('ltkBinTreeScene', () => {
  it('deteta formato BinTree e gera nó meta + objecto Jade', () => {
    expect(isLikelyLtkBinTreeJson(minimalTreeFixture)).toBe(true)
    expect(isLikelyLtkBinTreeJson({ format: 'node-graphs-lol', nodes: [], version: 1 })).toBe(false)

    const scene = binTreeJsonToCanvasScene(minimalTreeFixture)

    expect(scene?.nodes.some((candidate) => candidate.id === 'ltk-bin-meta-file')).toBe(true)
    expect(scene?.nodes.some((candidate) => candidate.id === `ltk-bin-obj-3735928559`)).toBe(true)

    const objectNode = scene?.nodes.find((candidate) => candidate.id === `ltk-bin-obj-3735928559`)

    expect(objectNode?.node.schema.parameters.some((candidate) => candidate.name === 'properties (Jade)')).toBe(true)

    expect(scene?.connections).toHaveLength(0)
    expect((scene?.height ?? 0) > 0).toBe(true)
  })

  it('cria Connection para ObjectLink quando o alvo existe no mesmo BinTree', () => {
    const tree = {
      dependencies: [],
      is_override: false,
      objects: {
        [`${referrerHash}`]: {
          class_hash: 1,
          path_hash: referrerHash,
          properties: {
            '111': {
              kind: 'ObjectLink',
              name_hash: 111,
              value: targetHash,
            },
          },
        },
        [`${targetHash}`]: {
          class_hash: 2,
          path_hash: targetHash,
          properties: {},
        },
      },
      version: 3,
    }

    const scene = binTreeJsonToCanvasScene(tree)
    expect(scene?.connections).toHaveLength(1)

    expect(scene?.connections[0]?.fromNodeId).toBe(`ltk-bin-obj-${referrerHash}`)
    expect(scene?.connections[0]?.toNodeId).toBe(`ltk-bin-obj-${targetHash}`)
    expect(scene?.connections[0]?.fromEntityId).toBe('olk-111')

    const linkTableInspect = scene
      ?.nodes.find((candidate) => candidate.id === `ltk-bin-obj-${referrerHash}`)
      ?.node.values.find((candidate) => candidate.parameterId === 'jade-property-table')

    expect(linkTableInspect?.value.includes('(fora)')).toBe(false)
  })

  it('cria Connection para ObjectLink aninhado num Container', () => {
    const containerReferrerHash = 0x11111111
    const containerTargetHash = 0x22222222

    const tree = {
      dependencies: [],
      is_override: false,
      objects: {
        [`${containerReferrerHash}`]: {
          class_hash: 1,
          path_hash: containerReferrerHash,
          properties: {
            '50': {
              kind: 'Container',
              name_hash: 50,
              value: {
                item_kind: 'ObjectLink',
                items: [{ kind: 'ObjectLink', value: containerTargetHash }],
              },
            },
          },
        },
        [`${containerTargetHash}`]: {
          class_hash: 2,
          path_hash: containerTargetHash,
          properties: {},
        },
      },
      version: 3,
    }

    const scene = binTreeJsonToCanvasScene(tree)

    expect(scene?.connections).toHaveLength(1)
    expect(scene?.connections[0]?.fromEntityId).toBe('olk-50_0')
    expect(scene?.connections[0]?.toNodeId).toBe(`ltk-bin-obj-${containerTargetHash}`)

    const metaNode = scene?.nodes.find((candidate) => candidate.id === 'ltk-bin-meta-file')
    const intratreeRaw = metaNode?.node.values.find((candidate) => candidate.parameterId === 'intratree-links')

    expect(intratreeRaw?.value).toBe('1')
    const metaExtra = metaNode?.node.values.find((candidate) => candidate.parameterId === 'extratree-links')

    expect(metaExtra?.value).toBe('0')

    const foreignPreview = metaNode?.node.values.find(
      (candidate) => candidate.parameterId === 'foreign-objectlink-targets',
    )

    expect(foreignPreview?.value).toContain('(sem ObjectLink')

    const containerInspectorTableText = scene
      ?.nodes.find((candidate) => candidate.id === `ltk-bin-obj-${containerReferrerHash}`)
      ?.node.values.find((candidate) => candidate.parameterId === 'jade-property-table')

    expect(containerInspectorTableText?.value.includes('(fora)')).toBe(false)
  })

  it('liga propriedade Hash ao objecto cujo path_hash coincide (pseudografia)', () => {
    const referrer = 0x1100aaaa
    const target = 0x2200bbbb

    const tree = {
      dependencies: [],
      is_override: false,
      objects: {
        [`${referrer}`]: {
          class_hash: 1,
          path_hash: referrer,
          properties: {
            '777': {
              kind: 'Hash',
              name_hash: 777,
              value: target,
            },
          },
        },
        [`${target}`]: {
          class_hash: 2,
          path_hash: target,
          properties: {},
        },
      },
      version: 3,
    }

    const scene = binTreeJsonToCanvasScene(tree)

    expect(scene?.connections).toHaveLength(1)
    expect(scene?.connections[0]?.fromEntityId.startsWith('hlk-hash_777')).toBe(true)
    expect(scene?.connections[0]?.fromNodeId).toBe(`ltk-bin-obj-${referrer}`)
    expect(scene?.connections[0]?.toNodeId).toBe(`ltk-bin-obj-${target}`)

    const metaNode = scene?.nodes.find((candidate) => candidate.id === 'ltk-bin-meta-file')

    expect(metaNode?.node.values.find((candidate) => candidate.parameterId === 'hash-path-hints')?.value).toBe(
      '1',
    )

    expect(metaNode?.node.values.find((candidate) => candidate.parameterId === 'intratree-links')?.value).toBe(
      '0',
    )

    expect(metaNode?.node.values.find((candidate) => candidate.parameterId === 'extratree-links')?.value).toBe(
      '0',
    )
  })

  it('usa _path_labels no título quando disponível', () => {
    const labelledPath = targetHash >>> 0

    const tree = {
      _path_labels: {
        [`${labelledPath}`]: `Hero/TargetObj`,
      },
      dependencies: [],
      is_override: false,
      objects: {
        [`${referrerHash}`]: {
          class_hash: 1,
          path_hash: referrerHash,
          properties: {
            '111': {
              kind: 'ObjectLink',
              name_hash: 111,
              value: targetHash,
            },
          },
        },
        [`${targetHash}`]: {
          class_hash: 2,
          path_hash: targetHash,
          properties: {},
        },
      },
      version: 3,
    }

    const scene = binTreeJsonToCanvasScene(tree)

    const targetCanvasNode = scene?.nodes.find((candidate) => candidate.id === `ltk-bin-obj-${targetHash}`)

    expect(targetCanvasNode?.node.schema.title).toContain('Hero/TargetObj')

    const metaNode = scene?.nodes.find((candidate) => candidate.id === 'ltk-bin-meta-file')

    expect(metaNode?.node.values.find((candidate) => candidate.parameterId === 'path-label-count')?.value).toBe(
      '1',
    )
  })

  it('meta marca ObjectLinks para path_hash absentes no snapshot', () => {
    const ghostTargetHash = 0xfe_edfa_ce
    const tree = {
      dependencies: [],
      is_override: false,
      objects: {
        [`${referrerHash}`]: {
          class_hash: 1,
          path_hash: referrerHash,
          properties: {
            '222': {
              kind: 'ObjectLink',
              name_hash: 222,
              value: ghostTargetHash,
            },
          },
        },
      },
      version: 3,
    }

    const scene = binTreeJsonToCanvasScene(tree)
    expect(scene?.connections).toHaveLength(0)

    const metaNode = scene?.nodes.find((candidate) => candidate.id === 'ltk-bin-meta-file')

    expect(
      metaNode?.node.values.find((candidate) => candidate.parameterId === 'extratree-links')?.value,
    ).toBe('1')
    expect(
      metaNode?.node.values.find((candidate) => candidate.parameterId === 'intratree-links')?.value,
    ).toBe('0')

    const foreignPrev = metaNode?.node.values.find(
      (candidate) => candidate.parameterId === 'foreign-objectlink-targets',
    )

    expect(foreignPrev?.value).toContain(
      `0x${(ghostTargetHash >>> 0).toString(16).padStart(8, '0')}`,
    )

    const ghostObjectNode = scene?.nodes.find((candidate) => candidate.id === `ltk-bin-obj-${referrerHash}`)
    const ghostInspectorTableText = ghostObjectNode?.node.values.find(
      (candidate) => candidate.parameterId === 'jade-property-table',
    )

    expect(ghostInspectorTableText?.value?.includes('(fora)')).toBe(true)
  })

  it('aceita bucket objects vazio com hints de BinTree → só nó meta', () => {
    const coarse = {
      dependencies: [],
      objects: {},
      version: 3,
    }

    expect(isLikelyLtkBinTreeJson(coarse)).toBe(true)
    const scene = binTreeJsonToCanvasScene(coarse)

    expect(scene?.nodes.map((candidate) => candidate.id)).toEqual(['ltk-bin-meta-file'])
  })
})

describe('ltkBinTreePropertyFormat', () => {
  it('resolve kind numérico e valor Signed do fixture legado', () => {
    expect(discriminantToKindLabel(6)).toBe('I32')
    expect(normalizePropertyKind('I32')).toBe('I32')

    const rows = collectJadePropertyRows({
      k1: {
        kind: 6,
        value: { Signed: [-7] },
      },
    })

    expect(rows.at(0)?.kindLabel).toBe('I32')
    expect(rows.at(0)?.preview).toBe('-7')
  })

  it('collectObjectLinks inclui nested Container + Struct inline', () => {
    const innerTarget = 0x9999_aabb

    const fromNestedStruct = collectObjectLinksFromBinProperties({
      wrap: {
        kind: 'Struct',
        name_hash: 1,
        value: {
          properties: {
            deep: {
              kind: 'ObjectLink',
              name_hash: 202,
              value: innerTarget,
            },
          },
        },
      },
    })

    expect(fromNestedStruct.some((candidate) => candidate.targetPathHash === innerTarget >>> 0)).toBe(true)

    const fromNestedContainer = collectObjectLinksFromBinProperties({
      fifty: {
        kind: 'Container',
        name_hash: 50,
        value: {
          item_kind: 'ObjectLink',
          items: [{ kind: 'ObjectLink', value: innerTarget }],
        },
      },
    })

    expect(fromNestedContainer.map((candidate) => candidate.entityBody)).toContain('50_0')
    expect(fromNestedContainer[0]?.targetPathHash).toBe(innerTarget >>> 0)
  })

  it('preview marca ObjectLinks dentro de valores compostos ([OL→…])', () => {
    const target = 0x11223344
    const rows = collectJadePropertyRows({
      '50': {
        kind: 'Container',
        name_hash: 50,
        value: {
          item_kind: 'ObjectLink',
          items: [{ kind: 'ObjectLink', value: target }],
        },
      },
    })

    expect(rows.some((row) => row.preview.includes('[→'))).toBe(true)

    const topOnly = collectJadePropertyRows({
      '9': {
        kind: 'ObjectLink',
        name_hash: 9,
        value: target,
      },
    })

    expect(topOnly.every((element) => !element.preview.includes('[→'))).toBe(true)
  })

  it('marca → e [OL→…] com (fora) se path_hash não estiver no snapshot', () => {
    const loneTargetGhost = 0xca11ab1e

    const topLevelRows = collectJadePropertyRows(
      {
        '222': {
          kind: 'ObjectLink',
          name_hash: 222,
          value: loneTargetGhost,
        },
      },
      new Set(),
    )

    expect(buildJadePropertyTableText(topLevelRows, 20, new Set()).includes('(fora)')).toBe(true)

    const nestedRows = collectJadePropertyRows(
      {
        '50': {
          kind: 'Container',
          name_hash: 50,
          value: {
            item_kind: 'ObjectLink',
            items: [{ kind: 'ObjectLink', value: loneTargetGhost }],
          },
        },
      },
      new Set(),
    )

    expect(nestedRows[0]?.preview.includes('(fora)')).toBe(true)
    expect(buildJadePropertyTableText(nestedRows, 20, new Set())).toContain('[→')
    expect(buildJadePropertyTableText(nestedRows, 20, new Set())).toContain('(fora)')
  })
})
