// Shared by the client (paste import) and the server (/api/tests/import).

export const TEST_PROMPT = `Ты помогаешь мне учить английский. Ниже — задания из учебника, которые я решила, и мои ответы.
1. Найди мои ошибки и пойми, какие правила/слова я путаю.
2. Составь тренировочный тест из 10–15 вопросов именно на эти ошибки (похожие, но новые примеры).
3. Ответь ТОЛЬКО JSON-ом в блоке кода, строго в таком формате:

{
  "title": "Короткое название темы",
  "description": "1–2 предложения: что тренируем и какие ошибки были",
  "questions": [
    {
      "type": "choice",
      "question": "She ___ here since 2010.",
      "options": ["lives", "has lived", "is living", "lived"],
      "answer": 1,
      "explanation": "Since + момент в прошлом → Present Perfect."
    },
    {
      "type": "input",
      "question": "Переведи: Я никогда не была в Лондоне.",
      "answers": ["I have never been to London", "I've never been to London"],
      "explanation": "Опыт в жизни → Present Perfect, been to."
    }
  ]
}

Правила: "answer" — номер правильного варианта с нуля; в "answers" перечисли все допустимые варианты ответа; объяснения пиши по-русски, коротко.

Мои задания и ответы:
`;

export function extractJson(text) {
  const s = String(text || '').trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : s;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Не нашла JSON в тексте');
  return JSON.parse(body.slice(start, end + 1));
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function validateTest(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { test: null, errors: ['Ожидался объект теста'] };
  const title = str(raw.title) || 'Тест без названия';
  const list = Array.isArray(raw.questions) ? raw.questions : [];
  if (!list.length) errors.push('Нет вопросов (поле "questions")');

  const questions = [];
  list.forEach((q, i) => {
    const n = i + 1;
    const question = str(q?.question || q?.text || q?.prompt);
    if (!question) { errors.push(`Вопрос ${n}: пустой текст`); return; }
    const explanation = str(q.explanation);
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
    const type = q.type === 'input' || (!options.length && (q.answers || typeof q.answer === 'string')) ? 'input' : 'choice';

    if (type === 'choice') {
      if (options.length < 2) { errors.push(`Вопрос ${n}: нужно хотя бы 2 варианта`); return; }
      let answer = q.answer;
      if (typeof answer === 'string') answer = options.findIndex((o) => o.toLowerCase() === answer.trim().toLowerCase());
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        errors.push(`Вопрос ${n}: "answer" должен быть номером варианта от 0 до ${options.length - 1}`);
        return;
      }
      questions.push({ type, question, options, answer, explanation });
    } else {
      const answers = (Array.isArray(q.answers) ? q.answers : [q.answer]).map(str).filter(Boolean);
      if (!answers.length) { errors.push(`Вопрос ${n}: нет правильного ответа ("answers")`); return; }
      questions.push({ type, question, answers, explanation });
    }
  });

  return { test: { title, description: str(raw.description), questions }, errors };
}

// Loose comparison for typed answers: case, extra spaces, trailing punctuation, curly quotes.
export function normalizeAnswer(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
