import styles from './StructureIndexPager.module.css'

type StructureIndexPagerProps = {
  selectedIndex: number
  total: number
  onSelectedIndexChange: (index: number) => void
  onCounterClick?: () => void
}

export function StructureIndexPager({
  selectedIndex,
  total,
  onSelectedIndexChange,
  onCounterClick,
}: StructureIndexPagerProps) {
  if (total <= 0) {
    return null
  }

  const safeIndex = Math.min(Math.max(0, selectedIndex), total - 1)
  const displayIndex = safeIndex

  return (
    <div aria-label="Navegação por índice" className={styles.pager} role="navigation">
      <button
        aria-label="Entrada anterior"
        className={styles.navButton}
        disabled={safeIndex <= 0}
        onClick={() => onSelectedIndexChange(safeIndex - 1)}
        type="button"
      >
        ‹
      </button>
      <button
        aria-label={`Índice ${displayIndex} de ${total - 1}. Abrir lista.`}
        className={styles.counter}
        onClick={onCounterClick}
        type="button"
      >
        {displayIndex} / {total - 1}
      </button>
      <button
        aria-label="Entrada seguinte"
        className={styles.navButton}
        disabled={safeIndex >= total - 1}
        onClick={() => onSelectedIndexChange(safeIndex + 1)}
        type="button"
      >
        ›
      </button>
    </div>
  )
}
