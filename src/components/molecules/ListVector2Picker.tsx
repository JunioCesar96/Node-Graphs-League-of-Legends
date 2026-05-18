import { Vec2CoordinatePicker } from '@/components/molecules/Vec2CoordinatePicker'
import { ListVectorPicker } from '@/components/molecules/ListVectorPicker'
import {
  formatListVector2String,
  formatVector2RitualBrace,
  parseListVector2String,
} from '@/core/listVector2Value'
import { formatVector2String, parseVector2String, type Vector2 } from '@/core/vector2Value'

const DEFAULT_ITEM: Vector2 = { x: 0, y: 0 }

type ListVector2PickerProps = {
  value: string
  onChange: (next: string) => void
}

export function ListVector2Picker({ value, onChange }: ListVector2PickerProps) {
  return (
    <ListVectorPicker
      defaultItem={DEFAULT_ITEM}
      formatBrace={formatVector2RitualBrace}
      formatItem={formatVector2String}
      formatList={formatListVector2String}
      itemLabel="Vec2"
      onChange={onChange}
      parseItem={parseVector2String}
      parseList={parseListVector2String}
      removalTitleDomId="list-vec2-removal-title"
      renderEditor={({ onChange: onEdit, value: editValue }) => (
        <Vec2CoordinatePicker onChange={onEdit} value={editValue} />
      )}
      title="List[Vec2]"
      value={value}
      variant="vec2"
    />
  )
}
