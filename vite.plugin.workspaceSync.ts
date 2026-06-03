import fs from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Connect } from 'vite'
import type { Plugin } from 'vite'

import { normalizeApiPathname } from './vite.devApiPath'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer | string) => {
      body += typeof chunk === 'string' ? chunk : chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as unknown)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function createWorkspaceSyncMiddleware(projectRoot: string): Connect.NextHandleFunction {
  const workspaceDir = path.resolve(projectRoot, 'src', 'data', 'workspace')

  return (req, res, next) => {
    const pathname = normalizeApiPathname(req.url)

    if (pathname === '/api/load-workspace' && req.method === 'GET') {
      void handleLoadWorkspace(workspaceDir, res)
      return
    }

    if (pathname === '/api/save-workspace' && req.method === 'POST') {
      void handleSaveWorkspace(workspaceDir, req, res)
      return
    }

    next()
  }
}

async function handleLoadWorkspace(workspaceDir: string, res: ServerResponse): Promise<void> {
  try {
    const logicPath = path.join(workspaceDir, 'logic.json')
    const layoutPath = path.join(workspaceDir, 'layout.json')
    const graphPath = path.join(workspaceDir, 'graph.json')
    const blocksPath = path.join(workspaceDir, 'blocks.json')
    const groupsPath = path.join(workspaceDir, 'groups.json')

    const [hasLogic, hasLayout, hasGraph] = await Promise.all([
      fileExists(logicPath),
      fileExists(layoutPath),
      fileExists(graphPath),
    ])

    if (!hasLogic || !hasLayout || !hasGraph) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Workspace files not found' }))
      return
    }

    const [logicRaw, layoutRaw, graphRaw, blocksRaw, groupsRaw] = await Promise.all([
      fs.readFile(logicPath, 'utf8'),
      fs.readFile(layoutPath, 'utf8'),
      fs.readFile(graphPath, 'utf8'),
      fileExists(blocksPath).then((exists) =>
        exists ? fs.readFile(blocksPath, 'utf8') : Promise.resolve(''),
      ),
      fileExists(groupsPath).then((exists) =>
        exists ? fs.readFile(groupsPath, 'utf8') : Promise.resolve(''),
      ),
    ])

    const logic = JSON.parse(logicRaw) as unknown
    const layout = JSON.parse(layoutRaw) as unknown
    const graph = JSON.parse(graphRaw) as unknown
    const blocks =
      blocksRaw.trim().length > 0 ? (JSON.parse(blocksRaw) as unknown) : undefined
    const groups =
      groupsRaw.trim().length > 0 ? (JSON.parse(groupsRaw) as unknown) : undefined

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        logic,
        layout,
        graph,
        ...(blocks !== undefined ? { blocks } : {}),
        ...(groups !== undefined ? { groups } : {}),
      }),
    )
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to load workspace',
      }),
    )
  }
}

async function handleSaveWorkspace(
  workspaceDir: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const parsed = await readJsonBody(req)
    if (!isRecord(parsed)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      return
    }

    const { logic, layout, graph, blocks, groups } = parsed
    if (!isRecord(logic) || !isRecord(layout) || !isRecord(graph)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Missing logic, layout or graph' }))
      return
    }

    await fs.mkdir(workspaceDir, { recursive: true })

    const writeTasks = [
      fs.writeFile(
        path.join(workspaceDir, 'logic.json'),
        `${JSON.stringify(logic, null, 2)}\n`,
        'utf8',
      ),
      fs.writeFile(
        path.join(workspaceDir, 'layout.json'),
        `${JSON.stringify(layout, null, 2)}\n`,
        'utf8',
      ),
      fs.writeFile(
        path.join(workspaceDir, 'graph.json'),
        `${JSON.stringify(graph, null, 2)}\n`,
        'utf8',
      ),
    ]

    if (blocks !== undefined) {
      if (!isRecord(blocks)) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Invalid blocks payload' }))
        return
      }
      writeTasks.push(
        fs.writeFile(
          path.join(workspaceDir, 'blocks.json'),
          `${JSON.stringify(blocks, null, 2)}\n`,
          'utf8',
        ),
      )
    }

    if (groups !== undefined) {
      if (!isRecord(groups)) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Invalid groups payload' }))
        return
      }
      writeTasks.push(
        fs.writeFile(
          path.join(workspaceDir, 'groups.json'),
          `${JSON.stringify(groups, null, 2)}\n`,
          'utf8',
        ),
      )
    }

    await Promise.all(writeTasks)

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Disk Sync OK')
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to save workspace',
      }),
    )
  }
}

/**
 * Em `npm run dev`:
 * - GET `/api/load-workspace` — lê logic.json, layout.json, graph.json e blocks.json (opcional)
 * - POST `/api/save-workspace` — grava o bundle em `src/data/workspace/`
 */
export function vitePluginWorkspaceSync(projectRoot: string): Plugin {
  return {
    name: 'workspace-sync-plugin',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(createWorkspaceSyncMiddleware(projectRoot))
      console.log(
        '[workspace-sync] API /api/load-workspace e /api/save-workspace activas',
      )
    },
  }
}
