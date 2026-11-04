import { useEffect, useState } from 'react';
import { ArrowUpRight, Plus, ChevronRight } from 'lucide-react';
import { useStore, list } from '../lib/store.js';
import { reviewQueue, setProgress, isDue } from '../lib/srs.js';
import { streak, words, plural, go } from '../lib/util.js';
import { Notch } from '../components/ui.jsx';
import { SetCard, NewSetSheet } from './Sets.jsx';
import { subjectOf, subjectOptions, sameSubject, sortSets, NO_SUBJECT } from '../lib/subjects.js';

function savedSetView() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('bloom:sets-view'));
    return { subject: typeof saved?.subject === 'string' ? saved.subject : null,
      order: ['title', 'updated', 'created'].includes(saved?.order) ? saved.order : 'title' };
  } catch { return { subject: null, order: 'title' }; }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

// The main screen: what to review today, a glance at progress, and every set.
export default function Home() {
  const data = useStore((s) => s.data);
  const [newSet, setNewSet] = useState(false);
  const [view, setView] = useState(savedSetView);
  useEffect(() => {
    try { sessionStorage.setItem('bloom:sets-view', JSON.stringify(view)); } catch { /* browsing preferences are optional */ }
  }, [view]);
  const cards = list('cards', data);
  const sets = list('sets', data);
  const subjects = subjectOptions(sets);
  if (view.subject && !subjects.some((s) => sameSubject(s, view.subject))) subjects.push(view.subject);
  if (sets.some((s) => !subjectOf(s)) || view.subject === '') subjects.push('');
  const filtered = sortSets(sets.filter((s) => view.subject === null || sameSubject(subjectOf(s), view.subject)), view.order);
  const groups = view.subject === null
    ? subjects.map((subject) => ({ subject, sets: filtered.filter((s) => sameSubject(subjectOf(s), subject)) })).filter((g) => g.sets.length)
    : [{ subject: view.subject, sets: filtered }];
  const reviews = list('reviews', data);
  const queue = reviewQueue(cards);
  const due = cards.filter((c) => isDue(c)).length;
  const fresh = queue.length - Math.min(due, 40);
  const p = setProgress(cards);
  const st = streak(reviews);

  let title, sub;
  if (!cards.length) {
    title = <>Начнём <em>с первых</em> карточек</>;
    sub = 'Нажми «+» внизу, чтобы создать набор и добавить карточки — по одному или сразу списком.';
  } else if (queue.length) {
    title = <>Сегодня — <em>{words(queue.length)}</em></>;
    sub = [due && `${due} на повторение`, fresh > 0 && `${fresh} ${plural(fresh, 'новое', 'новых', 'новых')}`].filter(Boolean).join(' · ');
  } else {
    title = <>На сегодня <em>всё</em> повторено</>;
    sub = 'Можно потренироваться в любом наборе ниже.';
  }

  return (
    <div>
      <div className="home-grid">
        <section className="block hero enter">
          {queue.length > 0 && (
            <Notch>
              <button className="notch-btn" aria-label="Начать повторение" onClick={() => go('/review')}>
                <ArrowUpRight size={22} />
              </button>
            </Notch>
          )}
          <div>
            <div className="eyebrow">{greeting()}</div>
            <h1 className="display h-xl" style={{ marginTop: 14, maxWidth: '9.5em', paddingRight: 40 }}>{title}</h1>
            <p className="muted">{sub}</p>
          </div>
          {queue.length > 0 && (
            <div className="row wrap">
              <button className="btn" onClick={() => go('/review')}>Начать повторение</button>
            </div>
          )}
          {!cards.length && (
            <div className="row wrap">
              <button className="btn" onClick={() => setNewSet(true)}><Plus size={18} /> Создать набор</button>
            </div>
          )}
        </section>

        {cards.length > 0 && (
          <a className="stat-tiles enter-2" href="#/stats" aria-label="Мой прогресс">
            <div className="tile"><div className="num tnum">{st}</div><div className="lbl">{plural(st, 'день', 'дня', 'дней')} подряд</div></div>
            <div className="tile"><div className="num tnum">{p.learned}</div><div className="lbl">выучено</div></div>
            <div className="tile"><div className="num tnum">{p.learning}</div><div className="lbl">в процессе</div></div>
            <div className="tiles-more">Весь прогресс <ChevronRight size={15} /></div>
          </a>
        )}
      </div>

      <div className="section-head enter-3">
        <h2 className="display h-md">Мои наборы</h2>
        <button className="btn soft sm" onClick={() => setNewSet(true)}><Plus size={16} /> Набор</button>
      </div>
      <div className="sets-toolbar enter-3">
        <div className="subject-filters" role="group" aria-label="Предметы">
          <button className={`chip ${view.subject === null ? 'on' : ''}`} aria-pressed={view.subject === null}
            onClick={() => setView((v) => ({ ...v, subject: null }))}>Все <span>{sets.length}</span></button>
          {subjects.map((subject) => (
            <button key={subject} className={`chip ${view.subject !== null && sameSubject(view.subject, subject) ? 'on' : ''}`}
              aria-pressed={view.subject !== null && sameSubject(view.subject, subject)}
              onClick={() => setView((v) => ({ ...v, subject }))}>
              {subject || NO_SUBJECT} <span>{sets.filter((s) => sameSubject(subjectOf(s), subject)).length}</span>
            </button>
          ))}
        </div>
        <div className="sets-sort">
          <label htmlFor="sets-order">Сортировка</label>
          <select id="sets-order" className="input" value={view.order}
            onChange={(e) => setView((v) => ({ ...v, order: e.target.value }))}>
            <option value="title">По названию</option>
            <option value="updated">Недавно изменённые</option>
            <option value="created">Сначала новые</option>
          </select>
        </div>
      </div>
      {filtered.length ? (
        <div className="subject-groups enter-3">
          {groups.map((group) => (
            <section key={group.subject} aria-label={group.subject || NO_SUBJECT}>
              {view.subject === null && <h3 className="subject-heading">{group.subject || NO_SUBJECT}<span>{group.sets.length} {plural(group.sets.length, 'набор', 'набора', 'наборов')}</span></h3>}
              <div className="sets-grid">
                {group.sets.map((s, i) => (
                  <SetCard key={s.id} set={s} i={i} p={setProgress(cards.filter((c) => c.setId === s.id))} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="display h-sm">{view.subject === null ? 'Здесь будут наборы' : 'По этому предмету пока нет наборов'}</div>
          <p className="small">{view.subject === null ? 'Создавай наборы по темам: английский, право, история.' : `Создай первый набор: ${view.subject || NO_SUBJECT}.`}</p>
          <button className="btn soft sm" onClick={() => setNewSet(true)}><Plus size={16} /> Создать набор</button>
        </div>
      )}

      <NewSetSheet open={newSet} onClose={() => setNewSet(false)} initialSubject={view.subject || ''} />
    </div>
  );
}
