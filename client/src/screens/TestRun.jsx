import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play, RotateCcw, Trash2, X } from 'lucide-react';
import { useStore, list, put, remove } from '../lib/store.js';
import { normalizeAnswer } from '../lib/testFormat.js';
import { back, go, plural, fmtDate } from '../lib/util.js';
import { Ring, toast } from '../components/ui.jsx';

function Question({ q, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(null); // null | boolean
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);

  const correct = q.type === 'choice' ? picked === q.answer : checked;
  const answered = q.type === 'choice' ? picked !== null : checked !== null;

  const check = () => {
    if (!value.trim()) return;
    const v = normalizeAnswer(value);
    setChecked(q.answers.some((a) => normalizeAnswer(a) === v));
  };

  return (
    <div className="enter">
      <div className="q-card" style={{ textAlign: 'left', padding: '28px 24px' }}>
        <div style={{ fontSize: 20, lineHeight: 1.45, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{q.question}</div>
      </div>

      {q.type === 'choice' ? (
        <div className="options">
          {q.options.map((opt, n) => {
            let cls = '';
            if (answered) cls = n === q.answer ? 'right' : n === picked ? 'wrong' : 'dim';
            return (
              <button key={n} className={`option ${cls}`} onClick={() => picked === null && setPicked(n)}>
                <span className="k">{String.fromCharCode(65 + n)}</span>{opt}
              </button>
            );
          })}
        </div>
      ) : (
        <form className="mt-sm" onSubmit={(e) => { e.preventDefault(); answered ? onAnswer(correct, value) : check(); }}>
          <input ref={input} className="input big" value={value} readOnly={answered} placeholder="Твой ответ"
            autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="off"
            onChange={(e) => setValue(e.target.value)}
            style={answered ? { borderColor: correct ? 'var(--good)' : 'var(--bad)' } : null} />
          {!answered && <button className="btn block-w mt-sm" disabled={!value.trim()}>Проверить</button>}
        </form>
      )}

      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'err'}`}>
            <b>{correct ? 'Верно!' : 'Неверно.'}</b>
            {!correct && q.type === 'input' && <> Правильно: <b>{q.answers[0]}</b></>}
            {q.explanation && <div style={{ marginTop: 6 }}>{q.explanation}</div>}
          </div>
          <div className="row mt-sm">
            {!correct && q.type === 'input' && (
              <button className="btn soft" onClick={() => onAnswer(true, value)}>Я была права</button>
            )}
            <button className="btn" style={{ flex: 1 }} onClick={() => onAnswer(correct, q.type === 'choice' ? q.options[picked] : value)}>
              Дальше <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TestRun({ id }) {
  const data = useStore((s) => s.data);
  const test = data.tests[id];
  const [run, setRun] = useState(null); // { order: number[], i, answers: [] }

  if (!test || test.deleted) {
    return (
      <div className="result">
        <h1 className="display h-lg">Тест не найден</h1>
        <a className="btn" href="#/tests">К тестам</a>
      </div>
    );
  }

  const attempts = list('attempts', data).filter((a) => a.testId === id).sort((a, b) => b.ts - a.ts);
  const start = (order) => setRun({ order, i: 0, answers: [] });

  if (run && run.i < run.order.length) {
    const qi = run.order[run.i];
    const onAnswer = (ok, given) => {
      const answers = [...run.answers, { q: qi, ok, given }];
      const i = run.i + 1;
      if (i >= run.order.length) {
        const score = answers.filter((a) => a.ok).length;
        put('attempts', { testId: id, ts: Date.now(), score, total: answers.length, answers });
      }
      setRun({ ...run, i, answers });
    };
    return (
      <>
        <div className="study-top">
          <button className="icon-btn" aria-label="Выйти" onClick={() => setRun(null)}><X size={20} /></button>
          <div className="progress"><span style={{ width: `${(run.i / run.order.length) * 100}%` }} /></div>
          <span className="counter tnum">{run.i + 1}/{run.order.length}</span>
        </div>
        <Question key={`${run.i}-${qi}`} q={test.questions[qi]} onAnswer={onAnswer} />
      </>
    );
  }

  if (run) {
    const score = run.answers.filter((a) => a.ok).length;
    const wrong = run.answers.filter((a) => !a.ok);
    const pct = Math.round((score / run.answers.length) * 100);
    return (
      <div className="result enter">
        <Ring value={score} total={run.answers.length} label={`${pct}%`} />
        <div>
          <h1 className="display h-lg">{pct === 100 ? 'Без ошибок!' : pct >= 80 ? 'Отлично!' : pct >= 50 ? 'Неплохо' : 'Есть над чем поработать'}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{score} из {run.answers.length} верно</p>
        </div>
        {wrong.length > 0 && (
          <div className="err-list">
            <div className="eyebrow" style={{ textAlign: 'center' }}>Разбор ошибок</div>
            {wrong.map((w) => {
              const q = test.questions[w.q];
              return (
                <div key={w.q} className="err-item">
                  <div className="q">{q.question}</div>
                  <div>Твой ответ: <span style={{ color: 'var(--bad)' }}>{w.given || '—'}</span></div>
                  <div>Правильно: <b style={{ color: 'var(--good)' }}>{q.type === 'choice' ? q.options[q.answer] : q.answers.join(' / ')}</b></div>
                  {q.explanation && <div className="muted" style={{ marginTop: 6 }}>{q.explanation}</div>}
                </div>
              );
            })}
          </div>
        )}
        <div className="row" style={{ width: '100%', maxWidth: 440 }}>
          {wrong.length > 0
            ? <button className="btn soft" style={{ flex: 1 }} onClick={() => start(wrong.map((w) => w.q))}><RotateCcw size={17} /> Только ошибки</button>
            : <button className="btn soft" style={{ flex: 1 }} onClick={() => start(test.questions.map((_, n) => n))}><RotateCcw size={17} /> Ещё раз</button>}
          <button className="btn" style={{ flex: 1 }} onClick={() => go('/tests')}>Готово</button>
        </div>
      </div>
    );
  }

  const del = () => {
    if (!confirm(`Удалить тест «${test.title}»?`)) return;
    remove('tests', id);
    toast('Тест удалён');
    go('/tests');
  };

  return (
    <div>
      <div className="study-top">
        <button className="icon-btn" aria-label="Назад" onClick={() => back('/tests')}><X size={20} /></button>
        <div style={{ flex: 1 }} />
        <button className="icon-btn" aria-label="Удалить тест" onClick={del}><Trash2 size={17} /></button>
      </div>
      <section className="block enter">
        <div className="eyebrow">{test.questions.length} {plural(test.questions.length, 'вопрос', 'вопроса', 'вопросов')} · {fmtDate(test.createdAt)}</div>
        <h1 className="display h-lg" style={{ margin: '12px 0 12px' }}>{test.title}</h1>
        {test.description && <p className="muted" style={{ margin: 0 }}>{test.description}</p>}
        <button className="btn block-w" style={{ marginTop: 24 }} onClick={() => start(test.questions.map((_, n) => n))}>
          <Play size={17} /> Начать
        </button>
      </section>

      {attempts.length > 0 && (
        <>
          <div className="section-head"><h2 className="display h-md">Попытки</h2></div>
          <div className="stack" style={{ gap: 8 }}>
            {attempts.map((a) => {
              const pct = Math.round((a.score / a.total) * 100);
              return (
                <div key={a.id} className="test-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.score} из {a.total}</div>
                    <div className="muted small">{new Date(a.ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span className={`score-pill ${pct >= 80 ? 'good' : ''}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
