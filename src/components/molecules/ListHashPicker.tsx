import { ListPrimitivePicker } from '@/components/molecules/ListPrimitivePicker'
import {
  formatHashListDisplay,
  formatListHashString,
  normalizeHashItem,
  parseListHashString,
} from '@/core/listHashValue'

type ListHashPickerProps = {
  value: string
  onChange: (next: string) => void
}

export function ListHashPicker({ value, onChange }: ListHashPickerProps) {
  return (
    <ListPrimitivePicker
      defaultItem="0x00000000"
      formatDisplay={formatHashListDisplay}
      formatList={formatListHashString}
      inputMode="text"
      itemLabel="hash"
      onChange={onChange}
      parseItem={normalizeHashItem}
      parseList={parseListHashString}
      removalTitleDomId="list-hash-removal-title"
      title="List[hash]"
      value={value}
      variant="hash"
    />
  )
}
