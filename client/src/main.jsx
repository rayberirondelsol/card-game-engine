import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import './index.css';
import StartScreen from './pages/StartScreen';
import GameDetail from './pages/GameDetail';
import GameTable from './pages/GameTable';
import AuthPage from './pages/AuthPage';
import ConfirmPage from './pages/ConfirmPage';

// Shown at /auth/confirm?token=...
function ConfirmRoute({ onLogin }) {
  return <ConfirmPage onLogin={onLogin} />;
}

function App() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) {
      setAuthState('unauthenticated');
      return;
    }
    fetch('/api/auth/check', {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(res => {
        if (res.ok) {
          setAuthState('authenticated');
        } else {
          localStorage.removeItem('auth_token');
          setAuthState('unauthenticated');
        }
      })
      .catch(() => {
        // Server unreachable → trust stored token
        setAuthState('authenticated');
      });
  }, []);

  function handleLogin(token) {
    localStorage.setItem('auth_token', token);
    setAuthState('authenticated');
  }

  // Email confirmation link – always accessible, even when not logged in
  if (window.location.pathname === '/auth/confirm') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/auth/confirm" element={<ConfirmRoute onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/games/:id/play" element={<GameTable />} />
        <Route path="/auth/confirm" element={<ConfirmRoute onLogin={handleLogin} />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
