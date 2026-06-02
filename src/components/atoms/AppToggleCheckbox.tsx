import styles from './AppToggleCheckbox.module.css'

export type AppToggleCheckboxSize = 'default' | 'compact'

type AppToggleCheckboxProps = {
  checked: boolean
  className?: string
  disabled?: boolean
  /** Visual apenas; o elemento pai trata o clique (ex.: linha de menu). */
  decorative?: boolean
  onChange?: (checked: boolean) => void
  size?: AppToggleCheckboxSize
}

export function AppToggleCheckbox({
  checked,
  className = '',
  disabled = false,
  decorative = false,
  onChange,
  size = 'default',
}: AppToggleCheckboxProps) {
  return (
    <input
      checked={checked}
      className={[
        styles.root,
        styles[size],
        decorative ? styles.decorative : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-app-toggle-input=""
      disabled={disabled}
      onChange={(event) => {
        if (!decorative) {
          onChange?.(event.target.checked)
        }
      }}
      onClick={
        decorative
          ? (event) => {
              event.preventDefault()
            }
          : undefined
      }
      readOnly={decorative}
      tabIndex={decorative ? -1 : undefined}
      type="checkbox"
    />
  )
}
