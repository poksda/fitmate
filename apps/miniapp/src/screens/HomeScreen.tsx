import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session, Screen } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  onOpenWorkout: (id: number) => void;
  onNewWorkout: () => void;
  onNavigate: (s: Screen) => void;
};

export function HomeScreen({ session, onOpenWorkout, onNewWorkout, onNavigate }: Props) {
  const [upcoming, setUpcoming] = useState<any>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'active' | 'inactive'>(session.status);
  const [workoutsLeft, setWorkoutsLeft] = useState<number | null>(session.workoutsLeft);

  useEffect(() => {
    api
      .getWorkouts(session.clientId)
      .then((res) => {
        const open = res.workouts.find((w) => !w.completed_at);
        setUpcoming(open ?? null);
        setCompletedCount(res.workouts.filter((w) => w.completed_at).length);
      })
      .finally(() => setLoading(false));

    api
      .getMe()
      .then((res) => {
        setStatus(res.client.status);
        setWorkoutsLeft(res.client.workouts_left);
      })
      .catch(() => {});
  }, [session.clientId]);

  const heroDate = upcoming
    ? new Date(upcoming.scheduled_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div>
      <header className="home-head">
        <div className="greeting">
          <div className="hello">Привет</div>
          <div className="trainer">Твой тренер · {session.trainerName}</div>
        </div>
        <div className="avatar">{session.trainerName.charAt(0).toUpperCase()}</div>
      </header>

      {status === 'inactive' ? (
        <section className="status-banner inactive">
          <div className="status-icon"><Icon name="bolt" /></div>
          <div>
            <div className="status-banner-title">Тренировки приостановлены</div>
            <div className="status-banner-sub">
              Свяжитесь с тренером, чтобы возобновить занятия
            </div>
          </div>
        </section>
      ) : workoutsLeft !== null ? (
        <section className={`status-banner ${workoutsLeft <= 3 ? 'warn' : 'ok'}`}>
          <div className="status-icon"><Icon name="bolt" /></div>
          <div>
            <div className="status-banner-title">
              Осталось {workoutsLeft}{' '}
              {workoutsLeft === 0 || workoutsLeft >= 5
                ? 'тренировок'
                : workoutsLeft === 1
                  ? 'тренировка'
                  : 'тренировки'}
            </div>
            <div className="status-banner-sub">
              {workoutsLeft === 0
                ? 'Пора продлить абонемент'
                : workoutsLeft <= 3
                  ? 'Продлите абонемент, чтобы продолжить заниматься'
                  : 'По твоему абонементу'}
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className="hero-card">
          <div className="hero-label">Сегодня</div>
          <div className="hero-title">Загрузка…</div>
        </section>
      ) : upcoming ? (
        <section className="hero-card">
          <div className="hero-label"><Icon name="dumbbell" size={14} /> {heroDate}</div>
          <div className="hero-title">{upcoming.name || 'Тренировка'}</div>
          <div className="hero-sub">
            {upcoming.exercises?.length
              ? `${upcoming.exercises.length} упражнений`
              : 'Добавь упражнения и начни'}
          </div>
          <button className="btn hero-btn" onClick={() => onOpenWorkout(upcoming.id)}>
            Начать тренировку
          </button>
        </section>
      ) : (
        <section className="hero-card">
          <div className="hero-label"><Icon name="check" size={14} /> Сегодня</div>
          <div className="hero-title">День отдыха</div>
          <div className="hero-sub">Нет запланированных тренировок</div>
          <button className="btn hero-btn" onClick={onNewWorkout}>
            Создать тренировку
          </button>
        </section>
      )}

      <div className="quick-title">Разделы</div>
      <div className="actions">
        <button className="action-card" onClick={onNewWorkout}>
          <span className="action-icon"><Icon name="dumbbell" size={20} /></span>
          <span>Тренировки</span>
        </button>
        <button className="action-card" onClick={() => onNavigate('progress')}>
          <span className="action-icon"><Icon name="scale" size={20} /></span>
          <span>Прогресс</span>
        </button>
        <button className="action-card" onClick={() => onNavigate('history')}>
          <span className="action-icon"><Icon name="history" size={20} /></span>
          <span>История</span>
        </button>
      </div>
    </div>
  );
}