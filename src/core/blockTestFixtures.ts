import type { BlockInspectorDraft, BlockParameterDef } from './blockSchema'
import type { CanvasNode, CanvasScene } from './canvasScene'
import type { NodeInstance } from './nodeSchema'

export const VFX_EMITTER_COLOR_TOKEN =
  '_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&Emitter01_nameParameter&color_typeParameter&vec4{0.55,0.95,1,1}_slotParameter&output[vec4,vec4list]&input[multiplyVec4]_endParameter'

export const VFX_EMITTER_LIFETIME_TOKEN =
  '_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&Emitter02_nameParameter&particleLifetime_typeParameter&f32{1.15}_slotParameter&output[f32,f32range]_endParameter'

export const VFX_EMITTER_TEXTURE_TOKEN =
  '_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&Emitter03_nameParameter&@iconImg@texture_typeParameter&string{"ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex"}_slotParameter&output[Img]_endParameter'

export const VFX_EMITTER_NAME_TOKEN =
  '_blockType&VfxEmitterDefinitionDataResult_blockName&EmitterResult_idParameter&EmitterResult01_nameParameter&emitterName_typeParameter&string{"circulo_magico_sparks"}_endParameter'

export const vfxEmitterSampleParameters: BlockParameterDef[] = [
  {
    idParameter: 'Emitter01',
    nameParameter: 'color',
    typeParameter: 'vec4',
    defaultValue: '0.55,0.95,1,1',
    slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
    iconHint: null,
    sourcePath: { kind: 'parameter', parameterId: 'p-color' },
  },
  {
    idParameter: 'Emitter02',
    nameParameter: 'particleLifetime',
    typeParameter: 'f32',
    defaultValue: '1.15',
    slotRules: { outputs: ['f32', 'f32range'] },
    iconHint: null,
    sourcePath: { kind: 'parameter', parameterId: 'p-lifetime' },
  },
  {
    idParameter: 'Emitter03',
    nameParameter: 'texture',
    typeParameter: 'string',
    defaultValue: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex',
    slotRules: { outputs: ['Img'] },
    iconHint: 'Img',
    sourcePath: { kind: 'parameter', parameterId: 'p-texture' },
  },
]

export const vfxEmitterSampleDraft: BlockInspectorDraft = {
  blockType: 'VfxEmitterDefinitionData',
  blockName: 'Emitter',
  entries: [
    {
      sourcePath: { kind: 'parameter', parameterId: 'p-color' },
      ritualName: 'Color',
      typeParameter: 'vec4',
      defaultValue: '0.55,0.95,1,1',
      exposed: true,
      nameParameter: 'color',
      iconHint: null,
      iconId: '',
      slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
      slotTags: [
        { direction: 'output', type: 'vec4', active: true },
        { direction: 'output', type: 'vec4list', active: true },
        { direction: 'input', type: 'multiplyVec4', active: true },
      ],
    },
    {
      sourcePath: { kind: 'parameter', parameterId: 'p-lifetime' },
      ritualName: 'particleLifetime',
      typeParameter: 'f32',
      defaultValue: '1.15',
      exposed: true,
      nameParameter: 'particleLifetime',
      iconHint: null,
      iconId: '',
      slotRules: { outputs: ['f32', 'f32range'] },
      slotTags: [
        { direction: 'output', type: 'f32', active: true },
        { direction: 'output', type: 'f32range', active: true },
      ],
    },
    {
      sourcePath: { kind: 'parameter', parameterId: 'p-texture' },
      ritualName: 'texture',
      typeParameter: 'string',
      defaultValue: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex',
      exposed: true,
      nameParameter: 'texture',
      iconHint: 'Img',
      iconId: 'texture.png',
      slotRules: { outputs: ['Img'] },
      slotTags: [{ direction: 'output', type: 'Img', active: true }],
    },
  ],
}

export function makeVfxEmitterCanvasNode(overrides?: Partial<CanvasNode>): CanvasNode {
  const node: NodeInstance = {
    id: 'n-vfx',
    schema: {
      id: 'VfxEmitterDefinitionData',
      title: 'VfxEmitterDefinitionData',
      parameters: [
        { id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: 'circulo_magico_sparks' },
        { id: 'p-color', name: 'Color', type: 'vector4', defaultValue: '0.55,0.95,1,1' },
        { id: 'p-lifetime', name: 'particleLifetime', type: 'f32', defaultValue: '1.15' },
        { id: 'p-texture', name: 'texture', type: 'string', defaultValue: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex' },
      ],
      internalStructures: [],
    },
    values: [
      { parameterId: 'p-emitter', value: 'circulo_magico_sparks' },
      { parameterId: 'p-color', value: '0.55,0.95,1,1' },
      { parameterId: 'p-lifetime', value: '1.15' },
      { parameterId: 'p-texture', value: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex' },
    ],
  }

  return {
    id: 'n-vfx',
    position: { x: 120, y: 80 },
    node,
    ...overrides,
  }
}

export function makeVfxEmitterScene(canvasNode?: CanvasNode): CanvasScene {
  return {
    width: 1120,
    height: 760,
    nodes: [canvasNode ?? makeVfxEmitterCanvasNode()],
    connections: [],
  }
}
