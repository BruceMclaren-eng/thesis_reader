import lemmatizer from "wink-lemmatizer";

// 品詞を特定せず、動詞・名詞・形容詞の各変換を試して最も短い（＝最も基本形に近い）結果を採用する簡易正規化。
export function lemmatize(word) {
  const lower = word.toLowerCase();

  // "-ing"形は工学論文では動名詞由来の名詞として使われることが多く（damping, sampling, filtering 等）、
  // 動詞の原形に強制変換すると意味が変わってしまう（damping→damp で「減衰」が「湿気」になる、等）。
  // 名詞としての活用（複数形など）だけを試し、動詞への変換は行わない。
  if (lower.endsWith("ing")) {
    const noun = lemmatizer.noun(lower);
    return noun && noun !== lower ? noun : lower;
  }

  const candidates = [lemmatizer.verb(lower), lemmatizer.noun(lower), lemmatizer.adjective(lower)].filter(
    (w) => w && w !== lower
  );
  if (candidates.length === 0) return lower;
  candidates.sort((a, b) => a.length - b.length);
  return candidates[0];
}
