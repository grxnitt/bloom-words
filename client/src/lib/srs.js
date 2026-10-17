import { put, list } from './store.js';

// Leitner-style spaced repetition. box 0 = new, 1..3 = learning, 4+ = learned.
const DAY = 86_400_000;
const INTERVALS = [0, 1, 3, 7, 16, 35, 80]; // days, indexed by box
export const MAX_BOX = INTERVALS.length - 1;
export const LEARNED_BOX = 4;
export const NEW_PER_SESSION = 10;

export function status(card) {
  const box = card.box || 0;
  if (box === 0 && !card.seen) return 'new';
  return box >= LEARNED_BOX ? 'learned' : 'learning';
}

export const isDue = (card, now = Date.now()) => (card.box || 0) > 0 && (card.due || 0) <= now;

// Records an answer. A correct answer only promotes a card that's actually due (or new),
// so drilling the same set ten times a day doesn't fake long-term memory.
export function grade(card, correct, mode) {
  const now = Date.now();
  const box = card.box || 0;
  let next = { ...card, seen: (card.seen || 0) + 1, right: (card.right || 0) + (correct ? 1 : 0) };
  if (correct) {
    if (box === 0 || isDue(card, now)) {
      const nb = Math.min(box + 1, MAX_BOX);
      next = { ...next, box: nb, due: now + INTERVALS[nb] * DAY };
    }
  } else {
    const nb = Math.max(1, Math.floor(box / 2));
    next = { ...next, box: nb, due: now + 10 * 60_000 };
  }
  put('cards', next);
  put('reviews', { cardId: card.id, setId: card.setId, ts: now, correct: !!correct, mode });
  return next;
}

export function reviewQueue(cards, now = Date.now()) {
  const due = cards.filter((c) => isDue(c, now)).sort((a, b) => (a.due || 0) - (b.due || 0)).slice(0, 40);
  const fresh = cards.filter((c) => status(c) === 'new').sort((a, b) => a.createdAt - b.createdAt).slice(0, NEW_PER_SESSION);
  return [...due, ...fresh];
}

export function setProgress(cards) {
  const p = { new: 0, learning: 0, learned: 0, total: cards.length };
  cards.forEach((c) => { p[status(c)] += 1; });
  return p;
}

export const cardsOf = (setId, data) => list('cards', data).filter((c) => c.setId === setId);
