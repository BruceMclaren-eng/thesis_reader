import { Router } from "express";
import { db, todayStr } from "../db.js";

const router = Router();

function computeStreak(activeDates) {
  if (activeDates.size === 0) return 0;
  const cursor = new Date(`${todayStr()}T00:00:00Z`);
  // If nothing logged today yet, streak counting starts from yesterday.
  if (!activeDates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

router.get("/dashboard", (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 182, 30), 366);

  const totals = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM papers WHERE status = 'done') AS done_papers,
         (SELECT COUNT(*) FROM translations) AS total_translations,
         (SELECT COALESCE(SUM(total_translated_chars), 0) FROM papers) AS total_translated_chars,
         (SELECT COALESCE(SUM(total_reading_seconds), 0) FROM papers) AS total_reading_seconds`
    )
    .get();

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().slice(0, 10);

  const dailyRows = db
    .prepare(
      `SELECT date, SUM(translation_count) AS translation_count, SUM(translated_chars) AS translated_chars,
              SUM(reading_seconds) AS reading_seconds
       FROM daily_activity
       WHERE date >= ?
       GROUP BY date
       ORDER BY date ASC`
    )
    .all(sinceStr);

  const allActivityDates = db.prepare(`SELECT DISTINCT date FROM daily_activity`).all();
  const streak = computeStreak(new Set(allActivityDates.map((r) => r.date)));

  const engagement = db
    .prepare(
      `SELECT id, title, status, total_translations, total_translated_chars, total_reading_seconds
       FROM papers
       WHERE total_translations > 0
       ORDER BY total_translations DESC
       LIMIT 20`
    )
    .all()
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      totalTranslations: r.total_translations,
      totalTranslatedChars: r.total_translated_chars,
      totalReadingSeconds: r.total_reading_seconds,
    }));

  res.json({
    donePapers: totals.done_papers,
    totalTranslations: totals.total_translations,
    totalTranslatedChars: totals.total_translated_chars,
    totalReadingSeconds: totals.total_reading_seconds,
    streak,
    dailyActivity: dailyRows.map((r) => ({
      date: r.date,
      translationCount: r.translation_count,
      translatedChars: r.translated_chars,
      readingSeconds: r.reading_seconds,
    })),
    engagement,
  });
});

export default router;
