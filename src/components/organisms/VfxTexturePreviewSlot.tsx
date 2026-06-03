import styles from './VfxTexturePreviewSlot.module.css'

type VfxTexturePreviewSlotProps = {
  ritualPath: string
  previewUrl: string | null
  isDds?: boolean
  assetIndexSize: number
}

export function VfxTexturePreviewSlot({
  ritualPath,
  previewUrl,
  isDds = false,
  assetIndexSize,
}: VfxTexturePreviewSlotProps) {
  const displayPath = ritualPath.replace(/^ASSETS\//i, '').trim()

  let placeholder = 'Pré-visualização'
  if (!displayPath) placeholder = 'Sem caminho de textura'
  else if (!previewUrl && assetIndexSize === 0) placeholder = 'A carregar…'
  else if (!previewUrl) placeholder = 'Textura não encontrada'

  return (
    <div className={styles.block}>
      {displayPath ? (
        <div className={styles.pathLine} title={ritualPath}>
          {displayPath}
        </div>
      ) : null}

      <div
        aria-label="Pré-visualização da textura"
        className={[
          styles.slot,
          previewUrl ? styles.slotFilled : styles.slotEmpty,
        ].join(' ')}
      >
        {previewUrl && !isDds ? (
          <img alt="" className={styles.previewImg} src={previewUrl} />
        ) : previewUrl && isDds ? (
          <span className={styles.previewPlaceholder}>
            .dds indexado
            <br />
            (ver viewport 3D)
          </span>
        ) : (
          <span className={styles.previewPlaceholder}>{placeholder}</span>
        )}
      </div>
    </div>
  )
}
