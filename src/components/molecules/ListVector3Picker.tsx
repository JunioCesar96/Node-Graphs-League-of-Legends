import { ListVectorPicker } from '@/components/molecules/ListVectorPicker'
import { Vec3SliderPicker } from '@/components/molecules/Vec3SliderPicker'
import {
  formatListVector3String,
  formatVector3RitualBrace,
  parseListVector3String,
} from '@/core/listVector3Value'
import { formatVector3String, parseVector3String, type Vector3 } from '@/core/vector3Value'

const DEFAULT_ITEM: Vector3 = { x: 0, y: 0, z: 0 }

type ListVector3PickerProps = {
  value: string
  onChange: (next: string) => void
}

export function ListVector3Picker({ value, onChange }: ListVector3PickerProps) {
  return (
    <ListVectorPicker
      defaultItem={DEFAULT_ITEM}
      formatBrace={formatVector3RitualBrace}
      formatItem={formatVector3String}
      formatList={formatListVector3String}
      itemLabel="Vec3"
      onChange={onChange}
      parseItem={parseVector3String}
      parseList={parseListVector3String}
      removalTitleDomId="list-vec3-removal-title"
      renderEditor={({ onChange: onEdit, value: editValue }) => (
        <Vec3SliderPicker onChange={onEdit} value={editValue} />
      )}
      title="List[Vec3]"
      value={value}
      variant="vec3"
    />
  )
}
