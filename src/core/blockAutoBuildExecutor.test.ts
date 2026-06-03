import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlockAutoBuildPlan } from './blockAutoBuild'
import {
  executeAutoBuildWorkItems,
  flattenAutoBuildWorkItems,
  type AutoBuildWorkItem,
} from './blockAutoBuildExecutor'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { BlockParameterJsonDocument } from './blockParameterJson'

vi.mock('./blockParameterStorage', () => ({
  writeBlockParameterDocument: vi.fn(),
  writeBlockParameterDocuments: vi.fn(),
}))

vi.mock('./blockDefinitionStorage', () => ({
  writeBlockDefinitionDocument: vi.fn(),
}))

import { writeBlockParameterDocuments } from './blockParameterStorage'
import { writeBlockDefinitionDocument } from './blockDefinitionStorage'

const parameterA: BlockParameterJsonDocument = {
  id: 'scale0_scale0',
  block: 'VfxEmitterDefinitionData',
  parameterName: 'scale0',
  name: 'scale0',
  type: 'vec3',
  value: '1, 2, 3',
  source: { kind: 'parameter', parameterId: 'p-scale0' },
  slots: { in: ['vec3'], out: ['vec3'] },
}

const parameterDuplicate: BlockParameterJsonDocument = {
  ...parameterA,
  value: '9, 9, 9',
}

const blockA: BlockDefinitionJsonDocument = {
  id: 'ValueFloat_ValueFloat',
  block: 'rate',
  blockName: 'ValueFloat',
  type: 'embed',
  name: 'ValueFloat',
  source: { kind: 'block', nodeId: 'value-float__template' },
  color: '#40ff56',
  headerSlots: ['in[rate]', 'out[ValueFloatPreview]'],
  parameters: ['constantValue'],
}

function makePlan(overrides: Partial<BlockAutoBuildPlan> = {}): BlockAutoBuildPlan {
  return {
    parameterDocuments: [parameterA],
    blockDocuments: [blockA],
    nodeResults: [{ nodeId: 'n-1', schemaTitle: 'Test', parameterCount: 1, blockId: blockA.id, errors: [] }],
    errors: [],
    ...overrides,
  }
}

