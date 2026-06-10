import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const addonsRoot = path.resolve(__dirname, '../public/addons')

/** @type {Array<{ ritual: string, nodeDataType: string, defaultValue: string, placeholderPt: string, placeholderEn: string, labelPt: string, labelEn: string }>} */
const PARAM_TYPES = [
  {
    ritual: 'string',
    nodeDataType: 'string',
    defaultValue: '',
    placeholderPt: 'texto',
    placeholderEn: 'text',
    labelPt: 'Valor String',
    labelEn: 'String Value',
  },
  {
    ritual: 'bool',
    nodeDataType: 'bool',
    defaultValue: 'false',
    placeholderPt: 'true ou false',
    placeholderEn: 'true or false',
    labelPt: 'Valor Bool',
    labelEn: 'Bool Value',
  },
  {
    ritual: 'flag',
    nodeDataType: 'flag',
    defaultValue: 'false',
    placeholderPt: 'true ou false',
    placeholderEn: 'true or false',
    labelPt: 'Valor Flag',
    labelEn: 'Flag Value',
  },
  {
    ritual: 'u8',
    nodeDataType: 'u8',
    defaultValue: '0',
    placeholderPt: '0–255',
    placeholderEn: '0–255',
    labelPt: 'Valor U8',
    labelEn: 'U8 Value',
  },
  {
    ritual: 'i8',
    nodeDataType: 'i8',
    defaultValue: '0',
    placeholderPt: '-128–127',
    placeholderEn: '-128–127',
    labelPt: 'Valor I8',
    labelEn: 'I8 Value',
  },
  {
    ritual: 'u16',
    nodeDataType: 'u16',
    defaultValue: '0',
    placeholderPt: '0–65535',
    placeholderEn: '0–65535',
    labelPt: 'Valor U16',
    labelEn: 'U16 Value',
  },
  {
    ritual: 'i16',
    nodeDataType: 'i16',
    defaultValue: '0',
    placeholderPt: '-32768–32767',
    placeholderEn: '-32768–32767',
    labelPt: 'Valor I16',
    labelEn: 'I16 Value',
  },
  {
    ritual: 'u32',
    nodeDataType: 'u32',
    defaultValue: '0',
    placeholderPt: 'inteiro',
    placeholderEn: 'integer',
    labelPt: 'Valor U32',
    labelEn: 'U32 Value',
  },
  {
    ritual: 'i32',
    nodeDataType: 'i32',
    defaultValue: '0',
    placeholderPt: 'inteiro',
    placeholderEn: 'integer',
    labelPt: 'Valor I32',
    labelEn: 'I32 Value',
  },
  {
    ritual: 'u64',
    nodeDataType: 'u64',
    defaultValue: '0',
    placeholderPt: 'inteiro',
    placeholderEn: 'integer',
    labelPt: 'Valor U64',
    labelEn: 'U64 Value',
  },
  {
    ritual: 'i64',
    nodeDataType: 'i64',
    defaultValue: '0',
    placeholderPt: 'inteiro',
    placeholderEn: 'integer',
    labelPt: 'Valor I64',
    labelEn: 'I64 Value',
  },
  {
    ritual: 'f32',
    nodeDataType: 'f32',
    defaultValue: '0',
    placeholderPt: '0.0',
    placeholderEn: '0.0',
    labelPt: 'Valor F32',
    labelEn: 'F32 Value',
  },
  {
    ritual: 'float',
    nodeDataType: 'float',
    defaultValue: '0',
    placeholderPt: '0.0',
    placeholderEn: '0.0',
    labelPt: 'Valor Float',
    labelEn: 'Float Value',
  },
  {
    ritual: 'double',
    nodeDataType: 'double',
    defaultValue: '0',
    placeholderPt: '0.0',
    placeholderEn: '0.0',
    labelPt: 'Valor Double',
    labelEn: 'Double Value',
  },
  {
    ritual: 'vec2',
    nodeDataType: 'vector2',
    defaultValue: '0, 0',
    placeholderPt: 'x, y',
    placeholderEn: 'x, y',
    labelPt: 'Valor Vec2',
    labelEn: 'Vec2 Value',
  },
  {
    ritual: 'vec3',
    nodeDataType: 'vector3',
    defaultValue: '0, 0, 0',
    placeholderPt: 'x, y, z',
    placeholderEn: 'x, y, z',
    labelPt: 'Valor Vec3',
    labelEn: 'Vec3 Value',
  },
  {
    ritual: 'vec4',
    nodeDataType: 'vector4',
    defaultValue: '0, 0, 0, 0',
    placeholderPt: 'x, y, z, w',
    placeholderEn: 'x, y, z, w',
    labelPt: 'Valor Vec4',
    labelEn: 'Vec4 Value',
  },
  {
    ritual: 'rgba',
    nodeDataType: 'rgba',
    defaultValue: '0, 0, 0, 1',
    placeholderPt: 'r, g, b, a',
    placeholderEn: 'r, g, b, a',
    labelPt: 'Valor RGBA',
    labelEn: 'RGBA Value',
  },
]

