import { describe, expect, it } from 'vitest'

import { staticCanvasScene } from '@/core/canvasScene'
import {
  isWorkspaceBundleEmpty,
  isWorkspaceBundleValid,
  mergeWorkspaceToScene,
  splitSceneToWorkspace,
  WORKSPACE_FORMAT_VERSION,
} from '@/core/workspacePersistence'

describe('workspacePersistence', () => {
  it('faz round-trip split → merge sobre a demo estática', () => {
    const bundle = splitSceneToWorkspace(staticCanvasScene)
    const restored = mergeWorkspaceToScene(bundle)

    expect(restored).not.toBeNull()
    expect(restored?.nodes.length).toBe(staticCanvasScene.nodes.length)
    expect(restored?.connections.length).toBe(staticCanvasScene.connections.length)
    expect(restored?.nodes[0]?.node.schema.id).toBe(staticCanvasScene.nodes[0]?.node.schema.id)
    expect(restored?.nodes[0]?.position).toEqual(staticCanvasScene.nodes[0]?.position)
  })

  it('valida bundle com versão e estrutura corretas', () => {
    const bundle = splitSceneToWorkspace(staticCanvasScene)
    expect(isWorkspaceBundleValid(bundle)).toBe(true)
    expect(isWorkspaceBundleEmpty(bundle)).toBe(false)
  })

  it('rejeita bundle inválido', () => {
    expect(isWorkspaceBundleValid({ logic: {}, layout: {}, graph: {} })).toBe(false)
    expect(
      mergeWorkspaceToScene({
        logic: { version: WORKSPACE_FORMAT_VERSION, nodes: {} },
        layout: { version: WORKSPACE_FORMAT_VERSION, width: 100, height: 100, nodes: {} },
        graph: { version: WORKSPACE_FORMAT_VERSION, connections: [] },
      }),
    ).toBeNull()
  })

  it('bundle vazio é considerado empty e merge retorna null', () => {
    const empty = {
      logic: { version: WORKSPACE_FORMAT_VERSION, nodes: {} },
      layout: { version: WORKSPACE_FORMAT_VERSION, width: 1120, height: 760, nodes: {} },
      graph: { version: WORKSPACE_FORMAT_VERSION, connections: [] },
    }
    expect(isWorkspaceBundleValid(empty)).toBe(false)
    expect(isWorkspaceBundleEmpty(empty as never)).toBe(true)
    expect(mergeWorkspaceToScene(empty as never)).toBeNull()
  })
})
