const API_URL = import.meta.env.VITE_API_URL ?? '/api/trainer';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('fitmate_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string } }>(
      '/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ).then((r) => {
      localStorage.setItem('fitmate_user', JSON.stringify(r.user));
      return r;
    }),

  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string } }>(
      '/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
    ).then((r) => {
      localStorage.setItem('fitmate_user', JSON.stringify(r.user));
      return r;
    }),

  getClients: () =>
    request<{
      clients: {
        client_profile_id: number;
        name: string;
        weight_kg: number | null;
        goals: string | null;
        telegram_id: number | null;
        workout_count: number;
        status: 'active' | 'inactive';
        workouts_left: number | null;
      }[];
    }>('/clients'),

  getClient: (id: number) => request<any>(`/clients/${id}`),

  updateClient: (
    id: number,
    body: {
      status?: 'active' | 'inactive';
      workouts_left?: number | null;
      weight_kg?: number | null;
      goals?: string | null;
    },
  ) =>
    request<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getClientProgress: (id: number) =>
    request<{ entries: any[] }>(`/clients/${id}/progress`),

  createWorkout: (clientId: number, scheduledAt: string, name?: string) =>
    request<any>('/workouts', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, scheduled_at: scheduledAt, name, author: 'trainer' }),
    }),

  addExercise: (workoutId: number, name: string) =>
    request<any>(`/workouts/${workoutId}/exercises`, {
      method: 'POST',
      body: JSON.stringify({ name, author: 'trainer' }),
    }),

  addSet: (exerciseId: number, setNumber: number, weightKg?: number, reps?: number, techniqueOk?: boolean) =>
    request<any>(`/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: JSON.stringify({
        set_number: setNumber,
        weight_kg: weightKg,
        reps,
        technique_ok: techniqueOk,
        author: 'trainer',
      }),
    }),

  addComment: (workoutId: number, trainerSummary: string) =>
    request<any>(`/workouts/${workoutId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ trainer_summary: trainerSummary }),
    }),
};