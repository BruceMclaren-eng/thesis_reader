import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import PdfViewer from "../components/PdfViewer.jsx";
import SelectionToolbar from "../components/SelectionToolbar.jsx";
import TranslationPanel from "../components/TranslationPanel.jsx";
import WordLookupPopover from "../components/WordLookupPopover.jsx";
import { useReadingSession } from "../hooks/useReadingSession.js";
import "./Reader.css";

const STATUS_LABEL = { unread: "未読", reading: "読書中", done: "読了" };

export default function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paper, setPaper] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [selection, setSelection] = useState(null);
  const [pendingText, setPendingText] = useState(null);
  const [translateError, setTranslateError] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [wordLookup, setWordLookup] = useState(null);

  useReadingSession(id);

  useEffect(() => {
    api
      .getPaper(id)
      .then((p) => setPaper(p.status === "unread" ? { ...p, status: "reading" } : p))
      .catch(() => setPaper(null));
    api.listTranslations(id).then(setTranslations).catch(() => {});
  }, [id]);

  const handleSelectionChange = useCallback((next) => {
    setSelection(next);
    if (next) setWordLookup(null);
  }, []);

  async function handleLookupWord(word) {
    const rect = selection?.rect;
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setWordLookup({ rect, loading: true, data: null, error: null });
    try {
      const data = await api.lookupWord(word);
      setWordLookup({ rect, loading: false, data, error: null });
    } catch (e) {
      setWordLookup({ rect, loading: false, data: null, error: e.message });
    }
  }

  async function handleTranslate(text) {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setPendingText(text);
    setTranslateError(null);
    setPanelOpen(true);
    try {
      const translation = await api.translate(id, text);
      setTranslations((prev) => [...prev, translation]);
      setPaper((p) => (p ? { ...p, totalTranslations: p.totalTranslations + 1 } : p));
    } catch (e) {
      setTranslateError(e.message);
    } finally {
      setPendingText(null);
    }
  }

  async function handleMarkDone() {
    const nextStatus = paper.status === "done" ? "reading" : "done";
    const updated = await api.updatePaper(id, { status: nextStatus });
    setPaper(updated);
  }

  if (!paper) {
    return <div className="reader-loading">読み込み中…</div>;
  }

  return (
    <div className="reader">
      <header className="reader__header">
        <button type="button" className="reader__back" onClick={() => navigate("/")}>
          ← ライブラリ
        </button>
        <h1 className="reader__title">{paper.title}</h1>
        <button type="button" className={`reader__status reader__status--${paper.status}`} onClick={handleMarkDone}>
          {paper.status === "done" ? "読了 ✓" : `${STATUS_LABEL[paper.status]} · 読了にする`}
        </button>
      </header>

      <div className="reader__body">
        <PdfViewer fileUrl={api.fileUrl(id)} onSelectionChange={handleSelectionChange} />
        <TranslationPanel
          translations={translations}
          pending={pendingText}
          error={translateError}
          open={panelOpen}
          onToggle={() => setPanelOpen((o) => !o)}
        />
      </div>

      <SelectionToolbar
        selection={selection}
        onTranslate={handleTranslate}
        onLookupWord={handleLookupWord}
        busy={!!pendingText || wordLookup?.loading}
      />
      <WordLookupPopover lookup={wordLookup} onClose={() => setWordLookup(null)} />
    </div>
  );
}
