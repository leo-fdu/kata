import { useCallback, useMemo, useRef, useState } from "react";
import { boardToStones } from "../game/rules";
import { addMove, currentNode, deleteVariation, lineage, newGame, nextNode, previousNode, promoteVariation, selectNode, setComment, visibleLine } from "../game/tree";
import type { GameTree } from "../game/tree";
import { parseSgf } from "../sgf/sgf";
import { boardIndex, pointKey } from "../types/game";
import type { BoardPoint } from "../types/game";

export function useGame() {
  const [tree, setTree] = useState<GameTree>(() => newGame());
  const treeRef = useRef(tree);
  treeRef.current = tree;
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const node = currentNode(tree);
  const path = useMemo(() => lineage(tree), [tree]);
  const line = useMemo(() => visibleLine(tree), [tree]);
  const moveNumbers = useMemo(() => {
    const numbers = new Map<number, number>();
    for (const item of path) {
      for (const [index] of numbers) if (item.board[index] === 0) numbers.delete(index);
      if (!item.move?.point) continue;
      numbers.set(boardIndex(item.move.point, tree.size), item.moveNumber);
    }
    return numbers;
  }, [path, tree.size]);
  const stones = useMemo(() => boardToStones(node.board, moveNumbers, tree.size), [node.board, moveNumbers, tree.size]);
  const occupiedPoints = useMemo(() => new Set(stones.map(pointKey)), [stones]);
  const lastMove = node.move?.point ? stones.find((stone) => pointKey(stone) === pointKey(node.move!.point!)) : undefined;

  const playMove = useCallback((point: BoardPoint | null) => {
    try {
      const next = addMove(treeRef.current, point);
      treeRef.current = next;
      setTree(next);
      setError(null);
      setDirty(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  const openSgf = useCallback((text: string, filePath: string | null) => {
    const loaded = parseSgf(text);
    const next = { ...loaded, filePath, title: loaded.title === "Untitled Game" && filePath ? filePath.split("/").at(-1)!.replace(/\.sgf$/i, "") : loaded.title };
    treeRef.current = next;
    setTree(next);
    setError(null);
    setDirty(false);
  }, []);

  const replaceTree = useCallback((next: GameTree, isDirty = true) => {
    treeRef.current = next;
    setTree(next);
    setDirty(isDirty);
    setError(null);
  }, []);

  const newGameAction = useCallback((size = 19, komi = 7.5) => {
    const next = newGame(size, komi);
    treeRef.current = next;
    setTree(next);
    setDirty(false);
    setError(null);
  }, []);

  return {
    tree, node, path, line, stones, occupiedPoints, lastMove,
    nextPlayer: node.nextPlayer, error, setError, dirty, setDirty,
    playMove, openSgf, replaceTree,
    undo: () => { const next = previousNode(treeRef.current); treeRef.current = next; setTree(next); },
    redo: () => { const next = nextNode(treeRef.current); treeRef.current = next; setTree(next); },
    jumpTo: (id: string) => { const next = selectNode(treeRef.current, id); treeRef.current = next; setTree(next); },
    deleteCurrentVariation: () => { const next = deleteVariation(treeRef.current); treeRef.current = next; setTree(next); setDirty(true); },
    promoteCurrentVariation: () => { const next = promoteVariation(treeRef.current); treeRef.current = next; setTree(next); setDirty(true); },
    setComment: (comment: string) => { const next = setComment(treeRef.current, comment); treeRef.current = next; setTree(next); setDirty(true); },
    newGame: newGameAction,
  };
}
