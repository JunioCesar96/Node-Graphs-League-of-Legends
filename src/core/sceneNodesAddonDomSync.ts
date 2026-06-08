import { syncAddonColorVec4FromLiteral } from '@/core/addonColorVec4Input'
import { syncAddonMtx44GridFromLiteral } from '@/core/addonMtx44Input'
import { syncAddonVecAxisFromLiteral } from '@/core/addonVecAxisInput'

/** Propaga um valor editado no painel para o DOM do cartão add-on (dispara o drive reactivo). */
export function syncAddonSceneParameterToCardDom(
  nodeId: string,
  fieldName: string,
  value: string,
): void {
  const root = document.querySelector(`[data-instance-id="${CSS.escape(nodeId)}"]`)

  if (!(root instanceof HTMLElement)) {
    return
  }

  const namedInput = root.querySelector(`input[name="${CSS.escape(fieldName)}"]`)

  if (namedInput instanceof HTMLInputElement) {
    if (namedInput.value !== value) {
      namedInput.value = value
    }
    namedInput.dispatchEvent(new Event('input', { bubbles: true }))
    namedInput.dispatchEvent(new Event('change', { bubbles: true }))
  }

  if (fieldName === 'literal') {
    syncAddonVecAxisFromLiteral(root, value)
    syncAddonMtx44GridFromLiteral(root, value)
    syncAddonColorVec4FromLiteral(root, value)
  }
}
