import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const COLOR_HEX = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  yellow: '#eab308',
};

export default function RoomLobby() {
  const { code } = useParams();
  const navigate = useNavigate();

  // Retrieve player identity from sessionStorage (set during room creation/join)
  const playerId = sessionStorage.getItem(`room_${code}_player_id`);
  const isHost = sessionStorage.getItem(`room_${code}_is_host`) === 'true';

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  async function fetchRoom() {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) { setError('Room not found'); return; }
      const data = await res.json();
      setRoom(data);
      if (data.status === 'active') {
        navigate(`/rooms/${code}/play`);
      }
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => {
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, 2000);
    return () => clearInterval(pollRef.current);
  }, [code]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to start');
    } catch {
      setError('Network error');
    } finally {
      setStarting(false);
    }
  }

  async function handleLeave() {
    try {
      await fetch(`/api/rooms/${code}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
    } catch {}
    sessionStorage.removeItem(`room_${code}_player_id`);
    sessionStorage.removeItem(`room_${code}_is_host`);
    navigate(-1);
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
            Back to Start
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const players = room.players || [];
  const myPlayer = players.find(p => p.id === playerId);
  const connectedCount = players.filter(p => p.is_connected).length;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Waiting Room</h1>
          <p className="text-gray-400 text-sm">Share the code with other players</p>
        </div>

        {/* Room Code */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Room Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-mono font-bold tracking-widest text-cyan-400">
              {code}
            </span>
            <button
              onClick={copyCode}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Copy code"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Players ({players.length}/6)
            </h2>
            <span className="text-xs text-gray-500">
              {connectedCount} connected
            </span>
          </div>
          <div className="space-y-2">
            {/* Filled seats */}
            {players.sort((a, b) => a.seat - b.seat).map(player => {
              const hex = COLOR_HEX[player.color] || '#888';
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: `${hex}15`, border: `1px solid ${hex}30` }}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                  <span className="font-medium text-white flex-1">
                    {player.display_name}
                    {player.id === playerId && (
                      <span className="text-xs text-gray-400 ml-2">(you)</span>
                    )}
                    {player.is_host ? (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Host</span>
                    ) : null}
                  </span>
                  <span className="text-xs capitalize text-gray-400" style={{ color: hex }}>
                    {player.color}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${player.is_connected ? 'bg-green-400' : 'bg-gray-600'}`} />
                </div>
              );
            })}
            {/* Empty seats */}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-700">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <span className="text-slate-600 text-sm">Waiting for player…</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            className="flex-1 px-4 py-3 border border-slate-600 text-gray-300 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Leave Room
          </button>
          {isHost && (
            <button
              onClick={handleStart}
              disabled={starting || players.length < 2}
              className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              title={players.length < 2 ? 'Need at least 2 players' : ''}
            >
              {starting ? 'Starting…' : 'Start Game'}
            </button>
          )}
        </div>

        {!isHost && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Waiting for the host to start the game…
          </p>
        )}
      </div>
    </div>
  );
}
