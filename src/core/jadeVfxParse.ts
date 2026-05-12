/**
 * Parser VFX alinhado ao Particle Editor do Jade (`ParticleEditorPanel.tsx`):
 * sistemas `VfxSystemDefinitionData` e emitters `VfxEmitterDefinitionData` com os
 * mesmos campos expostos no painel (birthScale0, scale0, translationOverride, …).
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface VfxProperty<T> {
  constantValue: T
  startLine: number
  endLine: number
}

export interface VfxEmitter {
  name: string
  globalStartLine: number
  globalEndLine: number
  birthScale0?: VfxProperty<Vec3>
  scale0?: VfxProperty<Vec3>
  translationOverride?: VfxProperty<Vec3>
  bindWeight?: VfxProperty<number>
  particleLifetime?: VfxProperty<number>
  particleLinger?: VfxProperty<number>
  rate?: VfxProperty<number>
}

export interface VfxSystem {
  name: string
  displayName: string
  emitters: VfxEmitter[]
}

export interface ParsedVfxData {
  systems: Record<string, VfxSystem>
  systemOrder: string[]
}

export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

// Count brackets in a line, ignoring those inside strings
function countBrackets(line: string): { opens: number; closes: number } {
  let opens = 0
  let closes = 0
  let inString = false
  let stringChar: string | null = null

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!
    const prevChar = i > 0 ? line[i - 1]! : ''

    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = null
      }
    }

    if (!inString) {
      if (char === '{') {
        opens += 1
      }
      if (char === '}') {
        closes += 1
      }
    }
  }

  return { opens, closes }
}

// Find the end of a block starting at startLine
function findBlockEnd(lines: string[], startLine: number): number {
  let bracketDepth = 0
  let foundFirstBracket = false

  for (let i = startLine; i < lines.length; i += 1) {
    const line = lines[i]!
    const { opens, closes } = countBrackets(line)

    bracketDepth += opens - closes

    if (opens > 0) {
      foundFirstBracket = true
    }

    if (foundFirstBracket && bracketDepth === 0) {
      return i
    }

    if (i - startLine > 10_000) {
      return i
    }
  }

  return lines.length - 1
}

function getShortName(fullPath: string): string {
  if (!fullPath) {
    return 'Unknown'
  }

  const parts = fullPath.split('/')
  let name = parts[parts.length - 1] ?? fullPath

  name = name.replace(/^[A-Z][a-z]+_(Base_|Skin\d+_)/i, '')

  if (name.length > 35) {
    name = `${name.substring(0, 32)}...`
  }

  return name
}

function parseEmitter(content: string, globalOffset: number): VfxEmitter {
  const lines = content.split('\n')

  let name = 'Unnamed'
  const nameMatch = content.match(/emitterName:\s*string\s*=\s*"([^"]+)"/i)
  if (nameMatch?.[1]) {
    name = nameMatch[1]
  }

  const emitter: VfxEmitter = {
    name,
    globalStartLine: globalOffset,
    globalEndLine: globalOffset,
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/birthScale0:\s*embed\s*=\s*ValueVector3\s*\{/i.test(lines[i]!)) {
      const blockEnd = findBlockEnd(lines, i)
      const blockContent = lines.slice(i, blockEnd + 1).join('\n')
      const constMatch = blockContent.match(/constantValue:\s*vec3\s*=\s*\{\s*([^}]+)\}/i)
      if (constMatch?.[1]) {
        const values = constMatch[1].split(',').map((v) => parseFloat(v.trim()))
        if (values.length >= 3 && values.every((n) => !Number.isNaN(n))) {
          emitter.birthScale0 = {
            constantValue: { x: values[0]!, y: values[1]!, z: values[2]! },
            startLine: globalOffset + i,
            endLine: globalOffset + blockEnd,
          }
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (
      /^\s*scale0:\s*embed\s*=\s*ValueVector3\s*\{/i.test(lines[i]!) &&
      !/birthScale0/i.test(lines[i]!)
    ) {
      const blockEnd = findBlockEnd(lines, i)
      const blockContent = lines.slice(i, blockEnd + 1).join('\n')
      const constMatch = blockContent.match(/constantValue:\s*vec3\s*=\s*\{\s*([^}]+)\}/i)
      if (constMatch?.[1]) {
        const values = constMatch[1].split(',').map((v) => parseFloat(v.trim()))
        if (values.length >= 3 && values.every((n) => !Number.isNaN(n))) {
          emitter.scale0 = {
            constantValue: { x: values[0]!, y: values[1]!, z: values[2]! },
            startLine: globalOffset + i,
            endLine: globalOffset + blockEnd,
          }
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i]!.match(/translationOverride:\s*vec3\s*=\s*\{\s*([^}]+)\}/i)
    if (match?.[1]) {
      const values = match[1].split(',').map((v) => parseFloat(v.trim()))
      if (values.length >= 3 && values.every((n) => !Number.isNaN(n))) {
        emitter.translationOverride = {
          constantValue: { x: values[0]!, y: values[1]!, z: values[2]! },
          startLine: globalOffset + i,
          endLine: globalOffset + i,
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/bindWeight:\s*embed\s*=\s*ValueFloat\s*\{/i.test(lines[i]!)) {
      const blockEnd = findBlockEnd(lines, i)
      const blockContent = lines.slice(i, blockEnd + 1).join('\n')
      const constMatch = blockContent.match(/constantValue:\s*f32\s*=\s*(-?[\d.]+)/i)
      if (constMatch?.[1]) {
        const v = parseFloat(constMatch[1])
        if (!Number.isNaN(v)) {
          emitter.bindWeight = {
            constantValue: v,
            startLine: globalOffset + i,
            endLine: globalOffset + blockEnd,
          }
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/particleLifetime:\s*embed\s*=\s*ValueFloat\s*\{/i.test(lines[i]!)) {
      const blockEnd = findBlockEnd(lines, i)
      const blockContent = lines.slice(i, blockEnd + 1).join('\n')
      const constMatch = blockContent.match(/constantValue:\s*f32\s*=\s*(-?[\d.]+)/i)
      if (constMatch?.[1]) {
        const v = parseFloat(constMatch[1])
        if (!Number.isNaN(v)) {
          emitter.particleLifetime = {
            constantValue: v,
            startLine: globalOffset + i,
            endLine: globalOffset + blockEnd,
          }
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i]!.match(/particleLinger:\s*option\[f32\]\s*=\s*\{\s*([\d.\-]+)\s*\}/i)
    if (match?.[1]) {
      const v = parseFloat(match[1])
      if (!Number.isNaN(v)) {
        emitter.particleLinger = {
          constantValue: v,
          startLine: globalOffset + i,
          endLine: globalOffset + i,
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*rate:\s*embed\s*=\s*ValueFloat\s*\{/i.test(lines[i]!) && !/birthRate/i.test(lines[i]!)) {
      const blockEnd = findBlockEnd(lines, i)
      const blockContent = lines.slice(i, blockEnd + 1).join('\n')
      const constMatch = blockContent.match(/constantValue:\s*f32\s*=\s*(-?[\d.]+)/i)
      if (constMatch?.[1]) {
        const v = parseFloat(constMatch[1])
        if (!Number.isNaN(v)) {
          emitter.rate = {
            constantValue: v,
            startLine: globalOffset + i,
            endLine: globalOffset + blockEnd,
          }
        }
      }
      break
    }
  }

  return emitter
}

export function parseVfxContent(content: string): ParsedVfxData {
  const systems: Record<string, VfxSystem> = {}
  const systemOrder: string[] = []

  if (!content) {
    return { systems, systemOrder }
  }

  const normalizedContent = normalizeLineEndings(content)
  const lines = normalizedContent.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    const systemMatch = line.match(/^\s*"?([^"=]+)"?\s*=\s*VfxSystemDefinitionData\s*\{/)

    if (systemMatch?.[1]) {
      const systemName = systemMatch[1].trim().replace(/"/g, '')
      const startLine = i
      const endLine = findBlockEnd(lines, i)

      const systemLines = lines.slice(startLine, endLine + 1)
      const systemContent = systemLines.join('\n')

      let displayName = getShortName(systemName)
      const particleNameMatch = systemContent.match(/particleName:\s*string\s*=\s*"([^"]+)"/i)
      if (particleNameMatch?.[1]) {
        displayName = particleNameMatch[1]
      }

      const system: VfxSystem = {
        name: systemName,
        displayName,
        emitters: [],
      }

      for (let j = 0; j < systemLines.length; j += 1) {
        if (/VfxEmitterDefinitionData\s*\{/.test(systemLines[j]!)) {
          const emitterStartLine = j
          const emitterEndLine = findBlockEnd(systemLines, j)

          const emitterLines = systemLines.slice(emitterStartLine, emitterEndLine + 1)
          const emitterContent = emitterLines.join('\n')

          const emitter = parseEmitter(emitterContent, startLine + emitterStartLine + 1)
          emitter.globalStartLine = startLine + emitterStartLine + 1
          emitter.globalEndLine = startLine + emitterEndLine + 1

          system.emitters.push(emitter)

          j = emitterEndLine
        }
      }

      systems[systemName] = system
      systemOrder.push(systemName)

      i = endLine
    }
  }

  return { systems, systemOrder }
}
