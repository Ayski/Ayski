// Icônes en SVG (traits fins, style unique), dessinées pour l'app.

import type { ReactNode } from 'react'

const stroke = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)
const solid = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {children}
  </svg>
)

export const Icon = {
  play: () => solid(<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11.3-6.8a1 1 0 0 0 0-1.72L9.5 4.34A1 1 0 0 0 8 5.2z" />),
  pause: () =>
    solid(
      <>
        <rect x="6" y="4.5" width="4.4" height="15" rx="1.4" />
        <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4" />
      </>,
    ),
  next: () =>
    solid(
      <>
        <path d="M5 6.1v11.8a1 1 0 0 0 1.55.83l8.6-5.9a1 1 0 0 0 0-1.66l-8.6-5.9A1 1 0 0 0 5 6.1z" />
        <rect x="17" y="5" width="2.6" height="14" rx="1.2" />
      </>,
    ),
  prev: () =>
    solid(
      <>
        <path d="M19 6.1v11.8a1 1 0 0 1-1.55.83l-8.6-5.9a1 1 0 0 1 0-1.66l8.6-5.9A1 1 0 0 1 19 6.1z" />
        <rect x="4.4" y="5" width="2.6" height="14" rx="1.2" />
      </>,
    ),
  heart: (filled: boolean) => (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.3s-7.5-4.4-7.5-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.1-7.5 10.1z" />
    </svg>
  ),
  palette: () =>
    stroke(
      <>
        <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.9 2-1.9 0-1.4-1-1.7-1-2.8 0-.9.7-1.6 1.7-1.6h1.9a3.9 3.9 0 0 0 3.9-3.9c0-3.8-3.8-6.8-8.5-6.8z" />
        <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="11.5" cy="7.6" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.6" cy="9.2" r="1" fill="currentColor" stroke="none" />
      </>,
    ),
  devices: () =>
    stroke(
      <>
        <rect x="3.5" y="5" width="12" height="9.5" rx="1.8" />
        <path d="M7 18.5h5" />
        <rect x="16" y="9" width="5" height="10" rx="1.4" />
      </>,
    ),
  queue: () =>
    stroke(
      <>
        <path d="M4 7h11M4 12h11M4 17h7" />
        <path d="M17.5 13.2v5.6l4-2.8z" fill="currentColor" stroke="none" />
      </>,
    ),
  playlists: () =>
    stroke(
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
      </>,
    ),
  stats: () => stroke(<path d="M5 20V11M12 20V4M19 20v-6" />),
  more: () =>
    solid(
      <>
        <circle cx="5" cy="12" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="19" cy="12" r="1.8" />
      </>,
    ),
  chevron: () => stroke(<path d="M6 9l6 6 6-6" />),
  close: () => stroke(<path d="M6 6l12 12M18 6L6 18" />),
  plus: () => stroke(<path d="M12 5v14M5 12h14" />),
  grip: () => stroke(<path d="M5 9h14M5 15h14" />),
  check: () => stroke(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  ban: () =>
    stroke(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M6 18L18 6" />
      </>,
    ),
  spark: () => stroke(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />),
  sofa: () =>
    stroke(
      <>
        <path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" />
        <path d="M3.5 12.5a1.5 1.5 0 0 1 3 0V15h11v-2.5a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
      </>,
    ),
  balance: () => stroke(<path d="M12 4v16M5 8h14M5 8l-2 6h4zM19 8l-2 6h4zM8 20h8" />),
  compass: () =>
    stroke(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </>,
    ),
  note: () =>
    stroke(
      <>
        <path d="M9 17.5V6l10-2v11.5" />
        <circle cx="6.5" cy="17.5" r="2.5" />
        <circle cx="16.5" cy="15.5" r="2.5" />
      </>,
    ),
  /** Logo Spotify (attribution demandée par les Design Guidelines). */
  spotify: () =>
    solid(
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />,
    ),
}
