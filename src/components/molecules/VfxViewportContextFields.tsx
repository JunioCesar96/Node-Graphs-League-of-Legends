import {
  DEFAULT_AXIS_WORLD_COLORS,
  DEFAULT_AXIS_WORLD_SCALE,
  type VfxAxisWorldColors,
} from '@/core/vfx/vfxViewportPreferences'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import axisStyles from './VfxAxisWorldContextMenu.module.css'
import fieldStyles from './VfxGroundContextMenu.module.css'

function clampAxisScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(20, Math.max(0.05, value))
}

function clampGroundScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(50, Math.max(0.05, value))
}

function normalizeHexInput(value: string, fallback: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

const AXES = ['X', 'Y', 'Z'] as const
const COLOR_KEYS: Array<keyof VfxAxisWorldColors> = ['x', 'y', 'z']

type VfxAxisWorldSettingsFieldsProps = {
  colors: VfxAxisWorldColors
  compact?: boolean
  disabled?: boolean
  onColorsChange: (next: VfxAxisWorldColors) => void
  onScaleChange: (next: [number, number, number]) => void
  scale: [number, number, number]
}

export function VfxAxisWorldSettingsFields({
  colors,
  compact = false,
  disabled = false,
  onColorsChange,
  onScaleChange,
  scale,
}: VfxAxisWorldSettingsFieldsProps) {
  const { t } = useLanguage()
  const fieldClass = compact ? `${fieldStyles.field} ${fieldStyles.fieldCompact}` : fieldStyles.field
  const colorRowClass = compact ? `${axisStyles.colorRow} ${axisStyles.colorRowCompact}` : axisStyles.colorRow

  return (
    <>
      <fieldset className={fieldStyles.fieldset} disabled={disabled}>
        <legend className={fieldStyles.legend}>{t(LangId.VfxCtxAxisScaleLegend)}</legend>
        {AXES.map((axis, index) => (
          <label className={fieldClass} key={axis}>
            <span>{axis}</span>
            <input
              className={fieldStyles.input}
              disabled={disabled}
              max={20}
              min={0.05}
              onChange={(event) => {
                const next = [...scale] as [number, number, number]
                next[index] = clampAxisScale(Number.parseFloat(event.target.value))
                onScaleChange(next)
              }}
              step={0.05}
              type="number"
              value={scale[index]}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className={fieldStyles.fieldset} disabled={disabled}>
        <legend className={fieldStyles.legend}>{t(LangId.VfxCtxAxisColorLegend)}</legend>
        {AXES.map((axis, index) => {
          const key = COLOR_KEYS[index]!
          return (
            <div className={colorRowClass} key={axis}>
              <span className={axisStyles.colorLabel}>{axis}</span>
              <input
                aria-label={t(LangId.VfxCtxAxisColorAria, 'Cor eixo {axis}', { axis })}
                className={axisStyles.colorPicker}
                disabled={disabled}
                onChange={(event) => {
                  onColorsChange({
                    ...colors,
                    [key]: normalizeHexInput(event.target.value, colors[key]),
                  })
                }}
                type="color"
                value={colors[key]}
              />
              <input
                className={fieldStyles.input}
                disabled={disabled}
                onChange={(event) => {
                  onColorsChange({
                    ...colors,
                    [key]: normalizeHexInput(event.target.value, colors[key]),
                  })
                }}
                spellCheck={false}
                type="text"
                value={colors[key]}
              />
            </div>
          )
        })}
      </fieldset>

      <button
        className={axisStyles.resetButton}
        disabled={disabled}
        onClick={() => {
          onScaleChange([...DEFAULT_AXIS_WORLD_SCALE])
          onColorsChange({ ...DEFAULT_AXIS_WORLD_COLORS })
        }}
        type="button"
      >
        {t(LangId.VfxCtxResetDefault)}
      </button>
    </>
  )
}

type VfxGroundSettingsFieldsProps = {
  compact?: boolean
  disabled?: boolean
  groundPosition: [number, number, number]
  groundScale2d: [number, number]
  onGroundPositionChange: (next: [number, number, number]) => void
  onGroundScale2dChange: (next: [number, number]) => void
}

export function VfxGroundSettingsFields({
  compact = false,
  disabled = false,
  groundPosition,
  groundScale2d,
  onGroundPositionChange,
  onGroundScale2dChange,
}: VfxGroundSettingsFieldsProps) {
  const { t } = useLanguage()
  const fieldClass = compact ? `${fieldStyles.field} ${fieldStyles.fieldCompact}` : fieldStyles.field

  return (
    <>
      <fieldset className={fieldStyles.fieldset} disabled={disabled}>
        <legend className={fieldStyles.legend}>{t(LangId.VfxCtxGroundPositionLegend)}</legend>
        {(
          [
            ['X', 'X'],
            ['Y', 'Z LoL'],
            ['Z', 'Y LoL'],
          ] as const
        ).map(([axis, label], index) => (
          <label className={fieldClass} key={axis}>
            <span>{label}</span>
            <input
              className={fieldStyles.input}
              disabled={disabled}
              onChange={(event) => {
                const next = [...groundPosition] as [number, number, number]
                next[index] = Number.parseFloat(event.target.value) || 0
                onGroundPositionChange(next)
              }}
              step={0.01}
              type="number"
              value={groundPosition[index]}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className={fieldStyles.fieldset} disabled={disabled}>
        <legend className={fieldStyles.legend}>{t(LangId.VfxCtxGroundScaleLegend)}</legend>
        <label className={fieldClass}>
          <span>{t(LangId.VfxCtxGroundWidth)}</span>
          <input
            className={fieldStyles.input}
            disabled={disabled}
            min={0.05}
            onChange={(event) => {
              onGroundScale2dChange([
                clampGroundScale(Number.parseFloat(event.target.value)),
                groundScale2d[1],
              ])
            }}
            step={0.05}
            type="number"
            value={groundScale2d[0]}
          />
        </label>
        <label className={fieldClass}>
          <span>{t(LangId.VfxCtxGroundDepth)}</span>
          <input
            className={fieldStyles.input}
            disabled={disabled}
            min={0.05}
            onChange={(event) => {
              onGroundScale2dChange([
                groundScale2d[0],
                clampGroundScale(Number.parseFloat(event.target.value)),
              ])
            }}
            step={0.05}
            type="number"
            value={groundScale2d[1]}
          />
        </label>
      </fieldset>
    </>
  )
}

type VfxGlobalRotationSettingsFieldsProps = {
  compact?: boolean
  disabled?: boolean
  offsetDegrees: [number, number, number]
  onOffsetDegreesChange: (next: [number, number, number]) => void
}

export function VfxGlobalRotationSettingsFields({
  compact = false,
  disabled = false,
  offsetDegrees,
  onOffsetDegreesChange,
}: VfxGlobalRotationSettingsFieldsProps) {
  const { t } = useLanguage()
  const fieldClass = compact ? `${fieldStyles.field} ${fieldStyles.fieldCompact}` : fieldStyles.field

  return (
    <fieldset className={fieldStyles.fieldset} disabled={disabled}>
      <legend className={fieldStyles.legend}>{t(LangId.VfxCtxGlobalRotationOffsetLegend)}</legend>
      {AXES.map((axis, index) => (
        <label className={fieldClass} key={axis}>
          <span>{axis}</span>
          <input
            className={fieldStyles.input}
            disabled={disabled}
            onChange={(event) => {
              const next = [...offsetDegrees] as [number, number, number]
              next[index] = Number.parseFloat(event.target.value) || 0
              onOffsetDegreesChange(next)
            }}
            step={1}
            type="number"
            value={offsetDegrees[index]}
          />
        </label>
      ))}
      <button
        className={axisStyles.resetButton}
        disabled={disabled}
        onClick={() => onOffsetDegreesChange([0, 0, 0])}
        type="button"
      >
        {t(LangId.VfxCtxResetOffset)}
      </button>
    </fieldset>
  )
}

type VfxPositionSettingsFieldsProps = {
  compact?: boolean
  disabled?: boolean
  offset: [number, number, number]
  onOffsetChange: (next: [number, number, number]) => void
}

export function VfxPositionSettingsFields({
  compact = false,
  disabled = false,
  offset,
  onOffsetChange,
}: VfxPositionSettingsFieldsProps) {
  const { t } = useLanguage()
  const fieldClass = compact ? `${fieldStyles.field} ${fieldStyles.fieldCompact}` : fieldStyles.field

  return (
    <>
      <p className={fieldStyles.hint}>{t(LangId.VfxCtxPositionHint)}</p>
      <fieldset className={fieldStyles.fieldset} disabled={disabled}>
        <legend className={fieldStyles.legend}>{t(LangId.VfxCtxPositionOffsetLegend)}</legend>
        {AXES.map((axis, index) => (
          <label className={fieldClass} key={axis}>
            <span>{axis}</span>
            <input
              className={fieldStyles.input}
              disabled={disabled}
              onChange={(event) => {
                const next = [...offset] as [number, number, number]
                next[index] = Number.parseFloat(event.target.value) || 0
                onOffsetChange(next)
              }}
              step={0.01}
              type="number"
              value={offset[index]}
            />
          </label>
        ))}
        <button
          className={axisStyles.resetButton}
          disabled={disabled}
          onClick={() => onOffsetChange([0, 1.5, 0])}
          type="button"
        >
          {t(LangId.VfxCtxPositionResetDefault)}
        </button>
      </fieldset>
    </>
  )
}
