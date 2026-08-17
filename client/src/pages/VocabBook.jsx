import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import "./VocabBook.css";

export default function VocabBook() {
  const [words, setWords] = useState([]);
  const [showMastered, setShowMastered] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listVocab(showMastered ? {} : { mastered: "false" })
      .then(setWords)
      .catch((e) => setError(e.message));
  }, [showMastered]);

  async function toggleMastered(word) {
    try {
      const updated = await api.updateVocab(word.id, { mastered: !word.mastered });
      setWords((list) =>
        showMastered ? list.map((w) => (w.id === word.id ? updated : w)) : list.filter((w) => w.id !== word.id)
      );
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(word) {
    try {
      await api.deleteVocab(word.id);
      setWords((list) => list.filter((w) => w.id !== word.id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="vocab-book">
      <div className="vocab-book__header">
        <h1>単語帳</h1>
        <label className="vocab-book__toggle">
          <input type="checkbox" checked={showMastered} onChange={(e) => setShowMastered(e.target.checked)} />
          習得済みも表示
        </label>
      </div>
      <p className="vocab-book__hint">検索回数が多い単語ほど上に表示されます。まだ覚えていない単語の目安にしてください。</p>

      {error && <p className="vocab-book__error">{error}</p>}

      {words.length === 0 ? (
        <p className="vocab-book__empty">
          まだ調べた単語がありません。論文中の英単語を1語だけ選択すると、ここに追加されます。
        </p>
      ) : (
        <ul className="vocab-book__list">
          {words.map((w) => (
            <li key={w.id} className={`vocab-item ${w.mastered ? "vocab-item--mastered" : ""}`}>
              <div className="vocab-item__main">
                <span className="vocab-item__word">{w.normalized}</span>
                <span className="vocab-item__meaning">{w.meaning}</span>
              </div>
              <div className="vocab-item__meta">
                <span className="vocab-item__count">{w.lookupCount}回</span>
                <button type="button" onClick={() => toggleMastered(w)}>
                  {w.mastered ? "習得済みを解除" : "習得済みにする"}
                </button>
                <button type="button" className="vocab-item__delete" onClick={() => remove(w)}>
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
