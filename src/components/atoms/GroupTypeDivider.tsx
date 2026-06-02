import styles from './GroupTypeDivider.module.css'

type GroupTypeDividerProps = {
  color: string
}

export function GroupTypeDivider({ color }: GroupTypeDividerProps) {
  return <hr className={styles.divider} style={{ backgroundColor: color }} aria-hidden />
}
