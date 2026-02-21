import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom.js';
import GameTable from './GameTable.jsx';

/**
 * Wrapper component that connects to a multiplayer room via WebSocket
 * and passes the room context down to GameTable.
 */
export default function MultiplayerGame() {
  const { code } = useParams();
  const navigate = useNavigate();

  const playerId = sessionStorage.getItem(`room_${code}_player_id`);
  const [gameId, setGameId] = useState(null);

  useEffect(() => {
    // Fetch room info to get the game ID
    fetch(`/api/rooms/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.game_id) setGameId(data.game_id);
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

  // onMessage is set by GameTable via the room prop's onAction callback
  const roomRef = React.useRef(null);
  if (!roomRef.current) roomRef.current = {};

  return <MultiplayerGameInner code={code} playerId={playerId} gameId={gameId} roomRef={roomRef} />;
}

function MultiplayerGameInner({ code, playerId, gameId, roomRef }) {
  const {
    connected,
    players,
    boardState,
    zones,
    remoteCursors,
    myPlayer,
    sendAction,
    sendHandCountUpdate,
    sendCursor,
  } = useGameRoom(code, playerId, (msg) => {
    if (roomRef.current?.onAction) {
      roomRef.current.onAction(msg);
    }
  });

  const room = {
    roomCode: code,
    gameId,
    myPlayerId: playerId,
    myColor: myPlayer?.color || null,
    myPlayer,
    players,
    boardState,
    zones,
    remoteCursors,
    connected,
    sendAction,
    sendHandCountUpdate,
    sendCursor,
    registerActionHandler: (fn) => { roomRef.current.onAction = fn; },
  };

  return <GameTable room={room} />;
}
