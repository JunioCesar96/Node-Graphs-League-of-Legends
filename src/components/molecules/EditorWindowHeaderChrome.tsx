import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { DockTabIcon } from '@/components/atoms/DockTabIcon'

import styles from './EditorWindowHeaderChrome.module.css'

type EditorWindowHeaderChromeProps = {
  children: ReactNode
}

export function EditorWindowHeaderChrome({ children }: EditorWindowHeaderChromeProps) {
  return <div className={styles.strip}>{children}</div>
}

type EditorWindowHeaderChromeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function EditorWindowHeaderChromeButton({
  className = '',
  type = 'button',
  ...props
}: EditorWindowHeaderChromeButtonProps) {
  return (
    <button
      className={[styles.btn, className].filter(Boolean).join(' ')}
      type={type}
      {...props}
    />
  )
}

type EditorWindowHeaderChromeIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function EditorWindowHeaderChromeIconButton({
  active = false,
  className = '',
  type = 'button',
  ...props
}: EditorWindowHeaderChromeIconButtonProps) {
  return (
    <button
      className={[styles.iconBtn, active ? styles.iconBtnActive : '', className].filter(Boolean).join(' ')}
      type={type}
      {...props}
    >
      <DockTabIcon kind="tools" />
    </button>
  )
}
