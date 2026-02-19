import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ConfirmPage({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setError('Kein Token gefunden');
      return;
    }
    fetch(`/api/auth/confirm?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          onLogin(data.token);
        } else {
          setState('error');
          setError(data.error || 'Bestätigung fehlgeschlagen');
        }
      })
      .catch(() => {
        setState('error');
        setError('Server nicht erreichbar');
      });
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-cyan-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400">E-Mail wird bestätigt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-900/40 border border-red-700/50 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Bestätigung fehlgeschlagen</h2>
        <p className="text-red-300 text-sm mb-6">{error}</p>
        <a href="/" className="text-cyan-400 hover:text-cyan-300 text-sm underline">
          Zurück zum Login
        </a>
      </div>
    </div>
  );
}
