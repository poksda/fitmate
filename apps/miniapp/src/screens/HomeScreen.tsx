import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session, Screen } from '../App';

type Props = {
  session: Session;
  onOpenWorkout: (id: number) => void;
  onNavigate: (s: Screen) => void;
};

export function HomeScreen({ session, onOpenWorkout, onNavigate }: Props) {
  const [upcoming, setUpcoming] = useState<any>(null);
  const [nextWorkout, setNextWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getWorkouts(session.clientId)
      .then((res) => {
        const open = res.workouts.filter((w) => !w.completed_at);
        const last = open[0] ?? null;
        setUpcoming(last);
        setNextWorkout(last);
      })
      .finally(() => setLoading(false));
  }, [session.clientId]);

  const startNew = async () => {
    const { workout } = await api.createWorkout({
      client_id: session.clientId,
      scheduled_at: new Date().toISOString(),
      author: 'client',
    });
    onOpenWorkout(workout.id);
  };

  return (
    <div>
      <header className="home-head">
        <div className="greeting">
          <div className="hello">Привет, 👋</div>
          <div className="trainer">Тренер: {session.trainerName}</div>
        </div>
        <div className="avatar">{session.trainerName.charAt(0).toUpperCase()}</div>
      </header>

      <section className="hero-card">
        <div className="hero-label">Сегодня</div>
        {loading ? (
          <div className="hero-title">Загрузка…</div>
        ) : upcoming ? (
          <>
            <div className="hero-title">Тренировка готова</div>
            <button className="btn hero-btn" onClick={() => onOpenWorkout(upcoming.id)}>
              Начать тренировку
            </button>
          </>
        ) : (
          <>
            <div className="hero-title">День отдыха</div>
            <p className="hero-sub">Хороший день, чтобы восстановиться</p>
          </>
        )}
      </section>

      <div className="section-title">Быстрые действия</div>
      <div className="actions">
        <button className="action-card" onClick={startNew}>
          <span className="action-icon">🏋️</span>
          <span>Новая тренировка</span>
        </button>
        <button className="action-card" onClick={() => onNavigate('progress')}>
          <span className="action-icon">⚖️</span>
          <span>Записать вес</span>
        </button>
        <button className="action-card" onClick={() => onNavigate('history')}>
          <span className="action-icon">📋</span>
          <span>История</span>
        </button>
      </div>

      {nextWorkout && (
        <div className="next-card">
          <div className="next-label">Ближайшая тренировка</div>
          <div className="next-date">
            {new Date(nextWorkout.scheduled_at).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
        </div>
      )}
    </div>
  );
}