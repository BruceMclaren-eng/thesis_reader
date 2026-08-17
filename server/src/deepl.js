const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_HOST = DEEPL_API_KEY?.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

export async function lookupWordMeaning(word) {
  if (!DEEPL_API_KEY) {
    throw new Error("DEEPL_API_KEY が設定されていません（server/.env を確認してください）");
  }

  const res = await fetch(`${DEEPL_HOST}/v2/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
    },
    body: new URLSearchParams({
      text: word,
      source_lang: "EN",
      target_lang: "JA",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepL API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const meaning = data.translations?.[0]?.text;
  if (!meaning) throw new Error("DeepL APIから翻訳結果を取得できませんでした");
  return meaning;
}
