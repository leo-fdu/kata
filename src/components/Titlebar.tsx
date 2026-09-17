import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisIcon,
  FolderIcon,
  RotateIcon,
  SidebarIcon,
  SparklesIcon,
} from "./icons";

interface TitlebarProps {
  title: string;
  dirty: boolean;
  moveNumber: number;
  analysisEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  browserOpen: boolean;
  onToggleBrowser: () => void;
  onOpen: () => void;
  onSave: () => void;
  onNewGame: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSettings: () => void;
  onToggleAnalysis: () => void;
}

export function Titlebar({
  title,
  dirty,
  moveNumber,
  analysisEnabled,
  canUndo,
  canRedo,
  browserOpen,
  onToggleBrowser,
  onOpen,
  onSave,
  onNewGame,
  onUndo,
  onRedo,
  onSettings,
  onToggleAnalysis,
}: TitlebarProps) {
  return (
    <header className="titlebar" data-tauri-drag-region="deep">
      <div className="traffic-light-space" data-tauri-drag-region="deep" />

      <div className="toolbar-group toolbar-group--leading">
        <button className={`icon-button${browserOpen ? " is-selected" : ""}`} aria-label="Toggle game browser" onClick={onToggleBrowser}>
          <SidebarIcon />
        </button>
        <span className="toolbar-separator" />
        <button className="icon-button" aria-label="Open SGF" onClick={onOpen} title="Open SGF (⌘O)">
          <FolderIcon />
        </button>
      </div>

      <div className="document-title" data-tauri-drag-region="deep">
        <span>{title}{dirty ? " •" : ""}</span>
        <small>{moveNumber === 0 ? "Ready to play" : `Move ${moveNumber}`}</small>
      </div>

      <div className="toolbar-group toolbar-group--trailing">
        <div className="history-controls" aria-label="Move history">
          <button className="icon-button icon-button--joined" aria-label="Previous move" onClick={onUndo} disabled={!canUndo}>
            <ChevronLeftIcon />
          </button>
          <button className="icon-button icon-button--joined" aria-label="Next move" onClick={onRedo} disabled={!canRedo}>
            <ChevronRightIcon />
          </button>
        </div>
        <button className="icon-button" aria-label="New game" onClick={onNewGame}>
          <RotateIcon />
        </button>
        <button
          className={`analysis-toggle${analysisEnabled ? " is-active" : ""}`}
          aria-pressed={analysisEnabled}
          onClick={onToggleAnalysis}
        >
          <SparklesIcon />
          Analysis
        </button>
        <button className="icon-button" aria-label="Save SGF" onClick={onSave} title="Save SGF (⌘S)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v6h8V4M8 20v-7h8v7"/></svg>
        </button>
        <button className="icon-button" aria-label="Settings" onClick={onSettings} title="Settings (⌘,)">
          <EllipsisIcon />
        </button>
      </div>
    </header>
  );
}
