import {
  formatVec4NormalizedString,
  vfxRgbaToRgbaColor,
  vfxRgbaToCss,
  type VfxRgbaTuple,
} from '@/core/vfx/vfxColor'

import styles from '@/components/molecules/VfxColorSwatchRow.module.css'

type VfxColorSwatchRowProps = {
  label: string
  rgba: VfxRgbaTuple
  subtitle?: string
}

function formatRgbBytes(rgba: VfxRgbaTuple): string {
  const { r, g, b, a } = vfxRgbaToRgbaColor(rgba)
  const ri = Math.round(r * 255)
  const gi = Math.round(g * 255)
  const bi = Math.round(b * 255)
  const ai = Math.round(a * 255)
  return `${ri}, ${gi}, ${bi}, ${ai}`
}

export function VfxColorSwatchRow({ label, rgba, subtitle }: VfxColorSwatchRowProps) {
  const css = vfxRgbaToCss(rgba)
  const vec4 = formatVec4NormalizedString(rgba)
  const rgb = formatRgbBytes(rgba)

  return (
    <div className={styles.row}>
      <span className={styles.swatch} style={{ background: css }} title={css} aria-hidden />
      <div className={styles.meta}>
        <span className={styles.label}>{label}</span>
        {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        <span className={styles.vec4} title="vec4 (0–1)">
          vec4: {vec4}
        </span>
        <span className={styles.rgb} title="RGB (0–255)">
          RGB: {rgb}
        </span>
      </div>
    </div>
  )
}
