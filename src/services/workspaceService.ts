import type { CanvasScene } from '@/core/canvasScene'
import {
  isWorkspaceBundleEmpty,
  isWorkspaceBundleValid,
  mergeWorkspaceToScene,
  splitSceneToWorkspace,
  type WorkspaceBundle,
} from '@/core/workspacePersistence'
import { isCanvasScene, loadStoredScene, SCENE_STORAGE_KEY } from '@/core/sceneStorage'

export const WORKSPACE_MIGRATED_FLAG = 'node-graphs-lol:workspace-migrated'

const SAVE_DEBOUNCE_MS = 500

class WorkspaceService {
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  private readonly saveEndpoint = '/api/save-workspace'

  private readonly loadEndpoint = '/api/load-workspace'

  private isDev(): boolean {
    return import.meta.env.DEV
  }

  async loadWorkspaceFromDisk(): Promise<WorkspaceBundle | null> {
    if (!this.isDev()) {
      return null
    }

    try {
      const response = await fetch(this.loadEndpoint)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        if (this.isDev()) {
          console.error('[Workspace] Erro ao carregar do disco:', response.statusText)
        }
        return null
      }

      const data: unknown = await response.json()
      if (!isWorkspaceBundleValid(data)) {
        return null
      }

      return data
    } catch (error) {
      if (this.isDev()) {
        console.error('[Workspace] Falha na rede ao carregar:', error)
      }
      return null
    }
  }

  async loadSceneFromDisk(): Promise<CanvasScene | null> {
    const bundle = await this.loadWorkspaceFromDisk()
    if (!bundle || isWorkspaceBundleEmpty(bundle)) {
      return null
    }
    return mergeWorkspaceToScene(bundle)
  }

  saveWorkspace(data: WorkspaceBundle): void {
    if (!this.isDev()) {
      return
    }

    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null
      void this.flushSave(data)
    }, SAVE_DEBOUNCE_MS)
  }

  private async flushSave(data: WorkspaceBundle): Promise<void> {
    try {
      const response = await fetch(this.saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        console.log('[Workspace] Sincronizado com o disco com sucesso.')
      } else {
        console.error('[Workspace] Erro na sincronização:', response.statusText)
      }
    } catch (error) {
      console.error('[Workspace] Falha na rede ao salvar:', error)
    }
  }

  syncSceneToDisk(scene: CanvasScene): void {
    if (!this.isDev()) {
      return
    }
    this.saveWorkspace(splitSceneToWorkspace(scene))
  }

  async migrateLocalStorageToDiskOnce(): Promise<void> {
    if (!this.isDev()) {
      return
    }

    try {
      if (window.localStorage.getItem(WORKSPACE_MIGRATED_FLAG) === '1') {
        return
      }

      const existing = await this.loadWorkspaceFromDisk()
      if (existing !== null && !isWorkspaceBundleEmpty(existing)) {
        window.localStorage.setItem(WORKSPACE_MIGRATED_FLAG, '1')
        return
      }

      const storedRaw = window.localStorage.getItem(SCENE_STORAGE_KEY)
      if (!storedRaw) {
        return
      }

      const parsed: unknown = JSON.parse(storedRaw)
      if (!isCanvasScene(parsed)) {
        return
      }

      const scene = loadStoredScene()
      if (scene.nodes.length === 0) {
        return
      }

      const bundle = splitSceneToWorkspace(scene)
      await this.flushSave(bundle)
      window.localStorage.setItem(WORKSPACE_MIGRATED_FLAG, '1')
      console.log('[Workspace] Migração localStorage → disco concluída.')
    } catch (error) {
      console.error('[Workspace] Falha na migração one-shot:', error)
    }
  }
}

export const workspaceService = new WorkspaceService()
