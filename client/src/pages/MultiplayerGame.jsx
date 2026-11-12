import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom.js';
import GameTable from './GameTable.jsx';
import { apiFetch } from '../utils/api';

/**
 * Wrapper component that connects to a multiplayer room via WebSocket
 * and passes the room context down to GameTable.
 */
export default function MultiplayerGame() {
  const { code } = useParams();
  const navigate = useNavigate();

  const playerId = sessionStorage.getItem(`room_${code}_player_id`);
  const [gameId, setGameId] = useState(null);
  // M22: der Aufbau des Raums. Der Tisch fuehrt seine Herkunft mit und
  // schreibt sie in jeden Spielstand - im Raum ist der "Save"-Knopf sichtbar.
  const [setupId, setSetupId] = useState(null);
  // Must be declared before any early returns (Rules of Hooks)
  const roomRef = React.useRef({});

  useEffect(() => {
    // Fetch room info to get the game ID
    apiFetch(`/api/rooms/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.game_id) setGameId(data.game_id);
        if (data.setup_id) setSetupId(data.setup_id);
      })
      .catch(() => {});
  }, [code]);

  if (!playerId) {
    navigate('/');
    return null;
  }

  if (!gameId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <MultiplayerGameInner code={code} playerId={playerId} gameId={gameId} setupId={setupId} roomRef={roomRef} />;
}

function MultiplayerGameInner({ code, playerId, gameId, setupId, roomRef }) {
  const {
    connected,
    replaced,
    players,
    boardState,
    zones,
    grids,
    hand,
    handVersion,
    remoteCursors,
    myPlayer,
    sendAction,
    sendCursor,
  } = useGameRoom(code, playerId, (msg) => {
    if (roomRef.current?.onAction) {
      roomRef.current.onAction(msg);
    }
  });

  const room = {
    roomCode: code,
    gameId,
    setupId,
    myPlayerId: playerId,
    myColor: myPlayer?.color || null,
    myPlayer,
    players,
    boardState,
    zones,
    grids,
    hand,
    handVersion,
    remoteCursors,
    connected,
    sendAction,
    sendCursor,
    registerActionHandler: (fn) => { roomRef.current.onAction = fn; },
  };

  return (
    <>
      <GameTable room={room} />
      {replaced && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-500 rounded-lg p-6 max-w-sm text-center">
            <p className="text-white text-lg font-semibold mb-4">Dieser Raum ist in einem anderen Tab geöffnet.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded"
            >
              Hier weiterspielen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
