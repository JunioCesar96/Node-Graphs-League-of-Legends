import type { ReactNode } from 'react'

import type { Preview3dSpinAxis } from '@/core/vfx/preview3dSpin'
import { useVfxPreview3dContextMenu } from '@/hooks/useVfxPreview3dContextMenu'

import { VfxPreview3dContextMenu } from './VfxPreview3dContextMenu'

type VfxPreview3dSlotFrameProps = {
  ariaLabel?: string
  className: string
  children: (spinAxis: Preview3dSpinAxis) => ReactNode
}

export function VfxPreview3dSlotFrame({ ariaLabel, className, children }: VfxPreview3dSlotFrameProps) {
  const { spinAxis, menuAnchor, openMenu, closeMenu, selectAxis } = useVfxPreview3dContextMenu()

  return (
    <>
      <div aria-label={ariaLabel} className={className} onContextMenu={openMenu}>
        {children(spinAxis)}
      </div>

      {menuAnchor ? (
        <VfxPreview3dContextMenu
          activeAxis={spinAxis}
          anchor={menuAnchor}
          onClose={closeMenu}
          onSelectAxis={selectAxis}
        />
      ) : null}
    </>
  )
}
