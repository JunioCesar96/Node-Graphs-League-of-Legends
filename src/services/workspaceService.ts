import type { CanvasScene } from '@/core/canvasScene'
import {
  isWorkspaceBundleEmpty,
  mergeWorkspaceToScene,
  normalizeWorkspaceBundle,
  splitSceneToWorkspace,
  type WorkspaceBundle,
} from '@/core/workspacePersistence'
import { isCanvasScene, loadStoredScene, SCENE_STORAGE_KEY } from '@/core/sceneStorage'

export const WORKSPACE_MIGRATED_FLAG = 'node-graphs-lol:workspace-migrated'

const SAVE_DEBOUNCE_MS = 500

export type WorkspaceSaveTrigger = 'manual' | 'auto' | 'migration'

export type WorkspaceSaveStatusEvent = {
  ok: boolean
  trigger: WorkspaceSaveTrigger
  detail?: string
}

class WorkspaceService {
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  private saveStatusListener: ((event: WorkspaceSaveStatusEvent) => void) | null = null

  private readonly saveEndpoint = '/api/save-workspace'

  private readonly loadEndpoint = '/api/load-workspace'

  setSaveStatusListener(listener: ((event: WorkspaceSaveStatusEvent) => void) | null): void {
    this.saveStatusListener = listener
  }

  private emitSaveStatus(event: WorkspaceSaveStatusEvent): void {
    this.saveStatusListener?.(event)
  }

  private isDev(): boolean {
    return import.meta.env.DEV
  }

  async loadWorkspaceFromDisk(): Promise<WorkspaceBundle | null> {
    if (!this.isDev()) {
      return null
    }

    try {
      const response = await fetch(this.loadEndpoint, {
        headers: { Accept: 'application/json' },
      })
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        if (this.isDev()) {
          console.error('[Workspace] Erro ao carregar do disco:', response.statusText)
        }
        return null
      }

      const contentType = response.headers.get('Content-Type') ?? ''
      if (!contentType.includes('application/json')) {
        console.error(
          '[Workspace] Resposta de load-workspace não é JSON (recebeu HTML do SPA). Reinicia `npm run dev` em node-graphs-lol e confirma [workspace-sync] no terminal.',
        )
        return null
      }

      const data: unknown = await response.json()
      const bundle = normalizeWorkspaceBundle(data)
      if (!bundle) {
        return null
      }

      return bundle
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
      void this.flushSave(data, 'auto')
    }, SAVE_DEBOUNCE_MS)
  }

  private async flushSave(data: WorkspaceBundle, trigger: WorkspaceSaveTrigger): Promise<void> {
    try {
      const response = await fetch(this.saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        console.log('[Workspace] Sincronizado com o disco com sucesso.')
        if (trigger !== 'migration') {
          this.emitSaveStatus({ ok: true, trigger })
        }
      } else if (response.status === 404) {
        const detail =
          'API de disco não encontrada (404). Reinicia npm run dev e confirma [workspace-sync] no terminal.'
        console.error(`[Workspace] ${detail}`)
        if (trigger !== 'migration') {
          this.emitSaveStatus({ ok: false, trigger, detail })
        }
      } else {
        const detail = `Erro na sincronização: ${response.statusText}`
        console.error(`[Workspace] ${detail}`)
        if (trigger !== 'migration') {
          this.emitSaveStatus({ ok: false, trigger, detail })
        }
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Falha na rede ao gravar cena no disco.'
      console.error('[Workspace] Falha na rede ao salvar:', error)
      if (trigger !== 'migration') {
        this.emitSaveStatus({ ok: false, trigger, detail })
      }
    }
  }

  syncSceneToDisk(scene: CanvasScene): void {
    if (!this.isDev()) {
      return
    }
    this.saveWorkspace(splitSceneToWorkspace(scene))
  }

  /** Gravação imediata no disco (sem debounce); usada pelo menu Grafo → Salvar grafo cena. */
  saveSceneNow(scene: CanvasScene): void {
    if (!this.isDev()) {
      return
    }

    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    void this.flushSave(splitSceneToWorkspace(scene), 'manual')
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
      await this.flushSave(bundle, 'migration')
      window.localStorage.setItem(WORKSPACE_MIGRATED_FLAG, '1')
      console.log('[Workspace] Migração localStorage → disco concluída.')
    } catch (error) {
      console.error('[Workspace] Falha na migração one-shot:', error)
    }
  }
}

export const workspaceService = new WorkspaceService()
