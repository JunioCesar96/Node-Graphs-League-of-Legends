import { ListPrimitivePicker } from '@/components/molecules/ListPrimitivePicker'
import {
  formatOptionStringScalar,
  parseOptionStringItems,
} from '@/core/optionValue'
import { formatStringListDisplay } from '@/core/listStringValue'

type OptionStringPickerProps = {
  value: string
  onChange: (next: string) => void
}

export function OptionStringPicker({ value, onChange }: OptionStringPickerProps) {
  return (
    <ListPrimitivePicker
      defaultItem=""
      formatDisplay={formatStringListDisplay}
      formatList={formatOptionStringScalar}
      inputMode="text"
      itemLabel="string"
      maxItems={1}
      onChange={onChange}
      parseItem={(raw) => raw}
      parseList={parseOptionStringItems}
      removalTitleDomId="option-string-removal-title"
      title="Option[string]"
      value={value}
      variant="string"
    />
  )
}
