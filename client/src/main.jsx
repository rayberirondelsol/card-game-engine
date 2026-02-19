import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import StartScreen from './pages/StartScreen';
import GameDetail from './pages/GameDetail';
import GameTable from './pages/GameTable';
import LoginPage from './pages/LoginPage';

function App() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const [token, setToken] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) {
      setAuthState('unauthenticated');
      return;
    }
    // Validate token with server
    fetch('/api/auth/check', {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then(res => {
        if (res.ok) {
          setToken(stored);
          setAuthState('authenticated');
        } else {
          localStorage.removeItem('auth_token');
          setAuthState('unauthenticated');
        }
      })
      .catch(() => {
        // If server unreachable, still allow if token exists
        setToken(stored);
        setAuthState('authenticated');
      });
  }, []);

  function handleLogin(newToken) {
    setToken(newToken);
    setAuthState('authenticated');
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
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/games/:id/play" element={<GameTable />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
