import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Session } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  workoutId: number | null;
  onBack: () => void;
};

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
  sets: SetRow[];
};

export function WorkoutScreen({ session, workoutId, onBack }: Props) {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const load = useCallback(
    (id: number) => {
      setLoading(true);
      api
        .getWorkouts(session.clientId)
        .then((res) => {
          const found = res.workouts.find((w) => w.id === id);
          if (found) setWorkout(found);
        })
        .finally(() => setLoading(false));
    },
    [session.clientId],
  );

  useEffect(() => {
    if (workoutId) load(workoutId);
    else {
      // Нет тренировки — создаём новую
      api
        .createWorkout({
          client_id: session.clientId,
          scheduled_at: new Date().toISOString(),
          author: 'client',
        })
        .then((res) => load(res.workout.id));
    }
  }, [workoutId, load, session.clientId]);

  const exercises: Exercise[] = workout?.exercises ?? [];
  const activeExercise =
    exercises.find((x) => x.id === activeExerciseId) ?? null;

  const addExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim() || !workout) return;
    const { exercise } = await api.addExercise(workout.id, exerciseName.trim(), 'client');
    setExerciseName('');
    setAdding(false);
    await load(workout.id);
    setActiveExerciseId(exercise.id);
  };

  const addSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExercise) return;
    const nextNum = activeExercise.sets.length + 1;
    await api.addSet(
      activeExercise.id,
      nextNum,
      'client',
      weight ? parseFloat(weight.replace(',', '.')) : undefined,
      reps ? parseInt(reps, 10) : undefined,
    );
    setWeight('');
    setReps('');
    load(workout.id);
  };

  const finish = async () => {
    if (workout) await api.completeWorkout(workout.id);
    onBack();
  };

  if (loading) return <div className="loading">Загрузка…</div>;
  if (!workout) return <div className="loading">Тренировка не найдена</div>;

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}><Icon name="back" /></button>
        <h1>{workout.name || 'Тренировка'}</h1>
        <span />
      </header>

      <div className="workout-meta">
        {new Date(workout.scheduled_at).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        })}
      </div>

      {exercises.map((ex) => (
        <div key={ex.id} className="ex-card">
          <div className="ex-card-head">
            <strong>{ex.name}</strong>
            <button className="icon-btn small" onClick={() => setActiveExerciseId(ex.id)}>
              <Icon name="plus" size={16} />
            </button>
          </div>
          {ex.sets.length > 0 && (
            <div className="sets">
              {ex.sets.map((s) => (
                <div key={s.id} className="set-row">
                  <span className="set-num">{s.set_number}</span>
                  <span className="set-weight">{s.weight_kg ?? '—'} кг</span>
                  <span className="set-reps">× {s.reps ?? '—'}</span>
                  <span className="set-author">
                    {s.author === 'trainer' ? 'тренер' : 'ты'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {activeExercise ? (
        <form className="add-form" onSubmit={addSet}>
          <div className="form-title">Подход к: {activeExercise.name}</div>
          <div className="row">
            <input
              className="input"
              placeholder="Вес, кг"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <input
              className="input"
              placeholder="Повторения"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
          <button className="btn" type="submit">Добавить подход</button>
          <button className="link" type="button" onClick={() => setActiveExerciseId(null)}>
            Закрыть
          </button>
        </form>
      ) : adding ? (
        <form className="add-form" onSubmit={addExercise}>
          <div className="form-title">Новое упражнение</div>
          <input
            className="input"
            placeholder="Название (например: Жим лёжа)"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            autoFocus
          />
          <button className="btn" type="submit">Добавить</button>
          <button className="link" type="button" onClick={() => setAdding(false)}>
            Отмена
          </button>
        </form>
      ) : (
        <button className="btn btn-block" onClick={() => setAdding(true)}>
          + Упражнение
        </button>
      )}

      <button className="btn btn-block finish" onClick={finish}>
        Завершить тренировку
      </button>
    </div>
  );
}