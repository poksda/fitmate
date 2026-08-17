import React, { useEffect, useState } from 'react';
import { api } from './api';
import { getInitData, getTgUser } from './tg';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { HistoryScreen } from './screens/HistoryScreen';

export type Session = {
  clientId: number;
  trainerName: string;
};

export type Screen = 'home' | 'workout' | 'progress' | 'history';

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
        setSession({ clientId: res.client_id, trainerName: res.trainer.name });
      } catch {
        // 428 — новый пользователь, нужен код тренера → покажем LoginScreen
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

  if (checking) return <div className="screen loading">Загрузка…</div>;

  if (!session) {
    return (
      <LoginScreen
        onLogin={async (code) => {
          const res = await api.tgLogin(getInitData(), code);
          setSession({ clientId: res.client_id, trainerName: res.trainer.name });
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
          onNavigate={setScreen}
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
    </div>
  );
}