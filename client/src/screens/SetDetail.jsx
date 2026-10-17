import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Plus, ListPlus, Play, GalleryHorizontalEnd, ListChecks, Keyboard, Shapes } from 'lucide-react';
import { useStore, remove } from '../lib/store.js';
import { setProgress, cardsOf, status } from '../lib/srs.js';
import { words, go, back, fmtTime } from '../lib/util.js';
import { ProgressBar, Notch, toast } from '../components/ui.jsx';
import { NewSetSheet } from './Sets.jsx';
import WordSheet from './WordSheet.jsx';

export const MODES = [
  { id: 'cards', title: 'Карточки', sub: 'листай и вспоминай', icon: GalleryHorizontalEnd },
  { id: 'quiz', title: 'Тест', sub: 'выбери перевод', icon: ListChecks },
  { id: 'write', title: 'Написание', sub: 'вводи слово', icon: Keyboard },
  { id: 'match', title: 'Подбор', sub: 'пары на время', icon: Shapes },
];

export default function SetDetail({ id }) {
  const data = useStore((s) => s.data);
  const [rename, setRename] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | card
  const set = data.sets[id];

  if (!set || set.deleted) {
    return (
      <div className="empty">
        <div className="display h-md">Набор не найден</div>
        <a className="btn sm mt-sm" href="#/">К наборам</a>
      </div>
    );
  }

  const cards = cardsOf(id, data).sort((a, b) => b.createdAt - a.createdAt);
  const p = setProgress(cards);

  const del = () => {
    if (!confirm(`Удалить набор «${set.title}» и все слова в нём?`)) return;
    cards.forEach((c) => remove('cards', c.id));
    remove('sets', id);
    toast('Набор удалён');
    go('/');
  };

  return (
    <div>
      <div className="page-head">
        <button className="icon-btn" aria-label="Назад" onClick={() => back('/')}><ArrowLeft size={20} /></button>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Переименовать" onClick={() => setRename(true)}><Pencil size={17} /></button>
        <button className="icon-btn" aria-label="Удалить набор" onClick={del}><Trash2 size={17} /></button>
      </div>

      <section className="block enter">
        {p.total > 0 && (
          <Notch>
            <button className="notch-btn" aria-label="Учить карточками" onClick={() => go(`/set/${id}/study/cards`)}><Play size={20} /></button>
          </Notch>
        )}
        <div className="eyebrow">{words(p.total)}</div>
        <h1 className="display h-lg" style={{ margin: '10px 0 22px', paddingRight: 56 }}>{set.title}</h1>
        <ProgressBar p={p} />
        <div className="legend" style={{ marginTop: 12 }}>
          <span><i style={{ background: 'var(--rose-deep)' }} />выучено {p.learned}</span>
          <span><i style={{ background: 'var(--petal)' }} />изучаю {p.learning}</span>
          <span><i style={{ background: 'rgba(155,63,94,.15)' }} />новые {p.new}</span>
        </div>
      </section>

      {cards.length === 0 ? (
        <div className="empty mt-sm enter-2">
          <div className="display h-md">Добавь <em>слова</em></div>
          <p className="small">По одному — перевод и транскрипция подставятся сами. Или сразу списком: ответ ChatGPT, файл, строчки «word — перевод».</p>
          <div className="add-row" style={{ maxWidth: 420, margin: '18px auto 0' }}>
            <button className="btn" onClick={() => setEditing('new')}><Plus size={18} /> Слово</button>
            <button className="btn soft" onClick={() => go(`/import/${id}`)}><ListPlus size={18} /> Списком</button>
          </div>
        </div>
      ) : (
        <>
          <div className="section-head">
            <h2 className="display h-md">Учить</h2>
            <span className="muted small">выбери режим</span>
          </div>
          <div className="modes enter-2" style={{ marginTop: 0 }}>
            {MODES.map((m, i) => {
              const tooFew = (m.id === 'match' || m.id === 'quiz') && p.total < 2;
              return (
                <button key={m.id} className={`mode ${i === 0 ? 'hl' : ''}`} disabled={tooFew} style={tooFew ? { opacity: .5 } : null}
                  onClick={() => go(`/set/${id}/study/${m.id}`)}>
                  <span className="ic"><m.icon size={20} /></span>
                  <div>
                    <b>{m.title}</b>
                    <span>{m.id === 'match' && set.bestMatch ? `рекорд ${fmtTime(set.bestMatch)}` : m.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="section-head">
            <h2 className="display h-md">Слова <span className="muted small" style={{ fontFamily: 'var(--sans)' }}>{p.total}</span></h2>
          </div>
          <div className="add-row" style={{ marginBottom: 12 }}>
            <button className="btn sm" onClick={() => setEditing('new')}><Plus size={16} /> Слово</button>
            <button className="btn soft sm" onClick={() => go(`/import/${id}`)}><ListPlus size={16} /> Списком / файл</button>
          </div>
          <div className="word-list enter-3">
            {cards.map((c) => (
              <button key={c.id} className="word" onClick={() => setEditing(c)}>
                <span className={`dot ${status(c)}`} />
                <span>
                  <span className="t">{c.term}</span>
                  {c.transcription && <span className="ts">{c.transcription}</span>}
                  <div className="tr">{c.translation}</div>
                </span>
                <Pencil size={15} color="var(--muted)" />
              </button>
            ))}
          </div>
        </>
      )}

      <WordSheet open={!!editing} onClose={() => setEditing(null)} setId={id} card={editing === 'new' ? null : editing} />
      <NewSetSheet open={rename} onClose={() => setRename(false)} set={set} />
    </div>
  );
}
