import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Icon } from '../Icon';

type Client = {
  client_profile_id: number;
  name: string;
  weight_kg: number | null;
  goals: string | null;
  telegram_id: number | null;
  workout_count: number;
  status: 'active' | 'inactive';
  workouts_left: number | null;
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

  const activeCount = clients.filter((c) => c.status !== 'inactive').length;
  const totalWorkouts = clients.reduce(
    (sum, c) => sum + (Number(c.workout_count) || 0),
    0,
  );

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <div className="logo">
            <Icon name="dumbbell" size={20} />
          </div>
          <div>
            <h1>FitMate</h1>
            {trainerName && <div className="tag">Тренер · {trainerName}</div>}
          </div>
        </div>
        <button onClick={logout} className="btn btn-ghost">
          <Icon name="logout" size={15} /> Выйти
        </button>
      </header>

      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-value">{clients.length}</div>
          <div className="hero-stat-label">Клиентов</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">{activeCount}</div>
          <div className="hero-stat-label">Активных</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">{totalWorkouts}</div>
          <div className="hero-stat-label">Тренировок</div>
        </div>
      </div>

      <div className="section-title">
        <div className="icon"><Icon name="users" size={16} /></div>
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
            <div className="client-head">
              <div className="client-avatar">{c.name.charAt(0).toUpperCase()}</div>
              <h3>
                {c.name}
                {c.status === 'inactive' && <span className="badge-inactive">неактивен</span>}
              </h3>
            </div>
            <div className="stat-row">
              {c.weight_kg !== null && (
                <div className="stat">
                  Вес <strong>{c.weight_kg} кг</strong>
                </div>
              )}
              <div className="stat">
                Тренировок <strong>{c.workout_count ?? 0}</strong>
              </div>
              {c.workouts_left !== null && (
                <div className="stat">
                  До оплаты <strong>{c.workouts_left}</strong>
                </div>
              )}
            </div>
            {c.goals && <p className="muted" style={{ marginTop: 10 }}>{c.goals}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}