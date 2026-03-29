import ShareOrderDropdown from "./ShareOrderDropdown";

function excerpt(content) {
  return content.length > 60 ? `${content.slice(0, 57)}...` : content;
}

export default function ShareQueue({
  ideas,
  selectedCount,
  onChangeOrder,
  onDeselect,
  expanded,
  onToggleExpanded,
}) {
  const ordered = ideas.filter((idea) => idea.share_order !== null).sort((a, b) => a.share_order - b.share_order);
  const unordered = ideas.filter((idea) => idea.share_order === null);

  return (
    <aside className={`share-queue${expanded ? " share-queue--expanded" : ""}`}>
      <button type="button" className="share-queue__handle" onClick={onToggleExpanded}>
        <strong>{selectedCount} ideas selected</strong>
        <span>{expanded ? "Collapse" : "Expand"}</span>
      </button>
      <div className="share-queue__content">
        {ideas.length === 0 ? (
          <p className="empty-state">
            No ideas selected yet. Use the checkboxes in each group card to select ideas for sharing.
          </p>
        ) : (
          <>
            {ordered.map((idea) => (
              <div className="queue-row" key={idea.id}>
                <span className="queue-row__badge">{idea.share_order}</span>
                <div className="queue-row__text">
                  <strong>{idea.group_id}</strong>
                  <p>{excerpt(idea.content)}</p>
                </div>
                <ShareOrderDropdown
                  count={selectedCount}
                  value={idea.share_order}
                  onChange={(value) => onChangeOrder(idea, value)}
                  small
                />
                <button type="button" className="icon-button" onClick={() => onDeselect(idea)}>
                  ×
                </button>
              </div>
            ))}
            {unordered.length > 0 ? <p className="share-queue__label">No order assigned</p> : null}
            {unordered.map((idea) => (
              <div className="queue-row" key={idea.id}>
                <span className="queue-row__badge">-</span>
                <div className="queue-row__text">
                  <strong>{idea.group_id}</strong>
                  <p>{excerpt(idea.content)}</p>
                </div>
                <ShareOrderDropdown
                  count={selectedCount}
                  value={idea.share_order}
                  onChange={(value) => onChangeOrder(idea, value)}
                  small
                />
                <button type="button" className="icon-button" onClick={() => onDeselect(idea)}>
                  ×
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
