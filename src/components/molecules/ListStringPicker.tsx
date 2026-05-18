import { ListPrimitivePicker } from '@/components/molecules/ListPrimitivePicker'
import {
  formatListStringString,
  formatStringListDisplay,
  parseListStringString,
} from '@/core/listStringValue'

type ListStringPickerProps = {
  value: string
  onChange: (next: string) => void
}

export function ListStringPicker({ value, onChange }: ListStringPickerProps) {
  return (
    <ListPrimitivePicker
      defaultItem=""
      formatDisplay={formatStringListDisplay}
      formatList={formatListStringString}
      inputMode="text"
      itemLabel="string"
      onChange={onChange}
      parseItem={(raw) => raw}
      parseList={parseListStringString}
      removalTitleDomId="list-string-removal-title"
      title="List[string]"
      value={value}
      variant="string"
    />
  )
}
