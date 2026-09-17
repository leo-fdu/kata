import { applyMove } from "../game/rules";
import { lineage, newGame, selectNode } from "../game/tree";
import type { GameNode, GameTree } from "../game/tree";
import { boardIndex, cellFor, opposite } from "../types/game";
import type { Board, BoardPoint, Move, StoneColor } from "../types/game";

type Properties = Record<string, string[]>;
interface SgfNode { properties: Properties; children: SgfNode[] }

class Parser {
  private cursor = 0;
  constructor(private readonly source: string) {}
  private skipSpace() { while (/\s/.test(this.source[this.cursor] ?? "")) this.cursor += 1; }
  private value(): string {
    if (this.source[this.cursor++] !== "[") throw new Error("Expected SGF property value");
    let result = "";
    while (this.cursor < this.source.length) {
      const char = this.source[this.cursor++];
      if (char === "]") return result;
      if (char === "\\") {
        const next = this.source[this.cursor++];
        if (next === "\r" && this.source[this.cursor] === "\n") this.cursor += 1;
        else if (next !== "\n" && next !== "\r") result += next;
      } else result += char;
    }
    throw new Error("Unterminated SGF property value");
  }
  private node(): SgfNode {
    if (this.source[this.cursor++] !== ";") throw new Error("Expected SGF node");
    const properties: Properties = {};
    while (true) {
      this.skipSpace();
      if (!/[A-Za-z]/.test(this.source[this.cursor] ?? "")) break;
      let name = "";
      while (/[A-Za-z]/.test(this.source[this.cursor] ?? "")) name += this.source[this.cursor++];
      name = name.toUpperCase();
      this.skipSpace();
      const values: string[] = [];
      while (this.source[this.cursor] === "[") {
        values.push(this.value());
        this.skipSpace();
      }
      if (!values.length) throw new Error(`SGF property ${name} has no value`);
      properties[name] = [...(properties[name] ?? []), ...values];
    }
    return { properties, children: [] };
  }
  private tree(): SgfNode {
    this.skipSpace();
    if (this.source[this.cursor++] !== "(") throw new Error("Expected SGF game tree");
    this.skipSpace();
    if (this.source[this.cursor] !== ";") throw new Error("SGF game tree has no root node");
    const root = this.node();
    let last = root;
    while (true) {
      this.skipSpace();
      if (this.source[this.cursor] === ";") {
        const next = this.node();
        last.children.push(next);
        last = next;
      } else if (this.source[this.cursor] === "(") {
        last.children.push(this.tree());
      } else if (this.source[this.cursor] === ")") {
        this.cursor += 1;
        return root;
      } else throw new Error(`Unexpected SGF character at position ${this.cursor}`);
    }
  }
  parse(): SgfNode {
    const root = this.tree();
    this.skipSpace();
    if (this.cursor !== this.source.length) throw new Error("Only one SGF game is supported per file");
    return root;
  }
}

export function sgfPoint(value: string, size: number): BoardPoint | null {
  if (!value || (value === "tt" && size <= 19)) return null;
  if (value.length !== 2) throw new Error(`Invalid SGF point: ${value}`);
  const x = value.charCodeAt(0) - 97;
  const y = value.charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x >= size || y >= size) throw new Error(`SGF point outside board: ${value}`);
  return { x, y };
}

export function pointToSgf(point: BoardPoint | null): string {
  if (!point) return "";
  return String.fromCharCode(97 + point.x, 97 + point.y);
}

function setupPoints(values: string[] | undefined, size: number): BoardPoint[] {
  const result: BoardPoint[] = [];
  for (const value of values ?? []) {
    if (value.includes(":")) {
      const [first, last] = value.split(":").map((part) => sgfPoint(part, size));
      if (!first || !last) throw new Error(`Invalid SGF setup range: ${value}`);
      for (let y = first.y; y <= last.y; y += 1) for (let x = first.x; x <= last.x; x += 1) result.push({ x, y });
    } else {
      const point = sgfPoint(value, size);
      if (point) result.push(point);
    }
  }
  return result;
}

function applySetup(board: Board, properties: Properties, size: number): Board {
  const next = [...board];
  for (const name of ["AB", "AW", "AE"] as const) {
    for (const point of setupPoints(properties[name], size)) {
      next[boardIndex(point, size)] = name === "AE" ? 0 : cellFor(name === "AB" ? "black" : "white");
    }
  }
  return next;
}

