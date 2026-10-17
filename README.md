# Bloom — английские слова

Личный «Квизлет»: наборы слов, автоперевод и транскрипция, карточки, тест, написание, подбор пар,
интервальные повторения, прогресс, загрузка слов списком и тесты на ошибки из ChatGPT.

Сайт: https://grxnitt.github.io/bloom-words/ (на айфоне: Safari → «Поделиться» → «На экран Домой»).

## Как устроено

- `client/` — React + Vite, PWA. Статический сайт на GitHub Pages (ветка `gh-pages`).
- Данные лежат в IndexedDB на устройстве (работает офлайн) и синхронизируются с Supabase
  через функцию `bloom_sync` (last-write-wins по `updatedAt`).
- Supabase — проект «Planer Liza»: одна таблица `bloom_records` с RLS (каждый видит только свои строки).
  Схема — `supabase/schema.sql`, выполняется один раз в SQL Editor.
- Вход — почта и пароль Supabase Auth. Пользователь заводится в Supabase → Authentication → Users → Add user.
- Перевод и транскрипция запрашиваются прямо из браузера: Google (если доступен) → MyMemory, транскрипция — dictionaryapi.dev.
- `check/` — страница проверки, что всё открывается с телефона без VPN.

## Команды

```bash
npm --prefix client install
npm run dev       # локально на http://localhost:5173/bloom-words/
npm run deploy    # сборка и публикация на GitHub Pages
```

## Слова списком и тесты

- «+» → «Слова списком»: ответ ChatGPT (промпт копируется там же), файл .txt/.csv/.json или строчки `word — перевод`.
- «+» → «Тест на ошибки» или вкладка «Тесты»: промпт для ChatGPT → вставить ответ.
- Форматы и промпты — `client/src/lib/wordFormat.js` и `client/src/lib/testFormat.js`.
