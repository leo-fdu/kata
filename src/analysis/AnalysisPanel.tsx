import type { StoneColor } from "../types/game";
import type { AnalysisResult, EngineStatus } from "../engine/client";
import type { Settings } from "../settings/types";
import { candidateWinrate } from "./candidateVisual";

interface AnalysisPanelProps {
  enabled: boolean;
  nextPlayer: StoneColor;
  moveNumber: number;
  hasSetupStones: boolean;
  size: number;
  komi: number;
  rules: string;
  status: EngineStatus;
  result?: AnalysisResult;
  settings: Settings;
  onSettings: () => void;
  onPreviewPv: (pv: string[]) => void;
}

const formatVisits = (visits: number) => visits >= 1000 ? `${(visits / 1000).toFixed(1)}k` : String(visits);
const formatLead = (lead: number) => `${lead >= 0 ? "B" : "W"} +${Math.abs(lead).toFixed(1)}`;

export function AnalysisPanel({ enabled, nextPlayer, moveNumber, hasSetupStones, size, komi, rules,
  status, result, settings, onSettings, onPreviewPv }: AnalysisPanelProps) {
  const candidates = result?.moveInfos?.slice().sort((a, b) => a.order - b.order).slice(0, settings.candidateCount) ?? [];
  const metrics = result?.rootInfo;
  return (
    <aside className="analysis-panel" aria-label="Analysis">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Position</span>
          <h2>Analysis</h2>
        </div>
        <span className={`engine-status${status.state === "ready" ? " is-ready" : enabled ? " is-waiting" : ""}`} title={status.detail}>
          <i />
          {!enabled ? "Paused" : status.state === "ready" ? "KataGo running" : status.state === "starting" ? "Starting…" : status.state === "error" ? "Engine error" : "No engine"}
        </span>
      </div>

      <div className="turn-summary">
        <span className={`turn-stone turn-stone--${nextPlayer}`} />
        <div>
          <strong>{nextPlayer === "black" ? "Black" : "White"} to play</strong>
          <span>{moveNumber === 0 ? hasSetupStones ? "Handicap setup" : "Empty board" : `After move ${moveNumber}`}</span>
        </div>
      </div>

      <div className="primary-metrics" aria-label="Evaluation metrics">
        {settings.showScoreLead && <div className="metric">
          <span>Score lead</span>
          <strong>{enabled && metrics ? formatLead(metrics.scoreLead) : "—"}</strong>
        </div>}
        {settings.showWinrate && <div className="metric">
          <span>Black winrate</span>
          <strong>{enabled && metrics ? `${(metrics.winrate * 100).toFixed(1)}%` : "—"}</strong>
        </div>}
      </div>

      {metrics && enabled && <div className="visit-summary">{formatVisits(metrics.visits)} visits · {result?.isDuringSearch ? "analyzing" : "complete"}</div>}

      <div className="section-divider" />

      <section className="candidate-section">
        <div className="section-title-row">
          <h3>Candidate moves</h3>
          <span>Win · visits</span>
        </div>
        {candidates.length > 0 && enabled ? <div className="candidate-list">
          {candidates.map((candidate, index) => <button key={`${candidate.move}-${index}`} className={`candidate-row${index === 0 ? " is-best" : ""}`}
            onMouseEnter={() => onPreviewPv(settings.showPv ? candidate.pv ?? [] : [])}
            onMouseLeave={() => onPreviewPv([])}
            onFocus={() => onPreviewPv(settings.showPv ? candidate.pv ?? [] : [])}
            onBlur={() => onPreviewPv([])}>
            <span className="candidate-rank">{index + 1}</span>
            <strong>{candidate.move}</strong>
            <span>{Math.round(candidateWinrate(candidate, nextPlayer) * 100)}% win</span>
            <span>{formatVisits(candidate.visits)}</span>
          </button>)}
          {settings.showPv && <p className="pv-hint">Hover a move to preview its principal variation</p>}
        </div> : <div className="empty-candidates">
          <div className="empty-glyph" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>{!enabled ? "Analysis is paused" : status.state === "error" ? "Engine needs attention" : status.state === "ready" ? "Analyzing position…" : "Set up KataGo to begin"}</strong>
          <p>{status.state === "error" ? status.detail : "Suggestions appear here and directly on the board."}</p>
          {status.state !== "ready" && enabled && <button className="setup-link" onClick={onSettings}>Open Engine Settings</button>}
        </div>}
      </section>

      <details className="details-disclosure">
        <summary>Position details</summary>
        <dl>
          <div><dt>Board</dt><dd>{size} × {size}</dd></div>
          <div><dt>Komi</dt><dd>{komi}</dd></div>
          <div><dt>Rules</dt><dd>{rules}</dd></div>
        </dl>
      </details>
    </aside>
  );
}
