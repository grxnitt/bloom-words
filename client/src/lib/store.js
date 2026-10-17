import { get, set, clear } from 'idb-keyval';
import { supabase } from './supabase.js';
import { useSyncExternalStore } from 'react';

// Local-first store: everything lives in IndexedDB and works offline.
// Each change goes to an outbox; sync() pushes it and pulls whatever changed on the server.

export const TABLES = ['sets', 'cards', 'reviews', 'tests', 'attempts'];

let state = {
  ready: false,
  auth: 'unknown', // 'unknown' | 'ok' | 'locked'
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  lastSync: 0,
  data: Object.fromEntries(TABLES.map((t) => [t, {}])),
};
let outbox = [];
let rev = 0;
const listeners = new Set();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

export function useStore(selector = (s) => s) {
  return selector(useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state));
}

export const getState = () => state;

let persistTimer;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    set('bloom:data', state.data).catch(() => {});
    set('bloom:outbox', outbox).catch(() => {});
    set('bloom:rev', rev).catch(() => {});
  }, 150);
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function put(table, obj) {
  const now = Date.now();
  const rec = { createdAt: now, ...obj, id: obj.id || uid(), updatedAt: Math.max(now, (obj.updatedAt || 0) + 1) };
  state.data = { ...state.data, [table]: { ...state.data[table], [rec.id]: rec } };
  outbox.push({ table, id: rec.id, updatedAt: rec.updatedAt, deleted: !!rec.deleted, data: rec });
  emit();
  persist();
  scheduleSync();
  return rec;
}

export function remove(table, id) {
  const rec = state.data[table][id];
  if (rec) put(table, { ...rec, deleted: true });
}

export function list(table, data = state.data) {
  return Object.values(data[table]).filter((r) => !r.deleted);
}

let syncTimer;
export function scheduleSync(delay = 1200) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(sync, delay);
}

let inFlight = null;
export function sync() {
  if (inFlight) return inFlight;
  if (!navigator.onLine) return Promise.resolve();
  inFlight = (async () => {
    const sending = outbox.slice(0, 400);
    state.syncing = true;
    emit();
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        state.auth = 'locked';
        return;
      }
      const { data: body, error } = await supabase.rpc('bloom_sync', { changes: sending, since: rev });
      if (error) {
        if (error.code === '28000' || /jwt/i.test(error.message)) state.auth = 'locked';
        throw error;
      }
      outbox = outbox.slice(sending.length);
      const data = { ...state.data };
      for (const row of body.rows) {
        const local = data[row.table]?.[row.id];
        if (local && local.updatedAt > row.updatedAt) continue;
        data[row.table] = { ...data[row.table], [row.id]: { ...row.data, id: row.id, updatedAt: row.updatedAt, deleted: row.deleted } };
      }
      state.data = data;
      // Server database was reset or restored from an older backup: pull everything again.
      const reset = body.rev < rev;
      rev = reset ? 0 : body.rev;
      if (reset) scheduleSync(0);
      state.auth = 'ok';
      state.lastSync = Date.now();
      persist();
    } catch {
      // offline or server down — the outbox stays and we retry later
    } finally {
      state.syncing = false;
      inFlight = null;
      emit();
      if (outbox.length && state.auth === 'ok') scheduleSync(sending.length >= 400 ? 0 : 4000);
    }
  })();
  return inFlight;
}

export async function initStore() {
  try {
    const [data, ob, r] = await Promise.all([get('bloom:data'), get('bloom:outbox'), get('bloom:rev')]);
    if (data) state.data = { ...state.data, ...data };
    outbox = ob || [];
    rev = r || 0;
  } catch { /* private mode etc. — start empty */ }
  state.ready = true;
  emit();

  const setOnline = () => { state.online = navigator.onLine; emit(); if (navigator.onLine) sync(); };
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOnline);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && sync());
  setInterval(sync, 60_000);

  const { data } = await supabase.auth.getSession();
  state.auth = data.session ? 'ok' : 'locked';
  emit();
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) { state.auth = 'locked'; emit(); return; }
    if (state.auth !== 'ok') { state.auth = 'ok'; emit(); }
    if (event === 'SIGNED_IN') sync();
  });
  if (data.session) await sync();
}

// Supabase Auth needs an email, so a plain username "liza" becomes "liza@bloom.local".
export const LOGIN_DOMAIN = 'bloom.local';
export const loginEmail = (name) => {
  const n = name.trim().toLowerCase();
  return n.includes('@') ? n : `${n}@${LOGIN_DOMAIN}`;
};

export async function signIn(name, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(name), password });
  if (error) throw error;
  state.auth = 'ok';
  emit();
  await sync();
}

// Leaves the device clean: local words belong to the account that signed out.
export async function signOut() {
  await supabase.auth.signOut();
  outbox = [];
  rev = 0;
  state.data = Object.fromEntries(TABLES.map((t) => [t, {}]));
  state.auth = 'locked';
  emit();
  await clear().catch(() => {});
}

export const pendingCount = () => outbox.length;
