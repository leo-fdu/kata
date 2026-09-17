import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { analysisQuery, desktopAvailable, listenEngine, loadSettings, saveSettings, sendQuery, startEngine, stopEngine } from "../engine/client";
import type { AnalysisResult, EngineStatus } from "../engine/client";
import type { GameTree } from "../game/tree";
import { gtpToPoint } from "../types/game";
import type { BoardPoint } from "../types/game";
import type { Settings } from "../settings/types";
import { defaultSettings } from "../settings/types";

type RequestKind = "position" | "ai";
interface ActiveRequest { id: string; nodeId: string; kind: RequestKind }

export function useEngine(tree: GameTree, enabled: boolean, aiTurn: boolean, onAiMove: (point: BoardPoint | null) => void) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<EngineStatus>({ state: "stopped", detail: "Engine not configured" });
  const [log, setLog] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const active = useRef<ActiveRequest | null>(null);
  const requestNumber = useRef(0);
  const treeRef = useRef(tree);
  const onAiMoveRef = useRef(onAiMove);
  treeRef.current = tree;
  onAiMoveRef.current = onAiMove;
  const rootBoard = tree.nodes[tree.rootId].board;

  useEffect(() => {
    active.current = null;
    setResults({});
  }, [rootBoard]);

  useEffect(() => {
    let live = true;
    loadSettings().then((value) => {
      if (!live) return;
      setSettings(value);
      setLoaded(true);
    }).catch((error) => {
      if (live) { setStatus({ state: "error", detail: String(error) }); setLoaded(true); }
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!desktopAvailable) return;
    let dispose: (() => void) | undefined;
    let mounted = true;
    listen<Settings>("settings-changed", (event) => setSettings(event.payload)).then((cleanup) => {
      if (mounted) dispose = cleanup;
      else cleanup();
    });
    return () => { mounted = false; dispose?.(); };
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let mounted = true;
    listenEngine((result) => {
      if (result.error) { setStatus({ state: "error", detail: result.error }); return; }
      if (result.warning) { setLog((items) => [...items.slice(-49), result.warning!]); return; }
      const request = active.current;
      if (!request || result.id !== request.id) return;
      if (result.noResults) {
        if (request.kind === "ai") setStatus({ state: "error", detail: "KataGo returned no move for this position" });
        return;
      }
      if (result.rootInfo) setResults((current) => ({ ...current, [request.nodeId]: result }));
      if (result.isDuringSearch) return;
      active.current = null;
      if (request.kind === "ai") {
        const choice = result.moveInfos?.slice().sort((a, b) => a.order - b.order)[0];
        if (!choice) { setStatus({ state: "error", detail: "KataGo did not return a legal move" }); return; }
        try { onAiMoveRef.current(gtpToPoint(choice.move, treeRef.current.size)); }
        catch (error) { setStatus({ state: "error", detail: String(error) }); }
      }
    }, setStatus, (line) => setLog((items) => [...items.slice(-49), line])).then((cleanup) => {
      if (mounted) { dispose = cleanup; setListening(true); }
      else cleanup();
    });
    return () => { mounted = false; dispose?.(); };
  }, []);

  const start = useCallback(async (next = settings) => {
    try {
      setStatus({ state: "starting", detail: "Loading KataGo…" });
      setLog([]);
      active.current = null;
      setResults({});
      await startEngine(next);
    } catch (error) {
      setStatus({ state: "error", detail: String(error) });
    }
  }, [settings]);

  useEffect(() => {
    if (!loaded || !listening || !desktopAvailable) return;
    if (!settings.executable || !settings.model || !settings.config) return;
    void start(settings);
    return () => { void stopEngine(); };
    // Engine is intentionally restarted only when selected files or thread count change.
  }, [loaded, listening, settings.executable, settings.model, settings.config, settings.threads]);

  useEffect(() => {
    if (status.state !== "ready") return;
    const kind: RequestKind = aiTurn ? "ai" : "position";
    if (kind === "position" && !enabled) return;
    const nodeId = tree.currentId;
    const id = `${kind}-${++requestNumber.current}`;
    active.current = { id, nodeId, kind };
    void sendQuery({ id: `stop-${id}`, action: "terminate_all" })
      .then(() => active.current?.id === id ? sendQuery(analysisQuery(treeRef.current, settings, id, nodeId)) : undefined)
      .catch((error) => setStatus({ state: "error", detail: String(error) }));
    return () => { if (active.current?.id === id) active.current = null; };
  }, [rootBoard, tree.currentId, tree.komi, tree.rules, settings.maxVisits, settings.analysisInterval, settings.showOwnership, status.state, enabled, aiTurn]);

  const updateSettings = useCallback(async (next: Settings) => {
    await saveSettings(next);
    setSettings(next);
  }, []);

  const restart = useCallback(async () => {
    await stopEngine();
    await start(settings);
  }, [settings, start]);

  return { settings, updateSettings, loaded, status, log, results,
    currentResult: results[tree.currentId], start, restart, stop: stopEngine };
}