function appendNode(tree: GameTree, parentId: string, source: SgfNode): [GameTree, string] {
  const parent = tree.nodes[parentId];
  const properties = source.properties;
  const moveColor: StoneColor | null = properties.B ? "black" : properties.W ? "white" : null;
  const point = moveColor ? sgfPoint(properties[moveColor === "black" ? "B" : "W"][0], tree.size) : null;
  const move: Move | null = moveColor ? { color: moveColor, point } : null;
  let board = parent.board;
  let captured = 0;
  let nextPlayer = parent.nextPlayer;
  if (move) {
    const history = lineage(tree, parentId).map((node) => node.board);
    const priorBoards = tree.rules.toLowerCase() === "japanese" ? history.slice(-2, -1) : history;
    const transition = applyMove(parent.board, move, tree.size, priorBoards);
    board = transition.board;
    captured = transition.captured;
    nextPlayer = transition.nextPlayer;
  }
  board = applySetup(board, properties, tree.size);
  if (properties.PL?.[0] === "B") nextPlayer = "black";
  if (properties.PL?.[0] === "W") nextPlayer = "white";
  const id = `n${tree.nextId}`;
  const node: GameNode = {
    id, parentId, children: [], selectedChild: null, move, board, nextPlayer,
    moveNumber: parent.moveNumber + (move ? 1 : 0), captured,
    comment: properties.C?.[0] ?? "", properties,
  };
  const nodes = { ...tree.nodes, [id]: node, [parentId]: {
    ...parent, children: [...parent.children, id], selectedChild: parent.selectedChild ?? id,
  } };
  return [{ ...tree, nodes, nextId: tree.nextId + 1 }, id];
}

export function parseSgf(text: string): GameTree {
  const parsed = new Parser(text.replace(/^\uFEFF/, "")).parse();
  const rootProps = parsed.properties;
  const sizeText = rootProps.SZ?.[0] ?? "19";
  if (sizeText.includes(":")) throw new Error("Rectangular SGF boards are not supported");
  const size = Number(sizeText);
  if (![9, 13, 19].includes(size)) throw new Error("Supported SGF board sizes are 9, 13, and 19");
  const komi = Number(rootProps.KM?.[0] ?? "7.5");
  if (!Number.isFinite(komi)) throw new Error("Invalid SGF komi");
  let tree = newGame(size, komi);
  const root = tree.nodes[tree.rootId];
  const board = applySetup(root.board, rootProps, size);
  const firstPlayer: StoneColor = rootProps.PL?.[0] === "W" || (rootProps.HA && Number(rootProps.HA[0]) > 1) ? "white" : "black";
  tree = {
    ...tree, rules: rootProps.RU?.[0]?.toLowerCase() ?? "chinese",
    title: rootProps.GN?.[0] || "Untitled Game",
    nodes: { ...tree.nodes, [root.id]: { ...root, board, nextPlayer: firstPlayer,
      comment: rootProps.C?.[0] ?? "", properties: rootProps } },
  };
  const visit = (parentId: string, child: SgfNode): void => {
    const [updated, id] = appendNode(tree, parentId, child);
    tree = updated;
    for (const next of child.children) visit(id, next);
  };
  for (const child of parsed.children) visit(tree.rootId, child);
  tree = selectNode(tree, tree.rootId);
  return tree;
}

function escaped(value: string) { return value.replace(/\\/g, "\\\\").replace(/\]/g, "\\]"); }
function propertiesToText(properties: Properties) {
  return Object.entries(properties).map(([name, values]) => `${name}${values.map((value) => `[${escaped(value)}]`).join("")}`).join("");
}

export function serializeSgf(tree: GameTree): string {
  const root = tree.nodes[tree.rootId];
  const rootProperties: Properties = {
    ...root.properties, FF: ["4"], GM: ["1"], CA: ["UTF-8"],
    SZ: [String(tree.size)], KM: [String(tree.komi)], RU: [tree.rules],
    GN: [tree.title],
  };
  if (root.comment) rootProperties.C = [root.comment];
  else delete rootProperties.C;
  const encodeNode = (node: GameNode): string => {
    const properties = { ...node.properties };
    if (node.move) {
      delete properties.B;
      delete properties.W;
      properties[node.move.color === "black" ? "B" : "W"] = [pointToSgf(node.move.point)];
    }
    if (node.comment) properties.C = [node.comment];
    else delete properties.C;
    return `;${propertiesToText(properties)}`;
  };
  const writeBranch = (startId: string): string => {
    let output = "(";
    let id: string | null = startId;
    while (id) {
      const node: GameNode = tree.nodes[id];
      output += encodeNode(node);
      if (node.children.length > 1) {
        for (const child of node.children) output += writeBranch(child);
        id = null;
      } else id = node.children[0] ?? null;
    }
    return `${output})`;
  };
  let output = `(;${propertiesToText(rootProperties)}`;
  if (root.children.length === 1) output += writeBranch(root.children[0]).slice(1, -1);
  else for (const child of root.children) output += writeBranch(child);
  return `${output})`;
}

export function sgfNextPlayer(player: StoneColor) { return opposite(player); }
