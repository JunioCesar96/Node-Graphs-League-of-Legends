import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'

import styles from './BlockSlotConnectionPager.module.css'

type BlockSlotConnectionPagerProps = {
  selectedIndex: number
  total: number
  onSelectedIndexChange: (index: number) => void
  layout?: 'inline' | 'below'
}

export function BlockSlotConnectionPager({
  selectedIndex,
  total,
  onSelectedIndexChange,
  layout = 'inline',
}: BlockSlotConnectionPagerProps) {
  if (total <= 1) {
    return null
  }

  return (
    <div
      className={[styles.wrap, layout === 'below' ? styles.wrapBelow : ''].filter(Boolean).join(' ')}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <StructureIndexPager
        className={styles.pager}
        onSelectedIndexChange={onSelectedIndexChange}
        selectedIndex={selectedIndex}
        total={total}
      />
    </div>
  )
}
