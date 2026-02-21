import React, { useState, useEffect } from 'react';

const PLAYER_COLORS = [
  { value: 'red',    hex: '#ef4444', label: 'Red' },
  { value: 'blue',   hex: '#3b82f6', label: 'Blue' },
  { value: 'green',  hex: '#22c55e', label: 'Green' },
  { value: 'purple', hex: '#a855f7', label: 'Purple' },
  { value: 'orange', hex: '#f97316', label: 'Orange' },
  { value: 'yellow', hex: '#eab308', label: 'Yellow' },
];

export default function JoinRoomModal({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('blue');
  const [takenColors, setTakenColors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // Check taken colors when code is 6 chars
  useEffect(() => {
    if (code.length !== 6) { setTakenColors([]); return; }
    const controller = new AbortController();
    setChecking(true);
    fetch(`/api/rooms/${code.toUpperCase()}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.players) {
          setTakenColors(data.players.map(p => p.color));
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
    return () => controller.abort();
  }, [code]);

  // Auto-select first available color
  useEffect(() => {
    const available = PLAYER_COLORS.find(c => !takenColors.includes(c.value));
    if (available && takenColors.includes(color)) setColor(available.value);
  }, [takenColors]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) return setError('Please enter a name');
    if (code.length !== 6) return setError('Room code must be 6 characters');
    if (takenColors.includes(color)) return setError('That color is taken');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to join room');
      onJoined(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-semibold mb-4">Join Room</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Room Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="6-character code"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] font-mono tracking-widest text-center text-lg uppercase"
              autoFocus
            />
            {checking && <p className="text-xs text-gray-400 mt-1">Checking room…</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={20}
              placeholder="2–20 characters"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your Color</label>
            <div className="flex gap-2 flex-wrap">
              {PLAYER_COLORS.map(c => {
                const taken = takenColors.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={taken}
                    onClick={() => !taken && setColor(c.value)}
                    title={taken ? `${c.label} (taken)` : c.label}
                    className="w-9 h-9 rounded-full border-2 transition-all relative"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: color === c.value ? '#fff' : 'transparent',
                      outline: color === c.value ? `2px solid ${c.hex}` : 'none',
                      outlineOffset: '2px',
                      opacity: taken ? 0.35 : 1,
                      cursor: taken ? 'not-allowed' : 'pointer',
                    }}
                  />
                );
              })}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || displayName.trim().length < 2 || code.length !== 6}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining…' : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
