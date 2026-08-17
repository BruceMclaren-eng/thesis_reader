import { useEffect, useRef } from "react";
import "./TranslationPanel.css";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function TranslationPanel({ translations, pending, error, open, onToggle }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [translations.length, pending, open]);

  return (
    <div className={`translation-panel ${open ? "translation-panel--open" : ""}`}>
      <button type="button" className="translation-panel__handle" onClick={onToggle}>
        <span>翻訳履歴</span>
        <span className="translation-panel__count">{translations.length}</span>
      </button>

      <div className="translation-panel__list" ref={listRef}>
        {translations.length === 0 && !pending && (
          <p className="translation-panel__empty">
            本文中のテキストを選択し「翻訳する」を押すと、ここに結果が表示されます。
          </p>
        )}
        {translations.map((t) => (
          <article key={t.id} className="translation-entry">
            <p className="translation-entry__source">{t.sourceText}</p>
            <p className="translation-entry__translated">{t.translatedText}</p>
            <time className="translation-entry__time">{formatTime(t.createdAt)}</time>
          </article>
        ))}
        {pending && (
          <article className="translation-entry translation-entry--pending">
            <p className="translation-entry__source">{pending}</p>
            <p className="translation-entry__translated translation-entry__translated--loading">翻訳中…</p>
          </article>
        )}
        {error && <p className="translation-panel__error">{error}</p>}
      </div>
    </div>
  );
}
