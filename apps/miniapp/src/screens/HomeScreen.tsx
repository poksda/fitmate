import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session, Screen } from '../App';

type Props = {
  session: Session;
  onOpenWorkout: (id: number) => void;
  onNewWorkout: () => void;
  onNavigate: (s: Screen) => void;
};

export function HomeScreen({ session, onOpenWorkout, onNewWorkout, onNavigate }: Props) {
  const [upcoming, setUpcoming] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getWorkouts(session.clientId)
      .then((res) => {
        const open = res.workouts.find((w) => !w.completed_at);
        setUpcoming(open ?? null);
      })
      .finally(() => setLoading(false));
  }, [session.clientId]);

  const heroDate = upcoming
    ? new Date(upcoming.scheduled_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      })
    : null;

  return (
    <div>
      <header className="home-head">
        <div className="greeting">
          <div className="hello">Привет, 👋</div>
          <div className="trainer">Тренер: {session.trainerName}</div>
        </div>
        <div className="avatar">{session.trainerName.charAt(0).toUpperCase()}</div>
      </header>

      {loading ? (
        <section className="hero-card">
          <div className="hero-label">Сегодня</div>
          <div className="hero-title">Загрузка…</div>
        </section>
      ) : upcoming ? (
        <section className="hero-card">
          <div className="hero-label">{heroDate}</div>
          <div className="hero-title">
            {upcoming.name || 'Тренировка'}
          </div>
          <button className="btn hero-btn" onClick={() => onOpenWorkout(upcoming.id)}>
            Начать тренировку
          </button>
        </section>
      ) : (
        <section className="hero-card">
          <div className="hero-label">Сегодня</div>
          <div className="hero-title">День отдыха</div>
          <p className="hero-sub">Нет запланированных тренировок</p>
          <button className="btn hero-btn" onClick={onNewWorkout}>
            Создать тренировку
          </button>
        </section>
      )}

      <div className="section-title">Быстрые действия</div>
      <div className="actions">
        <button className="action-card" onClick={onNewWorkout}>
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
    </div>
  );
}