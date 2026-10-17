// Bulk word lists: ChatGPT JSON, CSV/TSV, or plain lines like "word — перевод".
// Shared by the client (import screen) and the server (/api/words/import).

export const WORDS_PROMPT = `Ты помогаешь мне учить английский. Ниже — текст (или фото страницы / список слов).
1. Выпиши слова и устойчивые выражения, которые стоит выучить (пропусти совсем простые: the, go, big и т.п.).
2. Для каждого дай перевод на русский (1–3 самых частых значения через запятую) и британскую транскрипцию в квадратных скобках.
3. Глаголы пиши без "to", фразовые глаголы и выражения — целиком.
4. Ответь ТОЛЬКО JSON-ом в блоке кода, строго в таком формате:

{
  "set": "Короткое название набора",
  "words": [
    { "term": "reliable", "translation": "надёжный", "transcription": "[rɪˈlaɪəbl]" },
    { "term": "give up", "translation": "сдаваться, бросать", "transcription": "[ɡɪv ʌp]" }
  ]
}

Мой текст:
`;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const hasCyrillic = (s) => /[а-яё]/i.test(s);

function fromJson(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.words) ? raw.words : Array.isArray(raw?.cards) ? raw.cards : null;
  if (!list) return null;
  const words = list.map((w) => (typeof w === 'string'
    ? { term: w.trim(), translation: '', transcription: '' }
    : {
      term: str(w.term || w.word || w.en || w.english),
      translation: str(w.translation || w.ru || w.russian || w.meaning),
      transcription: str(w.transcription || w.ipa || w.pronunciation),
    })).filter((w) => w.term);
  return { set: str(raw?.set || raw?.title || raw?.name), words };
}

function tryJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start < 0) return null;
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  try { return fromJson(JSON.parse(body.slice(start, end + 1))); } catch { return null; }
}

// "reliable [rɪˈlaɪəbl] — надёжный", "reliable;надёжный", "reliable\tнадёжный", "1. reliable - надёжный", "reliable"
function parseLine(line) {
  let s = line.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, '').trim();
  if (!s || /^(term|word|слово)\b/i.test(s)) return null;
  let transcription = '';
  const ts = s.match(/\s*([[/][^\]/]{1,60}[\]/])\s*/);
  if (ts) { transcription = `[${ts[1].slice(1, -1).trim()}]`; s = s.replace(ts[0], ' ').trim(); }

  const cols = s.split(/\t|;|\s+[—–-]\s+|\s*=\s*|\s*:\s+/).map((x) => x.trim().replace(/^"|"$/g, '')).filter(Boolean);
  if (cols.length === 1 && s.includes(',')) {
    // CSV: "reliable,надёжный" — split on the first comma that precedes Cyrillic
    const m = s.match(/^([^,]+),\s*(.+)$/);
    if (m && hasCyrillic(m[2]) && !hasCyrillic(m[1])) return { term: m[1].trim(), translation: m[2].trim(), transcription };
  }
  const term = cols.find((c) => !hasCyrillic(c)) || '';
  if (!term) return null;
  const translation = cols.filter((c) => c !== term && hasCyrillic(c)).join(', ');
  if (!transcription && cols[1] && !hasCyrillic(cols[1]) && /[ˈəɪʊʃʒθðŋæɒɔː]/.test(cols[1])) transcription = `[${cols[1]}]`;
  return { term, translation, transcription };
}

export function parseWords(text) {
  const t = String(text || '').trim();
  if (!t) return { set: '', words: [] };
  const json = tryJson(t);
  if (json?.words.length) return json;
  const words = t.split(/\r?\n/).map(parseLine).filter(Boolean);
  return { set: '', words };
}

export function dedupe(words, existing = []) {
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  return words.map((w) => {
    const k = w.term.toLowerCase();
    const dup = seen.has(k);
    seen.add(k);
    return { ...w, dup };
  });
}
