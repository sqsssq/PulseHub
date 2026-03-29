import IdeaCard from "./IdeaCard";
import ShareOrderDropdown from "./ShareOrderDropdown";

export default function GroupCard({
  group,
  ideas,
  selectedCount,
  orderCounts,
  onToggleIdea,
  onChangeOrder,
  onSelectGroup,
  pulse = false,
}) {
  const recentIdea = ideas.some((idea) => Date.now() - new Date(idea.submitted_at).getTime() <= 2 * 60 * 1000);
  const statusClass = ideas.length === 0 ? "bg-slate-300" : recentIdea ? "bg-[color:var(--color-success)]" : "bg-[color:var(--color-accent)]";

  return (
    <section
      className={`glass-panel p-5 transition ${pulse ? "border-slate-400 bg-slate-50" : ""}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${statusClass}`} />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{group}</h2>
            <p className="mt-1 text-sm text-[color:var(--color-muted)]">{ideas.length} cards in this space</p>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={onSelectGroup}>
          Select entire group
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {ideas.length === 0 ? <p className="text-sm text-[color:var(--color-muted)]">No ideas yet.</p> : null}
        {ideas.map((idea) => {
          const duplicates = idea.share_order ? (orderCounts[idea.share_order] || 0) > 1 : false;
          return (
            <IdeaCard
              key={idea.id}
              idea={idea}
              selected={idea.is_selected}
              controls={
                <>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--color-brand)]"
                      checked={idea.is_selected}
                      onChange={(event) => onToggleIdea(idea, event.target.checked)}
                    />
                    <span>Select for sharing</span>
                  </label>
                  {idea.is_selected ? (
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        <span>Share order:</span>
                        <ShareOrderDropdown
                          count={selectedCount}
                          value={idea.share_order}
                          onChange={(nextValue) => onChangeOrder(idea, nextValue)}
                        />
                      </label>
                      {duplicates ? <p className="text-sm text-amber-700">Order {idea.share_order} already assigned</p> : null}
                    </div>
                  ) : null}
                </>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
