import "./StatCard.css";

function formatCompact(n) {
  if (n >= 100000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString("ja-JP");
}

export default function StatCard({ label, value, unit, compact }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">
        {compact ? formatCompact(value) : value.toLocaleString("ja-JP")}
        {unit && <span className="stat-card__unit">{unit}</span>}
      </span>
    </div>
  );
}
