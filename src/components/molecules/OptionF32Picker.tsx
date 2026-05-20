import { ListPrimitivePicker } from '@/components/molecules/ListPrimitivePicker'
import {
  formatOptionF32Display,
  formatOptionF32Scalar,
  parseOptionF32Items,
} from '@/core/optionValue'

type OptionF32PickerProps = {
  value: string
  onChange: (next: string) => void
}

export function OptionF32Picker({ value, onChange }: OptionF32PickerProps) {
  return (
    <ListPrimitivePicker
      defaultItem="0"
      formatDisplay={formatOptionF32Display}
      formatList={formatOptionF32Scalar}
      inputMode="decimal"
      itemLabel="f32"
      maxItems={1}
      onChange={onChange}
      parseItem={(raw) => {
        const n = Number.parseFloat(raw)
        return Number.isFinite(n) ? String(Math.round(n * 1_000_000) / 1_000_000) : '0'
      }}
      parseList={parseOptionF32Items}
      removalTitleDomId="option-f32-removal-title"
      title="Option[f32]"
      value={value}
      variant="f32"
    />
  )
}
