export type StoneColor = "black" | "white";
export type Cell = 0 | 1 | 2;
export interface BoardPoint { x: number; y: number }
export interface Move { color: StoneColor; point: BoardPoint | null }
export interface Stone extends BoardPoint { color: StoneColor; moveNumber: number }
export type Board = Cell[];
export const BOARD_SIZE = 19;
export const pointKey = ({ x, y }: BoardPoint) => `${x}:${y}`;
export const cellFor = (color: StoneColor): Cell => color === "black" ? 1 : 2;
export const opposite = (color: StoneColor): StoneColor => color === "black" ? "white" : "black";
export const boardIndex = ({ x, y }: BoardPoint, size = BOARD_SIZE) => y * size + x;
export const emptyBoard = (size = BOARD_SIZE): Board => Array<Cell>(size * size).fill(0);
export const GTP_COLUMNS = "ABCDEFGHJKLMNOPQRST";

export function pointToGtp(point: BoardPoint | null, size = BOARD_SIZE): string {
  if (!point) return "pass";
  return `${GTP_COLUMNS[point.x]}${size - point.y}`;
}

export function gtpToPoint(value: string, size = BOARD_SIZE): BoardPoint | null {
  if (value.toLowerCase() === "pass") return null;
  const match = /^([A-HJ-T])(\d{1,2})$/i.exec(value);
  if (!match) throw new Error(`Invalid KataGo coordinate: ${value}`);
  const x = GTP_COLUMNS.indexOf(match[1].toUpperCase());
  const y = size - Number(match[2]);
  if (x < 0 || x >= size || y < 0 || y >= size) throw new Error(`Coordinate outside board: ${value}`);
  return { x, y };
}
