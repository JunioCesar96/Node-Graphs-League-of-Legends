import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  StructureListPanel,
  type StructureListPanelItem,
} from '@/components/molecules/StructureListPanel'
import { fetchBlockParametersFromDisk } from '@/core/blockParameterDiskLoader'
import { isParameterAlreadyOnBlock } from '@/core/blockParameterFromJson'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import type { BlockParameterDef } from '@/core/blockSchema'
import { LangId } from '@/core/language/languageIds'
import { structureListPanelDefaultHeight } from '@/core/structureListPanelLayout'
import { BLOCK_PARAMETER_LIST_PLACEMENT_ESTIMATE } from '@/core/ui/screenAnchoredPanelPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './BlockCardParameterMenu.module.css'

type BlockCardParameterMenuProps = {
  blockType: string
  parameters: readonly BlockParameterDef[]
  slotToolsEnabled?: boolean
  onSlotToolsEnabledChange?: (enabled: boolean) => void
  onAddParameter?: (doc: BlockParameterJsonDocument) => void
  onRemoveParameter?: (paramId: string) => void
  onEditParameter?: (param: BlockParameterDef, screenAnchor?: CanvasContextMenuAnchor) => void
  /** Pedido externo (ex.: menu de contexto do card) para abrir um painel. */
  externalPanelRequest?: 'add' | 'edit' | 'remove' | null
  /** Posição de ecrã do menu de contexto (quando o painel vem do context menu). */
  externalScreenAnchor?: CanvasContextMenuAnchor | null
  onExternalPanelRequestHandled?: () => void
  /** Fecha painéis flutuantes sem escolher parâmetro (limpa âncora de ecrã). */
  onPanelDismiss?: () => void
}

type PanelMode = 'add' | 'remove' | 'edit' | 'confirmRemove'

function stopMenuPointerPropagation(event: ReactPointerEvent) {
  event.stopPropagation()
}

function pointerAnchor(
  event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>,
): CanvasContextMenuAnchor {
  return { left: event.clientX, top: event.clientY }
}

