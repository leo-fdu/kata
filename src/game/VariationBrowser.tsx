import type { GameNode, GameTree } from "./tree";
import { pointToGtp } from "../types/game";

interface Props {
  tree: GameTree;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onPromote: () => void;
  onComment: (comment: string) => void;
}

export function VariationBrowser({ tree, onSelect, onDelete, onPromote, onComment }: Props) {
  const renderNode = (node: GameNode, depth: number): React.ReactNode => {
    const label = node.move ? `${node.moveNumber}. ${node.move.color === "black" ? "B" : "W"} ${pointToGtp(node.move.point, tree.size)}` : node.id === tree.rootId ? "Start" : "Position";
    return <div key={node.id}>
      <button className={`variation-node${node.id === tree.currentId ? " is-current" : ""}`}
        style={{ paddingLeft: 14 + depth * 13 }} onClick={() => onSelect(node.id)}>
        <span className={`variation-dot variation-dot--${node.move?.color ?? "root"}`} />{label}
        {node.children.length > 1 && <small>{node.children.length} branches</small>}
      </button>
      {node.children.map((child) => renderNode(tree.nodes[child], depth + (node.children.length > 1 ? 1 : 0)))}
    </div>;
  };

  return <aside className="variation-browser" aria-label="Game variations">
    <div className="variation-heading"><span className="eyebrow">Game</span><h2>Variations</h2></div>
    <div className="variation-list">{renderNode(tree.nodes[tree.rootId], 0)}</div>
    <div className="variation-edit">
      <label htmlFor="node-comment">Comment</label>
      <textarea id="node-comment" value={tree.nodes[tree.currentId].comment}
        onChange={(event) => onComment(event.target.value)} placeholder="Add a note to this move" />
      <button onClick={onPromote} disabled={tree.currentId === tree.rootId || tree.nodes[tree.nodes[tree.currentId].parentId!].children[0] === tree.currentId}>Make main variation</button>
      <button onClick={onDelete} disabled={tree.currentId === tree.rootId}>Delete current variation</button>
    </div>
  </aside>;
}
