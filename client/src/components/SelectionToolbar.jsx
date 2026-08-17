import "./SelectionToolbar.css";

export const SINGLE_WORD_RE = /^[A-Za-z][A-Za-z'-]{0,39}$/;

export default function SelectionToolbar({ selection, onTranslate, onLookupWord, busy }) {
  if (!selection) return null;

  const isWord = SINGLE_WORD_RE.test(selection.text);
  const { rect } = selection;
  const buttonWidth = isWord ? 100 : 84;
  const top = Math.min(window.innerHeight - 60, rect.bottom + 10);
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - buttonWidth - 8);

  return (
    <button
      type="button"
      className="selection-toolbar"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => (isWord ? onLookupWord(selection.text) : onTranslate(selection.text))}
      disabled={busy}
    >
      {busy ? "調べています…" : isWord ? "意味を調べる" : "翻訳する"}
    </button>
  );
}
