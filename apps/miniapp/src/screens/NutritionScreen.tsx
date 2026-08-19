import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  onBack: () => void;
};

export function NutritionScreen({ session, onBack }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [food, setFood] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const load = async () => {
    const res = await api.getNutrition(session.clientId, 7);
    setEntries(res.entries);
  };

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.clientId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!food.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.addNutrition(session.clientId, food.trim());
      setFood('');
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Не удалось распознать еду');
    } finally {
      setSaving(false);
    }
  };

  const getAnalysis = async () => {
    setShowAnalysis(true);
    setAnalysis(null);
    try {
      const res = await api.getNutritionAnalysis(session.clientId, 7);
      setAnalysis(res.analysis);
    } catch (err: any) {
      setError(err.message ?? 'Не удалось получить анализ');
    }
  };

  const totals = entries.reduce(
    (acc, e) => ({
      c: acc.c + (e.calories || 0),
      p: acc.p + (e.protein || 0),
      f: acc.f + (e.fats || 0),
      k: acc.k + (e.carbs || 0),
    }),
    { c: 0, p: 0, f: 0, k: 0 },
  );

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}><Icon name="back" /></button>
        <h1>Питание</h1>
        <span />
      </header>

      <div className="section-title">Записать приём пищи</div>
      <form className="add-form" onSubmit={save}>
        <input
          className="input"
          placeholder="Например: гречка с курицей 200г"
          value={food}
          onChange={(e) => setFood(e.target.value)}
          disabled={saving}
        />
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Распознаю…' : 'Добавить'}
        </button>
      </form>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

      {entries.length > 0 && (
        <section className="hero-card nutrition-summary">
          <div className="hero-label">За 7 дней</div>
          <div className="nutri-row">
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.c)}</div><div className="nutri-k">ккал</div></div>
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.p)}</div><div className="nutri-k">белки</div></div>
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.f)}</div><div className="nutri-k">жиры</div></div>
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.k)}</div><div className="nutri-k">углеводы</div></div>
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <button className="btn btn-block ghost" onClick={getAnalysis} disabled={showAnalysis && !analysis}>
          {analysis ? 'Анализ обновлён' : showAnalysis && !analysis ? 'Анализирую…' : 'ИИ-анализ за неделю'}
        </button>
      )}
      {analysis && (
        <div className="ai-box">
          <div className="ai-box-title">Разбор ИИ</div>
          {analysis}
        </div>
      )}

      {loading ? (
        <div className="loading">Загрузка…</div>
      ) : entries.length === 0 ? (
        <div className="empty">Пока нет записей</div>
      ) : (
        <div className="hist-list">
          {entries.map((e) => (
            <div key={e.id} className="hist-card nutrition-entry">
              <div className="hist-head">
                <div className="hist-date">{e.food_text}</div>
              </div>
              <div className="nutri-inline">
                <span>{Math.round(e.calories)} ккал</span>
                <span>Б {Math.round(e.protein)}</span>
                <span>Ж {Math.round(e.fats)}</span>
                <span>У {Math.round(e.carbs)}</span>
              </div>
              <div className="hist-date-sub">
                {new Date(e.eaten_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}