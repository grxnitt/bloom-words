import { useState } from 'react';
import { ArrowUpRight, Plus, ChevronRight } from 'lucide-react';
import { useStore, list } from '../lib/store.js';
import { reviewQueue, setProgress, isDue } from '../lib/srs.js';
import { streak, words, plural, go } from '../lib/util.js';
import { Notch } from '../components/ui.jsx';
import { SetCard, NewSetSheet } from './Sets.jsx';

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
  const cards = list('cards', data);
  const sets = list('sets', data).sort((a, b) => b.updatedAt - a.updatedAt);
  const reviews = list('reviews', data);
  const queue = reviewQueue(cards);
  const due = cards.filter((c) => isDue(c)).length;
  const fresh = queue.length - Math.min(due, 40);
  const p = setProgress(cards);
  const st = streak(reviews);

  let title, sub;
  if (!cards.length) {
    title = <>Начнём <em>с первых</em> слов</>;
    sub = 'Нажми «+» внизу, чтобы создать набор и добавить слова — по одному или сразу списком.';
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
      {sets.length ? (
        <div className="sets-grid enter-3">
          {sets.map((s, i) => (
            <SetCard key={s.id} set={s} i={i} p={setProgress(cards.filter((c) => c.setId === s.id))} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="display h-sm">Здесь будут наборы</div>
          <p className="small">Группируй слова по темам: урок, сериал, путешествие.</p>
        </div>
      )}

      <NewSetSheet open={newSet} onClose={() => setNewSet(false)} />
    </div>
  );
}
