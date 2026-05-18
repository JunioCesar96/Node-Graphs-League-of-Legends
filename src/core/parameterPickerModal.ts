/** Dataset no `body` enquanto um picker modal de parâmetro está aberto. */
export const PARAMETER_PICKER_OPEN_DATASET = 'parameterPickerOpen'

export function isParameterPickerOpen(): boolean {
  return document.body.dataset[PARAMETER_PICKER_OPEN_DATASET] === 'true'
}