function isBoolLikeType(type) {
  return type.ritual === 'bool' || type.ritual === 'flag'
}

function isVectorLikeType(type) {
  return type.ritual === 'vec2' || type.ritual === 'vec3' || type.ritual === 'vec4' || type.ritual === 'rgba'
}

function vectorAxisConfig(type) {
  switch (type.ritual) {
    case 'vec2':
      return { labels: ['X', 'Y'], width: 176, height: 68 }
    case 'vec3':
      return { labels: ['X', 'Y', 'Z'], width: 176, height: 92 }
    case 'vec4':
      return { labels: ['X', 'Y', 'Z', 'W'], width: 176, height: 116 }
    case 'rgba':
      return { labels: ['R', 'G', 'B', 'A'], width: 176, height: 116 }
    default:
      return { labels: ['X', 'Y', 'Z'], width: 176, height: 92 }
  }
}

function parseDefaultComponents(defaultValue, count) {
  const inner = String(defaultValue ?? '')
    .trim()
    .replace(/^\{\s*|\s*\}$/g, '')
  const parts = inner.split(/[\s,]+/).filter(Boolean)
  return Array.from({ length: count }, (_, index) => parts[index] ?? '0')
}

const INTEGER_RITUALS = new Set(['u8', 'i8', 'u16', 'i16', 'u32', 'i32', 'u64', 'i64'])
const FLOAT_RITUALS = new Set(['f32', 'float', 'double'])
const DECIMAL_RITUALS = new Set(['vec2', 'vec3', 'vec4', 'vec', 'rgba', ...FLOAT_RITUALS])

function inputModeAttrFor(type) {
  if (INTEGER_RITUALS.has(type.ritual)) {
    return 'inputmode="numeric"'
  }
  if (DECIMAL_RITUALS.has(type.ritual)) {
    return 'inputmode="decimal"'
  }
  return ''
}

function logicJsFor(type) {
  if (isBoolLikeType(type)) {
    return `import { syncBoolToggleUi } from '../shared/boolToggle.js'
import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = '${type.ritual}'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const hidden = cardDOM.querySelector('input[name="literal"]')
  const literal =
    hidden instanceof HTMLInputElement
      ? hidden.value
      : String(inputs.literal ?? '')

  syncBoolToggleUi(cardDOM.querySelector('[data-addon-bool-toggle]'), literal)
  return executeAddonParamValue(RITUAL_TYPE, literal, cardDOM)
}

export const logic = { execute }
`
  }

  if (isVectorLikeType(type)) {
    return `import { readLiteralFromDom, syncVecAxisFromLiteral } from '../shared/vecAxisInput.js'
import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = '${type.ritual}'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  const literal = readLiteralFromDom(cardDOM, inputs)
  syncVecAxisFromLiteral(cardDOM, literal)
  return executeAddonParamValue(RITUAL_TYPE, literal, cardDOM)
}

export const logic = { execute }
`
  }

  return `import { executeAddonParamValue } from '../shared/paramValueValidate.js'

const RITUAL_TYPE = '${type.ritual}'

/**
 * @param {Record<string, unknown>} inputs
 * @param {HTMLElement} cardDOM
 * @returns {Record<string, unknown>}
 */
function execute(inputs, cardDOM) {
  return executeAddonParamValue(RITUAL_TYPE, String(inputs.literal ?? ''), cardDOM)
}

export const logic = { execute }
`
}

function manifestFor(type) {
  const addonId = `addon-value-${type.ritual}`
  return {
    id: addonId,
    name: '[{0}]',
    category: 'Values',
    drive: 'inputChange',
    info: {
      link: 'https://github.com/JunioCesar96/Node-Graphs-League-of-Legends',
      author: 'Junio Cesar (Takeda)',
      version: '1.0.0',
      description: '[{23}]',
      license: 'MIT',
      tags: ['[{20}]', '[{21}]', type.ritual],
      docs: 'https://github.com/JunioCesar96/Node-Graphs-League-of-Legends/blob/main/README.md',
    },
    headerColor: '',
    icon: 'none',
    get: true,
    set: true,
    data: [
      {
        name: 'literal',
        type: type.ritual,
        direction: 'input',
        slot: 'false',
        slotColor: 'default',
      },
      {
        name: 'value',
        type: type.ritual,
        direction: 'output',
        slot: 'true',
        slotColor: 'default',
        slotTip: { pt: '{6}', en: '{6}' },
      },
    ],
  }
}

