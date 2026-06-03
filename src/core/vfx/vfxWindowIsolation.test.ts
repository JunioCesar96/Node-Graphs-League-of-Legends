import { describe, expect, it } from 'vitest'

import { resolveVfxIsolationTarget, VFX_ISOLATION_REGION_ATTR } from './vfxWindowIsolation'

function mountRegions() {
  const shell = document.createElement('section')
  const header = document.createElement('header')
  const workspace = document.createElement('div')
  const timeline = document.createElement('div')
  const workspaceChild = document.createElement('span')
  const timelineChild = document.createElement('span')

  workspace.appendChild(workspaceChild)
  timeline.appendChild(timelineChild)
  shell.append(header, workspace, timeline)
  document.body.appendChild(shell)

  return { shell, header, workspace, timeline, workspaceChild, timelineChild }
}

describe('resolveVfxIsolationTarget', () => {
  it('prioriza timeline quando o hit está na timeline', () => {
    const { shell, workspace, timeline, timelineChild } = mountRegions()

    const target = resolveVfxIsolationTarget({
      clientX: 10,
      clientY: 10,
      shellEl: shell,
      workspaceEl: workspace,
      timelineEl: timeline,
      elementFromPoint: () => timelineChild,
    })

    expect(target).toBe('timeline')
    shell.remove()
  })

  it('retorna workspace quando o hit está no workspace', () => {
    const { shell, workspace, timeline, workspaceChild } = mountRegions()

    const target = resolveVfxIsolationTarget({
      clientX: 10,
      clientY: 10,
      shellEl: shell,
      workspaceEl: workspace,
      timelineEl: timeline,
      elementFromPoint: () => workspaceChild,
    })

    expect(target).toBe('workspace')
    shell.remove()
  })

  it('fallback workspace para header ou área ambígua do shell', () => {
    const { shell, workspace, timeline, header } = mountRegions()

    const target = resolveVfxIsolationTarget({
      clientX: 10,
      clientY: 10,
      shellEl: shell,
      workspaceEl: workspace,
      timelineEl: timeline,
      elementFromPoint: () => header,
    })

    expect(target).toBe('workspace')
    shell.remove()
  })

  it('usa data-vfx-isolation-region quando presente no hit', () => {
    const { shell, workspace, timeline } = mountRegions()
    timeline.setAttribute(VFX_ISOLATION_REGION_ATTR, 'timeline')
    workspace.setAttribute(VFX_ISOLATION_REGION_ATTR, 'workspace')

    const target = resolveVfxIsolationTarget({
      clientX: 10,
      clientY: 10,
      shellEl: shell,
      workspaceEl: workspace,
      timelineEl: timeline,
      elementFromPoint: () => timeline,
    })

    expect(target).toBe('timeline')
    shell.remove()
  })

  it('prioriza bounds da timeline sobre foco no workspace', () => {
    const { shell, workspace, timeline } = mountRegions()
    timeline.setAttribute(VFX_ISOLATION_REGION_ATTR, 'timeline')
    workspace.setAttribute(VFX_ISOLATION_REGION_ATTR, 'workspace')

    Object.defineProperty(timeline, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 200, 400, 120),
    })
    Object.defineProperty(workspace, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(0, 0, 400, 180),
    })

    const workspaceInput = document.createElement('input')
    workspace.appendChild(workspaceInput)

    const target = resolveVfxIsolationTarget({
      clientX: 100,
      clientY: 240,
      shellEl: shell,
      workspaceEl: workspace,
      timelineEl: timeline,
      activeElement: workspaceInput,
      elementFromPoint: () => document.body,
    })

    expect(target).toBe('timeline')
    shell.remove()
  })

  it('fallback workspace quando hit está fora do shell', () => {
    const { shell, workspace, timeline } = mountRegions()
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    const target = resolveVfxIsolationTarget({
      clientX: 10,
      clientY: 10,
      shellEl: shell,
      workspaceEl: workspace,
      timelineEl: timeline,
      elementFromPoint: () => outside,
    })

    expect(target).toBe('workspace')
    shell.remove()
    outside.remove()
  })
})
