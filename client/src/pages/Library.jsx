import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import UploadDropzone from "../components/UploadDropzone.jsx";
import PaperCard from "../components/PaperCard.jsx";
import "./Library.css";

const FILTERS = [
  { key: "all", label: "すべて" },
  { key: "unread", label: "未読" },
  { key: "reading", label: "読書中" },
  { key: "done", label: "読了" },
];

export default function Library() {
  const [papers, setPapers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listPapers().then(setPapers).catch((e) => setError(e.message));
  }, []);

  async function handleUpload(file) {
    setUploading(true);
    setError(null);
    try {
      const paper = await api.uploadPaper(file);
      setPapers((prev) => [paper, ...prev]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleStatusChange(id, status) {
    const prev = papers;
    setPapers((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      await api.updatePaper(id, { status });
    } catch (e) {
      setPapers(prev);
      setError(e.message);
    }
  }

  const visible = filter === "all" ? papers : papers.filter((p) => p.status === filter);

  return (
    <main className="library">
      <UploadDropzone onUpload={handleUpload} uploading={uploading} />
      {error && <p className="library__error">{error}</p>}

      <div className="library__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "active" : ""}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.label}
            {f.key !== "all" && (
              <span className="library__count">{papers.filter((p) => p.status === f.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="library__empty">論文がありません。PDFをアップロードして読み始めましょう。</p>
      ) : (
        <div className="library__grid">
          {visible.map((paper) => (
            <PaperCard key={paper.id} paper={paper} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </main>
  );
}
