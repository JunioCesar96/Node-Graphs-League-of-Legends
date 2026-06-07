import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/global.css'

import { initAppThemeSync } from '@/core/appTheme'
import App from './App.tsx'
import { registerCompositePreferenceBackend } from './jade/compositePreferenceBackend.ts'
import { registerWebPreferenceBackend } from './jade/webPreferenceBackend.ts'
import { LanguageProvider } from './language/LanguageProvider.tsx'
import { MessengerPopupProvider } from './messenger_popup/MessengerPopupProvider.tsx'
import { RitualDragProvider } from './ritualDrag/RitualDragContext.tsx'
import { ShortcutScopeProvider } from './shortcuts/ShortcutScopeProvider.tsx'

registerWebPreferenceBackend()
registerCompositePreferenceBackend()

initAppThemeSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <MessengerPopupProvider>
        <ShortcutScopeProvider>
          <RitualDragProvider>
            <App />
          </RitualDragProvider>
        </ShortcutScopeProvider>
      </MessengerPopupProvider>
    </LanguageProvider>
  </StrictMode>,
)
