import type { CandidateMove } from "../engine/client";
import type { StoneColor } from "../types/game";

export function candidateWinrate(candidate: CandidateMove, player: StoneColor): number {
  const value = player === "black" ? candidate.winrate : 1 - candidate.winrate;
  return Math.min(1, Math.max(0, value));
}

export function candidateFill(winrate: number): string {
  return `hsl(146 50% ${Math.round(75 - winrate * 44)}%)`;
}
