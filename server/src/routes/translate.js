import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, bumpDailyActivity } from "../db.js";
import { translateAcademicText } from "../anthropic.js";

const router = Router();

function toTranslationDto(row) {
  return {
    id: row.id,
    paperId: row.paper_id,
    sourceText: row.source_text,
    translatedText: row.translated_text,
    createdAt: row.created_at,
  };
}

router.get("/papers/:id/translations", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM translations WHERE paper_id = ? ORDER BY created_at ASC")
    .all(req.params.id);
  res.json(rows.map(toTranslationDto));
});

router.post("/papers/:id/translate", async (req, res) => {
  const paper = db.prepare("SELECT * FROM papers WHERE id = ?").get(req.params.id);
  if (!paper) {
    res.status(404).json({ error: "論文が見つかりません" });
    return;
  }

  const sourceText = (req.body.sourceText || "").trim();
  if (!sourceText) {
    res.status(400).json({ error: "翻訳するテキストが空です" });
    return;
  }
  if (sourceText.length > 6000) {
    res.status(400).json({ error: "選択範囲が長すぎます（6000文字以内にしてください）" });
    return;
  }

  try {
    const translatedText = await translateAcademicText(sourceText);
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO translations (id, paper_id, source_text, translated_text, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, paper.id, sourceText, translatedText, createdAt);

    db.prepare(
      `UPDATE papers SET total_translations = total_translations + 1,
                          total_translated_chars = total_translated_chars + ?
       WHERE id = ?`
    ).run(sourceText.length, paper.id);

    bumpDailyActivity(paper.id, { translationCount: 1, translatedChars: sourceText.length });

    res.status(201).json(
      toTranslationDto({
        id,
        paper_id: paper.id,
        source_text: sourceText,
        translated_text: translatedText,
        created_at: createdAt,
      })
    );
  } catch (err) {
    console.error("翻訳に失敗しました:", err);
    res.status(502).json({ error: "翻訳リクエストに失敗しました。APIキーやネットワークを確認してください。" });
  }
});

export default router;
