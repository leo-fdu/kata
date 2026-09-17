export interface Settings {
  executable: string;
  model: string;
  config: string;
  maxVisits: number;
  analysisInterval: number;
  threads: number;
  candidateCount: number;
  showOwnership: boolean;
  showWinrate: boolean;
  showScoreLead: boolean;
  showPv: boolean;
  showMoveNumbers: boolean;
  theme: "system" | "light" | "dark";
  boardAppearance: "warm" | "light";
  coordinateStyle: "gtp" | "sgf" | "none";
}

export const defaultSettings: Settings = {
  executable: "", model: "", config: "", maxVisits: 500,
  analysisInterval: 0.5, threads: 4, candidateCount: 5,
  showOwnership: false, showWinrate: true, showScoreLead: true,
  showPv: true, showMoveNumbers: false, theme: "system",
  boardAppearance: "warm", coordinateStyle: "gtp",
};
