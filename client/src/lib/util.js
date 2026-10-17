import { useEffect, useState } from 'react';

// Hash router: "#/set/abc/study/quiz" → ['set', 'abc', 'study', 'quiz']
export function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path) => { location.hash = path; };
export const back = (fallback = '/') => (history.length > 1 ? history.back() : go(fallback));

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
export const words = (n) => `${n} ${plural(n, 'слово', 'слова', 'слов')}`;

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function streak(reviews) {
  const days = new Set(reviews.map((r) => dayKey(r.ts)));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

export function bestStreak(reviews) {
  const days = [...new Set(reviews.map((r) => dayKey(r.ts)))].sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const t = new Date(`${k}T12:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

let voice;
export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  voice ??= synth.getVoices().find((v) => v.lang === 'en-US' && /Samantha|Google US|Ava|Allison/i.test(v.name))
    || synth.getVoices().find((v) => v.lang?.startsWith('en'));
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  if (voice) u.voice = voice;
  u.rate = 0.92;
  synth.speak(u);
}

export const fmtDate = (ts) => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

export function fmtTime(ms) {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)} с` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
