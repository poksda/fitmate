import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

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
  general_note: string | null;
  trainer_summary: string | null;
  author: string;
  exercises: Exercise[];
};

export function ClientPage() {
  const { id } = useParams();
  const [client, setClient] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getClient(Number(id))
      .then((res) => {
        setClient(res.client);
        setWorkouts(res.workouts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="wrap">Загрузка…</div>;
  if (!client) return <div className="wrap">Клиент не найден</div>;

  const completed = workouts.filter((w) => w.completed_at).length;
  const latestWeight = client.weight_kg;

  return (
    <div className="wrap">
      <Link to="/" className="back-link">
        ← Назад
      </Link>

      <header className="topbar" style={{ border: 'none', marginBottom: 8 }}>
        <div className="brand">
          <div className="logo">F</div>
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
          <div className="v" style={{ fontSize: 16, color: '#34d399' }}>
            Активен
          </div>
        </div>
      </div>

      {client.goals && (
        <p className="muted" style={{ marginTop: 16 }}>
          🎯 {client.goals}
        </p>
      )}

      <div className="section-title">
        <div className="icon">🏋️</div>
        Тренировки
      </div>

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
              <h3>🗓 {date}</h3>
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
                                ? '✅'
                                : '❌'}
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
              </div>
            ))}

            {w.trainer_summary && (
              <div className="summary">
                <span className="label">Заметка тренера</span>
                {w.trainer_summary}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}