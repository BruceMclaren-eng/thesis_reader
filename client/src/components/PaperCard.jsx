import { Link } from "react-router-dom";
import "./PaperCard.css";

const STATUS_LABEL = { unread: "未読", reading: "読書中", done: "読了" };

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function PaperCard({ paper, onStatusChange }) {
  return (
    <div className="paper-card">
      <Link to={`/reader/${paper.id}`} className="paper-card__title">
        {paper.title}
      </Link>
      <div className="paper-card__meta">
        <span className={`paper-card__status paper-card__status--${paper.status}`}>
          {STATUS_LABEL[paper.status]}
        </span>
        <span>翻訳 {paper.totalTranslations}回</span>
        <span>アップロード {formatDate(paper.uploadedAt)}</span>
      </div>
      <div className="paper-card__actions">
        {paper.status !== "done" ? (
          <button type="button" onClick={() => onStatusChange(paper.id, "done")}>
            読了にする
          </button>
        ) : (
          <button type="button" onClick={() => onStatusChange(paper.id, "reading")}>
            読了を取り消す
          </button>
        )}
      </div>
    </div>
  );
}
