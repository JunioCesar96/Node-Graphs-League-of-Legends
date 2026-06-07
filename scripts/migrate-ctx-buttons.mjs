import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')

const hover = `color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
  border-color: var(--ctx-menu-hover-bg, #007acc);`

const dangerHover = `color: #fff;
  background: rgb(180 40 40 / 88%);
  border-color: rgb(180 40 40 / 88%);`

function patch(rel, fn) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) {
    console.warn('skip', rel)
    return
  }
  const before = fs.readFileSync(file, 'utf8')
  const after = fn(before)
  if (before !== after) {
    fs.writeFileSync(file, after)
    console.log('updated', rel)
  }
}

const compactBtn = {
  border: 'border: 1px solid var(--ctx-menu-border, #454545);',
  radius: 'border-radius: var(--ctx-menu-radius, 4px);',
  font: 'font: inherit;\n  font-size: var(--ctx-menu-shortcut-font-size, 11.5px);',
}

// --- Atoms & shared ---
patch('components/atoms/Button.module.css', () => `.button {
  width: 100%;
  padding: var(--ctx-menu-item-padding-block, 5px) var(--ctx-menu-item-padding-inline, 20px);
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  font: inherit;
  font-size: var(--ctx-menu-font-size, 12.5px);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--ctx-menu-border, #454545);
  border-radius: var(--ctx-menu-radius, 4px);
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}

.button:hover:not(:disabled) {
  ${hover}
}

.button:focus-visible {
  outline: 2px solid var(--ctx-menu-hover-bg, #007acc);
  outline-offset: 2px;
}
`)

patch('components/atoms/StructureViewToggle.module.css', () => `.toggle {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--ctx-menu-border, #454545);
  border-radius: var(--ctx-menu-radius, 4px);
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}

.toggle:hover:not(:disabled) {
  ${hover}
}

.toggle[aria-pressed='true'] {
  ${hover}
}

.icon {
  width: 0.95rem;
  height: 0.95rem;
}
`)

patch('components/molecules/OutputSlotPeerToolbar.module.css', (c) =>
  c
    .replace(
      /\.action \{[\s\S]*?opacity: 0\.82;\n\}/,
      `.action {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--ctx-menu-border, #454545);
  border-radius: var(--ctx-menu-radius, 4px);
  opacity: 0.85;
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease, opacity 100ms ease;
}`,
    )
    .replace(
      /\.action:hover \{[\s\S]*?opacity: 1;\n\}/,
      `.action:hover:not(:disabled) {
  ${hover}
  opacity: 1;
}`,
    )
    .replace(
      /\.actionActive \{[\s\S]*?opacity: 1;\n\}/,
      `.actionActive {
  ${hover.replace(/\n/g, '\n  ')}
  opacity: 1;
}`,
    )
    .replace(
      /\.actionDanger:hover \{[\s\S]*?border-color: rgb\(200 80 90 \/ 35%\);\n\}/,
      `.actionDanger:hover:not(:disabled) {
  ${dangerHover}
}`,
    ),
)

function patchTabBar(c) {
  return c
    .replace(/\.tab:hover \{[\s\S]*?\}/, `.tab:hover {
  color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
  border-color: var(--ctx-menu-hover-bg, #007acc);
}`)
    .replace(
      /\.tabActive \{[\s\S]*?border-bottom-color: transparent;\n\}/,
      `.tabActive {
  color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
  border-color: var(--ctx-menu-hover-bg, #007acc);
  border-bottom-color: var(--ctx-menu-hover-bg, #007acc);
}`,
    )
    .replace(
      /\.tabClose:hover \{[\s\S]*?\}/,
      `.tabClose:hover {
  opacity: 1;
  color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
}`,
    )
    .replace(
      /\.newTab:hover \{[\s\S]*?border-color: color-mix\(in srgb, var\(--color-text-primary\) 25%, transparent\);\n\}/,
      `.newTab:hover {
  color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
  border-color: var(--ctx-menu-hover-bg, #007acc);
  border-style: solid;
}`,
    )
}

patch('components/molecules/SceneTabBar.module.css', patchTabBar)
patch('components/molecules/CodeDockTabBar.module.css', patchTabBar)

