import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import PdfViewer from "../components/PdfViewer.jsx";
import SelectionToolbar from "../components/SelectionToolbar.jsx";
import TranslationPanel from "../components/TranslationPanel.jsx";
import WordLookupPopover from "../components/WordLookupPopover.jsx";
import { useReadingSession } from "../hooks/useReadingSession.js";
import "./Reader.css";

const STATUS_LABEL = { unread: "未読", reading: "読書中", done: "読了" };

const PANEL_WIDTH_KEY = "reader.panelWidth";
const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 720;

function loadPanelWidth() {
  const stored = Number(localStorage.getItem(PANEL_WIDTH_KEY));
  if (Number.isFinite(stored) && stored >= MIN_PANEL_WIDTH && stored <= MAX_PANEL_WIDTH) {
    return stored;
  }
  return DEFAULT_PANEL_WIDTH;
}

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
  const [panelWidth, setPanelWidth] = useState(loadPanelWidth);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const bodyRef = useRef(null);
  const resizingRef = useRef(false);

  useReadingSession(id);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;

    function handleMove(ev) {
      if (!resizingRef.current || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, rect.right - ev.clientX));
      setPanelWidth(next);
    }
    function handleUp() {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setPanelWidth((w) => {
        localStorage.setItem(PANEL_WIDTH_KEY, String(w));
        return w;
      });
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    }
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, []);

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

  function startEditTitle() {
    setTitleDraft(paper.title);
    setEditingTitle(true);
  }

  async function commitTitle() {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === paper.title) return;
    const prev = paper.title;
    setPaper((p) => ({ ...p, title: next }));
    try {
      await api.updatePaper(id, { title: next });
    } catch (e) {
      setPaper((p) => ({ ...p, title: prev }));
      console.error("タイトルの保存に失敗しました:", e.message);
    }
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
        <h1 className="reader__title">
          {editingTitle ? (
            <input
              className="reader__title-input"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingTitle(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="reader__title-button"
              onClick={startEditTitle}
              title="クリックしてタイトルを編集"
            >
              {paper.title}
            </button>
          )}
        </h1>
        <button type="button" className={`reader__status reader__status--${paper.status}`} onClick={handleMarkDone}>
          {paper.status === "done" ? "読了 ✓" : `${STATUS_LABEL[paper.status]} · 読了にする`}
        </button>
      </header>

      <div className="reader__body" ref={bodyRef} style={{ "--panel-width": `${panelWidth}px` }}>
        <PdfViewer fileUrl={api.fileUrl(id)} onSelectionChange={handleSelectionChange} />
        <div
          className="reader__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="パネル幅を調整"
          onMouseDown={handleResizeStart}
        />
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
