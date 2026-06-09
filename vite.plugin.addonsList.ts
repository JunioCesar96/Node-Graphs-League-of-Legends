import type { Plugin } from 'vite'

import { handleAddonsListRequest } from './vite.addonsListHandler'
import {
  handleAddonsInstallAvailableRequest,
  handleAddonsInstallRequest,
} from './vite.addonsInstallHandler'
import { handleInputAddonsListRequest } from './vite.inputAddonsListHandler'
import {
  handleInputAddonsInstallAvailableRequest,
  handleInputAddonsInstallRequest,
} from './vite.inputAddonsInstallHandler'
import { normalizeApiPathname } from './vite.devApiPath'

export function vitePluginAddonsList(projectRoot: string): Plugin {
  return {
    name: 'node-graphs-addons-list',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = normalizeApiPathname(req.url)
        if (pathname === '/api/addons-list' && req.method === 'GET') {
          void handleAddonsListRequest(projectRoot, res)
          return
        }
        if (pathname === '/api/addons-install-available' && req.method === 'GET') {
          handleAddonsInstallAvailableRequest(res)
          return
        }
        if (pathname === '/api/addons-install' && req.method === 'POST') {
          void handleAddonsInstallRequest(projectRoot, req, res)
          return
        }
        if (pathname === '/api/input-addons-list' && req.method === 'GET') {
          void handleInputAddonsListRequest(projectRoot, res)
          return
        }
        if (pathname === '/api/input-addons-install-available' && req.method === 'GET') {
          handleInputAddonsInstallAvailableRequest(res)
          return
        }
        if (pathname === '/api/input-addons-install' && req.method === 'POST') {
          void handleInputAddonsInstallRequest(projectRoot, req, res)
          return
        }
        next()
      })
      console.log('[addons-list] GET /api/addons-list activo')
      console.log('[addons-install] POST /api/addons-install activo')
      console.log('[input-addons-list] GET /api/input-addons-list activo')
      console.log('[input-addons-install] POST /api/input-addons-install activo')
    },
  }
}
