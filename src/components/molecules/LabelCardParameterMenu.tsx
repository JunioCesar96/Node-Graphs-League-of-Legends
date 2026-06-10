import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { SceneNodeEyeIcon } from '@/components/atoms/SceneNodesRowIcons'
import {
  StructureListPanel,
  type StructureListPanelItem,
} from '@/components/molecules/StructureListPanel'
import type { BlockParameterDef } from '@/core/blockSchema'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import type { LabelParameterEntry } from '@/core/labelSchema'
import { LangId } from '@/core/language/languageIds'
import { structureListPanelDefaultHeight } from '@/core/structureListPanelLayout'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './BlockCardParameterMenu.module.css'

type LabelCardParameterMenuProps = {
  labelParameters: readonly LabelParameterEntry[]
  parentParameters: readonly BlockParameterDef[]
  interactionLocked?: boolean
  slotToolsEnabled?: boolean
  onSlotToolsEnabledChange?: (enabled: boolean) => void
  onAddParameter?: (parameterId: string) => void
  onRemoveParameter?: (parameterId: string) => void
  onEditParameter?: (param: BlockParameterDef, screenAnchor?: CanvasContextMenuAnchor) => void
  onToggleAllHiddenInParent?: () => void
  linkedParentBlock?: { id: string; label: string } | null
  linkedBlockCandidates?: readonly StructureListPanelItem[]
  onSelectLinkedParentBlock?: () => void
  onLinkParentBlock?: (parentNodeId: string) => void
  onHoverLinkedBlockCandidate?: (parentNodeId: string | null) => void
  externalPanelRequest?: 'add' | 'edit' | 'remove' | null
  externalScreenAnchor?: CanvasContextMenuAnchor | null
  onExternalPanelRequestHandled?: () => void
  onPanelDismiss?: () => void
}

type PanelMode = 'add' | 'remove' | 'edit' | 'linkedBlock'

function stopMenuPointerPropagation(event: ReactPointerEvent) {
  event.stopPropagation()
}

function pointerAnchor(
  event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>,
): CanvasContextMenuAnchor {
  return { left: event.clientX, top: event.clientY }
}

