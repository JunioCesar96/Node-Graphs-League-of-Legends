import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { ParameterBoolInput } from '@/components/molecules/ParameterBoolInput'
import { ParameterRgbaInput } from '@/components/molecules/ParameterRgbaInput'
import { ParameterVector2Input } from '@/components/molecules/ParameterVector2Input'
import { ParameterVector3Input } from '@/components/molecules/ParameterVector3Input'
import { ParameterListF32Input } from '@/components/molecules/ParameterListF32Input'
import { ParameterOptionF32Input } from '@/components/molecules/ParameterOptionF32Input'
import { ParameterOptionStringInput } from '@/components/molecules/ParameterOptionStringInput'
import { ParameterOptionVector3Input } from '@/components/molecules/ParameterOptionVector3Input'
import { ParameterMapHashLinkInput } from '@/components/molecules/ParameterMapHashLinkInput'
import { ParameterListHashInput } from '@/components/molecules/ParameterListHashInput'
import { ParameterListStringInput } from '@/components/molecules/ParameterListStringInput'
import { ParameterListVector2Input } from '@/components/molecules/ParameterListVector2Input'
import { ParameterListVector3Input } from '@/components/molecules/ParameterListVector3Input'
import { ParameterListVector4Input } from '@/components/molecules/ParameterListVector4Input'
import { ParameterLinkInput } from '@/components/molecules/ParameterLinkInput'
import { ParameterMtx44Input } from '@/components/molecules/ParameterMtx44Input'
import { ParameterVector4Input } from '@/components/molecules/ParameterVector4Input'
import {
  getParameterInputHint,
  getParameterInputRejectionMessage,
  isValidPartialParameterValue,
  normalizeParameterValueForCommit,
  usesDecimalInputMode,
  usesNumericInputMode,
} from '@/core/parameterValueInput'
import type { NodeDataType } from '@/core/nodeSchema'

type ParameterValueInputProps = {
  ariaLabel: string
  className?: string
  type: NodeDataType
  value: string
  fieldTitle?: string
  onCommit: (value: string) => void
  /** Chamado quando o campo ganha ou perde foco (layout do card pode reagir). */
  onFocusChange?: (focused: boolean) => void
}

export function ParameterValueInput({
  ariaLabel,
  className,
  type: dataType,
  value,
  fieldTitle,
  onCommit,
  onFocusChange,
}: ParameterValueInputProps) {
  const [local, setLocal] = useState(value)
  const [hintTitle, setHintTitle] = useState(() => getParameterInputHint(dataType))
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
    setHintTitle(getParameterInputRejectionMessage(dataType))
    window.clearTimeout(rejectTimerRef.current)
    rejectTimerRef.current = window.setTimeout(() => {
      setHintTitle(getParameterInputHint(dataType))
    }, 2600)
  }

  const applyValue = (next: string, commit = true) => {
    const normalized = normalizeParameterValueForCommit(dataType, next)
    setLocal(normalized)
    if (commit) {
      onCommit(normalized)
    }
  }

  if (dataType === 'bool' || dataType === 'flag') {
    return (
      <ParameterBoolInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        parameterType={dataType}
        value={value}
      />
    )
  }

  if (dataType === 'rgba') {
    return (
      <ParameterRgbaInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'mapHashLink') {
    return (
      <ParameterMapHashLinkInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'optionF32') {
    return (
      <ParameterOptionF32Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'optionString') {
    return (
      <ParameterOptionStringInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'optionVector3') {
    return (
      <ParameterOptionVector3Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'listF32') {
    return (
      <ParameterListF32Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'listString') {
    return (
      <ParameterListStringInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'listHash') {
    return (
      <ParameterListHashInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'vector2') {
    return (
      <ParameterVector2Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'vector3') {
    return (
      <ParameterVector3Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'vector4') {
    return (
      <ParameterVector4Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'mtx44') {
    return (
      <ParameterMtx44Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'link') {
    return (
      <ParameterLinkInput
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'listVector2') {
    return (
      <ParameterListVector2Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'listVector3') {
    return (
      <ParameterListVector3Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  if (dataType === 'listVector4') {
    return (
      <ParameterListVector4Input
        ariaLabel={ariaLabel}
        className={className}
        onCommit={onCommit}
        onFocusChange={onFocusChange}
        value={value}
      />
    )
  }

  const defaultHint = getParameterInputHint(dataType)
  const nativeTitle = hintTitle !== defaultHint ? hintTitle : (fieldTitle ?? hintTitle)

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      data-parameter-type={dataType}
      title={nativeTitle}
      inputMode={
        usesDecimalInputMode(dataType) ? 'decimal' : usesNumericInputMode(dataType) ? 'numeric' : undefined
      }
      onBlur={() => {
        onFocusChange?.(false)
        applyValue(local)
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
        applyValue(next)
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false
        const next = event.currentTarget.value
        if (!isValidPartialParameterValue(dataType, next)) {
          showRejection()
          setLocal(value)
          return
        }
        applyValue(next)
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
      type="text"
      value={local}
    />
  )
}
