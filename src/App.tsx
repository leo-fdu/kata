import { useCallback, useEffect, useRef, useState } from "react";
import { AnalysisPanel } from "./analysis/AnalysisPanel";
import { GoBoard } from "./board/GoBoard";
import { Titlebar } from "./components/Titlebar";
import { listen } from "@tauri-apps/api/event";
import { desktopAvailable, openSettingsWindow, openSgfDialog, saveSgfDialog, sendQuery } from "./engine/client";
import { NewGamePane } from "./game/NewGamePane";
import { ConfirmDiscardPane } from "./game/ConfirmDiscardPane";
import { createConfiguredGame, gameFinished } from "./game/setup";
import type { GameOptions, PlayMode } from "./game/setup";
import { VariationBrowser } from "./game/VariationBrowser";
import { useGame } from "./hooks/useGame";
import { useEngine } from "./hooks/useEngine";
import { serializeSgf } from "./sgf/sgf";
import { SettingsPane } from "./settings/SettingsPane";
import { primaryModifierPressed } from "./platform";

export function App() {
  const game = useGame();
  const [analysisEnabled, setAnalysisEnabled] = useState(true);
  const [playMode, setPlayMode] = useState<PlayMode>("analysis");
  const [humanColor, setHumanColor] = useState<"black" | "white">("black");
  const finished = gameFinished(game.tree);
  const aiTurn = playMode === "human-ai" && !finished && game.node.children.length === 0 && game.nextPlayer !== humanColor;
  const engine = useEngine(game.tree, analysisEnabled, aiTurn, game.playMove);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"new" | "open" | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [previewPv, setPreviewPv] = useState<string[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = engine.settings.theme;
    document.documentElement.dataset.boardAppearance = engine.settings.boardAppearance;
  }, [engine.settings.theme, engine.settings.boardAppearance]);

  const toggleAnalysis = useCallback(() => {
    setAnalysisEnabled((current) => !current);
  }, []);

  const openSettings = useCallback(() => {
    if (!desktopAvailable) { setSettingsOpen(true); return; }
    void openSettingsWindow().catch((error) => game.setError(String(error)));
  }, [game.setError]);

  const openGame = useCallback(async (confirmed = false) => {
    if (game.dirty && !confirmed) { setConfirmAction("open"); return; }
    try {
      if (!desktopAvailable) { uploadRef.current?.click(); return; }
      const opened = await openSgfDialog();
      if (opened) { game.openSgf(opened.contents, opened.path); setPlayMode("analysis"); setBrowserOpen(true); }
    } catch (error) { game.setError(String(error)); }
  }, [game.dirty, game.openSgf, game.setError]);

  const saveGame = useCallback(async (saveAs = false) => {
    try {
      const contents = serializeSgf(game.tree);
      if (!desktopAvailable) {
        const url = URL.createObjectURL(new Blob([contents], { type: "application/x-go-sgf" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${game.tree.title || "Untitled Game"}.sgf`;
        anchor.click();
        URL.revokeObjectURL(url);
        game.setDirty(false);
        return;
      }
      const path = await saveSgfDialog(saveAs ? null : game.tree.filePath, contents);
      if (path) game.replaceTree({ ...game.tree, filePath: path, title: game.tree.title === "Untitled Game" ? path.split("/").at(-1)!.replace(/\.sgf$/i, "") : game.tree.title }, false);
    } catch (error) { game.setError(String(error)); }
  }, [game.tree, game.replaceTree, game.setDirty, game.setError]);

  const startNewGame = useCallback(() => {
    if (game.dirty) { setConfirmAction("new"); return; }
    setNewGameOpen(true);
  }, [game.dirty]);

  const createGame = useCallback((options: GameOptions) => {
    game.replaceTree(createConfiguredGame(options), false);
    setPlayMode(options.mode);
    setHumanColor(options.humanColor);
    setNewGameOpen(false);
    setBrowserOpen(false);
    setPreviewPv([]);
  }, [game.replaceTree]);

  useEffect(() => {
    if (!desktopAvailable) return;
    let dispose: (() => void) | undefined;
    let mounted = true;
    listen<string>("menu-action", (event) => {
      switch (event.payload) {
        case "new-game": startNewGame(); break;
        case "open": void openGame(); break;
        case "save": void saveGame(); break;
        case "save-as": void saveGame(true); break;
        case "previous": game.undo(); break;
        case "next": game.redo(); break;
        case "settings": openSettings(); break;
        case "variations": setBrowserOpen((current) => !current); break;
        case "analysis": toggleAnalysis(); break;
      }
    }).then((cleanup) => { if (mounted) dispose = cleanup; else cleanup(); });
    return () => { mounted = false; dispose?.(); };
  }, [startNewGame, openGame, saveGame, game.undo, game.redo, toggleAnalysis, openSettings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      const key = event.key.toLowerCase();
      const primaryModifier = primaryModifierPressed(event);
      if (primaryModifier && key === "o") { event.preventDefault(); void openGame(); return; }
      if (primaryModifier && key === "s") { event.preventDefault(); void saveGame(event.shiftKey); return; }
      if (primaryModifier && key === "n") { event.preventDefault(); startNewGame(); return; }
      if (primaryModifier && key === ",") { event.preventDefault(); openSettings(); return; }
      if (event.key === "ArrowLeft" || (primaryModifier && key === "z" && !event.shiftKey)) {
        event.preventDefault();
        game.undo();
      }
      if (event.key === "ArrowRight" || (primaryModifier && key === "z" && event.shiftKey)) {
        event.preventDefault();
        game.redo();
      }
      if (event.code === "Space" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        toggleAnalysis();
      }
      if (event.key === "Escape") { setSettingsOpen(false); setNewGameOpen(false); setConfirmAction(null); setPreviewPv([]); }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.undo, game.redo, openGame, saveGame, startNewGame, toggleAnalysis, openSettings]);

  useEffect(() => {
    if (!analysisEnabled && !aiTurn && engine.status.state === "ready") void sendQuery({ id: "pause", action: "terminate_all" });
  }, [analysisEnabled, aiTurn, engine.status.state]);

  const result = analysisEnabled ? engine.currentResult : undefined;
  const candidates = result?.moveInfos?.slice().sort((a, b) => a.order - b.order).slice(0, engine.settings.candidateCount) ?? [];

  return (
    <div className="app-shell">
      <input ref={uploadRef} className="visually-hidden" type="file" accept=".sgf" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try { game.openSgf(await file.text(), null); setPlayMode("analysis"); setBrowserOpen(true); }
        catch (error) { game.setError(String(error)); }
        event.target.value = "";
      }} />
      <Titlebar
        title={game.tree.title}
        dirty={game.dirty}
        moveNumber={game.node.moveNumber}
        analysisEnabled={analysisEnabled}
        canUndo={game.node.parentId !== null}
        canRedo={game.node.children.length > 0}
        browserOpen={browserOpen}
        onToggleBrowser={() => setBrowserOpen((current) => !current)}
        onOpen={() => void openGame()}
        onSave={() => void saveGame()}
        onNewGame={startNewGame}
        onUndo={game.undo}
        onRedo={game.redo}
        onSettings={openSettings}
        onToggleAnalysis={toggleAnalysis}
      />

      <main className={`workspace${browserOpen ? " workspace--browser-open" : ""}`}>
        {browserOpen && <VariationBrowser tree={game.tree} onSelect={game.jumpTo}
          onDelete={game.deleteCurrentVariation} onPromote={game.promoteCurrentVariation} onComment={game.setComment} />}
        <section className="board-workspace">
          <div className="board-context">
            <div>
              <span className={`player-dot player-dot--${game.nextPlayer}`} />
              <span>{finished ? "Game finished · two passes" : aiTurn ? `KataGo (${game.nextPlayer}) thinking…` : `${game.nextPlayer === "black" ? "Black" : "White"} to play`}</span>
              <button className="pass-button" disabled={aiTurn || finished} onClick={() => game.playMove(null)} title="Pass current turn">Pass</button>
            </div>
            <span>{playMode === "human-ai" ? "Human vs KataGo" : playMode === "human-human" ? "Human vs Human" : "Analysis"} · {game.tree.size} × {game.tree.size} · Komi {game.tree.komi}</span>
          </div>
          <div className="board-stage">
            <GoBoard
              size={game.tree.size}
              stones={game.stones}
              nextPlayer={game.nextPlayer}
              lastMove={game.lastMove}
              occupiedPoints={game.occupiedPoints}
              onPlayMove={game.playMove}
              disabled={aiTurn || finished}
              candidates={candidates}
              ownership={engine.settings.showOwnership ? result?.ownership : undefined}
              previewPv={previewPv}
              showMoveNumbers={engine.settings.showMoveNumbers}
              coordinateStyle={engine.settings.coordinateStyle}
            />
          </div>
        </section>

        <AnalysisPanel
          enabled={analysisEnabled}
          nextPlayer={game.nextPlayer}
          moveNumber={game.node.moveNumber}
          hasSetupStones={game.tree.nodes[game.tree.rootId].board.some((cell) => cell !== 0)}
          size={game.tree.size}
          komi={game.tree.komi}
          rules={game.tree.rules}
          status={engine.status}
          result={result}
          settings={engine.settings}
          onSettings={openSettings}
          onPreviewPv={setPreviewPv}
        />
      </main>
      {game.error && <div className="error-banner" role="alert">{game.error}<button onClick={() => game.setError(null)}>Dismiss</button></div>}
      {settingsOpen && <SettingsPane settings={engine.settings} onSave={engine.updateSettings}
        onClose={() => setSettingsOpen(false)} onRestart={engine.restart}
        engineLog={engine.log} />}
      {newGameOpen && <NewGamePane onCreate={createGame} onClose={() => setNewGameOpen(false)} />}
      {confirmAction && <ConfirmDiscardPane action={confirmAction} onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === "new") setNewGameOpen(true);
          else void openGame(true);
        }} />}
    </div>
  );
}
