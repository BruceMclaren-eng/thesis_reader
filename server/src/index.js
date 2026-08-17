import "dotenv/config";
import express from "express";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import papersRouter from "./routes/papers.js";
import translateRouter from "./routes/translate.js";
import statsRouter from "./routes/stats.js";
import vocabRouter from "./routes/vocab.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "..", "client", "dist");

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[警告] ANTHROPIC_API_KEY が設定されていません。server/.env を作成し、APIキーを設定してください（server/.env.example 参照）。"
  );
}
if (!process.env.DEEPL_API_KEY) {
  console.warn(
    "[警告] DEEPL_API_KEY が設定されていません。単語検索機能を使うには server/.env にDeepL APIキーを設定してください。"
  );
}

app.use(express.json({ limit: "2mb" }));

app.use("/api/papers", papersRouter);
app.use("/api", translateRouter);
app.use("/api/stats", statsRouter);
app.use("/api/vocab", vocabRouter);

app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return urls;
}

app.listen(PORT, () => {
  console.log(`論文リーダーサーバーが起動しました:`);
  console.log(`  - ローカル:   http://localhost:${PORT}`);
  for (const url of getLanUrls(PORT)) {
    console.log(`  - ネットワーク: ${url}  (同一ネットワーク上のiPad等からアクセス可能)`);
  }
});
