import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { GameTree } from "../game/tree";
import { lineage } from "../game/tree";
import type { Settings } from "../settings/types";
import { defaultSettings } from "../settings/types";
import { pointToGtp } from "../types/game";
import type { Board } from "../types/game";

export interface EngineStatus { state: "stopped" | "starting" | "ready" | "error"; detail: string }
export interface CandidateMove { move: string; order: number; visits: number; scoreLead: number; winrate: number; pv: string[] }
export interface AnalysisResult {
  id: string;
  isDuringSearch?: boolean;
  noResults?: boolean;
  error?: string;
  warning?: string;
  rootInfo?: { currentPlayer: "B" | "W"; scoreLead: number; winrate: number; visits: number };
  moveInfos?: CandidateMove[];
  ownership?: number[];
  turnNumber?: number;
}

export interface OpenedSgf { path: string; contents: string }
export const desktopAvailable = isTauri();
let lifecycle = Promise.resolve();

function serializeLifecycle(task: () => Promise<void>): Promise<void> {
  const next = lifecycle.then(task, task);
  lifecycle = next.catch(() => {});
  return next;
}

export async function loadSettings(): Promise<Settings> {
  if (!desktopAvailable) {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem("kata-settings") ?? "{}") }; }
    catch { return defaultSettings; }
  }
  return invoke<Settings>("load_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!desktopAvailable) { localStorage.setItem("kata-settings", JSON.stringify(settings)); return; }
  await invoke("save_settings", { settings });
}

export async function chooseFile(kind: "executable" | "model" | "config"): Promise<string | null> {
  if (!desktopAvailable) throw new Error("Engine file selection requires the desktop app");
  return invoke<string | null>("choose_file", { kind });
}

export async function openSettingsWindow(): Promise<void> {
  if (!desktopAvailable) throw new Error("Native settings require the desktop app");
  await invoke("open_settings_window");
}

export async function restartEngine(): Promise<void> {
  if (!desktopAvailable) throw new Error("KataGo analysis requires the desktop app");
  await serializeLifecycle(() => invoke("restart_engine"));
}

export async function openSgfDialog(): Promise<OpenedSgf | null> {
  if (!desktopAvailable) throw new Error("Open SGF in the desktop app");
  return invoke<OpenedSgf | null>("open_sgf");
}

export async function saveSgfDialog(path: string | null, contents: string): Promise<string | null> {
  if (!desktopAvailable) throw new Error("Save SGF in the desktop app");
  return invoke<string | null>("save_sgf", { path, contents });
}

export async function startEngine(settings: Settings): Promise<void> {
  if (!desktopAvailable) throw new Error("KataGo analysis requires the desktop app");
  await serializeLifecycle(() => invoke("start_engine", { config: {
    executable: settings.executable, model: settings.model,
    config: settings.config, threads: settings.threads,
  } }));
}

export async function stopEngine(): Promise<void> {
  if (desktopAvailable) await serializeLifecycle(() => invoke("stop_engine"));
}

export async function sendQuery(query: Record<string, unknown>): Promise<void> {
  if (!desktopAvailable) return;
  await invoke("send_engine_query", { query });
}

export async function listenEngine(onResult: (result: AnalysisResult) => void,
  onStatus: (status: EngineStatus) => void, onLog: (line: string) => void) {
  if (!desktopAvailable) return () => {};
  const unlisten = await Promise.all([
    listen<AnalysisResult>("engine-message", (event) => onResult(event.payload)),
    listen<EngineStatus>("engine-status", (event) => onStatus(event.payload)),
    listen<string>("engine-log", (event) => onLog(event.payload)),
  ]);
  return () => unlisten.forEach((dispose) => dispose());
}

function stonesFromBoard(board: Board, size: number): ["B" | "W", string][] {
  const result: ["B" | "W", string][] = [];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const cell = board[y * size + x];
    if (cell) result.push([cell === 1 ? "B" : "W", pointToGtp({ x, y }, size)]);
  }
  return result;
}

export function analysisQuery(tree: GameTree, settings: Settings, id: string, nodeId = tree.currentId) {
  const path = lineage(tree, nodeId);
  const root = path[0];
  const hasIntermediateSetup = path.slice(1).some((node) => node.properties.AB || node.properties.AW || node.properties.AE);
  const initialStones = stonesFromBoard(hasIntermediateSetup ? path.at(-1)!.board : root.board, tree.size);
  const moves = hasIntermediateSetup ? [] : path.slice(1).flatMap((node) => node.move ? [[node.move.color === "black" ? "B" : "W", pointToGtp(node.move.point, tree.size)]] : []);
  const rules = ["chinese", "japanese", "aga", "new zealand", "tromp-taylor"].includes(tree.rules.toLowerCase()) ? tree.rules.toLowerCase() : "chinese";
  return {
    id, initialStones, moves, initialPlayer: hasIntermediateSetup ? (path.at(-1)!.nextPlayer === "black" ? "B" : "W") : (root.nextPlayer === "black" ? "B" : "W"),
    rules, komi: tree.komi, boardXSize: tree.size, boardYSize: tree.size,
    maxVisits: settings.maxVisits, analysisPVLen: 15,
    includeOwnership: settings.showOwnership,
    reportDuringSearchEvery: settings.analysisInterval,
  };
}
