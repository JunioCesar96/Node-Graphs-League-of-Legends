import { useEffect, useMemo, useState } from 'react'

import {
  StructureListPanel,
  type StructureListPanelActions,
  type StructureListPanelItem,
} from '@/components/molecules/StructureListPanel'
import { structureListPanelDefaultHeight } from '@/core/structureListPanelLayout'

import styles from './CatalogFormDialog.module.css'

export type EmbeddedStructureListPickerProps = {
  actions?: StructureListPanelActions
  emptyHint: string
  items: readonly StructureListPanelItem[]
  listTitle: string
  onPick: (item: StructureListPanelItem) => void
  selectedId: string | null
  panelWidth?: number
}

export function EmbeddedStructureListPicker({
  actions,
  emptyHint,
  items,
  listTitle,
  onPick,
  selectedId,
  panelWidth = 440,
}: EmbeddedStructureListPickerProps) {
  const selectedIndex = useMemo(() => {
    if (!selectedId) {
      return 0
    }
    const index = items.findIndex((item) => item.id === selectedId)
    return index >= 0 ? index : 0
  }, [items, selectedId])

  const [listIndex, setListIndex] = useState(selectedIndex)

  useEffect(() => {
    setListIndex(selectedIndex)
  }, [selectedIndex])

  const panelSize = useMemo(
    () => ({
      width: panelWidth,
      height: Math.max(120, structureListPanelDefaultHeight(items.length)),
    }),
    [items.length, panelWidth],
  )

  return (
    <div className={styles.listPickerWrap}>
      <StructureListPanel
        actions={actions}
        dismissOnClickOutside={false}
        embedded
        emptyHint={emptyHint}
        initialSize={panelSize}
        itemCountForHeight={items.length}
        items={items}
        listTitle={listTitle}
        open
        selectedId={selectedId}
        selectedIndex={listIndex}
        onOpenChange={() => {}}
        onPickItem={onPick}
        onSelectIndex={setListIndex}
      />
    </div>
  )
}
