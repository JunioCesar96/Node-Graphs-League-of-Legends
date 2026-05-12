import type { NodeInstance, NodeSchemaDefinition } from './nodeSchema'

export type CanvasPosition = {
  x: number
  y: number
}

export type CanvasNode = {
  id: string
  node: NodeInstance
  position: CanvasPosition
}

export type ConnectionRouting = 'flex' | 'rigid'

export type CanvasConnection = {
  id: string
  fromNodeId: string
  fromEntityId: string
  toNodeId: string
  routing?: ConnectionRouting
}

export function hydrateScene(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    connections: scene.connections.map((c) => ({
      ...c,
      ...(c.routing ? { routing: c.routing } : {}),
    })),
    nodes: scene.nodes.map((n) => ({
      ...n,
      node: {
        ...n.node,
        schema: structuredClone(n.node.schema),
        values: structuredClone(n.node.values),
      },
    })),
  }
}

export type CanvasScene = {
  width: number
  height: number
  nodes: CanvasNode[]
  connections: CanvasConnection[]
}

const emitterSchema = {
  id: 'emitter-shape',
  title: 'EmitterShape',
  parameters: [
    {
      id: 'shape',
      name: 'shape',
      type: 'string',
      defaultValue: '"cone"',
    },
    {
      id: 'radius',
      name: 'radius',
      type: 'float',
      defaultValue: '1.25',
    },
    {
      id: 'offset',
      name: 'offset',
      type: 'vector3',
      defaultValue: '0, 0.5, 0',
    },
  ],
  entities: [],
} satisfies NodeSchemaDefinition

const forceSchema = {
  id: 'world-force',
  title: 'WorldForce',
  parameters: [
    {
      id: 'gravity',
      name: 'gravity',
      type: 'vector3',
      defaultValue: '0, -9.8, 0',
    },
    {
      id: 'drag',
      name: 'drag',
      type: 'float',
      defaultValue: '0.18',
    },
  ],
  entities: [
    {
      id: 'falloff',
      name: 'FalloffCurve',
      schemaId: 'falloff-curve',
    },
  ],
} satisfies NodeSchemaDefinition

const falloffSchema = {
  id: 'falloff-curve',
  title: 'FalloffCurve',
  parameters: [
    {
      id: 'mode',
      name: 'mode',
      type: 'keyword',
      defaultValue: 'smoothstep',
    },
    {
      id: 'strength',
      name: 'strength',
      type: 'double',
      defaultValue: '0.845',
    },
  ],
  entities: [],
} satisfies NodeSchemaDefinition

const particleSchema = {
  id: 'particle-root',
  title: 'ParticleSystem',
  parameters: [
    {
      id: 'spawn-rate',
      name: 'spawnRate',
      type: 'integer',
      defaultValue: '42',
    },
    {
      id: 'lifetime',
      name: 'lifetime',
      type: 'float',
      defaultValue: '3.14',
    },
    {
      id: 'tint',
      name: 'tintRGBA',
      type: 'vector4',
      defaultValue: '1, 0.58, 0.1, 1',
    },
  ],
  entities: [
    {
      id: 'emitter',
      name: 'EmitterShape',
      schemaId: 'emitter-shape',
    },
    {
      id: 'force',
      name: 'WorldForce',
      schemaId: 'world-force',
    },
  ],
} satisfies NodeSchemaDefinition

export const schemaRegistry = {
  [emitterSchema.id]: emitterSchema,
  [falloffSchema.id]: falloffSchema,
  [forceSchema.id]: forceSchema,
  [particleSchema.id]: particleSchema,
} satisfies Record<string, NodeSchemaDefinition>

export function createNodeInstance(schemaId: string, instanceId: string): NodeInstance | null {
  const schema = schemaRegistry[schemaId]

  if (!schema) {
    return null
  }

  const schemaClone = structuredClone(schema)

  return {
    id: instanceId,
    schema: schemaClone,
    values: schemaClone.parameters.map((parameter) => ({
      parameterId: parameter.id,
      value: parameter.defaultValue,
    })),
  }
}

const staticCanvasSceneRaw = {
  width: 1120,
  height: 760,
  nodes: [
    {
      id: 'particle-root-01',
      node: {
        id: 'particle-root-01',
        schema: particleSchema,
        values: [
          {
            parameterId: 'spawn-rate',
            value: '42',
          },
          {
            parameterId: 'lifetime',
            value: '3.14',
          },
          {
            parameterId: 'tint',
            value: '1, 0.58, 0.1, 1',
          },
        ],
      },
      position: {
        x: 72,
        y: 190,
      },
    },
    {
      id: 'emitter-01',
      node: {
        id: 'emitter-01',
        schema: emitterSchema,
        values: [
          {
            parameterId: 'shape',
            value: '"cone"',
          },
          {
            parameterId: 'radius',
            value: '1.25',
          },
          {
            parameterId: 'offset',
            value: '0, 0.5, 0',
          },
        ],
      },
      position: {
        x: 600,
        y: 72,
      },
    },
    {
      id: 'emitter-alt-01',
      node: {
        id: 'emitter-alt-01',
        schema: emitterSchema,
        values: [
          {
            parameterId: 'shape',
            value: '"sphere"',
          },
          {
            parameterId: 'radius',
            value: '2.4',
          },
          {
            parameterId: 'offset',
            value: '0, -0.25, 0',
          },
        ],
      },
      position: {
        x: 1010,
        y: 92,
      },
    },
    {
      id: 'force-01',
      node: {
        id: 'force-01',
        schema: forceSchema,
        values: [
          {
            parameterId: 'gravity',
            value: '0, -9.8, 0',
          },
          {
            parameterId: 'drag',
            value: '0.18',
          },
        ],
      },
      position: {
        x: 600,
        y: 390,
      },
    },
    {
      id: 'falloff-01',
      node: {
        id: 'falloff-01',
        schema: falloffSchema,
        values: [
          {
            parameterId: 'mode',
            value: 'smoothstep',
          },
          {
            parameterId: 'strength',
            value: '0.845',
          },
        ],
      },
      position: {
        x: 910,
        y: 474,
      },
    },
  ],
  connections: [
    {
      id: 'root-to-emitter',
      fromNodeId: 'particle-root-01',
      fromEntityId: 'emitter',
      toNodeId: 'emitter-01',
    },
    {
      id: 'root-to-force',
      fromNodeId: 'particle-root-01',
      fromEntityId: 'force',
      toNodeId: 'force-01',
    },
    {
      id: 'force-to-falloff',
      fromNodeId: 'force-01',
      fromEntityId: 'falloff',
      toNodeId: 'falloff-01',
    },
  ],
} satisfies CanvasScene

export const staticCanvasScene = hydrateScene(staticCanvasSceneRaw)
