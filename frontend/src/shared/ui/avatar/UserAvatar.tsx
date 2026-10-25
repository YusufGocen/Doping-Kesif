const appearances: Record<
  string,
  {
    background: string;
    skin: string;
    hair: string;
    shirt: string;
    style: 'short' | 'long' | 'curly' | 'bob';
  }
> = {
  yusuf: {
    background: '#dceeff',
    skin: '#e7b58f',
    hair: '#352a27',
    shirt: '#2c83cb',
    style: 'curly',
  },
  ayse: {
    background: '#ffe1e9',
    skin: '#f3c5aa',
    hair: '#332735',
    shirt: '#ea7595',
    style: 'long',
  },
  mert: {
    background: '#fff0ca',
    skin: '#dba27c',
    hair: '#51372c',
    shirt: '#e5a73b',
    style: 'short',
  },
  zeynep: {
    background: '#e9e0ff',
    skin: '#efc2a4',
    hair: '#583a30',
    shirt: '#8e73c8',
    style: 'bob',
  },
};
export const loginUserKeys = ['yusuf', 'ayse', 'mert', 'zeynep'] as const;
/** Explicit demo identities; no gender inference from names or unknown user profiles. */
export function UserAvatar({
  identity,
  className = '',
}: {
  identity?: string;
  className?: string;
}) {
  const key = identity?.replace(/^local:/, '') ?? '';
  const look = appearances[key];
  if (!look)
    return (
      <svg
        className={'user-avatar ' + className}
        viewBox="0 0 120 120"
        aria-hidden="true"
        data-avatar="default"
      >
        <rect width="120" height="120" rx="24" fill="#e7eff8" />
        <circle cx="60" cy="44" r="21" fill="#96adc6" />
        <path d="M19 120v-14a41 41 0 0 1 82 0v14" fill="#96adc6" />
      </svg>
    );
  const long = look.style === 'long' || look.style === 'bob';
  return (
    <svg
      className={'user-avatar ' + className}
      viewBox="0 0 120 120"
      aria-hidden="true"
      data-avatar={key}
    >
      <rect width="120" height="120" rx="24" fill={look.background} />
      <circle cx="60" cy="54" r="43" fill="white" opacity=".24" />
      {long && (
        <path
          d={
            look.style === 'long'
              ? 'M27 52Q23 13 60 13Q98 13 94 55L102 99Q85 110 60 97Q32 109 19 99Z'
              : 'M26 51Q23 16 60 15Q97 14 95 53L94 89Q60 108 25 89Z'
          }
          fill={look.hair}
        />
      )}
      <path d="M17 120v-9q2-27 33-30h20q31 3 33 30v9" fill={look.shirt} />
      <path d="m43 85 17 17 17-17-10-5H53Z" fill="white" opacity=".92" />
      <path d="M50 70h20v17q-10 12-20 0Z" fill={look.skin} />
      <path d="M50 73q10 10 20 0v9q-11 8-20 0Z" fill="#bf8468" opacity=".25" />
      <ellipse cx="32" cy="53" rx="6" ry="9" fill={look.skin} />
      <ellipse cx="88" cy="53" rx="6" ry="9" fill={look.skin} />
      <path d="M33 39Q32 22 60 22Q88 22 87 39v20q-2 23-27 24Q35 82 33 59Z" fill={look.skin} />
      <path
        d={
          long
            ? 'M30 48Q23 16 57 15Q90 11 91 43Q72 43 56 27Q51 43 30 48Z'
            : 'M31 46Q20 20 43 18Q57 6 76 17Q99 20 90 46L82 33Q54 41 40 32Z'
        }
        fill={look.hair}
      />
      {look.style === 'curly' && (
        <g fill={look.hair}>
          <circle cx="36" cy="25" r="9" />
          <circle cx="49" cy="19" r="10" />
          <circle cx="63" cy="18" r="10" />
          <circle cx="78" cy="23" r="10" />
        </g>
      )}
      <path d="m42 47 9-1m18 0 9 1" stroke={look.hair} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="47" cy="54" rx="3" ry="4" fill="#332b30" />
      <ellipse cx="74" cy="54" rx="3" ry="4" fill="#332b30" />
      <circle cx="48" cy="53" r="1" fill="white" />
      <circle cx="75" cy="53" r="1" fill="white" />
      <path d="m60 55-2 8h4" fill="none" stroke="#bb8369" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M49 69q11 13 22 0Z" fill="#943e46" />
      <path d="M51 69h18q-8 6-18 0" fill="white" />
      {key === 'yusuf' && (
        <g fill="none" stroke="#3e4653" strokeWidth="2.5">
          <rect x="36" y="46" width="22" height="17" rx="6" />
          <rect x="64" y="46" width="22" height="17" rx="6" />
          <path d="M58 52h6M31 50h5m50 0h5" />
        </g>
      )}
    </svg>
  );
}

/** Explicit local fixtures only; unknown names keep the neutral avatar. */
export function demoAvatarIdentity(displayName?: string) {
  const identities: Record<string, string> = {
    'Yusuf Göçen': 'local:yusuf',
    'Ayşe Yılmaz': 'local:ayse',
    'Mert Demir': 'local:mert',
    'Zeynep Kaya': 'local:zeynep',
  };
  return displayName ? identities[displayName] : undefined;
}
