import { Copy, Plus, ChevronRight } from 'lucide-react';
import { useStore, list } from '../lib/store.js';
import { TEST_PROMPT } from '../lib/testFormat.js';
import { plural, fmtDate } from '../lib/util.js';
import { toast } from '../components/ui.jsx';

export async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(TEST_PROMPT);
    toast('Промпт скопирован — вставь его в ChatGPT');
  } catch {
    toast('Не получилось скопировать');
  }
}

export default function Tests() {
  const data = useStore((s) => s.data);
  const tests = list('tests', data).sort((a, b) => b.createdAt - a.createdAt);
  const attempts = list('attempts', data);
  const lastOf = (id) => attempts.filter((a) => a.testId === id).sort((a, b) => b.ts - a.ts)[0];

  return (
    <div>
      <h1 className="display h-xl enter" style={{ marginBottom: 22 }}>Тесты <em>на ошибки</em></h1>

      <section className="block enter-2">
        <div className="eyebrow">Как добавить тест</div>
        <ol className="steps">
          <li>Скопируй промпт кнопкой ниже.</li>
          <li>Вставь его в ChatGPT, а после него — задания из учебника и свои ответы (можно фото).</li>
          <li>Скопируй ответ ChatGPT целиком и нажми «Добавить тест».</li>
        </ol>
        <div className="row wrap">
          <button className="btn soft" onClick={copyPrompt}><Copy size={17} /> Скопировать промпт</button>
          <a className="btn" href="#/tests/new"><Plus size={18} /> Добавить тест</a>
        </div>
      </section>

      <div className="section-head">
        <h2 className="display h-md">Мои тесты</h2>
        <span className="muted small">{tests.length}</span>
      </div>

      {tests.length ? (
        <div className="stack enter-3" style={{ gap: 8 }}>
          {tests.map((t) => {
            const last = lastOf(t.id);
            const pct = last ? Math.round((last.score / last.total) * 100) : null;
            return (
              <a key={t.id} className="test-item" href={`#/test/${t.id}`}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div className="muted small">
                    {t.questions.length} {plural(t.questions.length, 'вопрос', 'вопроса', 'вопросов')} · {fmtDate(t.createdAt)}
                  </div>
                </div>
                {pct === null ? <ChevronRight size={18} color="var(--muted)" style={{ marginLeft: 'auto' }} />
                  : <span className={`score-pill ${pct >= 80 ? 'good' : ''}`}>{pct}%</span>}
              </a>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <div className="display h-sm">Тестов пока нет</div>
          <p className="small">Первый появится, как только вставишь ответ ChatGPT.</p>
        </div>
      )}
    </div>
  );
}
