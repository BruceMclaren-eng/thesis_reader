import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { lemmatize } from "../lemmatize.js";
import { lookupWordMeaning } from "../deepl.js";

const WORD_RE = /^[A-Za-z][A-Za-z'-]{0,39}$/;

const router = Router();

function toDto(row) {
  return {
    id: row.id,
    normalized: row.normalized,
    surface: row.surface,
    meaning: row.meaning,
    lookupCount: row.lookup_count,
    firstLookedUpAt: row.first_looked_up_at,
    lastLookedUpAt: row.last_looked_up_at,
    mastered: !!row.mastered,
  };
}

router.get("/", (req, res) => {
  const order = req.query.sort === "recent" ? "last_looked_up_at DESC" : "lookup_count DESC, last_looked_up_at DESC";
  let rows;
  if (req.query.mastered === "false") {
    rows = db.prepare(`SELECT * FROM vocab_words WHERE mastered = 0 ORDER BY ${order}`).all();
  } else if (req.query.mastered === "true") {
    rows = db.prepare(`SELECT * FROM vocab_words WHERE mastered = 1 ORDER BY ${order}`).all();
  } else {
    rows = db.prepare(`SELECT * FROM vocab_words ORDER BY ${order}`).all();
  }
  res.json(rows.map(toDto));
});

router.post("/lookup", async (req, res) => {
  const raw = (req.body.word || "").trim();
  if (!WORD_RE.test(raw)) {
    res.status(400).json({ error: "英単語を1語選択してください" });
    return;
  }
  const normalized = lemmatize(raw);
  const now = new Date().toISOString();

  const existing = db.prepare("SELECT * FROM vocab_words WHERE normalized = ?").get(normalized);
  if (existing) {
    db.prepare(
      `UPDATE vocab_words SET lookup_count = lookup_count + 1, last_looked_up_at = ?, surface = ? WHERE id = ?`
    ).run(now, raw, existing.id);
    res.json(toDto(db.prepare("SELECT * FROM vocab_words WHERE id = ?").get(existing.id)));
    return;
  }

  try {
    const meaning = await lookupWordMeaning(normalized);
    const id = randomUUID();
    db.prepare(
      `INSERT INTO vocab_words (id, normalized, surface, meaning, lookup_count, first_looked_up_at, last_looked_up_at, mastered)
       VALUES (?, ?, ?, ?, 1, ?, ?, 0)`
    ).run(id, normalized, raw, meaning, now, now);
    res.status(201).json(toDto(db.prepare("SELECT * FROM vocab_words WHERE id = ?").get(id)));
  } catch (err) {
    console.error("単語検索に失敗しました:", err);
    res.status(502).json({ error: "単語の意味の取得に失敗しました。DeepL APIキーを確認してください。" });
  }
});

router.patch("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM vocab_words WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "単語が見つかりません" });
    return;
  }
  if (req.body.mastered !== undefined) {
    db.prepare("UPDATE vocab_words SET mastered = ? WHERE id = ?").run(req.body.mastered ? 1 : 0, row.id);
  }
  res.json(toDto(db.prepare("SELECT * FROM vocab_words WHERE id = ?").get(row.id)));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM vocab_words WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
