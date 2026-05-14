import type { NodeDataType } from '@/core/nodeSchema'

const INTEGER_PARTIAL = /^-?\d*$/

/** Número decimal em edição: opcional «-», dígitos, no máximo um «.» (permite «-» ou «.» a meio da edição). */
const FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/

/** Componentes de vector em construção (sem letras nem outros símbolos). */
const VECTOR_PARTIAL = /^[0-9,.\s\-]*$/

const SINGLE_LINE_TEXT = /^[^\r\n]*$/

export function getParameterInputHint(type: NodeDataType): string {
  switch (type) {
    case 'integer':
      return 'Valor inteiro: só dígitos e «-» no início.'
    case 'float':
    case 'double':
      return 'Número decimal: dígitos e no máximo um ponto (ex.: -3.14).'
    case 'vector2':
    case 'vector3':
    case 'vector4':
      return 'Números separados por vírgulas (ex.: 1, 0, -2); só dígitos, «.», «,», espaços e «-».'
    case 'keyword':
    case 'property':
    case 'symbol':
      return 'Texto numa linha; sem quebras de linha.'
    case 'string':
    case 'comment':
      return 'Texto livre.'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function getParameterInputRejectionMessage(type: NodeDataType): string {
  switch (type) {
    case 'integer':
      return 'Este campo só inteiro: use apenas dígitos e «-» no início.'
    case 'float':
    case 'double':
      return 'Este campo só aceita números decimais (dígitos e um ponto decimal).'
    case 'vector2':
    case 'vector3':
    case 'vector4':
      return 'Só são permitidos números, vírgulas, espaços, «.» e «-».'
    case 'keyword':
    case 'property':
    case 'symbol':
      return 'Não são permitidas quebras de linha neste campo.'
    case 'string':
    case 'comment':
      return 'Entrada não permitida.'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function isValidPartialParameterValue(type: NodeDataType, value: string): boolean {
  switch (type) {
    case 'integer':
      return INTEGER_PARTIAL.test(value)
    case 'float':
    case 'double':
      return FLOAT_PARTIAL.test(value)
    case 'vector2':
    case 'vector3':
    case 'vector4':
      return VECTOR_PARTIAL.test(value)
    case 'keyword':
    case 'property':
    case 'symbol':
      return SINGLE_LINE_TEXT.test(value)
    case 'string':
    case 'comment':
      return true
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}