describe('flattenAutoBuildWorkItems', () => {
  it('ordena parâmetros antes de blocos', () => {
    const items = flattenAutoBuildWorkItems(makePlan())
    expect(items.map((item) => item.kind)).toEqual(['parameter', 'block'])
  })

  it('deduplica parâmetros pelo id mantendo o último', () => {
    const items = flattenAutoBuildWorkItems(
      makePlan({
        parameterDocuments: [parameterA, parameterDuplicate],
      }),
    )

    expect(items.filter((item) => item.kind === 'parameter')).toHaveLength(1)
    expect(items.find((item) => item.kind === 'parameter')?.parameterDocument?.value).toBe('9, 9, 9')
  })

  it('mantém parâmetro e bloco quando compartilham o mesmo id', () => {
    const sharedId = 'shared_id'
    const items = flattenAutoBuildWorkItems(
      makePlan({
        parameterDocuments: [{ ...parameterA, id: sharedId }],
        blockDocuments: [{ ...blockA, id: sharedId }],
      }),
    )

    expect(items).toHaveLength(2)
    expect(items.filter((item) => item.kind === 'parameter')).toHaveLength(1)
    expect(items.filter((item) => item.kind === 'block')).toHaveLength(1)
  })

  it('mantém parâmetros homônimos em blocos diferentes', () => {
    const dynamicsA: BlockParameterJsonDocument = {
      id: 'dynamics_dynamics',
      block: 'ValueVector3',
      parameterName: 'dynamics',
      name: 'dynamics',
      type: 'embed',
      value: '',
      source: { kind: 'parameter', parameterId: 'p-a' },
      slots: { in: ['embed'], out: ['embed'] },
    }
    const dynamicsB: BlockParameterJsonDocument = {
      ...dynamicsA,
      block: 'IntegratedValueVector3',
      source: { kind: 'parameter', parameterId: 'p-b' },
    }

    const items = flattenAutoBuildWorkItems(
      makePlan({
        parameterDocuments: [dynamicsA, dynamicsB],
        blockDocuments: [],
      }),
    )

    expect(items.filter((item) => item.kind === 'parameter')).toHaveLength(2)
  })

  it('faz merge de parâmetros quando bloco duplicado tem mesmo id', () => {
    const blockOnlyDynamics: BlockDefinitionJsonDocument = {
      ...blockA,
      id: 'IntegratedValueVector3_IntegratedValueVector3',
      blockName: 'IntegratedValueVector3',
      name: 'IntegratedValueVector3',
      parameters: ['dynamics'],
    }
    const blockOnlyConstant: BlockDefinitionJsonDocument = {
      ...blockOnlyDynamics,
      parameters: ['constantValue'],
    }

    const items = flattenAutoBuildWorkItems(
      makePlan({
        parameterDocuments: [],
        blockDocuments: [blockOnlyDynamics, blockOnlyConstant],
      }),
    )

    const mergedBlock = items.find((item) => item.kind === 'block')?.blockDocument
    expect(mergedBlock?.parameters).toEqual(['dynamics', 'constantValue'])
  })

  it('faz merge de headerSlots quando bloco duplicado tem mesmo id', () => {
    const blockBranchA: BlockDefinitionJsonDocument = {
      ...blockA,
      id: 'DupBlock_DupBlock',
      blockName: 'DupBlock',
      name: 'DupBlock',
      headerSlots: ['in[branchA]', 'out[DupBlockPreview]'],
    }
    const blockBranchB: BlockDefinitionJsonDocument = {
      ...blockBranchA,
      headerSlots: ['in[branchB]', 'out[DupBlockPreview]'],
    }

    const items = flattenAutoBuildWorkItems(
      makePlan({
        parameterDocuments: [],
        blockDocuments: [blockBranchA, blockBranchB],
      }),
    )

    const mergedBlock = items.find((item) => item.kind === 'block')?.blockDocument
    expect(mergedBlock?.headerSlots).toEqual([
      'in[branchA,branchB]',
      'out[DupBlockPreview]',
    ])
  })

  it('retorna vazio para plano sem documentos', () => {
    expect(flattenAutoBuildWorkItems(makePlan({ parameterDocuments: [], blockDocuments: [] }))).toEqual([])
  })
})

describe('executeAutoBuildWorkItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(writeBlockParameterDocuments).mockResolvedValue({
      ok: true,
      written: ['scale0_scale0.json'],
      overwritten: [],
      skipped: [],
      errors: [],
    })
    vi.mocked(writeBlockDefinitionDocument).mockResolvedValue({
      ok: true,
      written: 'valuefloat_valuefloat.json',
      overwritten: false,
    })
  })

  it('grava todos os items e reporta progresso final', async () => {
    const items = flattenAutoBuildWorkItems(makePlan())
    const progressSnapshots: number[] = []

    const result = await executeAutoBuildWorkItems({
      items,
      nodesProcessed: 1,
      planErrors: [],
      onProgress: (progress) => {
        progressSnapshots.push(progress.completed)
      },
    })

    expect(writeBlockParameterDocuments).toHaveBeenCalledTimes(1)
    expect(writeBlockParameterDocuments).toHaveBeenCalledWith([parameterA])
    expect(writeBlockDefinitionDocument).toHaveBeenCalledTimes(1)
    expect(result.cancelled).toBe(false)
    expect(result.written.length + result.overwritten.length).toBeGreaterThan(0)
    expect(progressSnapshots.at(-1)).toBe(items.length)
  })

  it('interrompe quando cancel é pedido', async () => {
    const items: AutoBuildWorkItem[] = Array.from({ length: 50 }, (_, index) => ({
      kind: 'parameter' as const,
      label: `p-${String(index)}`,
      documentId: `p-${String(index)}`,
      parameterDocument: {
        ...parameterA,
        id: `p-${String(index)}_p-${String(index)}`,
        parameterName: `p${String(index)}`,
        name: `p${String(index)}`,
      },
    }))

    let cancel = false
    const result = await executeAutoBuildWorkItems({
      items,
      nodesProcessed: 1,
      planErrors: [],
      shouldCancel: () => cancel,
      onProgress: (progress) => {
        if (progress.completed >= 48) {
          cancel = true
        }
      },
    })

    expect(result.cancelled).toBe(true)
    expect(writeBlockParameterDocuments).toHaveBeenCalledTimes(1)
  })
})
