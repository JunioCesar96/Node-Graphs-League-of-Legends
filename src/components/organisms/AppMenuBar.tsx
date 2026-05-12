import { useRef } from 'react'

import styles from './AppMenuBar.module.css'

export type AppMenuBarProps = {
  onDeleteSelection: () => void
  onExportGraph: () => void
  onImportGraph: (file: File) => void
  onOpenStubBin: () => void
  onRequestAddNode: () => void
  onToggleCodeDock: () => void
}

export function AppMenuBar({
  onDeleteSelection,
  onExportGraph,
  onImportGraph,
  onOpenStubBin,
  onRequestAddNode,
  onToggleCodeDock,
}: AppMenuBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
            Json
          </button>
          <div className={styles.menuPanel} role="menu">
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
          </div>
        </div>
      </nav>
    </header>
  )
}
