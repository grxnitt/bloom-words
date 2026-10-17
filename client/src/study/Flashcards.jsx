import { useRef, useState } from 'react';
import { X, Check, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { grade } from '../lib/srs.js';
import { SayButton } from '../components/ui.jsx';
import { StudyTop, Done } from './Study.jsx';

const THRESHOLD = 90;

export default function Flashcards({ deck, review, onAgain }) {
  const [queue, setQueue] = useState(deck);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(0); // -1 | 0 | 1
  const [known, setKnown] = useState(new Set());
  const drag = useRef(null);

  const card = queue[i];
  const uniqueTotal = deck.length;

  if (!card) {
    return (
      <>
        <StudyTop done={1} total={1} right={<span />} />
        <Done right={known.size} total={uniqueTotal}
          title={review ? <>Повторение <em>готово</em></> : null} onAgain={review ? null : onAgain} />
      </>
    );
  }

  const answer = (ok) => {
    if (leaving) return;
    setLeaving(ok ? 1 : -1);
    grade(card, ok, review ? 'review' : 'cards');
    setTimeout(() => {
      if (ok) setKnown((k) => new Set(k).add(card.id));
      else setQueue((q) => [...q, card]); // see it again at the end of the session
      setI((n) => n + 1);
      setFlipped(false);
      setDx(0);
      setLeaving(0);
    }, 260);
  };

  const onDown = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const d = e.clientX - drag.current.x;
    if (Math.abs(d) > 6) drag.current.moved = true;
    setDx(d);
  };
  const onUp = () => {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    if (Math.abs(dx) > THRESHOLD) answer(dx > 0);
    else { setDx(0); if (!moved) setFlipped((f) => !f); }
  };

  const front = reverse ? card.translation : card.term;
  const backText = reverse ? card.term : card.translation;
  const x = leaving ? leaving * window.innerWidth : dx;
  const style = {
    transform: `translateX(${x}px) rotate(${x / 22}deg)`,
    transition: drag.current ? 'none' : 'transform .32s cubic-bezier(.22,1,.36,1)',
  };
  const tagOpacity = Math.min(Math.abs(dx) / THRESHOLD, 1);

  return (
    <>
      <StudyTop done={i} total={queue.length} />
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="eyebrow">{review ? 'Повторение' : 'Карточки'} · осталось {queue.length - i}</span>
        <button className="btn ghost sm" onClick={() => setReverse((r) => !r)} aria-label="Сменить направление">
          <ArrowLeftRight size={15} /> {reverse ? 'RU → EN' : 'EN → RU'}
        </button>
      </div>

      <div className="card-stage">
        <div style={{ ...style, width: '100%', display: 'grid', placeItems: 'center' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className={`flash ${flipped ? 'flipped' : ''}`} key={card.id + i}>
            <div className="face">
              <span className="swipe-tag yes" style={{ opacity: dx > 0 ? tagOpacity : 0 }}>знаю</span>
              <span className="swipe-tag no" style={{ opacity: dx < 0 ? tagOpacity : 0 }}>ещё учу</span>
              {!reverse && <div className="say"><SayButton text={card.term} /></div>}
              <div className="term">{front}</div>
              {!reverse && card.transcription && <div className="sub">{card.transcription}</div>}
              <div className="hint">нажми, чтобы перевернуть</div>
            </div>
            <div className="face back">
              {reverse && <div className="say"><SayButton text={card.term} /></div>}
              <div className="term" style={reverse ? null : { fontSize: 'clamp(30px, 8vw, 44px)' }}>{backText}</div>
              {reverse && card.transcription && <div className="sub">{card.transcription}</div>}
              <div className="sub" style={{ fontSize: 14 }}>{reverse ? card.translation : card.term}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="study-actions">
        <button className="btn no" onClick={() => answer(false)}><X size={18} /> Ещё учу</button>
        <button className="icon-btn" style={{ width: 58, height: 58 }} aria-label="Перевернуть" onClick={() => setFlipped((f) => !f)}>
          <RefreshCw size={20} />
        </button>
        <button className="btn yes" onClick={() => answer(true)}><Check size={18} /> Знаю</button>
      </div>
    </>
  );
}
