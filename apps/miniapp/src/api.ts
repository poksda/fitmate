const API_URL = import.meta.env.VITE_API_URL ?? '/api/bot';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Ошибка ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Вход через Telegram initData (id и имя берём из Telegram)
  tgLogin: (initData: string, trainerCode?: string) =>
    request<{
      token: string;
      client_id: number;
      trainer: { id: number; name: string };
      client?: { status: 'active' | 'inactive'; workouts_left: number | null };
      new_user?: boolean;
    }>('/tg-login', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData, trainer_code: trainerCode }),
    }).then((r) => {
      setAuthToken(r.token);
      return r;
    }),

  getWorkouts: (clientId: number) =>
    request<{ workouts: any[] }>(`/workouts?client_id=${clientId}`),

  getMe: () =>
    request<{ client: { status: 'active' | 'inactive'; workouts_left: number | null } }>(
      '/me',
    ),

  unbind: () =>
    request<{ ok: boolean }>('/unbind', { method: 'POST', body: '{}' }),

  getProgress: (clientId: number) =>
    request<{ entries: any[] }>(`/progress?client_id=${clientId}`),

  createWorkout: (body: {
    client_id: number;
    scheduled_at: string;
    name?: string;
    general_note?: string;
    author: 'trainer' | 'client';
  }) => request<{ workout: { id: number; name?: string } }>('/workouts', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  addExercise: (
    workoutId: number,
    name: string,
    author: 'trainer' | 'client',
    note?: string,
  ): Promise<{ exercise: { id: number } }> =>
    request(`/workouts/${workoutId}/exercises`, {
      method: 'POST',
      body: JSON.stringify({ name, author, note }),
    }),

  addSet: (
    exerciseId: number,
    setNumber: number,
    author: 'trainer' | 'client',
    weightKg?: number,
    reps?: number,
    techniqueOk?: boolean,
  ): Promise<{ set: { id: number } }> =>
    request(`/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: JSON.stringify({
        set_number: setNumber,
        weight_kg: weightKg,
        reps,
        technique_ok: techniqueOk,
        author,
      }),
    }),

  completeWorkout: (workoutId: number, generalNote?: string) =>
    request<{ workout: any }>(`/workouts/${workoutId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ general_note: generalNote }),
    }),

  addProgress: (clientId: number, weightKg?: number, note?: string) =>
    request<{ entry: any }>('/progress', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, weight_kg: weightKg, note }),
    }),
};