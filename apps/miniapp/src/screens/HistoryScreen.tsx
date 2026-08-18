import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Session } from '../App';

type Props = {
  session: Session;
  onOpenWorkout: (id: number) => void;
  onBack: () => void;
};

export function HistoryScreen({ session, onOpenWorkout, onBack }: Props) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getWorkouts(session.clientId)
      .then((res) => setWorkouts(res.workouts))
      .finally(() => setLoading(false));
  }, [session.clientId]);

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}>←</button>
        <h1>История</h1>
        <span />
      </header>

      {workouts.length === 0 && !loading && (
        <div className="empty">Пока нет тренировок</div>
      )}

      {workouts.map((w) => {
        const date = new Date(w.scheduled_at);
        const done = !!w.completed_at;
        const exercises = w.exercises ?? [];
        return (
          <div key={w.id} className="hist-card" onClick={() => onOpenWorkout(w.id)}>
            <div className="hist-head">
              <div className="hist-date">
                {w.name || date.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  weekday: 'short',
                })}
              </div>
              <span className={`status ${done ? 'done' : 'open'}`}>
                {done ? '✅' : '⏳'}
              </span>
            </div>
            {w.name && (
              <div className="hist-date-sub">
                {date.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
            )}
            {exercises.length > 0 && (
              <div className="hist-ex">
                {exercises.slice(0, 3).map((ex: any) => ex.name).join(', ')}
                {exercises.length > 3 ? '…' : ''}
              </div>
            )}
          </div>
        );
      })}

      {loading && <div className="loading">Загрузка…</div>}
    </div>
  );
}