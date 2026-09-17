import { useState } from "react";
import { chooseFile } from "../engine/client";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onClose: () => void;
  onRestart: () => Promise<void>;
  engineLog: string[];
  windowed?: boolean;
}

export function SettingsPane({ settings, onSave, onClose, onRestart, engineLog, windowed = false }: Props) {
  const [draft, setDraft] = useState(settings);
  const [section, setSection] = useState<"general" | "engine" | "analysis">("engine");
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const browse = async (key: "executable" | "model" | "config") => {
    try { const path = await chooseFile(key); if (path) update(key, path); }
    catch (caught) { setError(String(caught)); }
  };
  const save = async () => {
    try { await onSave(draft); onClose(); }
    catch (caught) { setError(String(caught)); }
  };
  const restart = async () => {
    try { await onRestart(); }
    catch (caught) { setError(String(caught)); }
  };
  return <div className={`modal-backdrop${windowed ? " modal-backdrop--windowed" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget && !windowed) onClose(); }}>
    <section className="settings-window" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-titlebar"><h2>Settings</h2><button onClick={onClose} aria-label="Close settings">×</button></div>
      <div className="settings-body">
        <nav className="settings-nav" aria-label="Settings sections">
          {(["general", "engine", "analysis"] as const).map((item) => <button key={item}
            className={section === item ? "is-active" : ""} onClick={() => setSection(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>)}
        </nav>
        <div className="settings-content">
          {section === "general" && <>
            <h3>General</h3>
            <label>Appearance<select value={draft.theme} onChange={(e) => update("theme", e.target.value as Settings["theme"])}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select></label>
            <label>Board<select value={draft.boardAppearance} onChange={(e) => update("boardAppearance", e.target.value as Settings["boardAppearance"])}>
              <option value="warm">Warm wood</option><option value="light">Pale wood</option>
            </select></label>
            <label>Coordinates<select value={draft.coordinateStyle} onChange={(e) => update("coordinateStyle", e.target.value as Settings["coordinateStyle"])}>
              <option value="gtp">Go (A–T, 19–1)</option><option value="sgf">SGF (a–s, 1–19)</option><option value="none">Hidden</option>
            </select></label>
          </>}
          {section === "engine" && <>
            <h3>KataGo engine</h3>
            <p className="settings-help">Kata does not include KataGo. Install it separately, then choose its executable, a neural-network model, and an analysis configuration (not a GTP configuration). These paths are saved on this Mac.</p>
            {([ ["executable", "KataGo executable"], ["model", "Neural network model"], ["config", "Analysis config"] ] as const).map(([key, label]) =>
              <label className="file-setting" key={key}>{label}<span><input value={draft[key]} onChange={(e) => update(key, e.target.value)} placeholder={`Choose ${label.toLowerCase()}…`} />
                <button onClick={() => browse(key)}>Choose…</button></span></label>)}
            <label>Search threads<input type="number" min="1" max="64" value={draft.threads} onChange={(e) => update("threads", Number(e.target.value))} /></label>
            <button className="secondary-button" onClick={restart}>Restart engine</button>
            <details className="engine-log"><summary>Engine log</summary><pre>{engineLog.slice(-20).join("\n") || "No messages yet"}</pre></details>
          </>}
          {section === "analysis" && <>
            <h3>Analysis</h3>
            <label>Maximum visits<input type="number" min="1" max="100000" value={draft.maxVisits} onChange={(e) => update("maxVisits", Number(e.target.value))} /></label>
            <label>Update interval (seconds)<input type="number" min="0.1" max="10" step="0.1" value={draft.analysisInterval} onChange={(e) => update("analysisInterval", Number(e.target.value))} /></label>
            <label>Candidate moves<input type="number" min="1" max="20" value={draft.candidateCount} onChange={(e) => update("candidateCount", Number(e.target.value))} /></label>
            {([ ["showOwnership", "Ownership heatmap"], ["showWinrate", "Winrate"], ["showScoreLead", "Score lead"], ["showPv", "Principal variation"], ["showMoveNumbers", "Move numbers"] ] as const).map(([key, label]) =>
              <label className="checkbox-setting" key={key}><input type="checkbox" checked={draft[key]} onChange={(e) => update(key, e.target.checked)} />{label}</label>)}
          </>}
          {error && <p className="settings-error" role="alert">{error}</p>}
        </div>
      </div>
      <div className="settings-actions"><button onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}>Save Settings</button></div>
    </section>
  </div>;
}
