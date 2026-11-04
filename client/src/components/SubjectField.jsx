import { subjectOptions } from '../lib/subjects.js';

export default function SubjectField({ value, onChange, sets, id = 'set-subject' }) {
  return (
    <div className="field">
      <label htmlFor={id}>Предмет</label>
      <input id={id} className="input" list={`${id}-options`} value={value} maxLength={80}
        placeholder="Выбери или введи свой предмет" onChange={(e) => onChange(e.target.value)} />
      <datalist id={`${id}-options`}>
        {subjectOptions(sets).map((s) => <option key={s} value={s} />)}
      </datalist>
      <div className="subject-suggestions">
        {subjectOptions(sets).map((s) => (
          <button type="button" key={s} className={`chip ${value === s ? 'on' : ''}`}
            onClick={() => onChange(s)}>{s}</button>
        ))}
      </div>
      <p className="small muted field-note">Оставь пустым, чтобы сохранить без предмета.</p>
    </div>
  );
}
