import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  onBack: () => void;
};

const PERIODS = [
  { label: 'Сегодня', days: 1 },
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
];

export function NutritionScreen({ session, onBack }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [food, setFood] = useState('');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [goals, setGoals] = useState<any>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // Редактирование записи
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ food_text: '', calories: '', protein: '', fats: '', carbs: '' });

  const load = async () => {
    const res = await api.getNutrition(session.clientId, days);
    setEntries(res.entries);
  };

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.clientId, days]);

  useEffect(() => {
    api
      .getGoals()
      .then((res) => {
        setGoals(res.goals);
        setLatestWeight(res.latest_weight);
      })
      .catch(() => {});
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

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditForm({
      food_text: entry.food_text,
      calories: String(entry.calories ?? ''),
      protein: String(entry.protein ?? ''),
      fats: String(entry.fats ?? ''),
      carbs: String(entry.carbs ?? ''),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await api.updateNutrition(editingId, session.clientId, {
        food_text: editForm.food_text,
        calories: Number(editForm.calories) || undefined,
        protein: Number(editForm.protein) || undefined,
        fats: Number(editForm.fats) || undefined,
        carbs: Number(editForm.carbs) || undefined,
      });
      setEditingId(null);
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Не удалось сохранить');
    }
  };

  const remove = async (entryId: number) => {
    if (!confirm('Удалить запись?')) return;
    await api.deleteNutrition(entryId, session.clientId);
    await load();
  };

  const getAnalysis = async () => {
    setShowAnalysis(true);
    setAnalysis(null);
    try {
      const res = await api.getNutritionAnalysis(session.clientId, days);
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

  const goalBars = [
    { key: 'goal_calories', label: 'ккал', value: totals.c, goal: goals?.goal_calories },
    { key: 'goal_protein', label: 'белки', value: totals.p, goal: goals?.goal_protein },
    { key: 'goal_fats', label: 'жиры', value: totals.f, goal: goals?.goal_fats },
    { key: 'goal_carbs', label: 'углеводы', value: totals.k, goal: goals?.goal_carbs },
  ];

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}><Icon name="back" /></button>
        <h1>Питание</h1>
        <span />
      </header>

      {goals && (goals.goal_weight != null || goals.goal_calories != null) && (
        <section className="hero-card goals-card">
          <div className="hero-label"><Icon name="target" size={14} /> Цели от тренера</div>
          {goals.goal_weight != null && (
            <div className="goal-line">
              <span>Целевой вес</span>
              <b>{goals.goal_weight} кг</b>
              {latestWeight != null && (
                <span className="goal-sub">
                  сейчас {latestWeight} кг · осталось{' '}
                  {Math.abs(Number(goals.goal_weight) - Number(latestWeight))} кг
                </span>
              )}
            </div>
          )}
          {goals.goal_calories != null && (
            <div className="goal-line">
              <span>Калории / день</span>
              <b>{goals.goal_calories} ккал</b>
            </div>
          )}
        </section>
      )}

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

      <div className="period-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            className={`period-tab ${days === p.days ? 'active' : ''}`}
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {entries.length > 0 && (
        <section className="hero-card nutrition-summary">
          <div className="hero-label">Итого {days === 1 ? 'сегодня' : `за ${days} дн.`}</div>
          <div className="nutri-row">
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.c)}</div><div className="nutri-k">ккал</div></div>
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.p)}</div><div className="nutri-k">белки</div></div>
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.f)}</div><div className="nutri-k">жиры</div></div>
            <div className="nutri-item"><div className="nutri-v">{Math.round(totals.k)}</div><div className="nutri-k">углеводы</div></div>
          </div>
          {days === 1 && goals?.goal_calories != null && (
            <div className="goal-progress">
              {goalBars.map(
                (g) =>
                  g.goal != null && (
                    <div key={g.key} className="gbar-row">
                      <span className="gbar-label">{g.label}</span>
                      <div className="gbar-track">
                        <div
                          className="gbar-fill"
                          style={{
                            width: `${Math.min(100, (g.value / g.goal) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="gbar-val">
                        {Math.round(g.value)} / {g.goal}
                      </span>
                    </div>
                  ),
              )}
            </div>
          )}
        </section>
      )}

      {entries.length > 0 && (
        <button className="btn btn-block ghost" onClick={getAnalysis} disabled={showAnalysis && !analysis}>
          {analysis ? 'Анализ обновлён' : showAnalysis && !analysis ? 'Анализирую…' : 'ИИ-анализ за период'}
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
        <div className="empty">Пока нет записей за период</div>
      ) : (
        <div className="hist-list">
          {entries.map((e) => (
            <div key={e.id} className="hist-card nutrition-entry">
              {editingId === e.id ? (
                <div className="edit-box">
                  <input
                    className="input"
                    value={editForm.food_text}
                    onChange={(ev) => setEditForm({ ...editForm, food_text: ev.target.value })}
                  />
                  <div className="edit-grid">
                    <input className="input" placeholder="ккал" value={editForm.calories} onChange={(ev) => setEditForm({ ...editForm, calories: ev.target.value })} />
                    <input className="input" placeholder="белки" value={editForm.protein} onChange={(ev) => setEditForm({ ...editForm, protein: ev.target.value })} />
                    <input className="input" placeholder="жиры" value={editForm.fats} onChange={(ev) => setEditForm({ ...editForm, fats: ev.target.value })} />
                    <input className="input" placeholder="углев." value={editForm.carbs} onChange={(ev) => setEditForm({ ...editForm, carbs: ev.target.value })} />
                  </div>
                  <div className="edit-actions">
                    <button className="btn" onClick={saveEdit}>Сохранить</button>
                    <button className="btn ghost" onClick={() => setEditingId(null)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="hist-head">
                    <div className="hist-date">{e.food_text}</div>
                    <div className="entry-actions">
                      <button className="icon-btn sm" onClick={() => startEdit(e)} aria-label="Изменить"><Icon name="pen" size={15} /></button>
                      <button className="icon-btn sm danger" onClick={() => remove(e.id)} aria-label="Удалить"><Icon name="trash" size={15} /></button>
                    </div>
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}