import React from 'react';
import ReactDOM from 'react-dom/client';
import { initTgApp } from './tg';
import { App } from './App';
import './styles.css';

initTgApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);