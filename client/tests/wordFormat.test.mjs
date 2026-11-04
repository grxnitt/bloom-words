import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWords, parseCollection, dedupe} from '../src/lib/wordFormat.js';
test('English import retains translations and transcription',()=>{
 const w=parseWords('reliable [rɪˈlaɪəbl] — надёжный').words[0];
 assert.equal(w.term,'reliable'); assert.equal(w.translation,'надёжный'); assert.equal(w.transcription,'[rɪˈlaɪəbl]');
});
test('Russian questions and JSON question/answer aliases are accepted',()=>{
 assert.equal(parseWords('Что такое вина? — Психическое отношение').words[0].term,'Что такое вина?');
 assert.equal(parseWords('{"cards":[{"question":"Вопрос","answer":"Ответ"}]}').words[0].translation,'Ответ');
});
test('Collections keep topics and reject incomplete sets',()=>{
 const raw={sets:[{set:'Право',type:'study',cards:[{front:'Вопрос',back:'Ответ'}]},{set:'English',words:[{term:'cat',translation:'кот'}]}]};
 const result=parseCollection(JSON.stringify(raw)); assert.equal(result.length,2); assert.equal(result[0].type,'study'); assert.equal(result[1].type,'language');
 raw.sets[0].cards[0].back=''; assert.equal(parseCollection(JSON.stringify(raw)),null);
 assert.equal(parseCollection('{"sets":[]}'),null);
});
test('Reimport skips questions already present without replacing progress',()=>{
 const result=dedupe([{term:'Вопрос',translation:'Ответ'},{term:'вопрос',translation:'Другой'}],['ВОПРОС']);
 assert.ok(result.every(w=>w.dup));
});
