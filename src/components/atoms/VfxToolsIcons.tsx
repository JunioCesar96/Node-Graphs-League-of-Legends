type IconProps = {
  className?: string
  size?: number
}

export function ToolsIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 2.5 6.2 4.2 3.8 6.6 2.1 4.9 4.5 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M6.2 4.2 8.5 1.9 10.2 3.6 7.9 5.9 6.2 4.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M11.5 6.5 13.2 8.2 10.8 10.6 9.1 8.9 11.5 6.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M13.2 8.2 15.5 5.9 17.2 7.6 14.9 9.9 13.2 8.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M2.5 11.5 4.2 13.2 6.6 10.8 4.9 9.1 2.5 11.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M4.2 13.2 1.9 15.5 3.6 17.2 5.9 14.9 4.2 13.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M9.5 9.5 11.2 11.2 8.8 13.6 7.1 11.9 9.5 9.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <path
        d="M11.2 11.2 13.5 8.9 15.2 10.6 12.9 12.9 11.2 11.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function InspectorIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 12 16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
      <path
        d="M5.5 7.2h2.2M5.5 9.2h3.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1"
      />
      <path
        d="M6.2 6.1 7.4 7.3M8.6 6.1 7.4 7.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="0.9"
      />
    </svg>
  )
}

export function CharacterIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M4.5 15.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function SceneIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" width="14" x="2" y="4" />
      <path
        d="M2 12.5 6.5 9.5 9.5 11.5 12.5 8.5 16 11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <circle cx="12.5" cy="7" fill="currentColor" r="1.1" />
    </svg>
  )
}

export function VfxLolIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 2.5 10.8 6.8 15.5 7.3 12 10.2 13 14.8 9 12.5 5 14.8 6 10.2 2.5 7.3 7.2 6.8 9 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
      <circle cx="4.5" cy="5" fill="currentColor" r="0.9" />
      <circle cx="14" cy="4.5" fill="currentColor" r="0.7" />
      <circle cx="15.5" cy="13" fill="currentColor" r="0.8" />
    </svg>
  )
}

export function ViewportMenuIcon({ className, size = 18 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="5" rx="1" stroke="currentColor" strokeWidth="1.2" width="14" x="2" y="3" />
      <rect height="5" rx="1" stroke="currentColor" strokeWidth="1.2" width="14" x="2" y="10" />
    </svg>
  )
}

export function VfxBackToPreviousIcon({ className, size = 14 }: IconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 18 18"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="10"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.2"
        width="13"
        x="3.5"
        y="4"
      />
      <path
        d="M7.5 9H12M7.5 9L9.5 7M7.5 9L9.5 11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}

/** @deprecated Use SceneIcon */
export function Scene3dIcon(props: IconProps) {
  return <SceneIcon {...props} />
}