export function BlockCardParameterMenu({
  blockType,
  parameters,
  slotToolsEnabled = false,
  onSlotToolsEnabledChange,
  onAddParameter,
  onRemoveParameter,
  onEditParameter,
  externalPanelRequest = null,
  externalScreenAnchor = null,
  onExternalPanelRequestHandled,
  onPanelDismiss,
}: BlockCardParameterMenuProps) {
  const { t } = useLanguage()
  const rootRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<PanelMode | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<BlockParameterDef | null>(null)
  const [paramListIndex, setParamListIndex] = useState(0)
  const [addCatalog, setAddCatalog] = useState<BlockParameterJsonDocument[]>([])
  const [addCatalogLoading, setAddCatalogLoading] = useState(false)
  const [addCatalogError, setAddCatalogError] = useState<string | null>(null)
  /** Âncora fixa enquanto o menu está aberto — só muda ao abrir (botão do card), não ao clicar na lista. */
  const [menuPlacementAnchor, setMenuPlacementAnchor] = useState<CanvasContextMenuAnchor | null>(null)

  /** Clique no card tem prioridade sobre âncora antiga do menu de contexto. */
  const effectiveScreenAnchor = menuPlacementAnchor ?? externalScreenAnchor

  const paramListItems = useMemo(
    (): StructureListPanelItem[] =>
      parameters.map((param, index) => ({
        id: param.idParameter,
        index,
        label: param.nameParameter || param.idParameter,
      })),
    [parameters],
  )

  const addAvailableDocs = useMemo(
    () => addCatalog.filter((doc) => !isParameterAlreadyOnBlock(parameters, doc)),
    [addCatalog, parameters],
  )

  const addListItems = useMemo(
    (): StructureListPanelItem[] =>
      addAvailableDocs.map((doc, index) => ({
        id: doc.id,
        index,
        label: `${doc.parameterName} · ${doc.type}`,
      })),
    [addAvailableDocs],
  )

  const paramListPanelSize = useMemo(() => {
    const height = Math.min(
      BLOCK_PARAMETER_LIST_PLACEMENT_ESTIMATE.height,
      structureListPanelDefaultHeight(parameters.length),
    )
    return {
      width: BLOCK_PARAMETER_LIST_PLACEMENT_ESTIMATE.width,
      height: Math.max(height, 120),
    }
  }, [parameters.length])

  const addListPanelSize = useMemo(() => {
    const height = Math.min(
      BLOCK_PARAMETER_LIST_PLACEMENT_ESTIMATE.height,
      structureListPanelDefaultHeight(addAvailableDocs.length),
    )
    return {
      width: BLOCK_PARAMETER_LIST_PLACEMENT_ESTIMATE.width,
      height: Math.max(height, 120),
    }
  }, [addAvailableDocs.length])

  const activeListConfig = useMemo(() => {
    if (panel === 'add') {
      if (addCatalogLoading) {
        return {
          emptyHint: t(LangId.BlockParameterPickerLoading),
          initialSize: addListPanelSize,
          items: [] as StructureListPanelItem[],
          listTitle: t(LangId.BlockCardParameterAdd, 'Adicionar'),
          total: 0,
        }
      }
      if (addCatalogError) {
        return {
          emptyHint: t(LangId.BlockParameterPickerError, undefined, { error: addCatalogError }),
          initialSize: addListPanelSize,
          items: [] as StructureListPanelItem[],
          listTitle: t(LangId.BlockCardParameterAdd, 'Adicionar'),
          total: 0,
        }
      }
      return {
        emptyHint: t(LangId.BlockParameterPickerEmpty),
        initialSize: addListPanelSize,
        items: addListItems,
        listTitle: t(LangId.BlockCardParameterAdd, 'Adicionar'),
        total: addListItems.length,
      }
    }
    if (panel === 'edit') {
      return {
        emptyHint: t(LangId.BlockParameterSelectToEdit),
        initialSize: paramListPanelSize,
        items: paramListItems,
        listTitle: t(LangId.BlockCardParameterEdit, 'Editar'),
        total: paramListItems.length,
      }
    }
    if (panel === 'remove') {
      return {
        emptyHint: t(LangId.BlockParameterSelectToRemove),
        initialSize: paramListPanelSize,
        items: paramListItems,
        listTitle: t(LangId.BlockCardParameterRemove, 'Remover'),
        total: paramListItems.length,
      }
    }
    return null
  }, [
    addCatalogError,
    addCatalogLoading,
    addListItems,
    addListPanelSize,
    panel,
    paramListItems,
    paramListPanelSize,
    t,
  ])

  const closeAll = useCallback(() => {
    setMenuOpen(false)
    setPanel(null)
    setPendingRemove(null)
    setMenuPlacementAnchor(null)
    onPanelDismiss?.()
  }, [onPanelDismiss])

  const listPanelOpen =
    menuOpen &&
    effectiveScreenAnchor != null &&
    (panel === 'add' || panel === 'remove' || panel === 'edit')

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

    window.addEventListener('pointerdown', onPointerDownCapture, true)
    const registerClickTimer = window.setTimeout(() => {
      window.addEventListener('click', onClickCapture, true)
    }, 0)

    return () => {
      window.clearTimeout(registerClickTimer)
      window.removeEventListener('pointerdown', onPointerDownCapture, true)
      window.removeEventListener('click', onClickCapture, true)
    }
  }, [closeAll, isInsideMenu, menuOpen])

  const openParamList = (mode: 'remove' | 'edit') => {
    if (parameters.length === 0) {
      window.alert(
        t(mode === 'edit' ? LangId.BlockParameterSelectToEdit : LangId.BlockParameterSelectToRemove),
      )
      return
    }
    setParamListIndex(0)
    setPanel(mode)
    setMenuOpen(true)
  }

  const openAddPanel = () => {
    setParamListIndex(0)
    setPanel('add')
    setMenuOpen(true)
  }

  useEffect(() => {
    if (!menuOpen || panel !== 'add') {
      return
    }
    let cancelled = false
    setAddCatalogLoading(true)
    setAddCatalogError(null)

    void fetchBlockParametersFromDisk(blockType).then((result) => {
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setAddCatalogError(result.error)
        setAddCatalog([])
      } else {
        setAddCatalog(result.parameters)
      }
      setAddCatalogLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [blockType, menuOpen, panel])

  useEffect(() => {
    if (!externalPanelRequest) {
      return
    }

    if (externalScreenAnchor) {
      setMenuPlacementAnchor(externalScreenAnchor)
    }

    if (externalPanelRequest === 'add') {
      if (!onAddParameter) {
        onExternalPanelRequestHandled?.()
        return
      }
      openAddPanel()
      onExternalPanelRequestHandled?.()
      return
    }

    if (externalPanelRequest === 'edit') {
      if (!onEditParameter) {
        onExternalPanelRequestHandled?.()
        return
      }
      openParamList('edit')
      onExternalPanelRequestHandled?.()
      return
    }

    if (!onRemoveParameter) {
      onExternalPanelRequestHandled?.()
      return
    }
    openParamList('remove')
    onExternalPanelRequestHandled?.()
  }, [
    externalPanelRequest,
    externalScreenAnchor,
    onAddParameter,
    onEditParameter,
    onExternalPanelRequestHandled,
    onRemoveParameter,
  ])

  return (
    <div ref={rootRef} className={styles.menuRoot} data-block-param-menu-root="1">
      <div className={styles.toolbar} role="toolbar" aria-label={t(LangId.BlockCardParameterMenu)}>
        <button
          type="button"
          className={[
            styles.iconButton,
            slotToolsEnabled ? styles.iconButtonActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={!onSlotToolsEnabledChange}
          aria-label={
            slotToolsEnabled
              ? t(LangId.BlockCardSlotToolsDisable, 'Desactivar slot tools')
              : t(LangId.BlockCardSlotToolsEnable, 'Activar slot tools')
          }
          aria-pressed={slotToolsEnabled}
          title={
            slotToolsEnabled
              ? t(LangId.BlockCardSlotToolsDisable, 'Desactivar slot tools')
              : t(LangId.BlockCardSlotToolsEnable, 'Activar slot tools')
          }
          onPointerDown={stopMenuPointerPropagation}
          onClick={(event) => {
            event.stopPropagation()
            onSlotToolsEnabledChange?.(!slotToolsEnabled)
          }}
        >
          <span className={[styles.iconGlyph, styles.iconGlyphSlotTools].join(' ')} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!onEditParameter || parameters.length === 0}
          aria-label={t(LangId.BlockCardParameterEdit, 'Editar')}
          title={t(LangId.BlockCardParameterEdit, 'Editar')}
          onPointerDown={(event) => {
            stopMenuPointerPropagation(event)
            setMenuPlacementAnchor(pointerAnchor(event))
          }}
          onClick={(event) => {
            event.stopPropagation()
            setMenuPlacementAnchor(pointerAnchor(event))
            openParamList('edit')
          }}
        >
          <span className={[styles.iconGlyph, styles.iconGlyphEdit].join(' ')} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!onAddParameter}
          aria-label={t(LangId.BlockCardParameterAdd, 'Adicionar')}
          title={t(LangId.BlockCardParameterAdd, 'Adicionar')}
          onPointerDown={(event) => {
            stopMenuPointerPropagation(event)
            setMenuPlacementAnchor(pointerAnchor(event))
          }}
          onClick={(event) => {
            event.stopPropagation()
            setMenuPlacementAnchor(pointerAnchor(event))
            openAddPanel()
          }}
        >
          <span className={[styles.iconGlyph, styles.iconGlyphAdd].join(' ')} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!onRemoveParameter || parameters.length === 0}
          aria-label={t(LangId.BlockCardParameterRemove, 'Remover')}
          title={t(LangId.BlockCardParameterRemove, 'Remover')}
          onPointerDown={(event) => {
            stopMenuPointerPropagation(event)
            setMenuPlacementAnchor(pointerAnchor(event))
          }}
          onClick={(event) => {
            event.stopPropagation()
            setMenuPlacementAnchor(pointerAnchor(event))
            openParamList('remove')
          }}
        >
          <span className={[styles.iconGlyph, styles.iconGlyphRemove].join(' ')} aria-hidden />
        </button>
      </div>

      {listPanelOpen && activeListConfig && (panel !== 'add' || onAddParameter) ? (
        <StructureListPanel
          key={panel}
          dismissGuardRefs={[rootRef]}
          dismissOnClickOutside={false}
          emptyHint={activeListConfig.emptyHint}
          filterItem={
            panel === 'add'
              ? (item, query) => {
                  const doc = addAvailableDocs[item.index]
                  if (!doc) {
                    return false
                  }
                  const normalized = query.trim().toLowerCase()
                  if (!normalized) {
                    return true
                  }
                  return (
                    doc.parameterName.toLowerCase().includes(normalized) ||
                    doc.name.toLowerCase().includes(normalized) ||
                    doc.type.toLowerCase().includes(normalized)
                  )
                }
              : undefined
          }
          initialSize={activeListConfig.initialSize}
          itemCountForHeight={activeListConfig.total}
          items={activeListConfig.items}
          listTitle={activeListConfig.listTitle}
          open
          portalDataAttr="data-block-param-menu-portal"
          screenAnchor={effectiveScreenAnchor}
          selectedId={activeListConfig.items[paramListIndex]?.id ?? null}
          selectedIndex={paramListIndex}
          onPickItem={(item) => {
            if (panel === 'add') {
              const doc = addAvailableDocs[item.index]
              if (!doc || !onAddParameter) {
                return
              }
              onAddParameter(doc)
              closeAll()
              return
            }
            const param = parameters[item.index]
            if (!param) {
              return
            }
            if (panel === 'edit') {
              onEditParameter?.(param, effectiveScreenAnchor ?? undefined)
              closeAll()
              return
            }
            setPendingRemove(param)
            setPanel('confirmRemove')
          }}
          onSelectIndex={setParamListIndex}
        />
      ) : null}

      {pendingRemove && panel === 'confirmRemove' ? (
        <div className={styles.confirmBackdrop} role="presentation">
          <div className={styles.confirmDialog} role="alertdialog">
            <h4 className={styles.confirmTitle}>{t(LangId.BlockParameterRemoveConfirmTitle)}</h4>
            <p className={styles.confirmMessage}>
              {t(LangId.BlockParameterRemoveConfirmMessage, undefined, {
                name: pendingRemove.nameParameter || pendingRemove.idParameter,
              })}
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => {
                  setPendingRemove(null)
                  setPanel('remove')
                  setMenuOpen(true)
                }}
              >
                {t(LangId.BlockParameterRemoveConfirmNo)}
              </button>
              <button
                type="button"
                className={[styles.confirmButton, styles.confirmButtonDanger].join(' ')}
                onClick={() => {
                  onRemoveParameter?.(pendingRemove.idParameter)
                  closeAll()
                }}
              >
                {t(LangId.BlockParameterRemoveConfirmYes)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
