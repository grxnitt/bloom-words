import test from 'node:test';
import assert from 'node:assert/strict';
import { subjectOf, subjectOptions, sameSubject, sortSets, normalizeSubject } from '../src/lib/subjects.js';
import { parseWords, parseCollection } from '../src/lib/wordFormat.js';

test('Existing law and English sets acquire subjects without modifying their data', () => {
  const law = { id: 'law', title: 'УП · 13. Рецидив', type: 'study', updatedAt: 123 };
  const snapshot = structuredClone(law);
  assert.equal(subjectOf(law), 'Уголовное право');
  assert.deepEqual(law, snapshot);
  assert.equal(subjectOf({ title: 'unit 4' }), 'Английский');
  assert.equal(subjectOf({ title: 'Гражданское право: собственность', type: 'study' }), 'Гражданское право');
  assert.equal(subjectOf({ title: 'История', type: 'study' }), '');
});
test('An explicit subject, including no subject, overrides automatic classification', () => {
  assert.equal(subjectOf({ title: 'УП · 01', subject: '' }), '');
  assert.equal(subjectOf({ title: 'unit 4', subject: 'История' }), 'История');
  assert.equal(normalizeSubject('  уголовное   право  '), 'Уголовное право');
});
test('Subjects are unique ignoring case and empty subjects remain filterable', () => {
  const sets = [{subject:' История '}, {subject:'история'}, {title:'УП · 01'}, {subject:''}];
  assert.deepEqual(subjectOptions(sets), ['Уголовное право','Гражданское право','Английский','История']);
  assert.equal(sets.filter(s => sameSubject(subjectOf(s), 'история')).length, 2);
  assert.equal(sets.filter(s => sameSubject(subjectOf(s), '')).length, 1);
});
test('Numbered lessons sort naturally; date sorting is deterministic and non-mutating', () => {
  const sets = [
    {id:'c', title:'УП · 10. Наказание', createdAt:3, updatedAt:1},
    {id:'b', title:'УП · 02. Закон', createdAt:2, updatedAt:5},
    {id:'a', title:'УП · 01. Принципы', createdAt:1, updatedAt:5},
  ];
  assert.deepEqual(sortSets(sets).map(s=>s.id), ['a','b','c']);
  assert.deepEqual(sortSets(sets,'updated').map(s=>s.id), ['a','b','c']);
  assert.deepEqual(sortSets(sets,'created').map(s=>s.id), ['c','b','a']);
  assert.equal(sets[0].id,'c');
});
test('Import preserves explicit subjects and leaves legacy inference possible', () => {
  const result = parseWords('{"set":"Собственность","type":"study","subject":"Гражданское право","words":[{"term":"Вопрос","translation":"Ответ"}]}');
  assert.equal(result.subject,'Гражданское право');
  const topics=parseCollection(JSON.stringify({sets:[{...result,set:'УП · 01',subject:''}]}));
  assert.equal(subjectOf({...topics[0],title:topics[0].set}), '');
  assert.equal(Object.hasOwn(parseWords('{"set":"unit 4","words":[{"term":"cat","translation":"кот"}]}'),'subject'),false);
});
