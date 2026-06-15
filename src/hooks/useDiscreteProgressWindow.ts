import { useEffect, useState } from 'react'

import {
  getDiscreteProgressForWindow,
  subscribeDiscreteProgress,
  type DiscreteProgressEntry,
} from '@/core/ui/discreteProgressStore'
import type { DiscreteProgressWindow } from '@/core/ui/discreteProgressTasks'

export function useDiscreteProgressWindow(window: DiscreteProgressWindow): DiscreteProgressEntry[] {
  const [items, setItems] = useState(() => getDiscreteProgressForWindow(window))

  useEffect(() => {
    return subscribeDiscreteProgress(() => {
      setItems(getDiscreteProgressForWindow(window))
    })
  }, [window])

  return items
}
