import { useEffect, useState } from 'react';
import { put } from '../lib/store.js';
import { words, go } from '../lib/util.js';
import { Sheet, ProgressBar } from '../components/ui.jsx';

export function SetCard({ set, p, i = 0 }) {
  return (
    <a className={`set-card v${i % 3}`} href={`#/set/${set.id}`}>
      <div>
        <div className="title">{set.title}</div>
        <div className="muted small" style={{ marginTop: 8 }}>{words(p.total)}</div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <ProgressBar p={p} />
        <div className="small muted">{p.total ? `выучено ${Math.round((p.learned / p.total) * 100)}%` : 'добавь карточки'}</div>
      </div>
    </a>
  );
}

export function NewSetSheet({ open, onClose, set }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('study');
  useEffect(() => { if (open) { setTitle(set?.title || ''); setType(set?.type || (set ? 'language' : 'study')); } }, [open, set]);
  const save = () => {
    const t = title.trim();
    if (!t) return;
    const rec = put('sets', { ...(set || {}), title: t, type });
    onClose();
    if (!set) go(`/set/${rec.id}`);
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="display h-md" style={{ marginBottom: 18 }}>{set ? 'Переименовать' : <>Новый <em>набор</em></>}</h2>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field">
          <label htmlFor="set-title">Название</label>
          <input id="set-title" className="input big" autoFocus value={title} placeholder="Например, «Уголовное право»"
            onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field"><label htmlFor="set-type">Тип набора</label><select id="set-type" className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="study">Предмет — вопрос и ответ</option><option value="language">Английский — слово и перевод</option></select></div>
        <button className="btn block-w" disabled={!title.trim()}>{set ? 'Сохранить' : 'Создать'}</button>
      </form>
    </Sheet>
  );
}
