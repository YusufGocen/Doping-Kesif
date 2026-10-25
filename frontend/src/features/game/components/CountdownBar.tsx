import { useState } from 'react';
export function CountdownBar({ deadline, now }: { deadline: string | null; now: number }) {
  const remaining = deadline ? Math.max(0, Date.parse(deadline) - now) : 0;
  const [initialRemaining] = useState(() => Math.max(1, remaining));
  return (
    <progress
      className="game-time-progress"
      value={Math.min(remaining, initialRemaining)}
      max={initialRemaining}
      aria-label="Kalan süre çubuğu"
      aria-valuetext={Math.ceil(remaining / 1000) + ' saniye kaldı'}
    />
  );
}
