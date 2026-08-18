import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Icon } from '../Icon';

type SetRow = {
  id: number;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  technique_ok: boolean | null;
  author: string;
};

type Exercise = {
  id: number;
  name: string;
  note: string | null;
  author: string;
  sets: SetRow[];
};

type Workout = {
  id: number;
  scheduled_at: string;
  completed_at: string | null;
  name: string | null;
  general_note: string | null;
  trainer_summary: string | null;
  author: string;
  exercises: Exercise[];
};

export function ClientPage() {
  const { id } = useParams();
  const [client, setClient] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма «новая тренировка»
  const [newWkName, setNewWkName] = useState('');
  const [newWkDate, setNewWkDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  // Формы добавления упражнения/подхода
  const [addingExTo, setAddingExTo] = useState<number | null>(null);
  const [exName, setExName] = useState('');
  const [addingSetTo, setAddingSetTo] = useState<number | null>(null);
  const [setWeight, setSetWeight] = useState('');
  const [setReps, setSetReps] = useState('');

  // Форма комментария
  const [commentFor, setCommentFor] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  // Управление клиентом
  const [workoutsLeftInput, setWorkoutsLeftInput] = useState('');

  // План на неделю
  const [plan, setPlan] = useState<Record<number, string>>({});
  const DAY_NAMES: Record<number, string> = {
    1: 'Пн',
    2: 'Вт',
    3: 'Ср',
    4: 'Чт',
    5: 'Пт',
    6: 'Сб',
    7: 'Вс',
  };

  const reload = async (clientId: number) => {
    const res = await api.getClient(clientId);
    setClient(res.client);
    setWorkouts(res.workouts);
    api
      .getClientProgress(clientId)
      .then((p) => setProgress(p.entries.filter((e) => e.weight_kg != null)))
      .catch(() => {});
    api
      .getClientPlan(clientId)
      .then((r) => {
        const map: Record<number, string> = {};
        r.plan.forEach((p) => {
          map[p.day_of_week] = p.workout_name;
        });
        setPlan(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    reload(Number(id))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="wrap">Загрузка…</div>;
  if (!client) return <div className="wrap">Клиент не найден</div>;

  const completed = workouts.filter((w) => w.completed_at).length;
  const latestWeight = client.weight_kg;

  const createWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newWkName.trim()) return;
    const d = new Date(`${newWkDate}T09:00:00`).toISOString();
    await api.createWorkout(Number(id), d, newWkName.trim());
    setNewWkName('');
    reload(Number(id));
  };

  const addExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingExTo === null || !exName.trim()) return;
    await api.addExercise(addingExTo, exName.trim());
    setExName('');
    setAddingExTo(null);
    reload(Number(id!));
  };

  const addSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingSetTo === null) return;
    const ex = workouts
      .flatMap((w) => w.exercises)
      .find((x) => x.id === addingSetTo);
    const nextNum = (ex?.sets?.length ?? 0) + 1;
    await api.addSet(
      addingSetTo,
      nextNum,
      setWeight ? parseFloat(setWeight.replace(',', '.')) : undefined,
      setReps ? parseInt(setReps, 10) : undefined,
    );
    setSetWeight('');
    setSetReps('');
    setAddingSetTo(null);
    reload(Number(id!));
  };

  const saveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commentFor === null) return;
    await api.addComment(commentFor, commentText.trim());
    setCommentText('');
    setCommentFor(null);
    reload(Number(id!));
  };

  const setStatus = async (status: 'active' | 'inactive') => {
    await api.updateClient(Number(id!), { status });
    reload(Number(id!));
  };

  const saveWorkoutsLeft = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(workoutsLeftInput, 10);
    await api.updateClient(Number(id!), {
      workouts_left: isNaN(n) ? null : n,
    });
    setWorkoutsLeftInput('');
    reload(Number(id!));
  };

  const savePlan = async () => {
    const items = Object.entries(plan)
      .map(([dow, name]) => ({ day_of_week: Number(dow), workout_name: name.trim() }))
      .filter((p) => p.workout_name.length > 0);
    await api.updateClientPlan(Number(id!), items);
    reload(Number(id!));
  };

  const chartMax = Math.max(...progress.map((p) => p.weight_kg), latestWeight ?? 0) * 1.05;
  const chartMin = Math.min(...progress.map((p) => p.weight_kg), latestWeight ?? 0) * 0.95;

  return (
    <div className="wrap">
      <Link to="/" className="back-link">
        <Icon name="back" size={16} /> Назад
      </Link>

      <header className="topbar">
        <div className="brand">
          <div className="logo">
            <Icon name="dumbbell" size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 26 }}>{client.name}</h1>
            <div className="tag">Карточка клиента</div>
          </div>
        </div>
      </header>

      <div className="profile-grid">
        <div className="profile-item">
          <div className="k">Текущий вес</div>
          <div className="v">{latestWeight ?? '—'} кг</div>
        </div>
        <div className="profile-item">
          <div className="k">Тренировок</div>
          <div className="v">{completed}</div>
        </div>
        <div className="profile-item">
          <div className="k">Статус</div>
          <div className="v" style={{ fontSize: 16, color: client.status === 'inactive' ? '#f87171' : '#34d399' }}>
            {client.status === 'inactive' ? 'Неактивен' : 'Активен'}
          </div>
        </div>
      </div>

      <div className="card manage-card">
        <div className="section-title" style={{ margin: '0 0 12px' }}>
          <div className="icon"><Icon name="gear" size={16} /></div>
          Управление клиентом
        </div>

        <div className="manage-row">
          {client.status === 'active' ? (
            <button className="btn btn-danger" onClick={() => setStatus('inactive')}>
              Деактивировать клиента
            </button>
          ) : (
            <button className="btn" onClick={() => setStatus('active')}>
              Активировать клиента
            </button>
          )}
          <span className="manage-hint">
            {client.status === 'inactive'
              ? 'Клиент увидит «Тренировки приостановлены»'
              : 'После деактивации клиент не сможет заниматься'}
          </span>
        </div>

        <form className="manage-row" onSubmit={saveWorkoutsLeft}>
          <input
            className="input input-narrow"
            placeholder={client.workouts_left?.toString() ?? '∞'}
            inputMode="numeric"
            value={workoutsLeftInput}
            onChange={(e) => setWorkoutsLeftInput(e.target.value)}
          />
          <button className="btn" type="submit">Сохранить счётчик</button>
          <span className="manage-hint">
            Текущее: {client.workouts_left ?? 'не задано'} тренировок до оплаты
          </span>
        </form>
      </div>

      {client.goals && (
        <p className="muted" style={{ marginTop: 16 }}>
          <Icon name="target" size={15} /> {client.goals}
        </p>
      )}

      <div className="card manage-card">
        <div className="section-title" style={{ margin: '0 0 12px' }}>
          <div className="icon"><Icon name="dumbbell" size={16} /></div>
          План на неделю
        </div>
        <div className="plan-grid">
          {Object.keys(DAY_NAMES).map((dow) => (
            <div key={dow} className="plan-row">
              <span className="plan-day">{DAY_NAMES[Number(dow)]}</span>
              <input
                className="input"
                placeholder="—"
                value={plan[Number(dow)] ?? ''}
                onChange={(e) =>
                  setPlan((p) => ({ ...p, [Number(dow)]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={savePlan}>
          Сохранить план
        </button>
        <span className="manage-hint" style={{ marginLeft: 10 }}>
          Клиент увидит «Сегодня: …» в приложении по этому плану
        </span>
      </div>

      {(progress.length > 0 || latestWeight) && (
        <>
          <div className="section-title">
            <div className="icon"><Icon name="scale" size={16} /></div>
            Прогресс веса
          </div>
          <div className="card">
            <div className="chart">
              {progress.map((p) => {
                const h = chartMax > chartMin
                  ? Math.max(8, ((p.weight_kg - chartMin) / (chartMax - chartMin)) * 100)
                  : 50;
                return (
                  <div key={p.id} className="bar-wrap">
                    <div className="bar" style={{ height: `${h}%` }} title={`${p.weight_kg} кг`} />
                    <div className="bar-label">{p.weight_kg}</div>
                  </div>
                );
              })}
              {progress.length === 0 && latestWeight && (
                <div className="bar-wrap">
                  <div className="bar" style={{ height: '80%' }} />
                  <div className="bar-label">{latestWeight}</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="section-title">
        <div className="icon"><Icon name="dumbbell" size={16} /></div>
        Тренировки
      </div>

      <form className="card add-workout-form" onSubmit={createWorkout}>
        <div className="row">
          <input
            className="input"
            placeholder="Название (Грудь и бицепс…)"
            value={newWkName}
            onChange={(e) => setNewWkName(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={newWkDate}
            onChange={(e) => setNewWkDate(e.target.value)}
          />
          <button className="btn" type="submit">Добавить</button>
        </div>
      </form>

      {workouts.length === 0 && (
        <div className="empty">
          Тренировок пока нет. Клиент создаёт их в приложении, или добавьте здесь.
        </div>
      )}

      {workouts.map((w) => {
        const date = new Date(w.scheduled_at).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const done = !!w.completed_at;
        return (
          <div key={w.id} className="card workout-card">
            <div className="head">
              <h3>
                {w.name ? `${w.name} · ` : ''}{date}
              </h3>
              <span className={`status ${done ? 'done' : 'open'}`}>
                {done ? 'Выполнена' : 'Запланирована'}
              </span>
            </div>

            {w.exercises?.map((ex) => (
              <div key={ex.id} className="exercise">
                <div className="ex-name">
                  {ex.name}
                  <span className={`author-badge ${ex.author === 'client' ? 'client' : ''}`}>
                    {ex.author === 'trainer' ? 'тренер' : 'клиент'}
                  </span>
                </div>
                {ex.sets?.length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>№</th>
                        <th>Вес</th>
                        <th>Повт.</th>
                        <th>Техника</th>
                        <th>Кто</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((s) => (
                        <tr key={s.id}>
                          <td>{s.set_number}</td>
                          <td>{s.weight_kg ?? '—'}</td>
                          <td>{s.reps ?? '—'}</td>
                          <td>
                            {s.technique_ok === null
                              ? '—'
                              : s.technique_ok
                                ? <Icon name="check" size={15} />
                                : <span style={{ color: 'var(--danger)' }}>✕</span>}
                          </td>
                          <td>
                            <span className={`author-badge ${s.author === 'client' ? 'client' : ''}`}>
                              {s.author === 'trainer' ? 'тренер' : 'клиент'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {addingSetTo === ex.id && (
                  <form className="inline-form" onSubmit={addSet}>
                    <input
                      className="input"
                      placeholder="Вес, кг"
                      inputMode="decimal"
                      value={setWeight}
                      onChange={(e) => setSetWeight(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Повторения"
                      inputMode="numeric"
                      value={setReps}
                      onChange={(e) => setSetReps(e.target.value)}
                    />
                    <button className="btn" type="submit">OK</button>
                    <button
                      className="link"
                      type="button"
                      onClick={() => setAddingSetTo(null)}
                    >
                      Отмена
                    </button>
                  </form>
                )}
                <button
                  className="link"
                  onClick={() =>
                    setAddingSetTo(addingSetTo === ex.id ? null : ex.id)
                  }
                >
                  {addingSetTo === ex.id ? 'Скрыть' : '+ Подход'}
                </button>
              </div>
            ))}

            {addingExTo === w.id && (
              <form className="inline-form" onSubmit={addExercise}>
                <input
                  className="input"
                  placeholder="Название упражнения"
                  value={exName}
                  onChange={(e) => setExName(e.target.value)}
                />
                <button className="btn" type="submit">OK</button>
                <button
                  className="link"
                  type="button"
                  onClick={() => setAddingExTo(null)}
                >
                  Отмена
                </button>
              </form>
            )}
            <button
              className="link"
              onClick={() => setAddingExTo(addingExTo === w.id ? null : w.id)}
            >
              {addingExTo === w.id ? 'Скрыть' : '+ Упражнение'}
            </button>

            {w.trainer_summary && (
              <div className="summary">
                <span className="label">Заметка тренера</span>
                {w.trainer_summary}
              </div>
            )}

            {commentFor === w.id ? (
              <form className="inline-form" onSubmit={saveComment}>
                <textarea
                  className="input"
                  placeholder="Комментарий клиенту…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button className="btn" type="submit">Сохранить</button>
                <button
                  className="link"
                  type="button"
                  onClick={() => setCommentFor(null)}
                >
                  Отмена
                </button>
              </form>
            ) : (
              <button
                className="link"
                onClick={() => {
                  setCommentFor(w.id);
                  setCommentText(w.trainer_summary ?? '');
                }}
              >
                {w.trainer_summary ? (
                  <><Icon name="pen" size={14} /> Изменить заметку</>
                ) : (
                  <><Icon name="chat" size={14} /> Добавить заметку клиенту</>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}