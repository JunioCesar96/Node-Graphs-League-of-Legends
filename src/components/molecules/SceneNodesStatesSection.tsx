import { useRef } from 'react'

import {
  SceneNodesStateDeleteIcon,
  SceneNodesStateLoadIcon,
  SceneNodesStateSaveIcon,
} from '@/components/molecules/SceneNodesStateIcons'
import type { SceneNodesStatePreset } from '@/core/sceneNodesStatePresets'

import styles from '@/components/molecules/SceneNodesStatesSection.module.css'

export type SceneNodesStatesSectionProps = {
  presets: SceneNodesStatePreset[]
  onSaveNew: () => void
  onLoad: (presetId: string) => void
  onDelete: (presetId: string) => void
  onOverwrite: (presetId: string) => void
  onExportLibrary: () => void
  onImportLibrary: (file: File) => void
}

export function SceneNodesStatesSection({
  presets,
  onSaveNew,
  onLoad,
  onDelete,
  onOverwrite,
  onExportLibrary,
  onImportLibrary,
}: SceneNodesStatesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <section aria-labelledby="scene-nodes-states-heading" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} id="scene-nodes-states-heading">
          Estados
        </h3>
        <p className={styles.sectionHint}>
          Guarda visibilidade, travas, cores, filtros de ligação e posição da câmera dos nós em cena.
        </p>
        <button className={styles.primaryAction} onClick={onSaveNew} type="button">
          Salvar novo estado
        </button>
      </div>

      <ul aria-label="Estados guardados" className={styles.list} role="list">
        {presets.length === 0 ? (
          <li className={styles.empty}>Nenhum estado guardado.</li>
        ) : (
          presets.map((preset) => (
            <li className={styles.listItem} key={preset.id}>
              <span className={styles.rowName} title={preset.name}>
                {preset.name}
              </span>
              <div className={styles.rowActions}>
                <button
                  aria-label={`Carregar estado ${preset.name}`}
                  className={styles.rowAction}
                  onClick={() => onLoad(preset.id)}
                  title="Carregar"
                  type="button"
                >
                  <SceneNodesStateLoadIcon />
                </button>
                <button
                  aria-label={`Salvar estado ${preset.name}`}
                  className={styles.rowAction}
                  onClick={() => onOverwrite(preset.id)}
                  title="Salvar (sobrescrever)"
                  type="button"
                >
                  <SceneNodesStateSaveIcon />
                </button>
                <button
                  aria-label={`Apagar estado ${preset.name}`}
                  className={[styles.rowAction, styles.rowActionDanger].join(' ')}
                  onClick={() => {
                    if (window.confirm(`Apagar o estado «${preset.name}»?`)) {
                      onDelete(preset.id)
                    }
                  }}
                  title="Apagar"
                  type="button"
                >
                  <SceneNodesStateDeleteIcon />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <footer className={styles.footer}>
        <button className={styles.footerButton} onClick={onExportLibrary} type="button">
          Exportar JSON
        </button>
        <button
          className={styles.footerButton}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          Importar JSON
        </button>
        <input
          accept=".json,application/json"
          className={styles.hiddenFileInput}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) {
              onImportLibrary(file)
            }
          }}
          ref={fileInputRef}
          type="file"
        />
      </footer>
    </section>
  )
}
