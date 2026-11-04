import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { grade } from '../lib/srs.js';
import { normalizeAnswer } from '../lib/testFormat.js';
import { SayButton } from '../components/ui.jsx';
import { StudyTop, Done } from './Study.jsx';

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export default function Write({ deck, onAgain, study }) {
  const [queue, setQueue] = useState(deck);
  const [i, setI] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null); // null | 'ok' | 'typo' | 'wrong'
  const [hint, setHint] = useState(0);
  const [missed, setMissed] = useState(new Set());
  const input = useRef(null);
  const card = queue[i];

  useEffect(() => { input.current?.focus(); }, [i]);

  if (!card) {
    const right = deck.filter((c) => !missed.has(c.id)).length;
    return <><StudyTop done={1} total={1} right={<span />} /><Done right={right} total={deck.length} onAgain={onAgain} /></>;
  }

  const check = () => {
    if (study) { setResult('shown'); return; }
    const got = normalizeAnswer(value);
    if (!got) return;
    const want = normalizeAnswer(study ? card.translation : card.term);
    const d = distance(got, want);
    setResult(d === 0 ? 'ok' : d === 1 && want.length >= 5 ? 'typo' : 'wrong');
  };

  const next = (ok) => {
    grade(card, ok, 'write');
    if (!ok) { setMissed((s) => new Set(s).add(card.id)); setQueue((q) => [...q, card]); }
    setValue(''); setResult(null); setHint(0); setI((n) => n + 1);
  };

  const ok = result === 'ok' || result === 'typo';

  return (
    <>
      <StudyTop done={i} total={queue.length} />
      <div className="eyebrow" style={{ marginBottom: 12 }}>{study ? 'Вспомни ответ своими словами' : 'Напиши по-английски'}</div>
      <div className="q-card enter" key={i}>
        <div className="term" style={{ fontSize: study ? 'clamp(20px, 5vw, 28px)' : 'clamp(30px, 9vw, 46px)' }}>{study ? card.term : card.translation}</div>
        {!study && hint > 0 && !result && (
          <div className="muted" style={{ marginTop: 12, letterSpacing: '.18em', fontWeight: 600 }}>
            {card.term.split('').map((ch, n) => (n < hint || ch === ' ' ? ch : '·')).join('')}
          </div>
        )}
      </div>

      <form className="stack mt-sm" onSubmit={(e) => { e.preventDefault(); result ? (!study && next(ok)) : check(); }}>
        <textarea ref={input} className="input big" value={value} readOnly={!!result} placeholder="Твой ответ"
          autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          style={result ? { borderColor: study || ok ? 'var(--good)' : 'var(--bad)' } : null} />

        {result && (
          <div className={`feedback ${study || ok ? 'ok' : 'err'}`}>
            <div className="row between">
              <div>
                {study && <><b>Ответ из карточки:</b><p>{card.translation}</p><p className="small">Сравни смысл со своим ответом и оцени себя.</p></>}
                {!study && result === 'ok' && <b>Верно!</b>}
                {!study && result === 'typo' && <><b>Почти!</b> Правильно: <b>{card.term}</b></>}
                {!study && result === 'wrong' && <>Правильно: <b>{card.term}</b></>}
                {card.transcription && <span style={{ opacity: .7 }}> {card.transcription}</span>}
              </div>
              {!study && <SayButton text={card.term} className="icon-btn bare" />}
            </div>
          </div>
        )}

        {!result ? (
          <div className="row">
            {!study && <button type="button" className="btn soft" onClick={() => setHint((h) => Math.min(h + 1, card.term.length))}>
              <Lightbulb size={17} /> Подсказка
            </button>}
            <button className="btn" style={{ flex: 1 }} disabled={!value.trim()}>{study ? 'Показать ответ' : 'Проверить'}</button>
          </div>
        ) : (
          <div className="row">
            {study ? <><button type="button" className="btn soft" onClick={() => next(false)}>Ещё учу</button><button type="button" className="btn" onClick={() => next(true)}>Знаю</button></> : <>{result === 'wrong' && <button type="button" className="btn soft" onClick={() => next(true)}>Я была права</button>}
            <button className="btn" style={{ flex: 1 }}>Дальше <ArrowRight size={18} /></button></>}
          </div>
        )}
      </form>
    </>
  );
}
