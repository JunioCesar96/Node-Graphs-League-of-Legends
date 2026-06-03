/**
 * Executa lol2gltf (Crauzer) — skn2gltf
 * https://github.com/Crauzer/lol2gltf
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'

const EXE_NAMES = ['lol2gltf.exe', 'lol2gltf.CLI.exe', 'lol2gltf']

export function safeBaseName(name) {
  const cleaned = String(name || 'model')
    .toLowerCase()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned.slice(0, 64) || 'model'
}

/** Nome do GLB a partir do campeão — sem prefixo gltf_. */
export function championToGltfBaseName(champion) {
  return safeBaseName(String(champion || 'model').trim())
}

function walkFindExe(dir, depth = 0) {
  if (depth > 4 || !fs.existsSync(dir)) return null
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isFile() && EXE_NAMES.includes(entry.name.toLowerCase())) {
      return full
    }
    if (entry.isDirectory()) {
      const inner = walkFindExe(full, depth + 1)
      if (inner) return inner
    }
  }
  return null
}

function resolveExecutable(projectRoot) {
  const envPath = process.env.LOL2GLTF_PATH
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, source: 'LOL2GLTF_PATH' }
  }

  const toolsRoot = path.join(projectRoot, 'tools', 'lol2gltf')
  if (fs.existsSync(toolsRoot)) {
    for (const name of EXE_NAMES) {
      const candidate = path.join(toolsRoot, name)
      if (fs.existsSync(candidate)) {
        return { path: candidate, source: `tools/lol2gltf/${name}` }
      }
    }
    const nested = walkFindExe(toolsRoot)
    if (nested) {
      return { path: nested, source: path.relative(projectRoot, nested) }
    }
  }

  return { path: null, source: null }
}

export function getStatus(projectRoot) {
  const resolved = resolveExecutable(projectRoot)
  const available = !!(resolved.path && fs.existsSync(resolved.path))
  return {
    available,
    path: resolved.path,
    source: resolved.source,
    installHint:
      'Baixe lol2gltf em https://github.com/Crauzer/lol2gltf/releases '
      + 'e extraia em tools/lol2gltf/ (lol2gltf.exe) ou defina LOL2GLTF_PATH.',
  }
}

function runProcess(exe, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(exe, args, {
      cwd: cwd || path.dirname(exe),
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else {
        const msg = (stderr || stdout || `Código de saída ${code}`).trim()
        reject(new Error(msg || `lol2gltf falhou (código ${code})`))
      }
    })
  })
}

function rmDirSafe(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * @param {object} opts
 * @param {string} opts.projectRoot
 * @param {string} opts.modelsDir
 * @param {Buffer} opts.sknBuffer
 * @param {string} opts.sknName
 * @param {Buffer} opts.sklBuffer
 * @param {string} opts.sklName
 * @param {Array<{name:string,buffer:Buffer}>} opts.anmFiles
 * @param {string} [opts.baseName]
 * @param {string} [opts.texturePath]
 * @param {string[]} [opts.materialNames]
 */
export async function convertSknToGlb(opts) {
  const {
    projectRoot,
    modelsDir,
    sknBuffer,
    sknName,
    sklBuffer,
    sklName,
    anmFiles = [],
  } = opts

  const exeInfo = resolveExecutable(projectRoot)
  if (!exeInfo.path || !fs.existsSync(exeInfo.path)) {
    const err = new Error('LOL2GLTF_NOT_FOUND')
    err.code = 'LOL2GLTF_NOT_FOUND'
    err.installHint = getStatus(projectRoot).installHint
    throw err
  }

  const baseName = opts.baseName ? safeBaseName(opts.baseName) : championToGltfBaseName(sknName)
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lol2gltf-'))

  try {
    const sknPath = path.join(tempDir, path.basename(sknName || 'model.skn'))
    const sklPath = path.join(tempDir, path.basename(sklName || 'model.skl'))
    const anmDir = path.join(tempDir, 'animations')
    fs.mkdirSync(anmDir, { recursive: true })

    fs.writeFileSync(sknPath, sknBuffer)
    fs.writeFileSync(sklPath, sklBuffer)

    anmFiles.forEach((f) => {
      const name = path.basename(f.name || 'anim.anm')
      fs.writeFileSync(path.join(anmDir, name), f.buffer)
    })

    fs.mkdirSync(modelsDir, { recursive: true })
    const outPath = path.join(modelsDir, `${baseName}.glb`)

    const args = ['skn2gltf', '-m', sknPath, '-s', sklPath, '-g', outPath]
    if (anmFiles.length > 0) {
      args.push('-a', anmDir)
    }
    if (opts.texturePath && fs.existsSync(opts.texturePath)) {
      const materials = opts.materialNames?.length ? opts.materialNames : ['Base']
      materials.forEach((name) => {
        args.push('--materials', name)
        args.push('--textures', opts.texturePath)
      })
    }

    await runProcess(exeInfo.path, args, tempDir)

    if (!fs.existsSync(outPath)) {
      throw new Error('lol2gltf não gerou o arquivo .glb.')
    }

    return {
      baseName,
      glbPath: outPath,
      glbRel: `character-gltf/${baseName}.glb`,
      animCount: anmFiles.length,
      tool: exeInfo.source,
    }
  } finally {
    rmDirSafe(tempDir)
  }
}
