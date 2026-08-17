export type Role = 'trainer' | 'client';

export type User = {
  id: number;
  role: Role;
  name: string;
  /** Telegram id, только для клиентов */
  telegramId?: number;
  /** Email для входа тренера в веб-панель */
  email?: string;
  passwordHash?: string;
  createdAt: string;
};

export type ClientProfile = {
  id: number;
  userId: number;
  trainerId: number;
  /** Текущий вес тела, кг */
  weightKg?: number;
  /** Достижения/цели */
  goals?: string;
  createdAt: string;
};

export type SetEntry = {
  id: number;
  exerciseId: number;
  setNumber: number;
  weightKg?: number;
  reps?: number;
  techniqueOk?: boolean;
  author: 'trainer' | 'client';
  createdAt: string;
};

export type Exercise = {
  id: number;
  workoutId: number;
  name: string;
  /** Порядковый номер в тренировке */
  orderIndex: number;
  note?: string;
  author: 'trainer' | 'client';
  createdAt: string;
};

export type Workout = {
  id: number;
  clientId: number;
  /** Запланированная дата тренировки */
  scheduledAt: string;
  /** Фактическая дата, когда тренировка была проведена */
  completedAt?: string;
  /** Общая заметка по тренировке */
  generalNote?: string;
  author: 'trainer' | 'client';
  trainerSummary?: string;
  createdAt: string;
};

export type ProgressEntry = {
  id: number;
  clientId: number;
  weightKg?: number;
  /** Обхваты, см: талия, грудь и т.д. */
  measurements?: Record<string, number>;
  note?: string;
  createdAt: string;
};

/** Ответ API: тренировка вместе с упражнениями и подходами */
export type WorkoutWithDetails = Workout & {
  exercises: (Exercise & { sets: SetEntry[] })[];
};

export type AuthResponse = {
  token: string;
  user: User;
};
