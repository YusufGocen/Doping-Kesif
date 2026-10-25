import { useId } from 'react';

/** Local original vector covers for known demo metadata; no invented remote asset URLs. */
export function PuzzleArtwork({ code }: { code: string }) {
  const id = useId();
  const variant = code.replace('DEMO_', '').toLowerCase();
  const colors =
    variant === 'history'
      ? ['#fee2b8', '#c77f51']
      : variant === 'nature'
        ? ['#c8f1ec', '#3f9d81']
        : variant === 'city'
          ? ['#d9d9ff', '#7c78c7']
          : ['#ffe4bf', '#e99e72'];
  return (
    <svg viewBox="0 0 240 150" role="presentation" focusable="false">
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M0 0h240v150H0z" />
      <circle cx="181" cy="34" r="19" fill="#fff5ce" opacity=".85" />
      {variant === 'history' ? (
        <>
          <path d="M31 145V58L59 37l116 4 34 22v82Z" fill="#c48b60" />
          <path d="m31 58 28-21v108H31z" fill="#9b654c" />
          <path d="M59 41h116v104H59z" fill="#e9b17c" />
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <path
                key={`${row}-${col}`}
                d={`M${69 + col * 21} ${73 + row * 29}v-13a7 7 0 0 1 14 0v13Z`}
                fill="#875c48"
              />
            )),
          )}
          <path d="M56 77h123M56 106h123M56 135h123" stroke="#f5c48e" strokeWidth="5" />
        </>
      ) : variant === 'city' ? (
        <>
          <path d="m0 120 47-65 45 53 48-79 61 75 39-43v89H0Z" fill="#8b7ec0" />
          <path d="m72 150 68-121 61 75 39-43v89Z" fill="#625d9b" />
          <path d="m140 29-19 34 23-8 12 7Z" fill="#f2edff" />
          <path d="M0 138c70-35 155 19 240-18v30H0Z" fill="#cda0b9" />
        </>
      ) : variant === 'nature' ? (
        <>
          <path d="m0 103 45-65 45 56 52-73 56 75 42-44v98H0Z" fill="#77ada1" />
          <path d="m94 150 48-129 56 75 42-44v98Z" fill="#438c82" />
          <path d="m142 21-13 35 17-7 8 9Z" fill="#ecfff7" />
          <path d="M0 120c83-20 156 18 240-7v37H0Z" fill="#8ad5db" />
          <path d="M0 135c50-21 75-4 93 15H0Zm175 15c15-27 40-34 65-32v32Z" fill="#3c8c66" />
        </>
      ) : (
        <>
          <path d="m0 124 48-52 49 48 55-35 38 28 50-45v82H0Z" fill="#d99577" />
          <path d="M0 145c75-45 136-18 240-40v45H0Z" fill="#af736d" />
          <g transform="translate(129 39)">
            <path d="M0 0c0-27 42-27 42 0 0 18-21 35-21 35S0 18 0 0Z" fill="#cf6c66" />
            <path d="M14-19c-12 18-8 39 7 54 14-16 20-36 7-54Z" fill="#f8c36d" />
            <path d="m13 32 3 17h12l2-17" stroke="#765b56" strokeWidth="2" />
            <path d="M16 46h12v10H16Z" fill="#8f6b53" />
          </g>
        </>
      )}
      <path d="M0 148h240" stroke="#ffffff40" strokeWidth="4" />
    </svg>
  );
}
