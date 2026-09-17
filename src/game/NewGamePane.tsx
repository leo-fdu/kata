import { useState } from "react";
import type { GameOptions, Handicap, PlayMode } from "./setup";
import type { StoneColor } from "../types/game";

interface Props { onCreate: (options: GameOptions) => void; onClose: () => void }

export function NewGamePane({ onCreate, onClose }: Props) {
  const [size, setSize] = useState<9 | 13 | 19>(19);
  const [mode, setMode] = useState<PlayMode>("human-human");
  const [handicap, setHandicap] = useState<Handicap>(0);
  const [humanColor, setHumanColor] = useState<StoneColor>("black");
  const [komi, setKomi] = useState(7.5);
  const chooseHandicap = (value: Handicap) => {
    setHandicap(value);
    setKomi(value === 0 ? 7.5 : 0.5);
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="new-game-window" role="dialog" aria-modal="true" aria-label="New game">
      <h2>New game</h2>
      <p>Choose how you want to play. You can still review and save every game as SGF.</p>
      <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as PlayMode)}>
        <option value="human-human">Human vs Human</option><option value="human-ai">Human vs KataGo</option><option value="analysis">Analysis board</option>
      </select></label>
      <label>Board size<select value={size} onChange={(event) => setSize(Number(event.target.value) as 9 | 13 | 19)}>
        <option value={19}>19 × 19</option><option value={13}>13 × 13</option><option value={9}>9 × 9</option>
      </select></label>
      <label>Handicap<select value={handicap} onChange={(event) => chooseHandicap(Number(event.target.value) as Handicap)}>
        <option value={0}>Even game · no handicap</option><option value={1}>Black first · no komi</option>
        {Array.from({ length: 8 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count} handicap stones</option>)}
      </select></label>
      {mode === "human-ai" && <label>Your color<select value={humanColor} onChange={(event) => setHumanColor(event.target.value as StoneColor)}>
        <option value="black">Black</option><option value="white">White</option>
      </select></label>}
      <label>Komi<input type="number" min="-30" max="30" step="0.5" value={komi}
        onChange={(event) => setKomi(Number(event.target.value))} /></label>
      {mode === "human-ai" && <p className="new-game-hint">KataGo must be ready before its turn. The AI plays after its search completes.</p>}
      <div className="new-game-actions"><button onClick={onClose}>Cancel</button>
        <button className="primary-button" disabled={!Number.isFinite(komi) || Math.abs(komi) > 30}
          onClick={() => onCreate({ size, mode, handicap, humanColor, komi })}>Create Game</button></div>
    </section>
  </div>;
}