export function LabelCardParameterMenu({
  labelParameters,
  parentParameters,
  interactionLocked = false,
  slotToolsEnabled = false,
  onSlotToolsEnabledChange,
  onAddParameter,
  onRemoveParameter,
  onEditParameter,
  onToggleAllHiddenInParent,
  linkedParentBlock = null,
  linkedBlockCandidates = [],
  onSelectLinkedParentBlock,
  onLinkParentBlock,
  onHoverLinkedBlockCandidate,
  externalPanelRequest = null,
  externalScreenAnchor = null,
  onExternalPanelRequestHandled,
  onPanelDismiss,
}: LabelCardParameterMenuProps) {
  const { t } = useLanguage()
  const rootRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<PanelMode | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paramListIndex, setParamListIndex] = useState(0)
  const [menuPlacementAnchor, setMenuPlacementAnchor] = useState<CanvasContextMenuAnchor | null>(null)

  const effectiveScreenAnchor = menuPlacementAnchor ?? externalScreenAnchor

  const allHiddenInParent = useMemo(
    () =>
      labelParameters.length > 0 &&
      labelParameters.every((entry) => entry.hiddenInParent === true),
    [labelParameters],
  )

  const paramListItems = useMemo((): StructureListPanelItem[] => {
    return labelParameters
      .map((entry, index) => {
        const param = parentParameters.find((p) => p.idParameter === entry.parameterId)
        if (!param) {
          return null
        }
        return {
          id: param.idParameter,
          index,
          label: param.nameParameter || param.idParameter,
        }
      })
      .filter((item): item is StructureListPanelItem => item !== null)
  }, [labelParameters, parentParameters])

  const usedIds = useMemo(() => new Set(labelParameters.map((entry) => entry.parameterId)), [labelParameters])

  const addListItems = useMemo(
    (): StructureListPanelItem[] =>
      parentParameters
        .filter((param) => !usedIds.has(param.idParameter))
        .map((param, index) => ({
          id: param.idParameter,
          index,
          label: param.nameParameter || param.idParameter,
        })),
    [parentParameters, usedIds],
  )

  const listPanelSize = useMemo(
    () => ({
      width: 280,
      height: structureListPanelDefaultHeight(
        panel === 'add' ? addListItems.length : paramListItems.length,
      ),
    }),
    [addListItems.length, panel, paramListItems.length],
  )

  const closeAll = useCallback(() => {
    setMenuOpen(false)
    setPanel(null)
    setMenuPlacementAnchor(null)
    onHoverLinkedBlockCandidate?.(null)
    onPanelDismiss?.()
  }, [onHoverLinkedBlockCandidate, onPanelDismiss])

  const activeListConfig = useMemo(() => {
    if (panel === 'add') {
      return {
        emptyHint: t(LangId.LabelCardNoMoreParams, 'Sem parâmetros disponíveis no bloco pai.'),
        initialSize: listPanelSize,
        items: addListItems,
        listTitle: t(LangId.LabelCardAddParam, 'Adicionar parâmetro'),
        total: addListItems.length,
      }
    }
    if (panel === 'edit') {
      return {
        emptyHint: t(LangId.LabelCardNoParams, 'A label não tem parâmetros.'),
        initialSize: listPanelSize,
        items: paramListItems,
        listTitle: t(LangId.LabelCardEditParam, 'Editar parâmetro'),
        total: paramListItems.length,
      }
    }
    if (panel === 'remove') {
      return {
        emptyHint: t(LangId.LabelCardNoParams, 'A label não tem parâmetros.'),
        initialSize: listPanelSize,
        items: paramListItems,
        listTitle: t(LangId.LabelCardRemoveParam, 'Remover parâmetro'),
        total: paramListItems.length,
      }
    }
    if (panel === 'linkedBlock') {
      return {
        emptyHint: t(LangId.LabelCardLinkedBlockPick, 'Nenhum bloco disponível na cena.'),
        initialSize: listPanelSize,
        items: [...linkedBlockCandidates],
        listTitle: linkedParentBlock
          ? t(LangId.LabelCardLinkedBlockChange, 'Alterar bloco vinculado')
          : t(LangId.LabelCardLinkedBlockSelect, 'Seleccionar bloco vinculado'),
        total: linkedBlockCandidates.length,
      }
    }
    return null
  }, [addListItems, linkedBlockCandidates, linkedParentBlock, listPanelSize, panel, paramListItems, t])

  const listPanelOpen =
    menuOpen && effectiveScreenAnchor != null && activeListConfig !== null

  const isInsideMenu = useCallback((target: Node | null) => {
    if (!target) {
      return false
    }
    if (rootRef.current?.contains(target)) {
      return true
    }
    let node: Node | null = target
    while (node) {
      if (node instanceof Element) {
        if (
          node.hasAttribute('data-block-param-menu-portal') ||
          node.hasAttribute('data-block-param-menu-root') ||
          node.hasAttribute('data-label-param-menu-root') ||
          node.hasAttribute('data-structure-list-panel-portal')
        ) {
          return true
        }
      }
      node = node.parentNode
    }
    return false
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const onPointerDownCapture = (event: PointerEvent) => {
      if (isInsideMenu(event.target as Node)) {
        return
      }
    }

    const onClickCapture = (event: MouseEvent) => {
      if (isInsideMenu(event.target as Node)) {
        return
      }
      closeAll()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeAll()
      }
    }

    window.addEventListener('pointerdown', onPointerDownCapture, true)
    window.addEventListener('keydown', onKeyDown, true)
    const registerClickTimer = window.setTimeout(() => {
      window.addEventListener('click', onClickCapture, true)
    }, 0)

    return () => {
      window.clearTimeout(registerClickTimer)
      window.removeEventListener('pointerdown', onPointerDownCapture, true)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('click', onClickCapture, true)
    }
  }, [closeAll, isInsideMenu, menuOpen])

  useEffect(() => {
    if (!externalPanelRequest) {
      return
    }
    if (externalScreenAnchor) {
      setMenuPlacementAnchor(externalScreenAnchor)
    }
    setParamListIndex(0)
    setPanel(externalPanelRequest)
    setMenuOpen(true)
    onExternalPanelRequestHandled?.()
  }, [externalPanelRequest, externalScreenAnchor, onExternalPanelRequestHandled])

  const openPanel = (mode: PanelMode, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setMenuPlacementAnchor(pointerAnchor(event))
    setParamListIndex(0)
    setPanel(mode)
    setMenuOpen(true)
  }

  const hideToggleLabel = allHiddenInParent
    ? t(LangId.LabelCardShowInParent, 'Mostrar parâmetros no bloco pai')
    : t(LangId.LabelCardHideInParent, 'Ocultar parâmetros no bloco pai')

  return (
    <div
      className={styles.menuRoot}
      data-block-param-menu-root="1"
      data-label-param-menu-root="1"
      onPointerDown={stopMenuPointerPropagation}
      ref={rootRef}
    >
      <div aria-label={t(LangId.LabelCardParameterMenu, 'Parâmetros da label')} className={styles.toolbar} role="toolbar">
        {onSelectLinkedParentBlock || onLinkParentBlock ? (
          <button
            aria-label={t(LangId.LabelCardLinkedBlock, 'Bloco vinculado')}
            className={styles.iconButton}
            disabled={interactionLocked}
            onClick={(event) => {
              event.stopPropagation()
              openPanel('linkedBlock', event as unknown as ReactPointerEvent<HTMLButtonElement>)
            }}
            onPointerDown={stopMenuPointerPropagation}
            title={t(LangId.LabelCardLinkedBlock, 'Bloco vinculado')}
            type="button"
          >
            <span aria-hidden className={[styles.iconGlyph, styles.iconGlyphBlockLinked].join(' ')} />
          </button>
        ) : null}
        <button
          aria-label={
            slotToolsEnabled
              ? t(LangId.BlockCardSlotToolsDisable, 'Desactivar slot tools')
              : t(LangId.BlockCardSlotToolsEnable, 'Activar slot tools')
          }
          aria-pressed={slotToolsEnabled}
          className={[
            styles.iconButton,
            slotToolsEnabled ? styles.iconButtonActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={interactionLocked || !onSlotToolsEnabledChange}
          onClick={(event) => {
            event.stopPropagation()
            onSlotToolsEnabledChange?.(!slotToolsEnabled)
          }}
          onPointerDown={stopMenuPointerPropagation}
          title={
            slotToolsEnabled
              ? t(LangId.BlockCardSlotToolsDisable, 'Desactivar slot tools')
              : t(LangId.BlockCardSlotToolsEnable, 'Activar slot tools')
          }
          type="button"
        >
          <span aria-hidden className={[styles.iconGlyph, styles.iconGlyphSlotTools].join(' ')} />
        </button>
        {onAddParameter ? (
          <button
            aria-label={t(LangId.LabelCardAddParam, 'Adicionar parâmetro')}
            className={styles.iconButton}
            disabled={interactionLocked || addListItems.length === 0}
            onClick={(event) => {
              event.stopPropagation()
              openPanel('add', event as unknown as ReactPointerEvent<HTMLButtonElement>)
            }}
            onPointerDown={stopMenuPointerPropagation}
            title={t(LangId.LabelCardAddParam, 'Adicionar parâmetro')}
            type="button"
          >
            <span aria-hidden className={[styles.iconGlyph, styles.iconGlyphAdd].join(' ')} />
          </button>
        ) : null}
        {onRemoveParameter ? (
          <button
            aria-label={t(LangId.LabelCardRemoveParam, 'Remover parâmetro')}
            className={styles.iconButton}
            disabled={interactionLocked || paramListItems.length === 0}
            onClick={(event) => {
              event.stopPropagation()
              openPanel('remove', event as unknown as ReactPointerEvent<HTMLButtonElement>)
            }}
            onPointerDown={stopMenuPointerPropagation}
            title={t(LangId.LabelCardRemoveParam, 'Remover parâmetro')}
            type="button"
          >
            <span aria-hidden className={[styles.iconGlyph, styles.iconGlyphRemove].join(' ')} />
          </button>
        ) : null}
        {onEditParameter ? (
          <button
            aria-label={t(LangId.LabelCardEditParam, 'Editar parâmetro')}
            className={styles.iconButton}
            disabled={interactionLocked || paramListItems.length === 0}
            onClick={(event) => {
              event.stopPropagation()
              openPanel('edit', event as unknown as ReactPointerEvent<HTMLButtonElement>)
            }}
            onPointerDown={stopMenuPointerPropagation}
            title={t(LangId.LabelCardEditParam, 'Editar parâmetro')}
            type="button"
          >
            <span aria-hidden className={[styles.iconGlyph, styles.iconGlyphEdit].join(' ')} />
          </button>
        ) : null}
        {onToggleAllHiddenInParent ? (
          <button
            aria-label={hideToggleLabel}
            aria-pressed={allHiddenInParent}
            className={[
              styles.iconButton,
              allHiddenInParent ? styles.iconButtonActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={interactionLocked || paramListItems.length === 0}
            onClick={(event) => {
              event.stopPropagation()
              onToggleAllHiddenInParent()
            }}
            onPointerDown={stopMenuPointerPropagation}
            title={hideToggleLabel}
            type="button"
          >
            <SceneNodeEyeIcon active={!allHiddenInParent} />
          </button>
        ) : null}
      </div>

      {listPanelOpen && activeListConfig ? (
        <StructureListPanel
          dismissGuardRefs={[rootRef]}
          dismissOnClickOutside={false}
          emptyHint={activeListConfig.emptyHint}
          initialSize={activeListConfig.initialSize}
          itemCountForHeight={activeListConfig.total}
          items={activeListConfig.items}
          listTitle={activeListConfig.listTitle}
          open
          portalDataAttr="data-block-param-menu-portal"
          screenAnchor={effectiveScreenAnchor}
          selectedId={
            panel === 'linkedBlock' && linkedParentBlock
              ? linkedParentBlock.id
              : (activeListConfig.items[paramListIndex]?.id ?? null)
          }
          selectedIndex={paramListIndex}
          onOpenChange={(open) => {
            if (!open) {
              closeAll()
            }
          }}
          onPickItem={(item) => {
            if (panel === 'linkedBlock') {
              if (linkedParentBlock?.id === item.id) {
                onSelectLinkedParentBlock?.()
              } else {
                onLinkParentBlock?.(item.id)
              }
              closeAll()
              return
            }
            if (panel === 'add') {
              onAddParameter?.(item.id)
              closeAll()
              return
            }
            const param = parentParameters.find((entry) => entry.idParameter === item.id)
            if (!param) {
              return
            }
            if (panel === 'edit') {
              onEditParameter(param, effectiveScreenAnchor ?? undefined)
              closeAll()
              return
            }
            if (panel === 'remove') {
              onRemoveParameter?.(item.id)
              closeAll()
            }
          }}
          onHoverItem={
            panel === 'linkedBlock' && onLinkParentBlock
              ? (item) => onHoverLinkedBlockCandidate?.(item?.id ?? null)
              : undefined
          }
          onSelectIndex={setParamListIndex}
        />
      ) : null}
    </div>
  )
}
