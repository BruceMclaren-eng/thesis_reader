import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, bumpDailyActivity } from "../db.js";
import { extractPdfTitle } from "../pdfMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("PDFファイルのみアップロードできます"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

function toPaperDto(row) {
  return {
    id: row.id,
    title: row.title,
    filename: row.filename,
    status: row.status,
    uploadedAt: row.uploaded_at,
    lastOpenedAt: row.last_opened_at,
    doneAt: row.done_at,
    totalTranslations: row.total_translations,
    totalTranslatedChars: row.total_translated_chars,
    totalReadingSeconds: row.total_reading_seconds,
  };
}

router.get("/", (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare("SELECT * FROM papers WHERE status = ? ORDER BY uploaded_at DESC").all(status)
    : db.prepare("SELECT * FROM papers ORDER BY uploaded_at DESC").all();
  res.json(rows.map(toPaperDto));
});

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "ファイルがアップロードされていません" });
    return;
  }
  const id = randomUUID();
  const filePath = path.join(uploadsDir, req.file.filename);
  const title = await extractPdfTitle(filePath, path.parse(req.file.originalname).name);
  const uploadedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO papers (id, title, filename, stored_filename, status, uploaded_at)
     VALUES (?, ?, ?, ?, 'unread', ?)`
  ).run(id, title, req.file.originalname, req.file.filename, uploadedAt);

  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(id);
  res.status(201).json(toPaperDto(row));
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "論文が見つかりません" });
    return;
  }
  res.json(toPaperDto(row));
});

router.get("/:id/file", (req, res) => {
  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "論文が見つかりません" });
    return;
  }
  db.prepare("UPDATE papers SET last_opened_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
  if (row.status === "unread") {
    db.prepare("UPDATE papers SET status = 'reading' WHERE id = ?").run(row.id);
  }
  res.sendFile(path.join(uploadsDir, row.stored_filename));
});

router.patch("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "論文が見つかりません" });
    return;
  }

  const { title, status } = req.body;
  if (title !== undefined) {
    db.prepare("UPDATE papers SET title = ? WHERE id = ?").run(title, row.id);
  }
  if (status !== undefined) {
    if (!["unread", "reading", "done"].includes(status)) {
      res.status(400).json({ error: "不正なステータスです" });
      return;
    }
    const doneAt = status === "done" ? new Date().toISOString() : null;
    db.prepare("UPDATE papers SET status = ?, done_at = ? WHERE id = ?").run(status, doneAt, row.id);
  }

  const updated = db.prepare("SELECT * FROM papers WHERE id = ?").get(row.id);
  res.json(toPaperDto(updated));
});

router.delete("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "論文が見つかりません" });
    return;
  }
  db.prepare("DELETE FROM papers WHERE id = ?").run(row.id);
  const filePath = path.join(uploadsDir, row.stored_filename);
  fs.rm(filePath, { force: true }, () => {});
  res.status(204).end();
});

router.post("/:id/session", (req, res) => {
  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "論文が見つかりません" });
    return;
  }
  const seconds = Math.max(0, Math.min(600, Number(req.body.seconds) || 0));
  if (seconds > 0) {
    db.prepare("UPDATE papers SET total_reading_seconds = total_reading_seconds + ? WHERE id = ?").run(
      seconds,
      row.id
    );
    bumpDailyActivity(row.id, { readingSeconds: seconds });
  }
  res.status(204).end();
});

export default router;
