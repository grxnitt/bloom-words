import { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { put } from '../lib/store.js';
import { shuffle, fmtTime } from '../lib/util.js';
import { StudyTop } from './Study.jsx';
import { Done } from './Study.jsx';

const PAIRS = 6;

export default function Match({ deck, set, onAgain }) {
  const tiles = useMemo(() => {
    const picked = deck.slice(0, PAIRS);
    return shuffle(picked.flatMap((c) => [
      { key: `${c.id}-en`, pair: c.id, text: c.term, en: true },
      { key: `${c.id}-ru`, pair: c.id, text: c.translation.split(',')[0].trim(), en: false },
    ]));
  }, [deck]);
  const pairs = tiles.length / 2;

  const [sel, setSel] = useState(null);
  const [done, setDone] = useState(new Set());
  const [bad, setBad] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(null);
  const start = useRef(performance.now());

  useEffect(() => {
    if (finished) return;
    let raf;
    const tick = () => { setElapsed(performance.now() - start.current); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finished]);

  const tap = (t) => {
    if (done.has(t.pair) || finished) return;
    if (!sel) return setSel(t);
    if (sel.key === t.key) return setSel(null);
    if (sel.pair === t.pair && sel.en !== t.en) {
      const next = new Set(done).add(t.pair);
      setDone(next);
      setSel(null);
      if (next.size === pairs) {
        const time = performance.now() - start.current + mistakes * 1000; // +1 с за ошибку
        const record = !set?.bestMatch || time < set.bestMatch;
        if (record && set) put('sets', { ...set, bestMatch: Math.round(time) });
        setFinished({ time, record });
      }
    } else {
      setBad([sel.key, t.key]);
      setMistakes((m) => m + 1);
      setSel(null);
      setTimeout(() => setBad([]), 450);
    }
  };

  if (finished) {
    return (
      <>
        <StudyTop done={1} total={1} right={<span />} />
        <Done right={pairs} total={pairs} title={fmtTime(finished.time)} onAgain={onAgain}
          extra={
            <div className="chips" style={{ justifyContent: 'center' }}>
              {finished.record && <span className="chip on"><Trophy size={14} style={{ verticalAlign: -2 }} /> Новый рекорд!</span>}
              {!finished.record && set?.bestMatch && <span className="chip">рекорд {fmtTime(set.bestMatch)}</span>}
              {mistakes > 0 && <span className="chip">ошибок: {mistakes} (+{mistakes} с)</span>}
            </div>
          } />
      </>
    );
  }

  return (
    <>
      <StudyTop done={done.size} total={pairs} right={<span className="timer tnum">{fmtTime(elapsed)}</span>} />
      <div className="eyebrow" style={{ marginBottom: 12 }}>Найди пары · ошибка = +1 секунда</div>
      <div className="match-grid">
        {tiles.map((t) => (
          <button key={t.key} onClick={() => tap(t)}
            className={`m-tile ${t.en ? 'en' : ''} ${sel?.key === t.key ? 'sel' : ''} ${done.has(t.pair) ? 'done' : ''} ${bad.includes(t.key) ? 'bad' : ''}`}>
            {t.text}
          </button>
        ))}
      </div>
    </>
  );
}
