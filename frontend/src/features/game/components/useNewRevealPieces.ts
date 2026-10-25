import { useLayoutEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '../model/schemas';
/** Animate observed open-to-reveal transitions; restored results stay still. */
export function useNewRevealPieces(snapshot: GameSnapshot | undefined) {
  const previous = useRef<GameSnapshot | undefined>(undefined);
  const [reveal, setReveal] = useState<{ roundId: string; pieces: number[] } | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    if (
      snapshot &&
      before &&
      before.id === snapshot.id &&
      before.round.id === snapshot.round.id &&
      before.round.status === 'QUESTION_OPEN' &&
      snapshot.round.status === 'REVEAL'
    ) {
      setReveal({
        roundId: snapshot.round.id,
        pieces: snapshot.revealedPieces.filter((piece) => !before.revealedPieces.includes(piece)),
      });
    }
    previous.current = snapshot;
  }, [snapshot]);
  return reveal?.roundId === snapshot?.round.id ? (reveal?.pieces ?? []) : [];
}
