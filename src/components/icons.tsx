import type { SVGProps } from 'react'

const base = ({ width, height, ...p }: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  // Explicit dimensions: Safari/iOS collapses a viewBox-only SVG to 0px
  // when it is a direct flex child. Default to 24, keep icons square.
  width: width ?? 24,
  height: height ?? width ?? 24,
  ...p,
})

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
)
export const IconExplore = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
)
export const IconStudio = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 19l7-7 2 2-7 7-3 1 1-3z" />
    <path d="M12 19 3 19" />
    <path d="M14 7 9 2 3 8l5 5" />
  </svg>
)
export const IconGallery = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="9" r="1.6" />
    <path d="m3 16 5-4 4 3 3-2 6 5" />
  </svg>
)
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l1.6-1.2-1.8-3.1-1.9.7a7.6 7.6 0 0 0-2.6-1.5L13.5 2h-3l-.8 2a7.6 7.6 0 0 0-2.6 1.5l-1.9-.7L2.4 7.9 4 9.1a7.8 7.8 0 0 0 0 3l-1.6 1.2 1.8 3.1 1.9-.7a7.6 7.6 0 0 0 2.6 1.5l.8 2h3l.8-2a7.6 7.6 0 0 0 2.6-1.5l1.9.7 1.8-3.1z" />
  </svg>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconUndo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
  </svg>
)
export const IconRedo = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m15 7 5 5-5 5" />
    <path d="M20 12H9a5 5 0 0 0 0 10h1" />
  </svg>
)
export const IconImage = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m4 17 5-4 4 3 3-2 5 4" />
  </svg>
)
export const IconText = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 6h14M12 6v13M9 19h6" />
  </svg>
)
export const IconShapes = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="12" width="8" height="8" rx="1.5" />
    <circle cx="16.5" cy="16" r="4" />
    <path d="M12 3 16 9H8z" />
  </svg>
)
export const IconLayers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
)
export const IconBg = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M3 15l5-5 4 4 3-3 6 6" />
  </svg>
)
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
)
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M4 16V5a1 1 0 0 1 1-1h11" />
  </svg>
)
export const IconStar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m12 3 2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1L6.1 19l1.3-6-4.5-4 6-.6z" />
  </svg>
)
export const IconStarFill = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: 'currentColor', ...p })}>
    <path d="m12 3 2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1L6.1 19l1.3-6-4.5-4 6-.6z" />
  </svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconSave = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 3h12l4 4v14H5z" />
    <path d="M8 3v6h8V3M8 21v-7h8v7" />
  </svg>
)
export const IconExport = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 15V3m0 0L8 7m4-4 4 4" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
)
export const IconWallet = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18M17 14h.01" />
  </svg>
)
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const IconUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m6 14 6-6 6 6" />
  </svg>
)
export const IconDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m6 10 6 6 6-6" />
  </svg>
)
export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)
export const IconBrush = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M15 4l5 5-9 9-5 1 1-5z" />
    <path d="M13 6l5 5" />
    <path d="M4 20c1.5 0 2-1 2-2a2 2 0 0 0-2-2c-1 1-1 4 0 4z" />
  </svg>
)
export const IconEye = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
)
export const IconFlip = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3v18" />
    <path d="M7 8 4 11l3 3" />
    <path d="M4 11h7" />
    <path d="m17 16 3-3-3-3" />
    <path d="M20 13h-7" />
  </svg>
)
