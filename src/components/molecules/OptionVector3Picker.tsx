import { ListVectorPicker } from '@/components/molecules/ListVectorPicker'
import { Vec3SliderPicker } from '@/components/molecules/Vec3SliderPicker'
import {
  formatOptionVector3Display,
  formatOptionVector3Scalar,
  parseOptionVector3Items,
} from '@/core/optionValue'
import { formatVector3String, parseVector3String, type Vector3 } from '@/core/vector3Value'

const DEFAULT_ITEM: Vector3 = { x: 0, y: 0, z: 0 }

type OptionVector3PickerProps = {
  value: string
  onChange: (next: string) => void
}

export function OptionVector3Picker({ value, onChange }: OptionVector3PickerProps) {
  return (
    <ListVectorPicker
      defaultItem={DEFAULT_ITEM}
      formatBrace={formatOptionVector3Display}
      formatItem={formatVector3String}
      formatList={formatOptionVector3Scalar}
      itemLabel="Vec3"
      maxItems={1}
      onChange={onChange}
      parseItem={parseVector3String}
      parseList={parseOptionVector3Items}
      removalTitleDomId="option-vec3-removal-title"
      renderEditor={({ onChange: onEdit, value: editValue }) => (
        <Vec3SliderPicker onChange={onEdit} value={editValue} />
      )}
      title="Option[vec3]"
      value={value}
      variant="vec3"
    />
  )
}
