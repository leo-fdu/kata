interface Props {
  action: "new" | "open";
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDiscardPane({ action, onCancel, onConfirm }: Props) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="new-game-window" role="dialog" aria-modal="true" aria-label="Unsaved game">
      <h2>Unsaved game</h2>
      <p>Your current moves have not been saved. {action === "new" ? "Starting a new game" : "Opening another game"} will discard them.</p>
      <div className="new-game-actions">
        <button onClick={onCancel}>Keep playing</button>
        <button className="primary-button" onClick={onConfirm}>Discard and continue</button>
      </div>
    </section>
  </div>;
}
