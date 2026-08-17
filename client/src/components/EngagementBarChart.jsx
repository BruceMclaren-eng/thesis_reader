import { Link } from "react-router-dom";
import "./EngagementBarChart.css";

export default function EngagementBarChart({ papers }) {
  if (papers.length === 0) {
    return <p className="engagement-empty">まだ翻訳の記録がありません。</p>;
  }

  const max = Math.max(...papers.map((p) => p.totalTranslations));

  return (
    <div className="engagement-chart" role="table" aria-label="論文ごとの翻訳回数">
      {papers.map((p) => (
        <div className="engagement-row" key={p.id} role="row">
          <Link to={`/reader/${p.id}`} className="engagement-row__label" title={p.title} role="cell">
            {p.title}
          </Link>
          <div className="engagement-row__track" role="cell">
            <div
              className="engagement-row__bar"
              style={{ width: `${Math.max(4, (p.totalTranslations / max) * 100)}%` }}
            />
            <span className="engagement-row__value">{p.totalTranslations}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
