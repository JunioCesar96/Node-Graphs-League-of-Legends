import { hydrateScene, type CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

/** Schemas embutidos — só para testes; a app não exige o pack `default`. */
const particleRootSchema = {
  id: 'particle-root',
  title: 'ParticleSystem',
  parameters: [
    { id: 'spawn-rate', name: 'spawnRate', type: 'integer', defaultValue: '42' },
    { id: 'lifetime', name: 'lifetime', type: 'float', defaultValue: '3.14' },
    { id: 'tint', name: 'tintRGBA', type: 'rgba', defaultValue: '1, 0.58, 0.1, 1' },
  ],
  internalStructures: [
    { id: 'emitter', name: 'EmitterShape', schemaId: 'emitter-shape' },
    { id: 'force', name: 'WorldForce', schemaId: 'world-force' },
  ],
} satisfies NodeSchemaDefinition

const emitterShapeSchema = {
  id: 'emitter-shape',
  title: 'EmitterShape',
  parameters: [
    { id: 'shape', name: 'shape', type: 'string', defaultValue: '"cone"' },
    { id: 'radius', name: 'radius', type: 'float', defaultValue: '1.25' },
    { id: 'offset', name: 'offset', type: 'vector3', defaultValue: '0, 0.5, 0' },
  ],
  internalStructures: [],
} satisfies NodeSchemaDefinition

const worldForceSchema = {
  id: 'world-force',
  title: 'WorldForce',
  parameters: [
    { id: 'gravity', name: 'gravity', type: 'vector3', defaultValue: '0, -9.8, 0' },
    { id: 'drag', name: 'drag', type: 'float', defaultValue: '0.18' },
  ],
  internalStructures: [{ id: 'falloff', name: 'FalloffCurve', schemaId: 'falloff-curve' }],
} satisfies NodeSchemaDefinition

const falloffCurveSchema = {
  id: 'falloff-curve',
  title: 'FalloffCurve',
  parameters: [
    { id: 'mode', name: 'mode', type: 'keyword', defaultValue: 'smoothstep' },
    { id: 'strength', name: 'strength', type: 'double', defaultValue: '0.845' },
  ],
  internalStructures: [],
} satisfies NodeSchemaDefinition

const demoCanvasSceneRaw = {
  width: 1120,
  height: 760,
  nodes: [
    {
      id: 'particle-root-01',
      node: {
        id: 'particle-root-01',
        schema: particleRootSchema,
        values: [
          { parameterId: 'spawn-rate', value: '42' },
          { parameterId: 'lifetime', value: '3.14' },
          { parameterId: 'tint', value: '1, 0.58, 0.1, 1' },
        ],
      },
      position: { x: 72, y: 190 },
    },
    {
      id: 'emitter-01',
      node: {
        id: 'emitter-01',
        schema: emitterShapeSchema,
        values: [
          { parameterId: 'shape', value: '"cone"' },
          { parameterId: 'radius', value: '1.25' },
          { parameterId: 'offset', value: '0, 0.5, 0' },
        ],
      },
      position: { x: 600, y: 72 },
    },
    {
      id: 'emitter-alt-01',
      node: {
        id: 'emitter-alt-01',
        schema: emitterShapeSchema,
        values: [
          { parameterId: 'shape', value: '"sphere"' },
          { parameterId: 'radius', value: '2.4' },
          { parameterId: 'offset', value: '0, -0.25, 0' },
        ],
      },
      position: { x: 1010, y: 92 },
    },
    {
      id: 'force-01',
      node: {
        id: 'force-01',
        schema: worldForceSchema,
        values: [
          { parameterId: 'gravity', value: '0, -9.8, 0' },
          { parameterId: 'drag', value: '0.18' },
        ],
      },
      position: { x: 600, y: 390 },
    },
    {
      id: 'falloff-01',
      node: {
        id: 'falloff-01',
        schema: falloffCurveSchema,
        values: [
          { parameterId: 'mode', value: 'smoothstep' },
          { parameterId: 'strength', value: '0.845' },
        ],
      },
      position: { x: 910, y: 474 },
    },
  ],
  connections: [
    {
      id: 'root-to-emitter',
      fromNodeId: 'particle-root-01',
      fromInternalStructureId: 'emitter',
      toNodeId: 'emitter-01',
    },
    {
      id: 'root-to-force',
      fromNodeId: 'particle-root-01',
      fromInternalStructureId: 'force',
      toNodeId: 'force-01',
    },
    {
      id: 'force-to-falloff',
      fromNodeId: 'force-01',
      fromInternalStructureId: 'falloff',
      toNodeId: 'falloff-01',
    },
  ],
} satisfies CanvasScene

/** Cena de exemplo com schemas embutidos (testes). */
export const demoCanvasScene = hydrateScene(demoCanvasSceneRaw)
