import { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { put, remove, useStore, list } from '../lib/store.js';
import { Sheet, SayButton, toast } from '../components/ui.jsx';
import { lookup } from '../lib/lookup.js';

// Add / edit a word. Typing the English word fetches translation + transcription,
// but whatever she types by hand always wins.
export default function WordSheet({ open, onClose, setId, card }) {
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [transcription, setTranscription] = useState('');
  const [suggest, setSuggest] = useState([]);
  const [loading, setLoading] = useState(false);
  const touched = useRef({ translation: false, transcription: false });
  const termRef = useRef(null);
  const reqId = useRef(0);
  const sets = useStore((st) => list('sets', st.data)).sort((a, b) => b.updatedAt - a.updatedAt);
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (!open) return;
    setTarget(setId || sets[0]?.id || 'new');
    setTerm(card?.term || '');
    setTranslation(card?.translation || '');
    setTranscription(card?.transcription || '');
    setSuggest([]);
    touched.current = { translation: !!card, transcription: !!card };
  }, [open, card]);

  useEffect(() => {
    const t = term.trim();
    if (!open || !t || (card && t === card.term)) return;
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await lookup(t);
        if (id !== reqId.current) return;
        setSuggest(r.translations || []);
        if (!touched.current.translation && r.translations?.[0]) setTranslation(r.translations.slice(0, 2).join(', '));
        if (!touched.current.transcription) setTranscription(r.transcription || '');
      } catch {
        if (id === reqId.current) setSuggest([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [term, open, card]);

  const toggleSuggestion = (s) => {
    touched.current.translation = true;
    const parts = translation.split(',').map((x) => x.trim()).filter(Boolean);
    const has = parts.some((x) => x.toLowerCase() === s.toLowerCase());
    setTranslation((has ? parts.filter((x) => x.toLowerCase() !== s.toLowerCase()) : [...parts, s]).join(', '));
  };

  const save = (more) => {
    const t = term.trim(), tr = translation.trim();
    if (!t || !tr) return;
    let sid = setId || target;
    if (!card && sid === 'new') { sid = put('sets', { title: 'Мои слова' }).id; setTarget(sid); }
    put('cards', { ...(card || { setId: sid, box: 0 }), term: t, translation: tr, transcription: transcription.trim() });
    if (more) {
      toast(`«${t}» добавлено`);
      setTerm(''); setTranslation(''); setTranscription(''); setSuggest([]);
      touched.current = { translation: false, transcription: false };
      termRef.current?.focus();
    } else onClose();
  };

  const chosen = translation.toLowerCase().split(',').map((x) => x.trim());

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="row between" style={{ marginBottom: 18 }}>
        <h2 className="display h-md">{card ? <>Изменить <em>слово</em></> : <>Новое <em>слово</em></>}</h2>
        {card && (
          <button className="icon-btn" aria-label="Удалить слово" onClick={() => { remove('cards', card.id); onClose(); toast('Слово удалено'); }}>
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(!card); }}>
        {!setId && !card && (
          <div className="field">
            <label>В набор</label>
            <div className="chips">
              {sets.map((st) => (
                <button type="button" key={st.id} className={`chip ${target === st.id ? 'on' : ''}`} onClick={() => setTarget(st.id)}>{st.title}</button>
              ))}
              {!sets.length && <span className="chip on">Мои слова (новый)</span>}
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="w-term">Слово или фраза на английском</label>
          <div className="row" style={{ gap: 8 }}>
            <input id="w-term" ref={termRef} className="input big" value={term} autoFocus autoCapitalize="none" autoCorrect="off"
              spellCheck="false" placeholder="reliable" onChange={(e) => setTerm(e.target.value)} />
            <SayButton text={term} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="w-ts">Транскрипция</label>
          <input id="w-ts" className="input" value={transcription} placeholder={loading ? 'ищу…' : '[rɪˈlaɪəbl]'}
            onChange={(e) => { touched.current.transcription = true; setTranscription(e.target.value); }} />
        </div>
        <div className="field">
          <label htmlFor="w-tr" className="row" style={{ gap: 6 }}>
            Перевод {loading && <Loader2 size={13} className="spin" />}
          </label>
          <input id="w-tr" className="input" value={translation} placeholder={loading ? 'ищу перевод…' : 'надёжный'}
            onChange={(e) => { touched.current.translation = true; setTranslation(e.target.value); }} />
          {suggest.length > 0 && (
            <div className="chips" style={{ marginTop: 6 }}>
              {suggest.map((s) => (
                <button type="button" key={s} className={`chip ${chosen.includes(s.toLowerCase()) ? 'on' : ''}`} onClick={() => toggleSuggestion(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          {card ? (
            <button className="btn block-w" disabled={!term.trim() || !translation.trim()}>Сохранить</button>
          ) : (
            <>
              <button type="button" className="btn soft" style={{ flex: 1 }} disabled={!term.trim() || !translation.trim()} onClick={() => save(false)}>Готово</button>
              <button className="btn" style={{ flex: 1.4 }} disabled={!term.trim() || !translation.trim()}>Сохранить и ещё</button>
            </>
          )}
        </div>
      </form>
    </Sheet>
  );
}
