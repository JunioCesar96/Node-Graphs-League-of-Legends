import type { Plugin } from 'vite'

import {
  handleGalleryFileRequest,
  handleGalleryNativeAvailableRequest,
  handleGalleryPickFolderBaseRequest,
  handleGalleryPickFolderRequest,
  handleGalleryScanDirectoryRequest,
} from './vite.galleryFolderHandler'
import { normalizeApiPathname } from './vite.devApiPath'

export function vitePluginGalleryFolder(): Plugin {
  return {
    name: 'node-graphs-gallery-folder',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = normalizeApiPathname(req.url)

        if (pathname === '/api/gallery-native-available' && req.method === 'GET') {
          handleGalleryNativeAvailableRequest(res)
          return
        }

        if (pathname === '/api/gallery-pick-folder-base' && req.method === 'POST') {
          void handleGalleryPickFolderBaseRequest(res)
          return
        }

        if (pathname === '/api/gallery-pick-folder' && req.method === 'POST') {
          void handleGalleryPickFolderRequest(res)
          return
        }

        if (pathname === '/api/gallery-scan-directory' && req.method === 'POST') {
          void handleGalleryScanDirectoryRequest(req, res)
          return
        }

        if (pathname === '/api/gallery-file' && req.method === 'GET') {
          const query = req.url?.split('?')[1] ?? ''
          const filePath = new URLSearchParams(query).get('path')
          void handleGalleryFileRequest(filePath, res)
          return
        }

        next()
      })
      console.log('[gallery-folder] POST /api/gallery-pick-folder e GET /api/gallery-file activos')
    },
  }
}
