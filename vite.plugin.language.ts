import fs from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Connect } from 'vite'
import type { Plugin } from 'vite'

import { normalizeApiPathname } from './vite.devApiPath'

const MANIFEST_FILE_NAME = 'manifest.json'
const LOCALE_ID_PATTERN = /^[\w-]+$/

function isLocaleJsonFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.json') && fileName.toLowerCase() !== MANIFEST_FILE_NAME
}

function localeIdFromFileName(fileName: string): string {
  return fileName.replace(/\.json$/i, '')
}

async function listLanguageLocales(languageDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(languageDir, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isFile() && isLocaleJsonFile(entry.name))
      .map((entry) => localeIdFromFileName(entry.name))
      .filter((locale) => LOCALE_ID_PATTERN.test(locale))
      .sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function createLanguageMiddleware(languageDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const pathname = normalizeApiPathname(req.url)

    if (pathname === '/api/language/locales' && req.method === 'GET') {
      void listLanguageLocales(languageDir).then((locales) => {
        sendJson(res, 200, { locales })
      })

      return
    }

    const packMatch = pathname.match(/^\/api\/language\/pack\/([^/]+)$/)

    if (packMatch && req.method === 'GET') {
      void serveLanguagePack(languageDir, decodeURIComponent(packMatch[1] ?? ''), res)

      return
    }

    next()
  }
}

async function serveLanguagePack(
  languageDir: string,
  locale: string,
  res: ServerResponse,
): Promise<void> {
  if (!LOCALE_ID_PATTERN.test(locale)) {
    sendJson(res, 400, { error: 'Invalid locale id' })

    return
  }

  const filePath = path.join(languageDir, `${locale}.json`)

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown

    sendJson(res, 200, parsed)
  } catch {
    sendJson(res, 404, { error: `Language pack not found: ${locale}` })
  }
}

async function syncLanguageDist(languageDir: string, outDir: string): Promise<void> {
  const targetDir = path.join(outDir, 'language')
  const locales = await listLanguageLocales(languageDir)

  await fs.mkdir(targetDir, { recursive: true })

  await fs.writeFile(
    path.join(targetDir, MANIFEST_FILE_NAME),
    `${JSON.stringify({ locales }, null, 2)}\n`,
    'utf8',
  )

  await Promise.all(
    locales.map(async (locale) => {
      const source = path.join(languageDir, `${locale}.json`)
      const target = path.join(targetDir, `${locale}.json`)

      await fs.copyFile(source, target)
    }),
  )
}

export function vitePluginLanguage(projectRoot: string): Plugin {
  const languageDir = path.resolve(projectRoot, 'language')

  return {
    name: 'vite-plugin-language',
    configureServer(server) {
      server.middlewares.use(createLanguageMiddleware(languageDir))
    },
    async closeBundle() {
      const outDir = path.resolve(projectRoot, 'dist')

      await syncLanguageDist(languageDir, outDir)
    },
  }
}
