import React, { useState } from 'react';
import { api } from '../api';
import { Session } from '../App';
import { Icon } from '../Icon';

type Props = {
  session: Session;
  onBack: () => void;
  onUnbound: () => void;
};

export function ProfileScreen({ session, onBack, onUnbound }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const doUnbind = async () => {
    setBusy(true);
    setError('');
    try {
      await api.unbind();
      onUnbound();
    } catch (e: any) {
      setError(e.message ?? 'Не удалось отвязаться');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack}><Icon name="back" /></button>
        <h1>Профиль</h1>
        <span />
      </header>

      <section className="hero-card">
        <div className="avatar profile-avatar">
          {session.trainerName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-name">{session.trainerName}</div>
        <div className="profile-role">Твой тренер</div>
      </section>

      <div className="section-title">Связь с тренером</div>
      <div className="next-card">
        <div className="next-label">Тренер</div>
        <div className="next-date">{session.trainerName}</div>
        <p className="profile-hint">
          Ты можешь отвязаться от тренера. После этого нужно будет ввести код нового
          тренера при следующем входе.
        </p>
        {!confirming ? (
          <button className="btn btn-block danger" onClick={() => setConfirming(true)}>
            Отвязаться от тренера
          </button>
        ) : (
          <div className="confirm-box">
            <p className="confirm-text">Точно отвязаться? Тренировки и история останутся.</p>
            <div className="row">
              <button className="btn btn-block danger" onClick={doUnbind} disabled={busy}>
                {busy ? 'Отвязываю…' : 'Да, отвязаться'}
              </button>
            </div>
            <button className="link" onClick={() => setConfirming(false)}>
              Отмена
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}