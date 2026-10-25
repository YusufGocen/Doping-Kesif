/** Original vector illustration for the local dashboard; replace with licensed platform artwork when supplied. */
export default function Landscape({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 410" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x2="0" y2="410" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7feff" />
          <stop offset="1" stopColor="#d1f4ed" />
        </linearGradient>
        <linearGradient id="sun" x2="1" y2="1">
          <stop stopColor="#ffdf62" />
          <stop offset="1" stopColor="#ffb52b" />
        </linearGradient>
        <linearGradient id="hill" x2="0" y2="1">
          <stop stopColor="#a7d85c" />
          <stop offset="1" stopColor="#64b643" />
        </linearGradient>
        <linearGradient id="path" x2="1" y2="0">
          <stop stopColor="#f1c77f" />
          <stop offset="1" stopColor="#ffdf9e" />
        </linearGradient>
        <g id="tree">
          <rect x="-2" y="-11" width="4" height="21" rx="1" fill="#8a6b3a" />
          <path d="M0-54 15-25H8l13 23H-21l13-23h-7Z" fill="#2a9e62" />
          <path d="M0-54v52h21L8-25h7Z" fill="#14885b" />
          <path d="m0-43-10 20h8Z" fill="#54bf72" />
        </g>
        <g id="bush">
          <circle cx="-9" cy="0" r="10" fill="#64bc55" />
          <circle cy="-7" r="14" fill="#7aca5a" />
          <circle cx="11" r="10" fill="#54ad4d" />
        </g>
      </defs>
      <path fill="url(#sky)" d="M0 0h320v410H0z" />
      <g stroke="#f7cf5c" opacity=".5">
        <path d="m222 162-49-77m59 71-10-96m24 95 25-92m-13 103 53-68m-101 89-99-35m94 47-119 2m127 20-106 44m142-62 52-17" />
      </g>
      <circle cx="253" cy="209" r="78" fill="url(#sun)" />
      <path d="M0 271c60-24 85 14 141-19 67-41 112-42 179-22v180H0Z" fill="#c2e48d" />
      <path d="M0 313c76-72 121-21 173-60 38-28 91-7 147-17v174H0Z" fill="url(#hill)" />
      <path d="M0 352c61-36 96-6 151-40 48-30 107 2 169-28v126H0Z" fill="#56b268" />
      <path d="M0 392c76-15 125-31 182-22 60 9 87-17 138-14v54H0Z" fill="#299a69" />
      <path
        d="M232 243c-51 44-91 35-77 60 12 21 94 3 64 43-21 28-113 27-109 64h51c-15-27 68-25 81-57 22-52-67-31-65-53 1-18 36-19 68-57Z"
        fill="url(#path)"
      />
      <g transform="translate(220 198)">
        <path d="m-15 10 31-22 32 22Z" fill="#a38e6b" />
        <path d="m-12 9 28-17 29 17Z" fill="#efe4c7" />
        <path d="M-7 11h47v34H-7z" fill="#d7c69d" />
        <path d="M-13 45h59v5h-59z" fill="#b3a07c" />
        <path d="M0 15h5v30H0zm12 0h5v30h-5zm13 0h5v30h-5z" fill="#f8edca" />
        <path d="M-12 9h57v5h-57z" fill="#b4a07b" />
      </g>
      <use href="#tree" transform="translate(40 305) scale(.9)" />
      <use href="#tree" transform="translate(80 290) scale(.7)" />
      <use href="#tree" transform="translate(116 300) scale(.8)" />
      <use href="#tree" transform="translate(195 265) scale(.45)" />
      <use href="#tree" transform="translate(214 257) scale(.35)" />
      <use href="#tree" transform="translate(302 291) scale(.7)" />
      <use href="#tree" transform="translate(278 329) scale(1)" />
      <use href="#tree" transform="translate(29 370) scale(1.2)" />
      <use href="#tree" transform="translate(79 348) scale(1)" />
      <use href="#tree" transform="translate(300 392) scale(1.35)" />
      <use href="#tree" transform="translate(242 392) scale(1)" />
      <use href="#tree" transform="translate(13 410) scale(.8)" />
      <use href="#bush" transform="translate(57 382) scale(.8)" />
      <use href="#bush" transform="translate(187 391) scale(.7)" />
      <use href="#bush" transform="translate(111 331) scale(.45)" />
      <g transform="translate(167 328)">
        <path stroke="#a17543" strokeWidth="5" d="M0 0v38" />
        <rect x="-17" y="-7" width="34" height="27" rx="3" fill="#bf8f50" />
        <rect x="-13" y="-3" width="26" height="19" rx="1" fill="#f4d789" />
        <path stroke="#dbb36d" d="M-8 3H8M-8 8H4" />
      </g>
      <g fill="#ffe08b">
        <circle cx="35" cy="397" r="2" />
        <circle cx="63" cy="369" r="2" />
        <circle cx="202" cy="361" r="2" />
        <circle cx="267" cy="346" r="2" />
        <circle cx="96" cy="389" r="2" />
      </g>
    </svg>
  );
}
