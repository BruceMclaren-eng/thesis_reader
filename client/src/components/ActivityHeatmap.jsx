import { useMemo, useState } from "react";
import "./ActivityHeatmap.css";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const LEVEL_THRESHOLDS = [0, 1, 3, 6, 11]; // レベル境界（活動スコア）

function scoreFor(entry) {
  if (!entry) return 0;
  return entry.translationCount + Math.floor(entry.readingSeconds / 600);
}

function levelFor(score) {
  let level = 0;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (score >= LEVEL_THRESHOLDS[i]) level = i;
  }
  return level;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export default function ActivityHeatmap({ dailyActivity, weeks = 26 }) {
  const [tooltip, setTooltip] = useState(null);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const entry of dailyActivity) map.set(entry.date, entry);
    return map;
  }, [dailyActivity]);

  const columns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    // 直近の土曜日まで列を揃える
    end.setDate(end.getDate() + (6 - end.getDay()));
    const totalDays = weeks * 7;
    const start = new Date(end);
    start.setDate(start.getDate() - totalDays + 1);

    const cols = [];
    const cursor = new Date(start);
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toDateStr(cursor);
        const isFuture = cursor > today;
        col.push({ date: dateStr, isFuture, weekIndex: w, month: cursor.getMonth() });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [weeks]);

  const monthMarkers = useMemo(() => {
    const markers = [];
    let lastMonth = null;
    columns.forEach((col, i) => {
      const month = col[0].month;
      if (month !== lastMonth) {
        markers.push({ weekIndex: i, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });
    return markers;
  }, [columns]);

  return (
    <div className="heatmap">
      <div className="heatmap__scroll">
        <div className="heatmap__months" style={{ gridTemplateColumns: `repeat(${weeks}, 13px)` }}>
          {monthMarkers.map((m) => (
            <span key={m.weekIndex} style={{ gridColumnStart: m.weekIndex + 1 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="heatmap__grid" style={{ gridTemplateColumns: `repeat(${weeks}, 13px)` }}>
          {columns.map((col, w) => (
            <div className="heatmap__col" key={w}>
              {col.map((cell) => {
                const entry = byDate.get(cell.date);
                const score = scoreFor(entry);
                const level = cell.isFuture ? -1 : levelFor(score);
                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`heatmap__cell ${cell.isFuture ? "heatmap__cell--future" : `heatmap__cell--level${level}`}`}
                    onMouseEnter={() => !cell.isFuture && setTooltip({ ...cell, score, entry })}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => !cell.isFuture && setTooltip({ ...cell, score, entry })}
                    aria-label={`${cell.date} 活動スコア ${score}`}
                    tabIndex={cell.isFuture ? -1 : 0}
                    disabled={cell.isFuture}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap__footer">
        <div className="heatmap__legend">
          <span>少ない</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <span key={lv} className={`heatmap__cell heatmap__cell--level${lv}`} />
          ))}
          <span>多い</span>
        </div>
        {tooltip && (
          <div className="heatmap__tooltip">
            <strong>{tooltip.date}</strong>
            {tooltip.entry ? (
              <span>
                翻訳 {tooltip.entry.translationCount}回 ／ 閲覧 {Math.round(tooltip.entry.readingSeconds / 60)}分
              </span>
            ) : (
              <span>活動記録なし</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
