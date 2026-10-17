import { useState } from 'react';
import { Layers, ClipboardCheck, Plus } from 'lucide-react';
import { useStore, signIn } from './lib/store.js';
import { useRoute } from './lib/util.js';
import { Flower, Toaster } from './components/ui.jsx';
import Home from './screens/Home.jsx';
import SetDetail from './screens/SetDetail.jsx';
import Stats from './screens/Stats.jsx';
import Tests from './screens/Tests.jsx';
import TestImport from './screens/TestImport.jsx';
import TestRun from './screens/TestRun.jsx';
import Study from './study/Study.jsx';
import WordImport from './screens/WordImport.jsx';
import AddSheet from './components/AddSheet.jsx';

// Just two places: words (sets, review, progress) and tests. Everything is added via "+".
const TABS = [
  { id: '', label: 'Слова', icon: Layers },
  { id: 'tests', label: 'Тесты', icon: ClipboardCheck },
];

function SyncBadge() {
  const { online, syncing } = useStore((s) => s);
  return (
    <span className={`sync-dot ${online ? '' : 'off'}`} title={online ? 'Синхронизировано' : 'Нет сети — сохраняю на телефоне'}>
      <i /> {!online ? 'офлайн' : syncing ? 'синхронизация…' : 'сохранено'}
    </span>
  );
}

function Shell({ tab, setId, children }) {
  const [adding, setAdding] = useState(false);
  const tabLink = (t) => (
    <a key={t.id} href={`#/${t.id}`} className={`tab ${tab === t.id ? 'on' : ''}`} aria-label={t.label}>
      <t.icon size={20} strokeWidth={1.8} /><span>{t.label}</span>
    </a>
  );
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/"><Flower /><span className="brand-name">Bloom</span></a>
        <nav className="desk-nav">
          {TABS.map((t) => <a key={t.id} href={`#/${t.id}`} className={tab === t.id ? 'on' : ''}>{t.label}</a>)}
        </nav>
        <div className="row" style={{ gap: 8 }}>
          <SyncBadge />
          <button className="btn sm desk-only" onClick={() => setAdding(true)}><Plus size={16} /> Добавить</button>
        </div>
      </header>
      {children}
      <nav className="tabbar">
        {tabLink(TABS[0])}
        <button className="tab-add" aria-label="Добавить" onClick={() => setAdding(true)}><Plus size={24} strokeWidth={2.2} /></button>
        {tabLink(TABS[1])}
      </nav>
      <AddSheet open={adding} onClose={() => setAdding(false)} setId={setId} />
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(/invalid/i.test(err.message) ? 'Неверная почта или пароль' : !navigator.onLine ? 'Нет интернета' : 'Не получилось войти, попробуй ещё раз');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="app lock">
      <form className="stack" style={{ width: '100%', maxWidth: 360, textAlign: 'left' }} onSubmit={submit}>
        <div style={{ textAlign: 'center' }}><Flower size={56} /></div>
        <h1 className="display h-lg" style={{ textAlign: 'center', marginBottom: 8 }}>Твой <em>словарик</em></h1>
        <div className="field">
          <label htmlFor="l-email">Почта</label>
          <input id="l-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="l-pass">Пароль</label>
          <input id="l-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="feedback err">{error}</div>}
        <button className="btn block-w" disabled={busy || !email || !password}>{busy ? 'Вхожу…' : 'Войти'}</button>
        <p className="muted small" style={{ textAlign: 'center', margin: 0 }}>Войти нужно один раз на каждом устройстве.</p>
      </form>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const { ready, auth } = useStore((s) => s);
  if (!ready) return null;
  if (auth === 'locked') return <Login />;

  const [a, b, c, d] = route;
  let screen;
  // Full-screen study views have no tab bar.
  if (a === 'review') screen = <Study mode="review" />;
  else if (a === 'set' && c === 'study') screen = <Study mode={d} setId={b} />;
  else if (a === 'test' && b) screen = <TestRun id={b} />;
  if (screen) return <div className="app study">{screen}<Toaster /></div>;

  const tab = a === 'tests' ? 'tests' : '';
  if (a === 'set') screen = <SetDetail id={b} />;
  else if (a === 'import') screen = <WordImport key={b || ''} setId={b} />;
  else if (a === 'tests' && b === 'new') screen = <TestImport />;
  else if (a === 'tests') screen = <Tests />;
  else if (a === 'stats') screen = <Stats />;
  else screen = <Home />;

  return <Shell tab={tab} setId={a === 'set' || a === 'import' ? b : undefined}>{screen}<Toaster /></Shell>;
}
