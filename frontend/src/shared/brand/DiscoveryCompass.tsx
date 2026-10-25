import { useId } from 'react';
/** Shared Doping Keşif mark; vector artwork stays sharp at every size. */
export function DiscoveryCompass({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const id = useId().replaceAll(':', '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={id + 'rim'}
          x1="20"
          y1="10"
          x2="80"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7ee7ff" />
          <stop offset=".4" stopColor="#009aff" />
          <stop offset="1" stopColor="#0754c9" />
        </linearGradient>
        <linearGradient
          id={id + 'face'}
          x1="25"
          y1="20"
          x2="75"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#007ae7" />
          <stop offset="1" stopColor="#42ccff" />
        </linearGradient>
      </defs>
      <ellipse cx="48" cy="90" rx="33" ry="5" fill="#237cce" opacity=".16" />
      <g transform="rotate(12 50 50)">
        <rect x="44" y="3" width="12" height="12" rx="4" fill="#89d6ff" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill={'url(#' + id + 'rim)'}
          stroke="#8bdeff"
          strokeWidth="2"
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          fill={'url(#' + id + 'face)'}
          stroke="#0063c9"
          strokeWidth="3"
        />
        <path
          d="M50 20V28M50 72V80M20 50H28M72 50H80"
          stroke="#e6fbff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M50 12A38 38 0 0 0 16 38"
          stroke="white"
          strokeOpacity=".6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M69 25 57 57 29 76 42 43Z"
          fill="#0062bf"
          opacity=".25"
          transform="translate(2 3)"
        />
        <path d="M69 25 56 56 29 76 43 44Z" fill="white" />
        <path d="M69 25 50 50 43 44Z" fill="#d1f1ff" />
        <path d="M29 76 50 50 56 56Z" fill="#b8e9ff" />
        <path d="M43 44 50 48 56 56 49 52Z" fill="#f45b73" />
        <circle cx="50" cy="50" r="3" fill="#6386b7" stroke="white" strokeWidth="1" />
      </g>
    </svg>
  );
}
