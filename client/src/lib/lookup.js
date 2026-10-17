// Translation + transcription straight from the browser (all three services allow CORS).
// Order: Google (unofficial, may be unavailable) → MyMemory; transcription from dictionaryapi.dev.

const TIMEOUT = 6000;
const cache = new Map();
const hasCyrillic = (s) => /[а-яё]/i.test(s);

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function uniq(list, limit = 3) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const s = String(raw || '').trim().replace(/\s+/g, ' ');
    const k = s.toLowerCase();
    if (!s || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

async function google(term) {
  const data = await getJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&dt=bd&q=${encodeURIComponent(term)}`);
  const main = (data?.[0] || []).map((x) => x?.[0]).join('');
  const dict = (data?.[1] || []).flatMap((pos) => pos?.[1] || []);
  return uniq([main, ...dict]).filter(hasCyrillic);
}

async function mymemory(term) {
  const data = await getJson(`https://api.mymemory.translated.net/get?langpair=en|ru&q=${encodeURIComponent(term)}`);
  const lower = term === term.toLowerCase();
  const fix = (s) => (lower && s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const matches = (data.matches || [])
    .filter((m) => hasCyrillic(m.translation || '') && Number(m.match) >= 0.85)
    .sort((a, b) => (Number(b.quality) || 0) - (Number(a.quality) || 0) || (b['usage-count'] || 0) - (a['usage-count'] || 0))
    .map((m) => fix(m.translation.replace(/[.!]+$/, '')));
  const main = data.responseData?.translatedText;
  return uniq([hasCyrillic(main || '') ? fix(main) : '', ...matches]);
}

async function ipa(term) {
  if (/\s/.test(term.trim())) return '';
  const data = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term.trim().toLowerCase())}`);
  const entry = Array.isArray(data) ? data[0] : null;
  const t = entry?.phonetic || entry?.phonetics?.find((p) => p.text)?.text || '';
  return t ? `[${t.replace(/^\/|\/$/g, '')}]` : '';
}

export async function lookup(term) {
  const key = term.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const [translations, transcription] = await Promise.all([
    (async () => {
      for (const src of [google, mymemory]) {
        try { const t = await src(term.trim()); if (t.length) return t; } catch { /* next source */ }
      }
      return [];
    })(),
    ipa(term).catch(() => ''),
  ]);
  const result = { translations, transcription };
  if (translations.length) cache.set(key, result);
  return result;
}
