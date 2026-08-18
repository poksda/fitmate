import React, { useEffect, useState } from 'react';
import { api } from './api';
import { setAuthToken } from './api';
import { getInitData, getTgUser } from './tg';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { NewWorkoutScreen } from './screens/NewWorkoutScreen';
import { ProfileScreen } from './screens/ProfileScreen';

export type Session = {
  clientId: number;
  trainerName: string;
  status: 'active' | 'inactive';
  workoutsLeft: number | null;
};

export type Screen = 'home' | 'workout' | 'new' | 'progress' | 'history' | 'profile';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<Screen>('home');
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = getTgUser();
      if (!user) {
        setChecking(false);
        return;
      }
      try {
        const res = await api.tgLogin(getInitData());
        setSession({
          clientId: res.client_id,
          trainerName: res.trainer.name,
          status: res.client?.status ?? 'active',
          workoutsLeft: res.client?.workouts_left ?? null,
        });
      } catch {
        // 428 — новый пользователь или отвязанный клиент, нужен код тренера → LoginScreen
      } finally {
        setChecking(false);
      }
    };
    init();
  }, []);

  const openWorkout = (workoutId: number) => {
    setActiveWorkoutId(workoutId);
    setScreen('workout');
  };

  const createWorkout = async (name: string) => {
    const { workout } = await api.createWorkout({
      client_id: session!.clientId,
      scheduled_at: new Date().toISOString(),
      name,
      author: 'client',
    });
    openWorkout(workout.id);
  };

  const handleUnbound = () => {
    setAuthToken(null);
    setSession(null);
  };

  if (checking) return <div className="screen loading">Загрузка…</div>;

  if (!session) {
    return (
      <LoginScreen
        onLogin={async (code) => {
          const res = await api.tgLogin(getInitData(), code);
          setSession({
            clientId: res.client_id,
            trainerName: res.trainer.name,
            status: res.client?.status ?? 'active',
            workoutsLeft: res.client?.workouts_left ?? null,
          });
        }}
      />
    );
  }

  return (
    <div className="screen">
      {screen === 'home' && (
        <HomeScreen
          session={session}
          onOpenWorkout={openWorkout}
          onNewWorkout={() => setScreen('new')}
          onNavigate={setScreen}
        />
      )}
      {screen === 'new' && (
        <NewWorkoutScreen
          onSelect={createWorkout}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'workout' && (
        <WorkoutScreen
          session={session}
          workoutId={activeWorkoutId}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'progress' && (
        <ProgressScreen session={session} onBack={() => setScreen('home')} />
      )}
      {screen === 'history' && (
        <HistoryScreen
          session={session}
          onOpenWorkout={openWorkout}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          session={session}
          onBack={() => setScreen('home')}
          onUnbound={handleUnbound}
        />
      )}
    </div>
  );
}