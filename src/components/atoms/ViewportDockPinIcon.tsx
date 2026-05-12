/** Ícone de acoplar à barra da vista (viewport). */
export function ViewportDockPinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden className="inspectorDockPinSvg" height="16" viewBox="0 0 24 24" width="16">
      {filled ? (
        <path
          d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3zm-4.5 1h.5v2h-5v-.38c1.63 0 3-1.37 3-3.11V6h4v4.62c-.09.71-.61 1.26-1.27 1.38z"
          fill="currentColor"
          opacity={0.88}
        />
      )}
    </svg>
  )
}
