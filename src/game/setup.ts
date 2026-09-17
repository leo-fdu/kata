import { newGame } from "./tree";
import type { GameTree } from "./tree";
import { boardIndex } from "../types/game";
import type { BoardPoint, StoneColor } from "../types/game";

export type PlayMode = "analysis" | "human-human" | "human-ai";
export type Handicap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface GameOptions { size: 9 | 13 | 19; mode: PlayMode; handicap: Handicap; humanColor: StoneColor; komi: number }

export function handicapPoints(size: 9 | 13 | 19, count: Handicap): BoardPoint[] {
  if (count < 2) return [];
  const low = size === 9 ? 2 : 3;
  const high = size - 1 - low;
  const mid = (size - 1) / 2;
  const points: BoardPoint[] = [
    { x: high, y: low }, { x: low, y: high },
    { x: high, y: high }, { x: low, y: low },
  ];
  if (count >= 5 && count % 2 === 1) points.push({ x: mid, y: mid });
  if (count >= 6) points.push({ x: low, y: mid }, { x: high, y: mid });
  if (count >= 8) points.push({ x: mid, y: low }, { x: mid, y: high });
  return points.slice(0, count);
}

export function createConfiguredGame(options: GameOptions): GameTree {
  const tree = newGame(options.size, options.komi);
  const points = handicapPoints(options.size, options.handicap);
  if (!points.length) return tree;
  const root = tree.nodes[tree.rootId];
  const board = [...root.board];
  for (const point of points) board[boardIndex(point, options.size)] = 1;
  const toSgf = (point: BoardPoint) => String.fromCharCode(97 + point.x, 97 + point.y);
  return { ...tree, nodes: { ...tree.nodes, [root.id]: { ...root, board, nextPlayer: "white",
    properties: { ...root.properties, HA: [String(points.length)], AB: points.map(toSgf), PL: ["W"] } } } };
}

export function gameFinished(tree: GameTree): boolean {
  const last = tree.nodes[tree.currentId];
  const previous = last.parentId ? tree.nodes[last.parentId] : null;
  return Boolean(last.move && last.move.point === null && previous?.move && previous.move.point === null);
}
