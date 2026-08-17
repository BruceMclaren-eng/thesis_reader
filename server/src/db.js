import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "thesis_reader.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'reading', 'done')),
    uploaded_at TEXT NOT NULL,
    last_opened_at TEXT,
    done_at TEXT,
    total_translations INTEGER NOT NULL DEFAULT 0,
    total_translated_chars INTEGER NOT NULL DEFAULT 0,
    total_reading_seconds INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY,
    paper_id TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_activity (
    date TEXT NOT NULL,
    paper_id TEXT REFERENCES papers(id) ON DELETE CASCADE,
    translation_count INTEGER NOT NULL DEFAULT 0,
    translated_chars INTEGER NOT NULL DEFAULT 0,
    reading_seconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, paper_id)
  );

  CREATE TABLE IF NOT EXISTS vocab_words (
    id TEXT PRIMARY KEY,
    normalized TEXT NOT NULL UNIQUE,
    surface TEXT NOT NULL,
    meaning TEXT NOT NULL,
    lookup_count INTEGER NOT NULL DEFAULT 0,
    first_looked_up_at TEXT NOT NULL,
    last_looked_up_at TEXT NOT NULL,
    mastered INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_translations_paper ON translations(paper_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(date);
  CREATE INDEX IF NOT EXISTS idx_vocab_count ON vocab_words(lookup_count DESC);
`);

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function bumpDailyActivity(paperId, { translationCount = 0, translatedChars = 0, readingSeconds = 0 }) {
  const date = todayStr();
  db.prepare(
    `INSERT INTO daily_activity (date, paper_id, translation_count, translated_chars, reading_seconds)
     VALUES (@date, @paperId, @translationCount, @translatedChars, @readingSeconds)
     ON CONFLICT (date, paper_id) DO UPDATE SET
       translation_count = translation_count + excluded.translation_count,
       translated_chars = translated_chars + excluded.translated_chars,
       reading_seconds = reading_seconds + excluded.reading_seconds`
  ).run({ date, paperId, translationCount, translatedChars, readingSeconds });
}
