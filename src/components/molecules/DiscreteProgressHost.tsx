import type { RefObject } from 'react'

import { useDiscreteProgressWindow } from '@/hooks/useDiscreteProgressWindow'
import type { DiscreteProgressWindow } from '@/core/ui/discreteProgressTasks'

import { DiscreteProgressIndicator } from './DiscreteProgressIndicator'
import styles from './DiscreteProgressHost.module.css'

type DiscreteProgressHostProps = {
  window: DiscreteProgressWindow
  containerRef: RefObject<HTMLElement | null>
}

export function DiscreteProgressHost({ window }: DiscreteProgressHostProps) {
  const entries = useDiscreteProgressWindow(window)
  const lockAny = entries.some((entry) => entry.lockAction)

  if (entries.length === 0) {
    return null
  }

  return (
    <>
      {lockAny ? <div aria-hidden className={styles.lockOverlay} /> : null}
      <div className={styles.host}>
        {entries.map((entry, index) => (
          <DiscreteProgressIndicator entry={entry} key={entry.name} stackIndex={index} />
        ))}
      </div>
    </>
  )
}
