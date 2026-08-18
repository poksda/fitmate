import React, { useState } from 'react';
import { api } from '../api';
import { Icon } from '../Icon';

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(name, email, password);
      onLogin(res.token);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo">
          <Icon name="dumbbell" size={26} />
        </div>
        <h1>FitMate</h1>
        <p className="subtitle">Панель тренера</p>

        {mode === 'register' && (
          <input
            className="input"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn" disabled={loading}>
          {loading
            ? 'Загрузка…'
            : mode === 'login'
              ? 'Войти'
              : 'Зарегистрироваться'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  );
}