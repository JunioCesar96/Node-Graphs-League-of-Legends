type IconProps = {
  active?: boolean
}

export function SceneNodeEyeIcon({ active = true }: IconProps) {
  if (!active) {
    return (
      <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
        <path
          d="M12 6.5c3.79 0 7.17 2.13 8.82 5.5-1.65 3.37-5.03 5.5-8.82 5.5S4.83 15.37 3.18 12c1.65-3.37 5.03-5.5 8.82-5.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C20.27 7.61 17 4.5 12 4.5zm0 5a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 0 0-7z"
          fill="currentColor"
          opacity={0.45}
        />
        <path d="M3.27 3.27 20.73 20.73" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M12 6.5c3.79 0 7.17 2.13 8.82 5.5-1.65 3.37-5.03 5.5-8.82 5.5S4.83 15.37 3.18 12c1.65-3.37 5.03-5.5 8.82-5.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C20.27 7.61 17 4.5 12 4.5zm0 5a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 0 0-7z"
        fill="currentColor"
      />
    </svg>
  )
}

export function SceneNodeLockIcon({ active = false }: IconProps) {
  if (active) {
    return (
      <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
        <path
          d="M18 10h-1V8a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7 7.83V19h2v-1.17c1.17-.38 2-1.5 2-2.83 0-1.66-1.34-3-3-3s-3 1.34-3 3c0 1.33.83 2.45 2 2.83zM9 8a3 3 0 1 1 6 0v2H9V8z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M12 17a2 2 0 0 0 2-2v-2h-4v2a2 2 0 0 0 2 2zm6-7h-1V8a5 5 0 0 0-9.9-1h2.07A3.007 3.007 0 0 1 15 8v2h-2V8a3 3 0 0 0-6 0v2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2z"
        fill="currentColor"
        opacity={0.72}
      />
    </svg>
  )
}

export function SceneNodeFocusIcon() {
  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm0-6h2V5h4V3H5c-1.1 0-2 .9-2 2v4zm14 6h2v-4h-2v4zm0-8V3h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm-6 12h-2v2h2v2h2v-2h2v-2h-2v-2h-2v2z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" fill="currentColor" r="2.25" />
    </svg>
  )
}
