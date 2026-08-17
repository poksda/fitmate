import React, { useState } from 'react';

export function LoginScreen({ onLogin }: { onLogin: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(code.trim());
    } catch (err: any) {
      setError(err.message ?? 'Тренер не найден. Проверьте код.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="logo-big">F</div>
        <h1>FitMate</h1>
        <p className="subtitle">Ваш дневник тренировок</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            placeholder="Код тренера"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Проверяем…' : 'Начать'}
          </button>
        </form>
        <p className="hint">Код вам даёт ваш тренер (обычно его имя)</p>
      </div>
    </div>
  );
}