declare module './scripts/lol2gltfRunner.mjs' {
  export function safeBaseName(name: string): string
  export function championToGltfBaseName(champion: string): string
  export function getStatus(projectRoot: string): {
    available: boolean
    path: string | null
    source: string | null
    installHint: string
  }
  export function convertSknToGlb(opts: {
    projectRoot: string
    modelsDir: string
    sknBuffer: Buffer
    sknName: string
    sklBuffer: Buffer
    sklName: string
    anmFiles: Array<{ name: string; buffer: Buffer }>
    baseName?: string
    texturePath?: string | null
    materialNames?: string[]
  }): Promise<{
    baseName: string
    glbPath: string
    glbRel: string
    animCount: number
    tool: string | null
  }>
}
