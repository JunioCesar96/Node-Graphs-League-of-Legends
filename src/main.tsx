import { StrictMode } from 'react'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { createRoot } from 'react-dom/client'

import '@/styles/global.css'

import App from './App.tsx'

/** Usa Monaco do `node_modules` em vez do CDN (@monaco-editor/react default) — evita falhas offline/CSP/extensões. */
loader.config({ monaco })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
