import { RITOBIN_LANGUAGE_ID } from '@/monaco/ritobinEditorSetup'

/** Extensões de texto simples (sem conversão bin) — alinhado a `Jade binOperations.ts`. */
export const PLAIN_TEXT_EXTENSIONS = new Set([
  'txt',
  'json',
  'md',
  'markdown',
  'xml',
  'yaml',
  'yml',
  'ini',
  'toml',
  'csv',
  'tsv',
  'log',
  'html',
  'htm',
  'css',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'sh',
  'bat',
  'cmd',
  'ps1',
  'sql',
  'env',
  'conf',
  'cfg',
])

export const CODE_DOCK_QUICK_NEW_EXTENSIONS = [
  { ext: 'txt', label: 'Texto simples' },
  { ext: 'md', label: 'Markdown' },
  { ext: 'json', label: 'JSON' },
  { ext: 'py', label: 'Ritobin (.py)' },
  { ext: 'bin', label: 'BIN (ritobin)' },
] as const

export const CODE_DOCK_FILE_INPUT_ACCEPT =
  '.bin,.py,.txt,.md,.markdown,.json,.xml,.yaml,.yml,.ini,.csv,.log,.html,.css,.js,.ts,.tsx'

export function getFileExtension(fileName: string): string {
  const slash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'))
  const dot = fileName.lastIndexOf('.')

  if (dot <= slash) {
    return ''
  }

  return fileName.slice(dot + 1).toLowerCase()
}

/** Editor ritobin (syntax Jade) — `.bin` e sidecar `.py`. */
export function isRitobinEditorPath(fileName: string): boolean {
  const ext = getFileExtension(fileName)

  return ext === 'bin' || ext === 'py'
}

/** Abrir: só `.bin` passa pela ponte de conversão. */
export function needsBinConversionOnOpen(fileName: string): boolean {
  return getFileExtension(fileName) === 'bin'
}

/** Gravar: só `.bin` é convertido de texto ritual → binário. */
export function needsBinConversionOnSave(fileName: string): boolean {
  return getFileExtension(fileName) === 'bin'
}

export function isPlainTextPath(fileName: string): boolean {
  const ext = getFileExtension(fileName)

  if (!ext) {
    return true
  }

  return PLAIN_TEXT_EXTENSIONS.has(ext) || ext === 'py'
}

export function sanitizeCodeDockBaseName(raw: string): string {
  return raw.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\.+$/, '') || 'Untitled'
}

export function buildCodeDockFileName(baseName: string, extension: string): string {
  const sanitizedBase = sanitizeCodeDockBaseName(baseName)
  const sanitizedExt = extension.trim().replace(/^\.+/, '').toLowerCase()

  return sanitizedExt ? `${sanitizedBase}.${sanitizedExt}` : sanitizedBase
}

/** Nome de ficheiro seguro; preserva extensão se já existir. */
export function normalizeCodeDockFileName(raw: string, defaultExt = 'txt'): string {
  const text = typeof raw === 'string' ? raw : ''
  const trimmed = text.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')

  if (!trimmed) {
    return buildCodeDockFileName('Untitled', defaultExt)
  }

  if (/\.[a-z0-9]+$/i.test(trimmed)) {
    return trimmed
  }

  return buildCodeDockFileName(trimmed, defaultExt)
}

export function defaultContentForNewFile(fileName: string): string {
  const ext = getFileExtension(fileName)

  switch (ext) {
    case 'json':
      return '{\n  \n}\n'
    case 'md':
    case 'markdown':
      return '# Título\n\n'
    case 'py':
      return '// Novo ritual\n'
    case 'bin':
      return ''
    default:
      return ''
  }
}

export function uniqueUntitledFileName(existing: readonly string[], extension: string): string {
  const ext = extension.trim().replace(/^\.+/, '').toLowerCase() || 'txt'
  const first = buildCodeDockFileName('Untitled', ext)
  const used = new Set(existing.map((name) => name.toLowerCase()))

  if (!used.has(first.toLowerCase())) {
    return first
  }

  let index = 2

  while (used.has(buildCodeDockFileName(`Untitled-${index}`, ext).toLowerCase())) {
    index += 1
  }

  return buildCodeDockFileName(`Untitled-${index}`, ext)
}

export function getMonacoLanguageForFileName(fileName: string): string {
  const ext = getFileExtension(fileName)

  if (!ext || ext === 'bin' || ext === 'py') {
    return RITOBIN_LANGUAGE_ID
  }

  switch (ext) {
    case 'json':
      return 'json'
    case 'md':
    case 'markdown':
      return 'markdown'
    case 'xml':
      return 'xml'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'jsx':
      return 'javascript'
    case 'ts':
    case 'tsx':
      return 'typescript'
    default:
      return 'plaintext'
  }
}

type SavePickerType = {
  description: string
  accept: Record<string, string[]>
}

/** Filtros do `showSaveFilePicker` (como no Jade `saveAnyFileAs`). */
export function codeDockSavePickerTypes(suggestedName: string): SavePickerType[] {
  const ext = getFileExtension(suggestedName)

  const types: SavePickerType[] = [
    { description: 'Binário ritual', accept: { 'application/octet-stream': ['.bin'] } },
    { description: 'Ritobin (texto)', accept: { 'text/plain': ['.py'] } },
    { description: 'Texto', accept: { 'text/plain': ['.txt'] } },
    { description: 'Markdown', accept: { 'text/markdown': ['.md'] } },
    { description: 'JSON', accept: { 'application/json': ['.json'] } },
  ]

  if (ext && !types.some((entry) => Object.values(entry.accept).flat().includes(`.${ext}`))) {
    types.unshift({
      description: 'Ficheiro actual',
      accept: { 'text/plain': [`.${ext}`] },
    })
  }

  return types
}

export function mimeTypeForSave(fileName: string): string {
  const ext = getFileExtension(fileName)

  switch (ext) {
    case 'json':
      return 'application/json;charset=utf-8'
    case 'md':
    case 'markdown':
      return 'text/markdown;charset=utf-8'
    case 'html':
    case 'htm':
      return 'text/html;charset=utf-8'
    case 'bin':
      return 'application/octet-stream'
    default:
      return 'text/plain;charset=utf-8'
  }
}