function boolToggleUiHtmlFor(type) {
  const rootClass = `addon-value-${type.ritual}-ui`
  return `<div class="${rootClass}">
  <div class="addon-value-row">
    {slot:value}{/slot}
    <span class="addon-value-label">{1}</span>
    <div class="addon-bool-toggle-wrap">
      <input type="hidden" name="literal" value="${type.defaultValue}" />
      <button
        type="button"
        class="addon-bool-toggle"
        data-addon-bool-toggle
        role="switch"
        aria-checked="${type.defaultValue === 'true' ? 'true' : 'false'}"
        aria-label="{1}"
        data-checked="${type.defaultValue === 'true' ? '1' : '0'}"
      >
        <span class="addon-bool-toggle-thumb" aria-hidden="true"></span>
      </button>
      <span class="addon-bool-toggle-state" data-bool-state>${type.defaultValue}</span>
    </div>
  </div>
</div>

<style>
  .${rootClass} {
    width: 200px;
    height: 40px;
    color: var(--color-text-primary);
    overflow: hidden;
  }

  .${rootClass} .addon-grid-row {
    align-items: center;
  }

  .${rootClass} .addon-grid-col--output {
    align-self: center;
    padding-top: 0;
  }

  .${rootClass} .addon-value-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    min-width: 0;
  }

  .${rootClass} .addon-value-label {
    flex: 0 0 auto;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-secondary, #94a3b8);
    white-space: nowrap;
  }

  .${rootClass} .addon-bool-toggle-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    flex: 0 0 auto;
  }

  .${rootClass} .addon-bool-toggle {
    position: relative;
    width: 2.25rem;
    height: 1.125rem;
    padding: 0;
    border: 1px solid var(--ctx-menu-border, #454545);
    border-radius: 999px;
    background: var(--ctx-menu-bg, #2d2d2d);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 120ms ease, border-color 120ms ease;
  }

  .${rootClass} .addon-bool-toggle[data-checked='1'] {
    background: var(--ctx-menu-hover-bg, #007acc);
    border-color: var(--ctx-menu-hover-bg, #007acc);
  }

  .${rootClass} .addon-bool-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 35%);
    transition: transform 120ms ease;
    pointer-events: none;
  }

  .${rootClass} .addon-bool-toggle[data-checked='1'] .addon-bool-toggle-thumb {
    transform: translateX(1.125rem);
  }

  .${rootClass} .addon-bool-toggle-state {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--syntax-keyword, #569cd6);
    min-width: 2rem;
  }
</style>
`
}

function vectorAxisUiHtmlFor(type) {
  const rootClass = `addon-value-${type.ritual}-ui`
  const { labels, width, height } = vectorAxisConfig(type)
  const defaults = parseDefaultComponents(type.defaultValue, labels.length)
  const axisRows = labels
    .map((label, index) => `      <div class="addon-vec-axis-row">
        <span class="addon-vec-axis-label">${label}</span>
        <input
          type="text"
          class="addon-vec-axis-input"
          data-vec-axis="${index}"
          inputmode="decimal"
          value="${defaults[index]}"
          aria-label="${label}"
        />
      </div>`)
    .join('\n')

  return `<div class="${rootClass}">
  <div class="addon-value-row addon-value-row--vec">
    {slot:value}{/slot}
    <div
      class="addon-vec-axis-panel"
      data-addon-vec-panel
      data-ritual-type="${type.ritual}"
      data-parameter-type="${type.nodeDataType}"
    >
      <input type="hidden" name="literal" value="${type.defaultValue}" />
${axisRows}
    </div>
  </div>
</div>

<style>
  .${rootClass} {
    width: ${width}px;
    height: ${height}px;
    color: var(--color-text-primary);
    overflow: hidden;
  }

  .${rootClass} .addon-grid-row {
    align-items: center;
  }

  .${rootClass} .addon-grid-col--output {
    align-self: center;
    padding-top: 0;
  }

  .${rootClass} .addon-value-row--vec {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0.375rem;
    width: 100%;
    min-width: 0;
    height: 100%;
  }

  .${rootClass} .addon-vec-axis-panel {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ctx-menu-border, #454545);
    border-radius: var(--ctx-menu-radius, 4px);
    overflow: hidden;
    background: var(--ctx-menu-bg, #2d2d2d);
  }

  .${rootClass} .addon-vec-axis-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 22px;
    padding: 0 0.375rem;
    border-bottom: 1px solid color-mix(in srgb, var(--ctx-menu-border, #454545) 55%, transparent);
  }

  .${rootClass} .addon-vec-axis-row:last-child {
    border-bottom: none;
  }

  .${rootClass} .addon-vec-axis-label {
    flex: 0 0 1rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-secondary, #94a3b8);
    user-select: none;
  }

  .${rootClass} .addon-vec-axis-input {
    flex: 1 1 0;
    min-width: 0;
    padding: 0;
    font-size: var(--ctx-menu-shortcut-font-size, 11.5px);
    text-align: right;
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    outline: none;
  }

  .${rootClass} .addon-vec-axis-input:focus-visible {
    outline: 1px solid var(--ctx-menu-hover-bg, #007acc);
    outline-offset: -1px;
    border-radius: 2px;
  }

  .${rootClass} .addon-vec-axis-panel[data-invalid='1'] {
    border-color: #e54545;
    box-shadow: 0 0 0 1px rgba(229, 69, 69, 0.35);
  }
</style>
`
}

