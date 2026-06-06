import { describe, expect, it } from 'vitest'

import { GRAPH_SNAP_ACTIONS } from '@/core/graphSnapMenu/graphSnapActions'
import {
  GRAPH_SNAP_ACTION_LANG,
  GRAPH_NAVIGATION_MENU_TITLE,
  listGraphSnapActionLangIds,
} from '@/core/language/graphSnapMenuLangIds'
import { LangId } from '@/core/language/languageIds'
import ptBr from '../../../language/pt-br.json'
import en from '../../../language/en.json'

describe('graphSnapMenuLangIds', () => {
  it('mapeia todas as acções Snap para LangId', () => {
    for (const entry of GRAPH_SNAP_ACTIONS) {
      expect(GRAPH_SNAP_ACTION_LANG[entry.action]?.langId).toBeTypeOf('number')
    }

    expect(listGraphSnapActionLangIds()).toHaveLength(GRAPH_SNAP_ACTIONS.length)
  })

  it('tem texto em pt-br e en para o título e acções do menu Snap', () => {
    const ids = [GRAPH_NAVIGATION_MENU_TITLE.langId, ...listGraphSnapActionLangIds()]

    for (const id of ids) {
      const key = String(id)

      expect((ptBr as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0)
      expect((en as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0)
    }

    expect(GRAPH_NAVIGATION_MENU_TITLE.langId).toBe(LangId.GraphSnapMenuTitle)
  })
})
