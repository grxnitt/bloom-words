import { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardPaste, Copy, AlertCircle } from 'lucide-react';
import { put } from '../lib/store.js';
import { extractJson, validateTest } from '../lib/testFormat.js';
import { back, go, plural } from '../lib/util.js';
import { toast } from '../components/ui.jsx';
import { copyPrompt } from './Tests.jsx';

export default function TestImport() {
  const [text, setText] = useState('');

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return validateTest(extractJson(text));
    } catch {
      return { test: null, errors: ['Не получилось прочитать ответ. Скопируй ответ ChatGPT целиком, вместе с блоком кода.'] };
    }
  }, [text]);

  const paste = async () => {
    try { setText(await navigator.clipboard.readText()); } catch { toast('Вставь вручную: долгое нажатие → Вставить'); }
  };

  const ok = parsed?.test && parsed.test.questions.length > 0;
  const save = () => {
    const rec = put('tests', parsed.test);
    toast('Тест добавлен');
    go(`/test/${rec.id}`);
  };

  return (
    <div>
      <div className="page-head">
        <button className="icon-btn" aria-label="Назад" onClick={() => back('/tests')}><ArrowLeft size={20} /></button>
      </div>
      <h1 className="display h-lg enter" style={{ marginBottom: 18 }}>Новый <em>тест</em></h1>

      <div className="stack enter-2">
        <div className="row wrap">
          <button className="btn soft sm" onClick={copyPrompt}><Copy size={15} /> Промпт для ChatGPT</button>
          <button className="btn blush sm" onClick={paste}><ClipboardPaste size={15} /> Вставить из буфера</button>
        </div>
        <div className="field">
          <label htmlFor="t-json">Ответ ChatGPT</label>
          <textarea id="t-json" className="textarea" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Вставь сюда ответ целиком — например:\n\n```json\n{ "title": "...", "questions": [ ... ] }\n```'} />
        </div>

        {parsed && (
          <div className={`feedback ${ok ? 'ok' : 'err'}`}>
            {ok && (
              <div>
                <b>{parsed.test.title}</b> — {parsed.test.questions.length} {plural(parsed.test.questions.length, 'вопрос', 'вопроса', 'вопросов')}
                {parsed.test.description && <div style={{ marginTop: 4, opacity: .85 }}>{parsed.test.description}</div>}
              </div>
            )}
            {parsed.errors.length > 0 && (
              <div style={{ marginTop: ok ? 10 : 0 }}>
                <div className="row" style={{ gap: 6, fontWeight: 700 }}><AlertCircle size={16} /> {ok ? 'Пропущены вопросы с ошибками:' : 'Есть проблема:'}</div>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{parsed.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <button className="btn block-w" disabled={!ok} onClick={save}>Сохранить тест</button>
      </div>
    </div>
  );
}
