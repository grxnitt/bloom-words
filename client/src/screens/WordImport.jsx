import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardPaste, Copy, FileUp, Loader2, Check, Plus } from 'lucide-react';
import { useStore, list, put } from '../lib/store.js';
import { parseWords, dedupe, WORDS_PROMPT } from '../lib/wordFormat.js';
import { lookup } from '../lib/lookup.js';
import { back, go, words as wordsN } from '../lib/util.js';
import { toast } from '../components/ui.jsx';

const ACCEPT = '.txt,.csv,.tsv,.json,.md,text/plain,text/csv,application/json';

async function copyPrompt() {
  try { await navigator.clipboard.writeText(WORDS_PROMPT); toast('Промпт скопирован — вставь его в ChatGPT'); }
  catch { toast('Не получилось скопировать'); }
}

export default function WordImport({ setId: initialSet }) {
  const data = useStore((s) => s.data);
  const sets = list('sets', data).sort((a, b) => b.updatedAt - a.updatedAt);
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [target, setTarget] = useState(initialSet || sets[0]?.id || 'new');
  const [newName, setNewName] = useState('');
  const [finding, setFinding] = useState(0);
  const fileRef = useRef(null);
  const run = useRef(0);

  const existing = useMemo(
    () => (target === 'new' ? [] : list('cards', data).filter((c) => c.setId === target).map((c) => c.term)),
    [target, data],
  );

  // Parse whenever the text changes, then fill in missing translations in the background.
  useEffect(() => {
    const id = ++run.current;
    const t = setTimeout(async () => {
      const parsed = parseWords(text);
      if (parsed.set && !initialSet) { setNewName(parsed.set); setTarget('new'); }
      const next = parsed.words.map((w, i) => ({ ...w, key: `${i}-${w.term}`, on: true, loading: !w.translation || !w.transcription }));
      setItems(next);
      const todo = next.filter((w) => w.loading);
      setFinding(todo.length);
      let cursor = 0;
      const worker = async () => {
        while (cursor < todo.length && id === run.current) {
          const w = todo[cursor++];
          let r = { translations: [], transcription: '' };
          try { r = await lookup(w.term); } catch { /* leave empty, she can type it */ }
          if (id !== run.current) return;
          setItems((cur) => cur.map((x) => (x.key !== w.key ? x : {
            ...x,
            translation: x.translation || r.translations.slice(0, 2).join(', '),
            transcription: x.transcription || r.transcription || '',
            loading: false,
          })));
          setFinding((n) => n - 1);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    }, 350);
    return () => clearTimeout(t);
  }, [text, initialSet]);

  const rows = dedupe(items, existing).map((w) => ({ ...w, on: w.on && !w.dup }));
  const chosen = rows.filter((w) => w.on && w.term && w.translation);
  const edit = (key, patch) => setItems((cur) => cur.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const readFile = async (file) => {
    if (!file) return;
    if (file.size > 1_000_000) return toast('Файл слишком большой');
    setText(await file.text());
  };

  const paste = async () => {
    try { setText(await navigator.clipboard.readText()); } catch { toast('Вставь вручную: долгое нажатие → Вставить'); }
  };

  const save = () => {
    let setId = target;
    if (target === 'new') {
      const name = newName.trim() || 'Новый набор';
      setId = put('sets', { title: name }).id;
    }
    chosen.forEach((w) => put('cards', { setId, box: 0, term: w.term, translation: w.translation, transcription: w.transcription }));
    toast(`Добавлено: ${wordsN(chosen.length)}`);
    go(`/set/${setId}`);
  };

  return (
    <div>
      <div className="page-head">
        <button className="icon-btn" aria-label="Назад" onClick={() => back('/')}><ArrowLeft size={20} /></button>
      </div>
      <h1 className="display h-lg enter" style={{ marginBottom: 18 }}>Слова <em>списком</em></h1>

      <section className="block enter">
        <div className="eyebrow">Как получить список</div>
        <ol className="steps">
          <li>Скопируй промпт и отправь его ChatGPT вместе с текстом, фото страницы или списком слов.</li>
          <li>ChatGPT выпишет незнакомые слова с переводом и транскрипцией.</li>
          <li>Вставь его ответ ниже или загрузи файл. Подойдёт и обычный список «word — перевод» или просто слова по строчкам — перевод найдётся сам.</li>
        </ol>
        <button className="btn soft" onClick={copyPrompt}><Copy size={17} /> Скопировать промпт</button>
      </section>

      <div className="stack mt-sm enter-2">
        <div className="row wrap">
          <button className="btn blush sm" onClick={paste}><ClipboardPaste size={15} /> Вставить из буфера</button>
          <button className="btn blush sm" onClick={() => fileRef.current?.click()}><FileUp size={15} /> Загрузить файл</button>
          <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div className="field">
          <label htmlFor="w-list">Ответ ChatGPT или список слов</label>
          <textarea id="w-list" className="textarea" style={{ minHeight: 150 }} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'reliable — надёжный\ngive up — сдаваться\nluggage'} />
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="display h-md">Проверь</h2>
            <span className="muted small row" style={{ gap: 6 }}>
              {finding > 0 && <><Loader2 size={13} className="spin" /> ищу переводы…</>}
              {finding === 0 && `${chosen.length} из ${rows.length}`}
            </span>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>В какой набор</label>
            <div className="chips">
              {sets.map((s) => (
                <button key={s.id} className={`chip ${target === s.id ? 'on' : ''}`} onClick={() => setTarget(s.id)}>{s.title}</button>
              ))}
              <button className={`chip ${target === 'new' ? 'on' : ''}`} onClick={() => setTarget('new')}><Plus size={13} style={{ verticalAlign: -2 }} /> Новый</button>
            </div>
            {target === 'new' && (
              <input className="input" style={{ marginTop: 8 }} value={newName} placeholder="Название нового набора" onChange={(e) => setNewName(e.target.value)} />
            )}
          </div>

          <div className="word-list">
            {rows.map((w) => (
              <div key={w.key} className={`imp-row ${w.on ? '' : 'off'}`}>
                <button className={`check ${w.on ? 'on' : ''}`} aria-label={w.on ? 'Не добавлять' : 'Добавить'} disabled={w.dup}
                  onClick={() => edit(w.key, { on: !w.on })}>
                  {w.on && <Check size={14} strokeWidth={3} />}
                </button>
                <div className="imp-fields">
                  <div className="row" style={{ gap: 8 }}>
                    <input className="imp-term" value={w.term} onChange={(e) => edit(w.key, { term: e.target.value })} aria-label="Слово" />
                    {w.dup && <span className="tag">уже есть</span>}
                  </div>
                  <input className="imp-tr" value={w.translation} placeholder={w.loading ? 'ищу перевод…' : 'перевод'}
                    onChange={(e) => edit(w.key, { translation: e.target.value })} aria-label="Перевод" />
                  <input className="imp-ts" value={w.transcription} placeholder={w.loading ? '' : 'транскрипция'}
                    onChange={(e) => edit(w.key, { transcription: e.target.value })} aria-label="Транскрипция" />
                </div>
              </div>
            ))}
          </div>

          <div className="save-bar">
            <button className="btn block-w" disabled={!chosen.length} onClick={save}>
              Добавить {wordsN(chosen.length)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
