import { applyMove } from "./rules";
import { emptyBoard } from "../types/game";
import type { Board, BoardPoint, Move, StoneColor } from "../types/game";

export interface GameNode {
  id: string;
  parentId: string | null;
  children: string[];
  selectedChild: string | null;
  move: Move | null;
  board: Board;
  nextPlayer: StoneColor;
  moveNumber: number;
  captured: number;
  comment: string;
  properties: Record<string, string[]>;
}

export interface GameTree {
  nodes: Record<string, GameNode>;
  rootId: string;
  currentId: string;
  nextId: number;
  size: number;
  komi: number;
  rules: string;
  title: string;
  filePath: string | null;
}

export function newGame(size = 19, komi = 7.5): GameTree {
  const root: GameNode = {
    id: "n0", parentId: null, children: [], selectedChild: null, move: null,
    board: emptyBoard(size), nextPlayer: "black", moveNumber: 0,
    captured: 0, comment: "", properties: {},
  };
  return { nodes: { n0: root }, rootId: "n0", currentId: "n0", nextId: 1,
    size, komi, rules: "chinese", title: "Untitled Game", filePath: null };
}

export const currentNode = (tree: GameTree) => tree.nodes[tree.currentId];

export function lineage(tree: GameTree, nodeId = tree.currentId): GameNode[] {
  const path: GameNode[] = [];
  let node: GameNode | undefined = tree.nodes[nodeId];
  while (node) {
    path.unshift(node);
    node = node.parentId ? tree.nodes[node.parentId] : undefined;
  }
  return path;
}

export function addMove(tree: GameTree, point: BoardPoint | null): GameTree {
  const parent = currentNode(tree);
  const color = parent.nextPlayer;
  const duplicate = parent.children.find((id) => {
    const existing = tree.nodes[id].move;
    return existing?.color === color &&
      (point === null ? existing.point === null : existing.point?.x === point.x && existing.point.y === point.y);
  });
  if (duplicate) return selectNode(tree, duplicate);
  const move: Move = { color, point };
  const history = lineage(tree).map((node) => node.board);
  const priorBoards = tree.rules.toLowerCase() === "japanese" ? history.slice(-2, -1) : history;
  const transition = applyMove(parent.board, move, tree.size, priorBoards);
  const id = `n${tree.nextId}`;
  const child: GameNode = {
    id, parentId: parent.id, children: [], selectedChild: null, move,
    board: transition.board, nextPlayer: transition.nextPlayer,
    moveNumber: parent.moveNumber + 1, captured: transition.captured,
    comment: "", properties: {},
  };
  return {
    ...tree, nextId: tree.nextId + 1, currentId: id,
    nodes: { ...tree.nodes, [parent.id]: { ...parent, children: [...parent.children, id], selectedChild: id }, [id]: child },
  };
}

export function selectNode(tree: GameTree, id: string): GameTree {
  if (!tree.nodes[id]) return tree;
  const nodes = { ...tree.nodes };
  let child = nodes[id];
  while (child.parentId) {
    const parent = nodes[child.parentId];
    nodes[parent.id] = { ...parent, selectedChild: child.id };
    child = parent;
  }
  return { ...tree, nodes, currentId: id };
}

export function previousNode(tree: GameTree): GameTree {
  const parentId = currentNode(tree).parentId;
  return parentId ? selectNode(tree, parentId) : tree;
}

export function nextNode(tree: GameTree): GameTree {
  const current = currentNode(tree);
  const id = current.selectedChild ?? current.children[0];
  return id ? selectNode(tree, id) : tree;
}

export function deleteVariation(tree: GameTree, id = tree.currentId): GameTree {
  const node = tree.nodes[id];
  if (!node?.parentId) return tree;
  const nodes = { ...tree.nodes };
  const remove = (target: string) => {
    for (const child of nodes[target].children) remove(child);
    delete nodes[target];
  };
  remove(id);
  const parent = nodes[node.parentId];
  const children = parent.children.filter((child) => child !== id);
  nodes[parent.id] = { ...parent, children, selectedChild: children[0] ?? null };
  return { ...tree, nodes, currentId: parent.id };
}

export function promoteVariation(tree: GameTree, id = tree.currentId): GameTree {
  const node = tree.nodes[id];
  if (!node?.parentId) return tree;
  const parent = tree.nodes[node.parentId];
  if (parent.children[0] === id) return tree;
  const children = [id, ...parent.children.filter((child) => child !== id)];
  return { ...tree, nodes: { ...tree.nodes, [parent.id]: { ...parent, children, selectedChild: id } } };
}

export function setComment(tree: GameTree, comment: string): GameTree {
  const node = currentNode(tree);
  return { ...tree, nodes: { ...tree.nodes, [node.id]: { ...node, comment } } };
}

export function setRootSetup(tree: GameTree, board: Board, nextPlayer: StoneColor): GameTree {
  const root = tree.nodes[tree.rootId];
  return { ...tree, nodes: { ...tree.nodes, [root.id]: { ...root, board, nextPlayer } } };
}

export function moveSequence(tree: GameTree, nodeId = tree.currentId): Move[] {
  return lineage(tree, nodeId).flatMap((node) => node.move ? [node.move] : []);
}

export function visibleLine(tree: GameTree): GameNode[] {
  const result: GameNode[] = [];
  let node: GameNode | undefined = tree.nodes[tree.rootId];
  while (node) {
    result.push(node);
    const nextId: string | null = node.selectedChild ?? node.children[0] ?? null;
    node = nextId ? tree.nodes[nextId] : undefined;
  }
  return result;
}
