import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session, Screen } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  onOpenWorkout: (id: number) => void;
  onNewWorkout: () => void;
  onStartPlanWorkout: (name: string) => void;
  onNavigate: (s: Screen) => void;
};

export function HomeScreen({
  session,
  onOpenWorkout,
  onNewWorkout,
  onStartPlanWorkout,
  onNavigate,
}: Props) {
  const [upcoming, setUpcoming] = useState<any>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'active' | 'inactive'>(session.status);
  const [workoutsLeft, setWorkoutsLeft] = useState<number | null>(session.workoutsLeft);
  const [plan, setPlan] = useState<{ day_of_week: number; workout_name: string }[]>([]);
  const [todayPlan, setTodayPlan] = useState<string | null>(null);

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

    api
      .getPlan()
      .then((res) => {
        setPlan(res.plan);
        setTodayPlan(res.today);
      })
      .catch(() => {});
  }, [session.clientId]);

  // Незавершённая тренировка, созданная сегодня (клиент уже начал)
  const startedToday =
    upcoming &&
    !upcoming.completed_at &&
    new Date(upcoming.scheduled_at).toDateString() === new Date().toDateString()
      ? upcoming
      : null;

  const DAY_SHORT: Record<number, string> = {
    1: 'Пн',
    2: 'Вт',
    3: 'Ср',
    4: 'Чт',
    5: 'Пт',
    6: 'Сб',
    7: 'Вс',
  };

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
        <button
          className="avatar-btn"
          onClick={() => onNavigate('profile')}
          aria-label="Профиль"
        >
          <div className="avatar">{session.trainerName.charAt(0).toUpperCase()}</div>
        </button>
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
      ) : todayPlan ? (
        <section className="hero-card">
          <div className="hero-label"><Icon name="dumbbell" size={14} /> Сегодня по плану</div>
          <div className="hero-title">{todayPlan}</div>
          <div className="hero-sub">План тренера на этот день</div>
          <button className="btn hero-btn" onClick={() => onStartPlanWorkout(todayPlan)}>
            Начать тренировку
          </button>
        </section>
      ) : startedToday ? (
        <section className="hero-card">
          <div className="hero-label"><Icon name="dumbbell" size={14} /> Сегодня</div>
          <div className="hero-title">{startedToday.name || 'Тренировка'}</div>
          <div className="hero-sub">
            {startedToday.exercises?.length
              ? `${startedToday.exercises.length} упражнений`
              : 'Добавь упражнения и начни'}
          </div>
          <button className="btn hero-btn" onClick={() => onOpenWorkout(startedToday.id)}>
            Продолжить тренировку
          </button>
        </section>
      ) : upcoming ? (
        <section className="hero-card">
          <div className="hero-label"><Icon name="history" size={14} /> {heroDate}</div>
          <div className="hero-title">{upcoming.name || 'Тренировка'}</div>
          <div className="hero-sub">
            {upcoming.exercises?.length
              ? `${upcoming.exercises.length} упражнений`
              : 'Открыта ранее — добавь упражнения'}
          </div>
          <button className="btn hero-btn" onClick={() => onOpenWorkout(upcoming.id)}>
            Продолжить тренировку
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

      {plan.length > 0 && (
        <>
          <div className="quick-title">План на неделю</div>
          <div className="week-plan">
            {plan.map((p) => (
              <div key={p.day_of_week} className="week-row">
                <span className="week-day">{DAY_SHORT[p.day_of_week]}</span>
                <span className="week-name">{p.workout_name}</span>
              </div>
            ))}
          </div>
        </>
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