function uiHtmlFor(type) {
  if (isBoolLikeType(type)) {
    return boolToggleUiHtmlFor(type)
  }

  if (isVectorLikeType(type)) {
    return vectorAxisUiHtmlFor(type)
  }

  const rootClass = `addon-value-${type.ritual}-ui`
  return `<div class="${rootClass}">
  <div class="addon-value-row">
    {slot:value}{/slot}
    <span class="addon-value-label">{1}</span>
    <input
      type="text"
      name="literal"
      class="addon-value-input"
      data-parameter-type="${type.nodeDataType}"
      ${inputModeAttrFor(type)}
      placeholder="{4}"
      value="${type.defaultValue}"
    />
  </div>
</div>

<style>
  .${rootClass} {
    width: 240px;
    height: 40px;
    color: var(--color-text-primary);
    overflow: hidden;
  }

  .${rootClass} .addon-grid-row {
    align-items: center;
  }

  .${rootClass} .addon-grid-col--output {
    align-self: center;
    padding-top: 0;
  }

  .${rootClass} .addon-value-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    min-width: 0;
  }

  .${rootClass} .addon-value-label {
    flex: 0 0 auto;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-secondary, #94a3b8);
    white-space: nowrap;
  }

  .${rootClass} .addon-value-input {
    flex: 1 1 0;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.25rem 0.375rem;
    font-size: var(--ctx-menu-shortcut-font-size, 11.5px);
    background: var(--ctx-menu-bg, #2d2d2d);
    border: 1px solid var(--ctx-menu-border, #454545);
    border-radius: var(--ctx-menu-radius, 4px);
  }

  .${rootClass} .addon-value-input[data-invalid='1'] {
    border-color: #e54545;
    box-shadow: 0 0 0 1px rgba(229, 69, 69, 0.35);
  }
</style>
`
}

function languagePt(type) {
  return {
    0: type.labelPt,
    1: 'Valor',
    ...(isBoolLikeType(type) || isVectorLikeType(type) ? {} : { 4: type.placeholderPt }),
    6: `Valor literal ${type.ritual} exposto na saída do add-on.`,
    20: 'Valores',
    21: 'Parâmetro',
    23: isBoolLikeType(type)
      ? `Chave liga/desliga que define true ou false e expõe o valor num slot de saída compatível com parâmetros de bloco.`
      : `Define um valor literal do tipo ${type.ritual} e expõe-o num slot de saída compatível com parâmetros de bloco.`,
  }
}

function languageEn(type) {
  return {
    0: type.labelEn,
    1: 'Value',
    ...(isBoolLikeType(type) || isVectorLikeType(type) ? {} : { 4: type.placeholderEn }),
    6: `Literal ${type.ritual} value exposed on the add-on output.`,
    20: 'Values',
    21: 'Parameter',
    23: isBoolLikeType(type)
      ? `Toggle switch that sets true or false and exposes the value on an output slot compatible with block parameters.`
      : `Sets a literal ${type.ritual} value and exposes it on an output slot compatible with block parameters.`,
  }
}

async function writeAddon(type) {
  const addonId = `addon-value-${type.ritual}`
  const dir = path.join(addonsRoot, addonId)
  await fs.mkdir(path.join(dir, 'language'), { recursive: true })
  await fs.writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifestFor(type), null, 2)}\n`)
  await fs.writeFile(path.join(dir, 'ui.html'), uiHtmlFor(type))
  await fs.writeFile(path.join(dir, 'logic.js'), logicJsFor(type))
  await fs.writeFile(path.join(dir, 'language', 'pt.json'), `${JSON.stringify(languagePt(type), null, 2)}\n`)
  await fs.writeFile(path.join(dir, 'language', 'en.json'), `${JSON.stringify(languageEn(type), null, 2)}\n`)
  return addonId
}

const ids = []
for (const type of PARAM_TYPES) {
  ids.push(await writeAddon(type))
}

const indexPath = path.join(addonsRoot, 'index.json')
const existing = JSON.parse(await fs.readFile(indexPath, 'utf8'))
const merged = [...existing]
for (const id of ids) {
  if (!merged.includes(id)) {
    merged.push(id)
  }
}
await fs.writeFile(indexPath, `${JSON.stringify(merged, null, 2)}\n`)
console.log(`Generated ${ids.length} parameter value add-ons.`)
