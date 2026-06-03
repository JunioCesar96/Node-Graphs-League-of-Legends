import styles from './BlockTypeDivider.module.css'

type BlockTypeDividerProps = {
  color: string
}

export function BlockTypeDivider({ color }: BlockTypeDividerProps) {
  return <hr className={styles.divider} style={{ backgroundColor: color }} aria-hidden />
}
