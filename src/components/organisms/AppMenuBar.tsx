import { useRef } from 'react'

import {
  clearStoredRitobinExePath,
  getStoredRitobinExePath,
  readAbsolutePathFromDroppedOrPickedFile,
  setStoredRitobinExePath,
} from '@/core/ritobinExePreference'
import styles from './AppMenuBar.module.css'

export type AppMenuBarProps = {
  autoSaveEnabled: boolean
  nodeConfigurationMode: boolean
  onDeleteSelection: () => void
  onExportGraph: () => void
  onImportGraph: (file: File) => void
  onOpenStubBin: () => void
  onRequestAddNode: () => void
  onSaveSceneGraph: () => void
  onToggleAutoSave: () => void
  onToggleNodeConfigurationMode: () => void
  onToggleCodeDock: () => void
}

export function AppMenuBar({
  autoSaveEnabled,
  nodeConfigurationMode,
  onDeleteSelection,
  onExportGraph,
  onImportGraph,
  onOpenStubBin,
  onRequestAddNode,
  onSaveSceneGraph,
  onToggleAutoSave,
  onToggleNodeConfigurationMode,
  onToggleCodeDock,
}: AppMenuBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const ritobinExeInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Node Graphs LOL</span>

      <nav aria-label="Principal" className={styles.nav}>
        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            File
          </button>
          <div className={styles.menuPanel} role="menu">
            <input
              accept=".json,.bin"
              className={styles.hiddenInput}
              onChange={(changeEvent) => {
                const picked = changeEvent.target.files?.[0]

                if (picked) {
                  onImportGraph(picked)
                  changeEvent.target.value = ''
                }
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className={styles.menuItem}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Open…
            </button>
            <button className={styles.menuItem} onClick={onOpenStubBin} type="button">
              Stub .bin → JSON
            </button>
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            Ritobin
          </button>
          <div className={styles.menuPanel} role="menu">
            <input
              accept=".exe,.EXE"
              className={styles.hiddenInput}
              onChange={(changeEvent) => {
                const picked = changeEvent.target.files?.[0]

                changeEvent.target.value = ''

                if (!picked) {
                  return
                }

                const fromFilesystem = readAbsolutePathFromDroppedOrPickedFile(picked)

                const nextPath =
                  fromFilesystem ??
                  window.prompt(
                    `O browser não expõe o caminho absoluto ao ficheiro "${picked.name}".\nCole aqui o caminho completo para o ritobin (.exe):`,
                    getStoredRitobinExePath() ?? '',
                  )?.trim() ??
                  ''

                if (nextPath.length === 0) {
                  return
                }

                setStoredRitobinExePath(nextPath)

                window.alert(
                  nextPath.length > 204
                    ? `Caminho guardado:\n…${nextPath.slice(-180)}`
                    : `Caminho guardado:\n${nextPath}`,
                )
              }}
              ref={ritobinExeInputRef}
              type="file"
            />
            <button
              className={styles.menuItem}
              onClick={() => ritobinExeInputRef.current?.click()}
              type="button"
            >
              Escolher executável .exe…
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                const raw = window.prompt(
                  'Caminho absoluto do ritobin.exe:',
                  getStoredRitobinExePath() ?? '',
                )

                if (raw === null) {
                  return
                }

                const next = raw.trim()

                if (next.length === 0) {
                  window.alert('Caminho vazio — não alterado.')

                  return
                }

                setStoredRitobinExePath(next)

                window.alert(`Caminho guardado (${String(next.length)} caracteres).`)
              }}
              type="button"
            >
              Editar ou colar caminho…
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                const current = getStoredRitobinExePath()

                if (!current) {
                  window.alert('Nenhum executável ritobin está configurado.')

                  return
                }

                void navigator.clipboard.writeText(current).then(
                  () => {
                    window.alert('Caminho copiado para a área de transferência.')
                  },
                  () => {
                    window.alert(`Caminho atual:\n${current}`)
                  },
                )
              }}
              type="button"
            >
              Copiar caminho guardado
            </button>
            <button
              className={styles.menuItemDanger}
              onClick={() => {
                clearStoredRitobinExePath()
                window.alert('Caminho do ritobin removido.')
              }}
              type="button"
            >
              Limpar caminho ritobin
            </button>
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            Grafo
          </button>
          <div className={styles.menuPanel} role="menu">
            <button className={styles.menuItem} onClick={onSaveSceneGraph} type="button">
              Salvar grafo cena
            </button>
            <button
              aria-checked={autoSaveEnabled}
              className={styles.menuItemConfig}
              onClick={onToggleAutoSave}
              role="menuitemcheckbox"
              type="button"
            >
              <span
                aria-hidden
                className={[
                  styles.menuCheckbox,
                  autoSaveEnabled ? styles.menuCheckboxChecked : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span>Auto Save</span>
            </button>
            <div aria-hidden className={styles.menuSeparator} />
            <button className={styles.menuItem} onClick={onExportGraph} type="button">
              Exportar grafo JSON
            </button>
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} onClick={onToggleCodeDock} type="button">
            Código
          </button>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            Nodes
          </button>
          <div className={styles.menuPanel} role="menu">
            <button className={styles.menuItem} onClick={onRequestAddNode} type="button">
              Adicionar…
            </button>
            <button className={styles.menuItemDanger} onClick={onDeleteSelection} type="button">
              Remover selecionados
            </button>
            <button
              aria-checked={nodeConfigurationMode}
              className={styles.menuItemConfig}
              onClick={onToggleNodeConfigurationMode}
              role="menuitemcheckbox"
              type="button"
            >
              <span
                aria-hidden
                className={[
                  styles.menuCheckbox,
                  nodeConfigurationMode ? styles.menuCheckboxChecked : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span>Configurar</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
