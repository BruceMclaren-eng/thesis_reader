import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

const SYSTEM_PROMPT = `あなたは工学・材料科学分野の学術論文の翻訳者です。与えられた英語の文章を、日本語の学術論文・技術文書として自然な文体（である調）で翻訳してください。
- 専門用語は、対応する定訳がある場合は日本語の専門用語を使い、定訳が定着していない場合や誤解を招く恐れがある場合は英語表記をそのまま残すか、括弧で併記してください。
- 直訳的な硬さよりも、日本語の技術文書として読みやすい構成を優先してください。ただし意味を省略・追加しないこと。
- 訳文のみを出力し、前置きや説明を付け加えないこと。`;

export async function translateAcademicText(sourceText) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: sourceText }],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
