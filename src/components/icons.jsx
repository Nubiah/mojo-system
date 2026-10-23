// Mojo System — Icônes d’univers custom (style trait, comme lucide-react)
function base({ size = 16, className, strokeWidth = 2, children, filled = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Petit dragon vu de face (Illirea) : cornes, regard, museau
export function DragonIcon(props) {
  return base({
    ...props,
    children: (
      <>
        <path d="M8.6 7.6C8 6.2 7.4 5 7 3.6" />
        <path d="M15.4 7.6c.6-1.4 1.2-2.6 1.6-4" />
        <path d="M12 6.5c-2.9 0-4.8 2-4.8 4.7 0 .8.2 1.6.5 2.3L5 15l2.8 1c.7 2.4 2.3 4 4.2 4s3.5-1.6 4.2-4l2.8-1-2.7-1.5c.3-.7.5-1.5.5-2.3 0-2.7-1.9-4.7-4.8-4.7Z" />
        <path d="M9.2 12.3l1.7-.6" />
        <path d="M14.8 12.3l-1.7-.6" />
        <path d="M10 16.8h4" />
      </>
    )
  })
}

// Temple maya (Teotl) : pyramide à degrés, escalier central, sanctuaire
export function MayaTempleIcon(props) {
  return base({
    ...props,
    children: (
      <>
        <path d="M3 20h18" />
        <path d="M4.5 20v-2.8h15V20" />
        <path d="M7 17.2v-2.7h10v2.7" />
        <path d="M11 20v-5.5M13 20v-5.5" />
        <path d="M9.5 14.5v-3h5v3" />
        <path d="M8.5 11.5h7" />
        <path d="M10.5 11.5V8.5h3v3" />
        <path d="M11.2 14.5v-1.6h1.6v1.6" />
      </>
    )
  })
}
