import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ClientPage } from './pages/ClientPage';

function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('fitmate_token'),
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    api
      .getClients()
      .catch(() => {
        localStorage.removeItem('fitmate_token');
        setToken(null);
        navigate('/login');
      });
  }, [token, navigate]);

  if (!token) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={(t) => {
                localStorage.setItem('fitmate_token', t);
                setToken(t);
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/clients/:id" element={<ClientPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export { App };