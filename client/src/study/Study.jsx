import { createContext, useContext, useMemo, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useStore, list } from '../lib/store.js';
import { reviewQueue, cardsOf } from '../lib/srs.js';
import { shuffle, back, plural } from '../lib/util.js';
import { Ring } from '../components/ui.jsx';
import Flashcards from './Flashcards.jsx';
import Quiz from './Quiz.jsx';
import Write from './Write.jsx';
import Match from './Match.jsx';
import { MODES } from '../screens/SetDetail.jsx';

const SwitchCtx = createContext(null);

export function StudyTop({ done, total, right }) {
  const sw = useContext(SwitchCtx);
  return (
    <>
    <div className="study-top">
      <button className="icon-btn" aria-label="Закрыть" onClick={() => back('/')}><X size={20} /></button>
      <div className="progress"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      {right ?? <span className="counter tnum">{Math.min(done + 1, total)}/{total}</span>}
    </div>
    {sw && (
      <nav className="mode-switch" aria-label="Режим">
        {MODES.map((m) => (
          <a key={m.id} className={sw.mode === m.id ? 'on' : ''} href={`#/set/${sw.setId}/study/${m.id}`}
            onClick={(e) => { e.preventDefault(); location.replace(`#/set/${sw.setId}/study/${m.id}`); }}>
            <m.icon size={15} /> {m.title}
          </a>
        ))}
      </nav>
    )}
    </>
  );
}

export function Done({ right, total, title, onAgain, extra }) {
  const pct = total ? Math.round((right / total) * 100) : 0;
  const msg = pct === 100 ? 'Идеально!' : pct >= 80 ? 'Отлично!' : pct >= 50 ? 'Хороший прогресс' : 'Повторим ещё';
  return (
    <div className="result enter">
      <Ring value={right} total={total} label={`${pct}%`} />
      <div>
        <h1 className="display h-lg">{title || msg}</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          {right} из {total} {plural(total, 'ответа', 'ответов', 'ответов')} верно
        </p>
      </div>
      {extra}
      <div className="row" style={{ width: '100%', maxWidth: 400 }}>
        {onAgain && <button className="btn soft" style={{ flex: 1 }} onClick={onAgain}><RotateCcw size={17} /> Ещё раз</button>}
        <button className="btn" style={{ flex: 1 }} onClick={() => back('/')}>Готово</button>
      </div>
    </div>
  );
}

export default function Study({ mode, setId }) {
  const data = useStore((s) => s.data);
  const [round, setRound] = useState(0);

  // Freeze the deck when a session starts so grading doesn't reshuffle it mid-way.
  const deck = useMemo(() => {
    if (mode === 'review') return reviewQueue(list('cards', data));
    return shuffle(cardsOf(setId, data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, setId, round]);
  const pool = useMemo(() => list('cards', data), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = setId ? data.sets[setId] : null;
  const again = () => setRound((r) => r + 1);

  if (!deck.length) {
    return (
      <>
        <StudyTop done={0} total={0} right={<span />} />
        <div className="result">
          <h1 className="display h-lg">{mode === 'review' ? <>Всё <em>повторено</em></> : 'Здесь пока нет слов'}</h1>
          <p className="muted">{mode === 'review' ? 'Новые слова для повторения появятся позже.' : 'Добавь слова в набор.'}</p>
          <button className="btn" onClick={() => back('/')}>Назад</button>
        </div>
      </>
    );
  }

  const props = { deck, pool, set, onAgain: again };
  let view;
  if (mode === 'quiz') view = <Quiz key={`q${round}`} {...props} />;
  else if (mode === 'write') view = <Write key={`w${round}`} {...props} />;
  else if (mode === 'match') view = <Match key={`m${round}`} {...props} />;
  else view = <Flashcards key={`c${round}`} {...props} review={mode === 'review'} />;
  return <SwitchCtx.Provider value={setId ? { mode, setId } : null}>{view}</SwitchCtx.Provider>;
}
