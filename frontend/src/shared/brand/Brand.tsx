export function Brand() {
  return (
    <div className="brand" aria-label="Doping Hafıza">
      <svg viewBox="0 0 36 42" aria-hidden="true">
        <path d="M16 2C4 2 2 11 5 18c-4 5-2 10 4 11l-2 9 9-2Z" fill="#2165bb" />
        <path d="M19 2c13 1 17 11 13 22-2 6-7 11-13 12Z" fill="#ff3158" />
        <path d="M16 3v34m3-26 13 3M19 23l11 2" stroke="white" strokeWidth="1.5" />
      </svg>
      <span>
        <span className="brand-word">
          <span>doping</span>
          <span>hafıza</span>
        </span>
        <small>öğrenmenin dijital hali</small>
      </span>
    </div>
  );
}
