export const DEFAULT_SUBJECTS = ['Уголовное право', 'Гражданское право', 'Английский'];
export const NO_SUBJECT = 'Без предмета';

export function normalizeSubject(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return DEFAULT_SUBJECTS.find((s) => s.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru')) || name;
}

// Older sets have no subject field. Explicitly clearing it overrides this fallback.
export function subjectOf(set) {
  if (typeof set.subject === 'string') return normalizeSubject(set.subject);
  if (/^уп\s*[·.:\-]|уголовн/i.test(set.title || '')) return DEFAULT_SUBJECTS[0];
  if (/^гп\s*[·.:\-]|гражданск/i.test(set.title || '')) return DEFAULT_SUBJECTS[1];
  return set.type !== 'study' ? DEFAULT_SUBJECTS[2] : '';
}

export function subjectOptions(sets) {
  const names = new Map(DEFAULT_SUBJECTS.map((s) => [s.toLocaleLowerCase('ru'), s]));
  for (const set of sets) {
    const name = subjectOf(set);
    if (name && !names.has(name.toLocaleLowerCase('ru'))) names.set(name.toLocaleLowerCase('ru'), name);
  }
  return [...names.values()];
}

export function sameSubject(a, b) {
  return normalizeSubject(a).toLocaleLowerCase('ru') === normalizeSubject(b).toLocaleLowerCase('ru');
}

const byTitle = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
export function sortSets(sets, order = 'title') {
  return sets.slice().sort((a, b) => {
    const date = order === 'updated' ? (b.updatedAt || 0) - (a.updatedAt || 0)
      : order === 'created' ? (b.createdAt || 0) - (a.createdAt || 0) : 0;
    return date || byTitle.compare(a.title || '', b.title || '') || String(a.id).localeCompare(String(b.id));
  });
}
