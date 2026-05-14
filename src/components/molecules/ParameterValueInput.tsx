import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import {
  getParameterInputHint,
  getParameterInputRejectionMessage,
  isValidPartialParameterValue,
} from '@/core/parameterValueInput'
import type { NodeDataType } from '@/core/nodeSchema'

type ParameterValueInputProps = {
  ariaLabel: string
  className?: string
  type: NodeDataType
  value: string
  onCommit: (value: string) => void
  /** Chamado quando o campo ganha ou perde foco (layout do card pode reagir). */
  onFocusChange?: (focused: boolean) => void
}

export function ParameterValueInput({
  ariaLabel,
  className,
  type: dataType,
  value,
  onCommit,
  onFocusChange,
}: ParameterValueInputProps) {
  const [local, setLocal] = useState(value)
  const [title, setTitle] = useState(() => getParameterInputHint(dataType))
  const composingRef = useRef(false)
  const rejectTimerRef = useRef(0)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    return () => {
      window.clearTimeout(rejectTimerRef.current)
    }
  }, [])

  const showRejection = () => {
    setTitle(getParameterInputRejectionMessage(dataType))
    window.clearTimeout(rejectTimerRef.current)
    rejectTimerRef.current = window.setTimeout(() => {
      setTitle(getParameterInputHint(dataType))
    }, 2600)
  }

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      onBlur={() => {
        onFocusChange?.(false)
        onCommit(local)
      }}
      onFocus={() => onFocusChange?.(true)}
      onChange={(event) => {
        if (composingRef.current) {
          setLocal(event.target.value)
          return
        }
        const next = event.target.value
        if (!isValidPartialParameterValue(dataType, next)) {
          showRejection()
          return
        }
        setLocal(next)
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false
        const next = event.currentTarget.value
        if (!isValidPartialParameterValue(dataType, next)) {
          showRejection()
          setLocal(value)
          return
        }
        setLocal(next)
      }}
      onCompositionStart={() => {
        composingRef.current = true
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setLocal(value)
          event.currentTarget.blur()
        }
      }}
      title={title}
      type="text"
      value={local}
    />
  )
}
