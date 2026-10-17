import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { grade } from '../lib/srs.js';
import { shuffle } from '../lib/util.js';
import { SayButton } from '../components/ui.jsx';
import { StudyTop, Done } from './Study.jsx';

function buildQuestions(deck, pool) {
  return deck.map((card) => {
    const reverse = Math.random() < 0.3; // mostly EN → RU, sometimes the other way
    const field = reverse ? 'term' : 'translation';
    const answer = card[field];
    const distractors = shuffle(pool.filter((c) => c.id !== card.id && c[field].toLowerCase() !== answer.toLowerCase()))
      .map((c) => c[field])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 3);
    return { card, reverse, prompt: reverse ? card.translation : card.term, options: shuffle([answer, ...distractors]), answer };
  });
}

export default function Quiz({ deck, pool, onAgain }) {
  const questions = useMemo(() => buildQuestions(deck, pool), [deck, pool]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [right, setRight] = useState(0);
  const q = questions[i];

  if (!q) return <><StudyTop done={1} total={1} right={<span />} /><Done right={right} total={questions.length} onAgain={onAgain} /></>;

  const next = () => { setPicked(null); setI((n) => n + 1); };
  const choose = (opt) => {
    if (picked !== null) return;
    const ok = opt === q.answer;
    setPicked(opt);
    grade(q.card, ok, 'quiz');
    if (ok) { setRight((r) => r + 1); setTimeout(next, 750); }
  };

  return (
    <>
      <StudyTop done={i} total={questions.length} />
      <div className="eyebrow" style={{ marginBottom: 12 }}>{q.reverse ? 'Как это по-английски?' : 'Выбери перевод'}</div>
      <div className="q-card enter" key={i}>
        {!q.reverse && <div style={{ position: 'absolute', top: 14, right: 14 }}><SayButton text={q.card.term} /></div>}
        <div className="term">{q.prompt}</div>
        {!q.reverse && q.card.transcription && <div className="muted" style={{ marginTop: 10 }}>{q.card.transcription}</div>}
      </div>
      <div className="options">
        {q.options.map((opt, n) => {
          let cls = '';
          if (picked !== null) {
            if (opt === q.answer) cls = 'right';
            else if (opt === picked) cls = 'wrong';
            else cls = 'dim';
          }
          return (
            <button key={opt} className={`option ${cls}`} onClick={() => choose(opt)}>
              <span className="k">{n + 1}</span>{opt}
            </button>
          );
        })}
      </div>
      {picked !== null && picked !== q.answer && (
        <button className="btn block-w mt-sm" onClick={next}>Дальше <ArrowRight size={18} /></button>
      )}
    </>
  );
}
