import type { NodeDataType } from '@/core/nodeSchema'

/**
 * Converte `NodeDataType` do editor para tipo ritual Class Group.
 * `bool` e `flag` mantêm-se distintos (ex.: DisableBackfaceCull: bool no .bin).
 */
export function nodeDataTypeToRitType(type: NodeDataType, _fieldName?: string): string {
  switch (type) {
    case 'keyword':
      return 'keyword'
    case 'string':
      return 'string'
    case 'symbol':
      return 'symbol'
    case 'integer':
      return 'i32'
    case 'i8':
      return 'i8'
    case 'u8':
      return 'u8'
    case 'i16':
      return 'i16'
    case 'u16':
      return 'u16'
    case 'i32':
      return 'i32'
    case 'u32':
      return 'u32'
    case 'i64':
      return 'i64'
    case 'u64':
      return 'u64'
    case 'f32':
    case 'float':
      return 'f32'
    case 'double':
      return 'f64'
    case 'vector2':
      return 'vec2'
    case 'vector3':
      return 'vec3'
    case 'vector4':
      return 'vec4'
    case 'rgba':
      return 'rgba'
    case 'mtx44':
      return 'mtx44'
    case 'link':
      return 'link'
    case 'listF32':
      return 'list[f32]'
    case 'listString':
      return 'list[string]'
    case 'listHash':
      return 'list[hash]'
    case 'listVector2':
      return 'list[vec2]'
    case 'listVector3':
      return 'list[vec3]'
    case 'listVector4':
      return 'list[vec4]'
    case 'optionF32':
      return 'option[f32]'
    case 'optionString':
      return 'option[string]'
    case 'optionVector3':
      return 'option[vec3]'
    case 'mapHashLink':
      return 'map[hash,link]'
    case 'mapHashPointer':
      return 'map[hash,pointer]'
    case 'mapHashEmbed':
      return 'map[hash,embed]'
    case 'mapU64Pointer':
      return 'map[u64,pointer]'
    case 'bool':
      return 'bool'
    case 'flag':
      return 'flag'
    default:
      return 'string'
  }
}

export function isMapHashParameterType(type: NodeDataType): boolean {
  return type === 'mapHashEmbed' || type === 'mapHashPointer' || type === 'mapU64Pointer'
}
