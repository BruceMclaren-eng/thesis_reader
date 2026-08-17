import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";
import ActivityHeatmap from "../components/ActivityHeatmap.jsx";
import EngagementBarChart from "../components/EngagementBarChart.jsx";
import "./Dashboard.css";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <main className="dashboard"><p className="dashboard__error">{error}</p></main>;
  if (!data) return <main className="dashboard"><p>読み込み中…</p></main>;

  const totalMinutes = Math.round(data.totalReadingSeconds / 60);

  return (
    <main className="dashboard">
      <section className="dashboard__stats">
        <StatCard label="累計読了論文数" value={data.donePapers} unit="本" />
        <StatCard label="累計翻訳回数" value={data.totalTranslations} unit="回" />
        <StatCard label="累計翻訳文字数" value={data.totalTranslatedChars} unit="文字" compact />
        <StatCard label="連続読書日数" value={data.streak} unit="日" />
      </section>

      <section className="dashboard__section">
        <h2>活動の記録</h2>
        <p className="dashboard__hint">
          過去{data.dailyActivity.length > 0 ? "" : "の"}半年間の翻訳・閲覧アクティビティ（累計閲覧時間 約{totalMinutes}分）
        </p>
        <ActivityHeatmap dailyActivity={data.dailyActivity} />
      </section>

      <section className="dashboard__section">
        <h2>論文ごとの取り組み度</h2>
        <p className="dashboard__hint">翻訳回数が多いほど、じっくり読み込んだ論文です。</p>
        <EngagementBarChart papers={data.engagement} />
      </section>
    </main>
  );
}
