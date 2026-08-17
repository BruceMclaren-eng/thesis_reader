import "./WordLookupPopover.css";

export default function WordLookupPopover({ lookup, onClose }) {
  if (!lookup) return null;
  const { rect, loading, data, error } = lookup;

  const popoverWidth = 260;
  const top = Math.min(window.innerHeight - 140, (rect?.bottom ?? 80) + 10);
  const left = Math.min(Math.max(8, rect?.left ?? 8), window.innerWidth - popoverWidth - 8);

  return (
    <div className="word-popover" style={{ top, left, width: popoverWidth }}>
      <button type="button" className="word-popover__close" onClick={onClose} aria-label="閉じる">
        ×
      </button>
      {loading && <p className="word-popover__loading">調べています…</p>}
      {error && <p className="word-popover__error">{error}</p>}
      {data && (
        <>
          <div className="word-popover__head">
            <strong>{data.normalized}</strong>
            {data.surface.toLowerCase() !== data.normalized && (
              <span className="word-popover__surface">（{data.surface}）</span>
            )}
          </div>
          <p className="word-popover__meaning">{data.meaning}</p>
          <p className="word-popover__count">
            {data.lookupCount}回目の検索{data.lookupCount >= 3 ? " ・ 単語帳で復習しましょう" : ""}
          </p>
        </>
      )}
    </div>
  );
}
