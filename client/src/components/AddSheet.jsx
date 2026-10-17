import { useState } from 'react';
import { PenLine, ListPlus, FolderPlus, ClipboardCheck, ChevronRight } from 'lucide-react';
import { go } from '../lib/util.js';
import { Sheet } from './ui.jsx';
import WordSheet from '../screens/WordSheet.jsx';
import { NewSetSheet } from '../screens/Sets.jsx';

// The one place to add anything. `setId` is the set currently open, if any.
export default function AddSheet({ open, onClose, setId }) {
  const [sub, setSub] = useState(null); // 'word' | 'set'

  const OPTIONS = [
    { id: 'word', icon: PenLine, title: 'Слово', sub: 'по одному, перевод подставится сам' },
    { id: 'list', icon: ListPlus, title: 'Слова списком', sub: 'вставить ответ ChatGPT или загрузить файл' },
    { id: 'set', icon: FolderPlus, title: 'Новый набор', sub: 'папка для слов по теме' },
    { id: 'test', icon: ClipboardCheck, title: 'Тест на ошибки', sub: 'из ответа ChatGPT по заданиям учебника' },
  ];

  const pick = (id) => {
    onClose();
    if (id === 'list') go(setId ? `/import/${setId}` : '/import');
    else if (id === 'test') go('/tests/new');
    else setSub(id);
  };

  return (
    <>
      <Sheet open={open} onClose={onClose}>
        <h2 className="display h-md" style={{ marginBottom: 16 }}>Что <em>добавим?</em></h2>
        <div className="menu">
          {OPTIONS.map((o) => (
            <button key={o.id} className="menu-item" onClick={() => pick(o.id)}>
              <span className="ic"><o.icon size={20} /></span>
              <span className="txt"><b>{o.title}</b><span>{o.sub}</span></span>
              <ChevronRight size={18} color="var(--muted)" />
            </button>
          ))}
        </div>
      </Sheet>
      <WordSheet open={sub === 'word'} onClose={() => setSub(null)} setId={setId} />
      <NewSetSheet open={sub === 'set'} onClose={() => setSub(null)} />
    </>
  );
}
