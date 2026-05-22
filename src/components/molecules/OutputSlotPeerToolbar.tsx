import {
  SceneNodeEyeIcon,
  SceneNodeFocusIcon,
  SceneNodeLockIcon,
} from '@/components/atoms/SceneNodesRowIcons'
import type { OutputSlotPeerViewState } from '@/core/outputSlotPeerActions'

import styles from './OutputSlotPeerToolbar.module.css'

type OutputSlotPeerToolbarProps = {
  peer: OutputSlotPeerViewState
  onToggleLock: () => void
  onToggleVisibility: () => void
  onFocusPeer: () => void
}

export function OutputSlotPeerToolbar({
  peer,
  onToggleLock,
  onToggleVisibility,
  onFocusPeer,
}: OutputSlotPeerToolbarProps) {
  const { hidden, locked } = peer

  return (
    <div className={styles.toolbar} onPointerDown={(event) => event.stopPropagation()}>
      <button
        aria-label={locked ? 'Destravar nó ligado' : 'Travar nó ligado'}
        aria-pressed={locked}
        className={[styles.action, locked ? styles.actionActive : ''].filter(Boolean).join(' ')}
        onClick={(event) => {
          event.stopPropagation()
          onToggleLock()
        }}
        title={locked ? 'Destravar nó ligado' : 'Travar nó ligado'}
        type="button"
      >
        <SceneNodeLockIcon active={locked} />
      </button>
      <button
        aria-label="Focar slot de entrada do nó ligado"
        className={styles.action}
        onClick={(event) => {
          event.stopPropagation()
          onFocusPeer()
        }}
        title="Focar slot de entrada do nó ligado"
        type="button"
      >
        <SceneNodeFocusIcon />
      </button>
      <button
        aria-label={hidden ? 'Mostrar nó ligado na cena' : 'Ocultar nó ligado na cena'}
        aria-pressed={!hidden}
        className={[
          styles.action,
          hidden ? styles.actionMuted : styles.actionActive,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => {
          event.stopPropagation()
          onToggleVisibility()
        }}
        title={hidden ? 'Mostrar nó ligado' : 'Ocultar nó ligado'}
        type="button"
      >
        <SceneNodeEyeIcon active={!hidden} />
      </button>
    </div>
  )
}