patch('components/organisms/GraphCanvas.module.css', (c) =>
  c
    .replace(
      /\.controls button \{[\s\S]*?border-radius: 999px;\n\}/,
      `.controls button {
  min-width: 26px;
  height: 26px;
  padding: 0 var(--space-2);
  color: var(--ctx-menu-fg, var(--color-text-primary));
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--ctx-menu-border, #454545);
  border-radius: var(--ctx-menu-radius, 4px);
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.controls button:hover \{[\s\S]*?border-color: var\(--port-child\);\n\}/,
      `.controls button:hover:not(:disabled) {
  ${hover}
}`,
    )
    .replace(
      /\.controls button:focus-visible \{[\s\S]*?outline-offset: 2px;\n\}/,
      `.controls button:focus-visible {
  outline: 2px solid var(--ctx-menu-hover-bg, #007acc);
  outline-offset: 2px;
}`,
    )
    .replace(
      /\.controls \.primaryControl \{[\s\S]*?background: var\(--port-child\);\n\}/,
      `.controls .primaryControl {
  color: var(--ctx-menu-hover-fg, #fff);
  font-weight: 600;
  background: var(--ctx-menu-hover-bg, #007acc);
  border-color: var(--ctx-menu-hover-bg, #007acc);
}`,
    )
    .replace(
      /\.controls \.primaryControl:hover \{[\s\S]*?border-color: var\(--port-child\);\n\}/,
      `.controls .primaryControl:hover:not(:disabled) {
  filter: brightness(1.08);
}`,
    )
    .replace(
      /\.controls \.dangerControl:hover \{[\s\S]*?border-color: rgb\(255 180 171 \/ 58%\);\n\}/,
      `.controls .dangerControl:hover:not(:disabled) {
  ${dangerHover}
}`,
    ),
)

patch('components/organisms/CodeDock.module.css', (c) =>
  c
    .replace(
      /\.headerGhostButton \{[\s\S]*?border-radius: 8px;\n\}/,
      `.headerGhostButton {
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  ${compactBtn.font}
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.headerGhostButton:hover \{[\s\S]*?\}/,
      `.headerGhostButton:hover:not(:disabled) {
  ${hover}
}`,
    )
    .replace(
      /\.jadeEditorBannerAction \{[\s\S]*?border-radius: 6px;\n\}/,
      `.jadeEditorBannerAction {
  flex-shrink: 0;
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  color: inherit;
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.jadeEditorBannerAction:hover \{[\s\S]*?\}/,
      `.jadeEditorBannerAction:hover:not(:disabled) {
  ${hover}
}`,
    )
    .replace(
      /\.converterMenuItem \{[\s\S]*?border-radius: 6px;\n\}/,
      `.converterMenuItem {
  display: flex;
  width: 100%;
  margin: 0;
  padding: var(--ctx-menu-item-padding-block, 5px) var(--ctx-menu-item-padding-inline, 20px);
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  ${compactBtn.font}
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  transition: color 100ms ease, background 100ms ease;
}`,
    )
    .replace(
      /\.converterMenuItem:hover \{[\s\S]*?\}/,
      `.converterMenuItem:hover:not(:disabled) {
  ${hover}
}`,
    )
    .replace(
      /\.converterMenuItemDanger:hover \{[\s\S]*?\}/,
      `.converterMenuItemDanger:hover:not(:disabled) {
  ${dangerHover}
}`,
    )
    .replace(
      /\.dialogDanger \{[\s\S]*?border-radius: 8px;\n\}/,
      `.dialogDanger {
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: rgb(255 140 140);
  ${compactBtn.font}
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.dialogDanger:hover:not\(:disabled\) \{[\s\S]*?\}/,
      `.dialogDanger:hover:not(:disabled) {
  ${dangerHover}
}`,
    )
    .replace(
      /\.close \{[\s\S]*?border-radius: 8px;\n\}/,
      `.close {
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    ),
)

// BlockCardParameterMenu
patch('components/molecules/BlockCardParameterMenu.module.css', (c) =>
  c
    .replace(
      /\.iconButton \{[\s\S]*?color 140ms ease;\n\}/,
      `.iconButton {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--block-text));
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.iconButton:hover:not\(:disabled\) \{[\s\S]*?color: #fff;\n\}/,
      `.iconButton:hover:not(:disabled) {
  ${hover}
}`,
    )
    .replace(
      /\.iconButtonActive \{[\s\S]*?color: var\(--syntax-property, #64b5f6\);\n\}/,
      `.iconButtonActive {
  ${hover.replace(/\n/g, '\n  ')}
}`,
    )
    .replace(
      /\.listItem \{[\s\S]*?cursor: pointer;\n\}/,
      `.listItem {
  padding: var(--ctx-menu-item-padding-block, 5px) var(--ctx-menu-item-padding-inline, 20px);
  color: var(--ctx-menu-fg, var(--block-text));
  ${compactBtn.font}
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  transition: color 100ms ease, background 100ms ease;
}`,
    )
    .replace(/\.listItem:hover \{[\s\S]*?\}/, `.listItem:hover {
  ${hover}
}`)
    .replace(
      /\.confirmButton \{[\s\S]*?cursor: pointer;\n\}/,
      `.confirmButton {
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-fg, var(--block-text));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.confirmButtonDanger \{[\s\S]*?color: #f8b4b4;\n\}/,
      `.confirmButtonDanger {
  color: rgb(255 140 140);
}`,
    ),
)

patch('components/molecules/StructureIndexPager.module.css', (c) =>
  c
    .replace(
      /\.navButton \{[\s\S]*?border-radius: var\(--radius-control\);\n\}/,
      `.navButton {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  font: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.navButton:hover:not\(:disabled\) \{[\s\S]*?\}/,
      `.navButton:hover:not(:disabled) {
  ${hover}
}`,
    )
    .replace(
      /\.counter:hover \{[\s\S]*?\}/,
      `.counter:hover {
  ${hover}
}`,
    ),
)

patch('components/molecules/StructureListPanel.module.css', (c) =>
  c
    .replace(
      /\.toolButton \{[\s\S]*?border-radius: 3px;\n\}/,
      `.toolButton {
  display: flex;
  width: calc(var(--group-block-field-min-height) - 4px);
  height: calc(var(--group-block-field-min-height) - 4px);
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  font: inherit;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(
      /\.toolButton:hover:not\(:disabled\) \{[\s\S]*?\}/,
      `.toolButton:hover:not(:disabled) {
  ${hover}
}`,
    ),
)

patch('messenger_popup/MessengerPopup.module.css', (c) =>
  c
    .replace(
      /\.button \{[\s\S]*?border-radius: 999px;\n\}/,
      `.button {
  min-width: 6rem;
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
    )
    .replace(/\.button:hover \{[\s\S]*?\}/, `.button:hover:not(:disabled) {
  ${hover}
}`)
    .replace(
      /\.buttonPrimary \{[\s\S]*?border-radius: 999px;\n\}/,
      `.buttonPrimary {
  min-width: 6rem;
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-hover-fg, #fff);
  ${compactBtn.font}
  font-weight: 600;
  cursor: pointer;
  background: var(--ctx-menu-hover-bg, #007acc);
  border: 1px solid var(--ctx-menu-hover-bg, #007acc);
  ${compactBtn.radius}
  transition: filter 100ms ease;
}`,
    )
    .replace(/\.buttonPrimary:hover \{[\s\S]*?\}/, `.buttonPrimary:hover:not(:disabled) {
  filter: brightness(1.08);
}`),
)

patch('components/molecules/NewCodeFileDialog.module.css', (c) =>
  c.replace(
    /\.quickBtn \{[\s\S]*?border-radius: 6px;\n\}/,
    `.quickBtn {
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`,
  ).replace(/\.quickBtn:hover \{[\s\S]*?\}/, `.quickBtn:hover:not(:disabled) {
  ${hover}
}`).replace(
    /\.quickBtnActive \{[\s\S]*?border-color: rgb\(90 150 210 \/ 45%\);\n\}/,
    `.quickBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`,
  ),
)

// Vfx button helpers
function vfxBtnBlock(selectors, extra = '') {
  return `${selectors} {
  ${compactBtn.font}
  color: var(--ctx-menu-fg, var(--color-text-primary));
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
  ${extra}
}

${selectors.replace(/\{[\s\S]*$/, '').trim()}:hover:not(:disabled) {
  ${hover}
}`
}

patch('components/molecules/VfxToolsVerticalMenu.module.css', (c) =>
  c
    .replace(/\.toolsToggle:hover \{[\s\S]*?\}/, `.toolsToggle:hover {
  color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
}`)
    .replace(
      /\.toolBtn \{[\s\S]*?transition:[\s\S]*?\}/,
      `.toolBtn {
  display: flex;
  gap: 8px;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  ${compactBtn.font}
  color: var(--ctx-menu-fg, var(--vfx-text-strong));
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  transition: color 100ms ease, background 100ms ease;
}`,
    )
    .replace(/\.toolBtn:hover \{[\s\S]*?\}/, `.toolBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.toolBtnActive \{[\s\S]*?\}/, `.toolBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`),
)

patch('components/molecules/VfxScene3dVerticalMenu.module.css', (c) =>
  fs.readFileSync(path.join(root, 'components/molecules/VfxToolsVerticalMenu.module.css'), 'utf8').includes('--ctx-menu-')
    ? c // will patch separately same as tools
    : c,
)

// Copy VfxTools patches to VfxScene3d - read and apply same replacements
const vfxToolsContent = fs.existsSync(path.join(root, 'components/molecules/VfxScene3dVerticalMenu.module.css'))
  ? fs.readFileSync(path.join(root, 'components/molecules/VfxScene3dVerticalMenu.module.css'), 'utf8')
  : ''
if (vfxToolsContent && !vfxToolsContent.includes('--ctx-menu-')) {
  patch('components/molecules/VfxScene3dVerticalMenu.module.css', (c) =>
    c
      .replace(/\.toolsToggle:hover \{[\s\S]*?\}/, `.toolsToggle:hover {
  background: var(--ctx-menu-hover-bg, #007acc);
}`)
      .replace(/\.toolBtn:hover \{[\s\S]*?\}/, `.toolBtn:hover:not(:disabled) {
  ${hover}
}`)
      .replace(/\.toolBtnActive \{[\s\S]*?\}/, `.toolBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`),
  )
}

function patchVfxTransport(c) {
  const btn = (sel, activeSel = null) => {
    let out = c
    const re = new RegExp(`\\\\${sel.replace('.', '\\.')} \\\\{[\\\\s\\\\S]*?\\\\}`)
    // manual per selector below
    return out
  }
  return c
    .replace(/\.transportBtn \{[\s\S]*?\}/, `.transportBtn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`)
    .replace(/\.transportBtn:hover \{[\s\S]*?\}/, `.transportBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.transportBtnActive \{[\s\S]*?\}/, `.transportBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`)
    .replace(/\.timeCurrentBtn \{[\s\S]*?\}/, `.timeCurrentBtn {
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`)
    .replace(/\.timeCurrentBtn:hover \{[\s\S]*?\}/, `.timeCurrentBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.layerSortBtn \{[\s\S]*?\}/, `.layerSortBtn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-muted));
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ctx-menu-radius, 4px);
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`)
    .replace(/\.layerSortBtn:hover \{[\s\S]*?\}/, `.layerSortBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.layerSortBtnActive \{[\s\S]*?\}/, `.layerSortBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`)
    .replace(/\.layerNameBtn \{[\s\S]*?\}/, `.layerNameBtn {
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 0;
  transition: color 100ms ease, background 100ms ease;
}`)
    .replace(/\.layerNameBtn:hover \{[\s\S]*?\}/, `.layerNameBtn:hover:not(:disabled) {
  ${hover}
}`)
}

patch('components/organisms/VfxDockTimeline.module.css', patchVfxTransport)

patch('components/molecules/VfxEffectTabsBar.module.css', (c) =>
  c
    .replace(/\.sortBtn \{[\s\S]*?\}/, `.sortBtn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-muted));
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`)
    .replace(/\.sortBtn:hover \{[\s\S]*?\}/, `.sortBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.sortBtnActive \{[\s\S]*?\}/, `.sortBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`)
    .replace(/\.tab:hover \{[\s\S]*?\}/, `.tab:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.tabActive \{[\s\S]*?\}/, `.tabActive {
  ${hover.replace(/\n/g, '\n  ')}
}`),
)

patch('components/molecules/VfxTimelineTimeControls.module.css', (c) =>
  c.replace(/\.valueBtn \{[\s\S]*?\}/, `.valueBtn {
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`).replace(/\.valueBtn:hover \{[\s\S]*?\}/, `.valueBtn:hover:not(:disabled) {
  ${hover}
}`),
)

patch('components/organisms/VfxDockInspector.module.css', (c) =>
  c
    .replace(/\.vertTab:hover \{[\s\S]*?\}/, `.vertTab:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.collapseBtn:hover \{[\s\S]*?\}/, `.collapseBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.assetsBtn \{[\s\S]*?\}/, `.assetsBtn {
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-hover-fg, #fff);
  ${compactBtn.font}
  font-weight: 600;
  cursor: pointer;
  background: var(--ctx-menu-hover-bg, #007acc);
  border: 1px solid var(--ctx-menu-hover-bg, #007acc);
  ${compactBtn.radius}
  transition: filter 100ms ease, opacity 100ms ease;
}`)
    .replace(/\.assetsBtnSecondary \{[\s\S]*?\}/, `.assetsBtnSecondary {
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`)
    .replace(/\.assetsBtnSecondary:hover:not\(:disabled\) \{[\s\S]*?\}/, `.assetsBtnSecondary:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.assetsBtn:hover:not\(:disabled\) \{[\s\S]*?\}/, `.assetsBtn:hover:not(:disabled) {
  filter: brightness(1.08);
}`),
)

patch('components/organisms/VfxCharacterPanel.module.css', (c) =>
  c
    .replace(/\.championBtn:hover \{[\s\S]*?\}/, `.championBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.poseToggleBtn:hover \{[\s\S]*?\}/, `.poseToggleBtn:hover:not(:disabled) {
  ${hover}
}`)
    .replace(/\.poseToggleBtnActive \{[\s\S]*?\}/, `.poseToggleBtnActive {
  ${hover.replace(/\n/g, '\n  ')}
}`),
)

patch('components/molecules/VfxContextToolRow.module.css', (c) =>
  c.replace(/\.expandBtn \{[\s\S]*?\}/, `.expandBtn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`).replace(/\.expandBtn:hover \{[\s\S]*?\}/, `.expandBtn:hover:not(:disabled) {
  ${hover}
}`),
)

patch('components/molecules/VfxAxisWorldContextMenu.module.css', (c) =>
  c.replace(/\.resetButton \{[\s\S]*?\}/, `.resetButton {
  margin-top: 0.25rem;
  padding: var(--ctx-menu-item-padding-block, 5px) 12px;
  color: var(--ctx-menu-fg, var(--color-text-primary));
  ${compactBtn.font}
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`).replace(/\.resetButton:hover \{[\s\S]*?\}/, `.resetButton:hover:not(:disabled) {
  ${hover}
}`),
)

patch('components/molecules/Mtx44Picker.module.css', (c) =>
  c.replace(/\.resetBtn \{[\s\S]*?\}/, `.resetBtn {
  padding: var(--ctx-menu-item-padding-block, 5px) 8px;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`).replace(/\.resetBtn:hover \{[\s\S]*?\}/, `.resetBtn:hover:not(:disabled) {
  ${hover}
}`),
)

patch('components/molecules/Mtx44AxisRow.module.css', (c) =>
  c.replace(/\.stepBtn \{[\s\S]*?\}/, `.stepBtn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  ${compactBtn.font}
  cursor: pointer;
  background: transparent;
  ${compactBtn.border}
  ${compactBtn.radius}
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}`).replace(/\.stepBtn:hover \{[\s\S]*?\}/, `.stepBtn:hover:not(:disabled) {
  ${hover}
}`),
)

patch('components/molecules/VfxCollapsiblePanel.module.css', (c) =>
  c.replace(/\.head:hover \{[\s\S]*?\}/, `.head:hover:not(:disabled) {
  ${hover}
}`),
)

console.log('migration complete')

const addRemoveFiles = [
  'components/molecules/EmbedItem.module.css',
  'components/molecules/ListEmbedItem.module.css',
  'components/molecules/ListPointerItem.module.css',
  'components/molecules/MapHashStructureBlock.module.css',
  'components/molecules/MapHashPointerBlock.module.css',
  'components/molecules/PointerItem.module.css',
]

const addRemoveOld = `.addButton,
.removeButton {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-control);
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background 160ms ease;
}

.addButton:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: rgb(255 255 255 / 4%);
  border-color: var(--port-child);
}

.removeButton:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: rgb(255 80 80 / 8%);
  border-color: rgb(255 120 120 / 45%);
}

.addButton:disabled,
.removeButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.addButton:focus-visible {
  outline: 2px solid var(--port-child);
  outline-offset: 2px;
}

.removeButton:focus-visible {
  outline: 2px solid rgb(255 120 120 / 55%);
  outline-offset: 2px;
}`

const addRemoveNew = `.addButton,
.removeButton {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--ctx-menu-fg, var(--color-text-secondary));
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--ctx-menu-border, #454545);
  border-radius: var(--ctx-menu-radius, 4px);
  transition: color 100ms ease, background 100ms ease, border-color 100ms ease;
}

.addButton:hover:not(:disabled) {
  color: var(--ctx-menu-hover-fg, #fff);
  background: var(--ctx-menu-hover-bg, #007acc);
  border-color: var(--ctx-menu-hover-bg, #007acc);
}

.removeButton:hover:not(:disabled) {
  color: #fff;
  background: rgb(180 40 40 / 88%);
  border-color: rgb(180 40 40 / 88%);
}

.addButton:disabled,
.removeButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.addButton:focus-visible,
.removeButton:focus-visible {
  outline: 2px solid var(--ctx-menu-hover-bg, #007acc);
  outline-offset: 2px;
}`

for (const rel of addRemoveFiles) {
  patch(rel, (c) => (c.includes(addRemoveOld) ? c.replace(addRemoveOld, addRemoveNew) : c))
}

console.log('add/remove batch complete')
