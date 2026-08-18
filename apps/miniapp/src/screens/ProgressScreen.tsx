import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  onBack: () => void;
};

export function ProgressScreen({ session, onBack }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProgress(session.clientId)
      .then((res) => setEntries(res.entries))
      .finally(() => setLoading(false));
  }, [session.clientId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(weight.replace(',', '.'));
    if (isNaN(kg)) return;
    await api.addProgress(session.clientId, kg);
    setWeight('');
    const res = await api.getProgress(session.clientId);
    setEntries(res.entries);
  };

  const latest = entries[entries.length - 1];
  const first = entries[0];
  const diff = latest && first ? latest.weight_kg - first.weight_kg : null;

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}><Icon name="back" /></button>
        <h1>Прогресс</h1>
        <span />
      </header>

      {latest && (
        <section className="hero-card">
          <div className="hero-label">Текущий вес</div>
          <div className="hero-big">{latest.weight_kg} кг</div>
          {diff !== null && diff !== 0 && (
            <div className={`diff ${diff < 0 ? 'down' : 'up'}`}>
              {diff > 0 ? '+' : ''}
              {diff.toFixed(1)} кг с начала
            </div>
          )}
        </section>
      )}

      <div className="section-title">Записать вес</div>
      <form className="add-form" onSubmit={save}>
        <div className="row">
          <input
            className="input"
            placeholder="Вес, кг"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button className="btn" type="submit">Сохранить</button>
        </div>
      </form>

      {entries.length > 1 && (
        <div className="chart">
          {entries.map((e, i) => (
            <div key={e.id} className="bar-wrap" style={{ height: 100 }}>
              <div
                className="bar"
                style={{
                  height: `${Math.max(20, (e.weight_kg / (first?.weight_kg || 1)) * 100)}%`,
                }}
              />
              <div className="bar-label">{e.weight_kg}</div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="loading">Загрузка…</div>}
    </div>
  );
}