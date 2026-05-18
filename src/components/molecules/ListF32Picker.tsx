import { ListPrimitivePicker } from '@/components/molecules/ListPrimitivePicker'
import {
  formatF32ListDisplay,
  formatListF32String,
  parseListF32String,
} from '@/core/listF32Value'

type ListF32PickerProps = {
  value: string
  onChange: (next: string) => void
}

export function ListF32Picker({ value, onChange }: ListF32PickerProps) {
  return (
    <ListPrimitivePicker
      defaultItem="0"
      formatDisplay={formatF32ListDisplay}
      formatList={formatListF32String}
      inputMode="decimal"
      itemLabel="f32"
      onChange={onChange}
      parseItem={(raw) => {
        const n = Number.parseFloat(raw)
        return Number.isFinite(n) ? String(Math.round(n * 1_000_000) / 1_000_000) : '0'
      }}
      parseList={parseListF32String}
      removalTitleDomId="list-f32-removal-title"
      title="List[f32]"
      value={value}
      variant="f32"
    />
  )
}
