import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

type Client = {
  client_profile_id: number;
  name: string;
  weight_kg: number | null;
  goals: string | null;
  telegram_id: number | null;
};

export function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerName, setTrainerName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getClients()
      .then((res) => {
        setClients(res.clients);
        const user = localStorage.getItem('fitmate_user');
        if (user) setTrainerName(JSON.parse(user).name);
      })
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('fitmate_token');
    localStorage.removeItem('fitmate_user');
    navigate('/login');
  };

  if (loading) return <div className="wrap">Загрузка…</div>;

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <div className="logo">F</div>
          <div>
            <h1>FitMate</h1>
            {trainerName && <div className="tag">Тренер · {trainerName}</div>}
          </div>
        </div>
        <button onClick={logout} className="btn btn-ghost">
          Выйти
        </button>
      </header>

      <div className="section-title">
        <div className="icon">👥</div>
        Мои клиенты
      </div>

      {clients.length === 0 && (
        <div className="empty">
          <p>Пока нет клиентов.</p>
          <p className="muted" style={{ marginTop: 8 }}>
            Клиент пишет вашему боту в Telegram и вводит ваше имя как код — так он
            привязывается к вам.
          </p>
        </div>
      )}

      <div className="client-grid">
        {clients.map((c) => (
          <Link
            key={c.client_profile_id}
            to={`/clients/${c.client_profile_id}`}
            className="card client-card"
          >
            <h3>{c.name}</h3>
            <div className="stat-row">
              {c.weight_kg !== null && (
                <div className="stat">
                  Вес <strong>{c.weight_kg} кг</strong>
                </div>
              )}
              <div className="stat">
                Тренировок <strong>—</strong>
              </div>
            </div>
            {c.goals && <p className="muted" style={{ marginTop: 10 }}>{c.goals}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}