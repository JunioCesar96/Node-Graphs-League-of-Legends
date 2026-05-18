import { ListVectorPicker } from '@/components/molecules/ListVectorPicker'
import { Vec4SliderPicker } from '@/components/molecules/Vec4SliderPicker'
import {
  formatListVector4String,
  formatVector4RitualBrace,
  parseListVector4String,
} from '@/core/listVector4Value'
import { formatVector4String, parseVector4String, type Vector4 } from '@/core/vector4Value'

const DEFAULT_ITEM: Vector4 = { x: 0, y: 0, z: 0, w: 0 }

type ListVector4PickerProps = {
  value: string
  onChange: (next: string) => void
}

export function ListVector4Picker({ value, onChange }: ListVector4PickerProps) {
  return (
    <ListVectorPicker
      defaultItem={DEFAULT_ITEM}
      formatBrace={formatVector4RitualBrace}
      formatItem={formatVector4String}
      formatList={formatListVector4String}
      itemLabel="Vec4"
      onChange={onChange}
      parseItem={parseVector4String}
      parseList={parseListVector4String}
      removalTitleDomId="list-vec4-removal-title"
      renderEditor={({ onChange: onEdit, value: editValue }) => (
        <Vec4SliderPicker onChange={onEdit} value={editValue} />
      )}
      title="List[Vec4]"
      value={value}
      variant="vec4"
    />
  )
}
