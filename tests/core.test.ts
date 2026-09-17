import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMove } from "../src/game/rules";
import { addMove, currentNode, deleteVariation, newGame, previousNode, promoteVariation, selectNode } from "../src/game/tree";
import { parseSgf, serializeSgf } from "../src/sgf/sgf";
import { boardIndex, emptyBoard } from "../src/types/game";
import { createConfiguredGame, gameFinished, handicapPoints } from "../src/game/setup";
import { candidateFill, candidateWinrate } from "../src/analysis/candidateVisual";

test("captures a surrounded group", () => {
  const board = emptyBoard(5);
  board[boardIndex({ x: 1, y: 1 }, 5)] = 2;
  for (const point of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 }]) board[boardIndex(point, 5)] = 1;
  const result = applyMove(board, { color: "black", point: { x: 1, y: 2 } }, 5);
  assert.equal(result.captured, 1);
  assert.equal(result.board[boardIndex({ x: 1, y: 1 }, 5)], 0);
});

test("rejects occupied and suicidal moves", () => {
  const board = emptyBoard(5);
  board[boardIndex({ x: 2, y: 2 }, 5)] = 1;
  assert.throws(() => applyMove(board, { color: "white", point: { x: 2, y: 2 } }, 5), /occupied/);
  board[boardIndex({ x: 2, y: 2 }, 5)] = 0;
  for (const point of [{ x: 2, y: 1 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }]) board[boardIndex(point, 5)] = 1;
  assert.throws(() => applyMove(board, { color: "white", point: { x: 2, y: 2 } }, 5), /Self-capture/);
});

test("rejects immediate ko recapture but allows pass", () => {
  const board = emptyBoard(5);
  for (const point of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 }]) board[boardIndex(point, 5)] = 1;
  for (const point of [{ x: 1, y: 1 }, { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 3 }]) board[boardIndex(point, 5)] = 2;
  const capture = applyMove(board, { color: "black", point: { x: 1, y: 2 } }, 5, [board]);
  assert.equal(capture.captured, 1);
  assert.throws(() => applyMove(capture.board, { color: "white", point: { x: 1, y: 1 } }, 5, [board, capture.board]), /Ko/);
  assert.deepEqual(applyMove(capture.board, { color: "white", point: null }, 5).board, capture.board);
});

test("keeps branching variations and lets one be deleted", () => {
  let tree = newGame();
  tree = addMove(tree, { x: 3, y: 3 });
  const first = tree.currentId;
  tree = addMove(tree, { x: 15, y: 15 });
  const branchA = tree.currentId;
  tree = previousNode(tree);
  tree = addMove(tree, { x: 14, y: 15 });
  const branchB = tree.currentId;
  assert.deepEqual(tree.nodes[first].children, [branchA, branchB]);
  tree = promoteVariation(tree);
  assert.deepEqual(tree.nodes[first].children, [branchB, branchA]);
  tree = selectNode(tree, branchA);
  assert.equal(currentNode(tree).move?.point?.x, 15);
  tree = deleteVariation(tree);
  assert.deepEqual(tree.nodes[first].children, [branchB]);
});

test("imports and exports SGF setup, comments, and branches", () => {
  const source = "(;GM[1]FF[4]SZ[9]KM[6.5]GN[Test]AB[cc]PL[W];W[dd]C[hello\\]world](;B[ee])(;B[ff]))";
  const tree = parseSgf(source);
  assert.equal(tree.size, 9);
  assert.equal(tree.komi, 6.5);
  assert.equal(tree.nodes[tree.rootId].board[boardIndex({ x: 2, y: 2 }, 9)], 1);
  const whiteId = tree.nodes[tree.rootId].children[0];
  assert.equal(tree.nodes[whiteId].comment, "hello]world");
  assert.equal(tree.nodes[whiteId].children.length, 2);
  const roundtrip = parseSgf(serializeSgf(tree));
  assert.equal(roundtrip.nodes[roundtrip.nodes[roundtrip.rootId].children[0]].children.length, 2);
  assert.equal(roundtrip.nodes[roundtrip.rootId].board[boardIndex({ x: 2, y: 2 }, 9)], 1);
});

test("configures even, black-first, and fixed handicap games", () => {
  for (const size of [9, 13, 19] as const) {
    for (const handicap of [0, 1, 2, 5, 9] as const) {
      const game = createConfiguredGame({ size, mode: "human-ai", handicap, humanColor: "white", komi: handicap ? 0.5 : 7.5 });
      const root = game.nodes[game.rootId];
      assert.equal(root.board.filter((cell) => cell === 1).length, handicap >= 2 ? handicap : 0);
      assert.equal(root.nextPlayer, handicap >= 2 ? "white" : "black");
      assert.equal(new Set(handicapPoints(size, handicap).map((point) => `${point.x}:${point.y}`)).size, handicap >= 2 ? handicap : 0);
      const parsed = parseSgf(serializeSgf(game));
      assert.deepEqual(parsed.nodes[parsed.rootId].board, root.board);
      assert.equal(parsed.nodes[parsed.rootId].nextPlayer, root.nextPlayer);
      if (handicap >= 2) assert.equal(parsed.nodes[parsed.rootId].properties.HA[0], String(handicap));
    }
  }
});

test("two passes end a playable game", () => {
  const first = addMove(newGame(9), null);
  assert.equal(gameFinished(first), false);
  const second = addMove(first, null);
  assert.equal(gameFinished(second), true);
});

test("candidate winrate is from the player to move and better moves are darker green", () => {
  const move = { move: "D4", order: 0, visits: 30, scoreLead: 0, winrate: 0.73, pv: [] };
  assert.equal(candidateWinrate(move, "black"), 0.73);
  assert.equal(candidateWinrate(move, "white"), 0.27);
  assert.equal(candidateFill(0.8), "hsl(146 50% 40%)");
  assert.equal(candidateFill(0.2), "hsl(146 50% 66%)");
});
