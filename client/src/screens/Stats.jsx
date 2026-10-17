import { useStore, list, signOut } from '../lib/store.js';
import { setProgress } from '../lib/srs.js';
import { streak, bestStreak, dayKey, plural } from '../lib/util.js';
import { ArrowLeft } from 'lucide-react';
import { ProgressBar } from '../components/ui.jsx';
import { back } from '../lib/util.js';

const WEEKS = 16;

export default function Stats() {
  const data = useStore((s) => s.data);
  const cards = list('cards', data);
  const sets = list('sets', data);
  const reviews = list('reviews', data);
  const attempts = list('attempts', data).sort((a, b) => b.ts - a.ts);
  const p = setProgress(cards);

  const perDay = new Map();
  reviews.forEach((r) => {
    const k = dayKey(r.ts);
    const v = perDay.get(k) || { ok: 0, no: 0 };
    r.correct ? v.ok++ : v.no++;
    perDay.set(k, v);
  });

  // Heatmap: columns are weeks (Mon→Sun), ending with the current week.
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const heat = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const v = perDay.get(dayKey(d));
    const n = v ? v.ok + v.no : 0;
    heat.push({ k: dayKey(d), n, l: n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4 });
  }

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i);
    return { d, ...(perDay.get(dayKey(d)) || { ok: 0, no: 0 }) };
  });
  const max = Math.max(1, ...last14.map((x) => x.ok + x.no));
  const week = last14.slice(7).reduce((a, x) => ({ ok: a.ok + x.ok, no: a.no + x.no }), { ok: 0, no: 0 });
  const acc = week.ok + week.no ? Math.round((week.ok / (week.ok + week.no)) * 100) : null;
  const st = streak(reviews);
  const avgTest = attempts.length ? Math.round(attempts.slice(0, 10).reduce((s, a) => s + a.score / a.total, 0) / Math.min(10, attempts.length) * 100) : null;

  return (
    <div>
      <div className="page-head">
        <button className="icon-btn" aria-label="Назад" onClick={() => back('/')}><ArrowLeft size={20} /></button>
      </div>
      <h1 className="display h-xl enter" style={{ marginBottom: 22 }}>Мой <em>прогресс</em></h1>

      <div className="stats-grid">
        <section className="block enter">
          <div className="eyebrow">Слова</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, margin: '8px 0 18px' }}>
            <span className="display" style={{ fontSize: 72 }}>{p.learned}</span>
            <span className="muted">из {p.total} выучено</span>
          </div>
          <ProgressBar p={p} />
          <div className="grid2" style={{ marginTop: 18 }}>
            <div className="tile"><div className="num tnum">{p.learning}</div><div className="lbl">изучаю</div></div>
            <div className="tile"><div className="num tnum">{p.new}</div><div className="lbl">новые</div></div>
          </div>
        </section>

        <section className="block deep enter-2">
          <div className="eyebrow">Серия</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 10, margin: '8px 0 18px' }}>
            <span className="display" style={{ fontSize: 72 }}>{st}</span>
            <span className="muted">{plural(st, 'день', 'дня', 'дней')} подряд</span>
          </div>
          <div className="grid2">
            <div className="tile"><div className="num tnum">{bestStreak(reviews)}</div><div className="lbl">лучшая серия</div></div>
            <div className="tile"><div className="num tnum">{acc === null ? '—' : `${acc}%`}</div><div className="lbl">точность за неделю</div></div>
          </div>
        </section>
      </div>

      <section className="block paper mt enter-3">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h2 className="display h-sm">Ответы за 2 недели</h2>
          <div className="legend">
            <span><i style={{ background: 'var(--rose-deep)' }} />верно</span>
            <span><i style={{ background: 'var(--petal)' }} />ошибки</span>
          </div>
        </div>
        <div className="bars">
          {last14.map((x) => (
            <div className="b" key={x.d.toISOString()} title={`${x.ok} верно, ${x.no} ошибок`}>
              <span className="no" style={{ height: `${(x.no / max) * 100}%` }} />
              <span className="ok" style={{ height: `${(x.ok / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="bars-x">{last14.map((x) => <span key={x.d.toISOString()}>{x.d.getDate()}</span>)}</div>
      </section>

      <section className="block paper mt-sm">
        <h2 className="display h-sm" style={{ marginBottom: 16 }}>Активность</h2>
        <div className="heat">{heat.map((h) => <i key={h.k} className={`l${h.l}`} title={`${h.k}: ${h.n}`} />)}</div>
        <div className="muted small" style={{ marginTop: 10 }}>{reviews.length} ответов всего</div>
      </section>

      {sets.length > 0 && (
        <>
          <div className="section-head"><h2 className="display h-md">По наборам</h2></div>
          <div className="word-list">
            {sets.map((s) => {
              const sp = setProgress(cards.filter((c) => c.setId === s.id));
              return (
                <a key={s.id} href={`#/set/${s.id}`} className="word" style={{ gridTemplateColumns: '1fr 90px auto' }}>
                  <span className="t">{s.title}</span>
                  <ProgressBar p={sp} />
                  <span className="muted small tnum" style={{ minWidth: 44, textAlign: 'right' }}>{sp.learned}/{sp.total}</span>
                </a>
              );
            })}
          </div>
        </>
      )}

      {attempts.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="display h-md">Тесты</h2>
            <span className="muted small">средний результат {avgTest}%</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {attempts.slice(0, 6).map((a) => {
              const t = data.tests[a.testId];
              const pct = Math.round((a.score / a.total) * 100);
              return (
                <a key={a.id} className="test-item" href={`#/test/${a.testId}`}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{t?.title || 'Тест'}</div>
                    <div className="muted small">{new Date(a.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
                  </div>
                  <span className={`score-pill ${pct >= 80 ? 'good' : ''}`}>{pct}%</span>
                </a>
              );
            })}
          </div>
        </>
      )}
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <button className="btn ghost sm" onClick={() => confirm('Выйти из аккаунта на этом устройстве?') && signOut()}>Выйти из аккаунта</button>
      </div>
    </div>
  );
}
