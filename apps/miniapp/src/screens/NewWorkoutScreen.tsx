import React, { useState } from 'react';
import { Icon } from '../Icon';

const PRESETS = [
  'Грудь и бицепс',
  'Спина и трицепс',
  'Ноги',
  'Плечи и руки',
  'Всё тело',
  'Кардио',
  'Пресс',
];

export function NewWorkoutScreen({
  onSelect,
  onBack,
}: {
  onSelect: (name: string) => void;
  onBack: () => void;
}) {
  const [custom, setCustom] = useState('');
  const [customMode, setCustomMode] = useState(false);

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}><Icon name="back" /></button>
        <h1>Новая тренировка</h1>
        <span />
      </header>

      <div className="section-title">Выберите название</div>
      <div className="preset-grid">
        {PRESETS.map((p) => (
          <button key={p} className="preset-card" onClick={() => onSelect(p)}>
            {p}
          </button>
        ))}
      </div>

      {customMode ? (
        <form
          className="add-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) onSelect(custom.trim());
          }}
        >
          <div className="form-title">Своё название</div>
          <input
            className="input"
            placeholder="Например: Функциональная"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            autoFocus
          />
          <button className="btn" type="submit">Создать</button>
          <button className="link" type="button" onClick={() => setCustomMode(false)}>
            Отмена
          </button>
        </form>
      ) : (
        <button className="btn btn-block ghost" onClick={() => setCustomMode(true)}>
          <Icon name="pen" size={16} /> Своё название
        </button>
      )}
    </div>
  );
}