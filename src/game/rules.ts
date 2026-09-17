import { boardIndex, cellFor, emptyBoard, opposite } from "../types/game";
import type { Board, BoardPoint, Cell, Move, StoneColor } from "../types/game";

export interface BoardTransition { board: Board; captured: number; nextPlayer: StoneColor }

export function neighbors(point: BoardPoint, size: number): BoardPoint[] {
  const result: BoardPoint[] = [];
  if (point.x > 0) result.push({ x: point.x - 1, y: point.y });
  if (point.x + 1 < size) result.push({ x: point.x + 1, y: point.y });
  if (point.y > 0) result.push({ x: point.x, y: point.y - 1 });
  if (point.y + 1 < size) result.push({ x: point.x, y: point.y + 1 });
  return result;
}

function group(board: Board, point: BoardPoint, size: number): { stones: number[]; liberties: Set<number> } {
  const color = board[boardIndex(point, size)];
  const seen = new Set<number>();
  const liberties = new Set<number>();
  const queue = [point];
  while (queue.length) {
    const current = queue.pop()!;
    const index = boardIndex(current, size);
    if (seen.has(index)) continue;
    seen.add(index);
    for (const adjacent of neighbors(current, size)) {
      const next = boardIndex(adjacent, size);
      if (board[next] === 0) liberties.add(next);
      else if (board[next] === color && !seen.has(next)) queue.push(adjacent);
    }
  }
  return { stones: [...seen], liberties };
}

export function applyMove(board: Board, move: Move, size: number, priorBoards: Board[] = []): BoardTransition {
  if (board.length !== size * size) throw new Error("Board size does not match the game");
  if (move.point === null) return { board: [...board], captured: 0, nextPlayer: opposite(move.color) };
  const { x, y } = move.point;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= size || y >= size) {
    throw new Error("Move is outside the board");
  }
  const index = boardIndex(move.point, size);
  if (board[index] !== 0) throw new Error("That intersection is occupied");
  const next = [...board];
  next[index] = cellFor(move.color);
  let captured = 0;
  const enemy = cellFor(opposite(move.color));
  for (const adjacent of neighbors(move.point, size)) {
    if (next[boardIndex(adjacent, size)] !== enemy) continue;
    const neighborGroup = group(next, adjacent, size);
    if (neighborGroup.liberties.size === 0) {
      for (const stone of neighborGroup.stones) next[stone] = 0;
      captured += neighborGroup.stones.length;
    }
  }
  if (group(next, move.point, size).liberties.size === 0) throw new Error("Self-capture is not legal");
  // Positional superko for ordinary Chinese play; pass is intentionally exempt.
  if (priorBoards.some((old) => old.every((cell, i) => cell === next[i]))) {
    throw new Error("Ko: this move repeats an earlier board position");
  }
  return { board: next, captured, nextPlayer: opposite(move.color) };
}

export function boardToStones(board: Board, moveNumbers: Map<number, number>, size: number) {
  const stones = [];
  for (let index = 0; index < board.length; index += 1) {
    const cell: Cell = board[index];
    if (cell === 0) continue;
    stones.push({ x: index % size, y: Math.floor(index / size), color: cell === 1 ? "black" as const : "white" as const, moveNumber: moveNumbers.get(index) ?? 0 });
  }
  return stones;
}

export function setupBoard(size: number, black: BoardPoint[], white: BoardPoint[], empty: BoardPoint[] = []): Board {
  const board = emptyBoard(size);
  for (const point of black) board[boardIndex(point, size)] = 1;
  for (const point of white) board[boardIndex(point, size)] = 2;
  for (const point of empty) board[boardIndex(point, size)] = 0;
  return board;
}
