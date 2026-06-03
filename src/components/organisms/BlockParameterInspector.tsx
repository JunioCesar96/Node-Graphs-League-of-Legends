import { useEffect, useState } from 'react'

import { BlockInspectorParameterCard } from '@/components/molecules/BlockInspectorParameterCard'
import { InspectorFloatingPanelShell } from '@/components/molecules/InspectorFloatingPanelShell'
import {
  blockInspectorEntryFromParameterDef,
  isStructuralParameterSourcePath,
} from '@/core/blockParameterFromJson'
import type { BlockInspectorDraftEntry, BlockParameterDef } from '@/core/blockSchema'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'
import inspectorStyles from '@/components/organisms/BlockInspector.module.css'

import styles from './BlockParameterInspector.module.css'

export type BlockParameterInspectorTarget = {
  nodeId: string
  paramId: string
  parameter: BlockParameterDef
}

type BlockParameterInspectorProps = {
  target: BlockParameterInspectorTarget | null
  onClose: () => void
  onApply: (nodeId: string, paramId: string, entry: BlockInspectorDraftEntry) => void
}

export function BlockParameterInspector({ target, onClose, onApply }: BlockParameterInspectorProps) {
  const { t } = useLanguage()
  const [entry, setEntry] = useState<BlockInspectorDraftEntry | null>(null)

  useEffect(() => {
    if (!target) {
      setEntry(null)
      return
    }
    setEntry(blockInspectorEntryFromParameterDef(target.parameter))
  }, [target])

  if (!target || !entry) {
    return null
  }

  const lockStructural = isStructuralParameterSourcePath(target.parameter.sourcePath)
  const displayName = entry.nameParameter || entry.ritualName

  return (
    <InspectorFloatingPanelShell
      ariaLabel={t(LangId.BlockParameterInspectorTitle)}
      title={displayName}
      eyebrow={t(LangId.BlockParameterInspectorTitle)}
      shellSurfaceClassName={inspectorStyles.panel}
      headerActions={
        <button
          type="button"
          className={inspectorStyles.iconButton}
          aria-label={t(LangId.BlockParameterInspectorCancel)}
          onClick={onClose}
        >
          ×
        </button>
      }
      body={
        <div className={styles.panel}>
          <BlockInspectorParameterCard
            entry={entry}
            showExposeToggle={false}
            lockStructuralSlots={lockStructural}
            onChange={setEntry}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              {t(LangId.BlockParameterInspectorCancel)}
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                onApply(target.nodeId, target.paramId, entry)
                onClose()
              }}
            >
              {t(LangId.BlockParameterInspectorApply)}
            </button>
          </div>
        </div>
      }
    />
  )
}
