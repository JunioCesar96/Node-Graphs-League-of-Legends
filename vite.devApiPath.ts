/** Normaliza `req.url` para comparação com rotas `/api/...` no dev server Vite. */
export function normalizeApiPathname(url: string | undefined): string {
  const raw = url?.split('?')[0] ?? ''
  if (raw === '') {
    return '/'
  }

  let pathname = raw
  try {
    pathname = decodeURIComponent(raw)
  } catch {
    pathname = raw
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '')
  }

  return pathname
}
