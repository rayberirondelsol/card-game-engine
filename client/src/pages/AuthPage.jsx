import React, { useState } from 'react';

function CardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function Input({ label, type, value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoFocus={autoFocus}
        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
      />
    </div>
  );
}

function Alert({ type, message }) {
  const styles = type === 'error'
    ? 'bg-red-900/40 border-red-700/50 text-red-300'
    : 'bg-emerald-900/40 border-emerald-700/50 text-emerald-300';
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}

function SignInForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'confirm_required') {
          setError('Bitte bestätige zuerst deine E-Mail-Adresse (Link in deinem Posteingang).');
        } else {
          setError(data.error || 'Login fehlgeschlagen');
        }
        return;
      }
      localStorage.setItem('auth_token', data.token);
      onLogin(data.token);
    } catch {
      setError('Server nicht erreichbar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="E-Mail" type="email" value={email} onChange={setEmail} placeholder="name@example.de" autoFocus />
      <Input label="Passwort" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      {error && <Alert type="error" message={error} />}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors mt-1"
      >
        {loading ? <Spinner text="Einloggen…" /> : 'Einloggen'}
      </button>
    </form>
  );
}

function SignUpForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== password2) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registrierung fehlgeschlagen');
        return;
      }
      if (data.status === 'confirm_email') {
        setSuccess(`Bestätigungsmail an ${email} gesendet. Bitte klicke auf den Link in der E-Mail.`);
        return;
      }
      // Auto-confirmed (no SMTP configured)
      localStorage.setItem('auth_token', data.token);
      onLogin(data.token);
    } catch {
      setError('Server nicht erreichbar');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert type="success" message={success} />
        <p className="text-slate-400 text-sm text-center">Nach der Bestätigung kannst du dich einloggen.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="E-Mail" type="email" value={email} onChange={setEmail} placeholder="name@example.de" autoFocus />
      <Input label="Passwort" type="password" value={password} onChange={setPassword} placeholder="Mindestens 8 Zeichen" />
      <Input label="Passwort wiederholen" type="password" value={password2} onChange={setPassword2} placeholder="••••••••" />
      {error && <Alert type="error" message={error} />}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors mt-1"
      >
        {loading ? <Spinner text="Registrieren…" /> : 'Registrieren'}
      </button>
    </form>
  );
}

function Spinner({ text }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </span>
  );
}

export default function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('signin');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-700 border border-slate-600 mb-4">
            <CardIcon />
          </div>
          <h1 className="text-2xl font-bold text-white">Card Game Engine</h1>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setTab('signin')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'signin'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Einloggen
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'signup'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrieren
            </button>
          </div>

          {/* Form */}
          <div className="p-6">
            {tab === 'signin'
              ? <SignInForm onLogin={onLogin} />
              : <SignUpForm onLogin={onLogin} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
