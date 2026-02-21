import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = (code, playerId) => {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname;
  const port = import.meta.env.VITE_SERVER_PORT || '3001';
  return `${proto}://${host}:${port}/ws/rooms/${code}?player_id=${playerId}`;
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const CURSOR_THROTTLE_MS = 33; // ~30fps

/**
 * useGameRoom – manages the WebSocket lifecycle for a multiplayer room.
 *
 * Returns:
 *   { connected, players, boardState, zones, sendAction, sendHandCountUpdate,
 *     remoteCursors, myPlayer }
 */
export function useGameRoom(roomCode, myPlayerId, onMessage) {
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState([]);
  const [boardState, setBoardState] = useState(null);
  const [zones, setZones] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);
  const lastCursorSend = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!roomCode || !myPlayerId) return;
    const url = WS_URL(roomCode, myPlayerId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case 'welcome':
          setBoardState(msg.board_state);
          setPlayers(msg.players || []);
          setZones(msg.zones || []);
          break;
        case 'board_sync':
          setBoardState(msg.board_state);
          break;
        case 'player_joined':
          setPlayers(prev => [...prev.filter(p => p.id !== msg.player.id), msg.player]);
          break;
        case 'player_connected':
          setPlayers(prev => prev.map(p => p.id === msg.player_id ? { ...p, isConnected: true } : p));
          break;
        case 'player_disconnected':
          setPlayers(prev => prev.map(p => p.id === msg.player_id ? { ...p, isConnected: false } : p));
          break;
        case 'player_left':
          setPlayers(prev => prev.filter(p => p.id !== msg.player_id));
          break;
        case 'player_hand_count':
          setPlayers(prev => prev.map(p => p.id === msg.player_id ? { ...p, handCardCount: msg.count } : p));
          break;
        case 'cursor':
          if (msg.player_id !== myPlayerId) {
            setRemoteCursors(prev => ({ ...prev, [msg.player_id]: { x: msg.x, y: msg.y } }));
          }
          break;
        case 'room_started':
          setBoardState(msg.board_state);
          setZones(msg.zones || []);
          break;
        case 'host_changed':
          setPlayers(prev => prev.map(p => ({
            ...p,
            isHost: p.id === msg.new_host_id,
          })));
          break;
      }

      // Forward to GameTable handler for board mutations
      if (onMessageRef.current) {
        onMessageRef.current(msg);
      }
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      setConnected(false);
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }, [roomCode, myPlayerId]);

  function scheduleReconnect() {
    if (!isMounted.current) return;
    clearTimeout(reconnectTimer.current);
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts.current),
      RECONNECT_MAX_MS
    );
    reconnectAttempts.current += 1;
    reconnectTimer.current = setTimeout(() => {
      if (isMounted.current) connect();
    }, delay);
  }

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendAction = useCallback((action) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
    }
  }, []);

  const sendHandCountUpdate = useCallback((count) => {
    sendAction({ type: 'hand_count_update', count });
  }, [sendAction]);

  const sendCursor = useCallback((worldX, worldY) => {
    const now = Date.now();
    if (now - lastCursorSend.current < CURSOR_THROTTLE_MS) return;
    lastCursorSend.current = now;
    sendAction({ type: 'cursor_move', x: worldX, y: worldY });
  }, [sendAction]);

  const myPlayer = players.find(p => p.id === myPlayerId) || null;

  return {
    connected,
    players,
    boardState,
    zones,
    remoteCursors,
    myPlayer,
    sendAction,
    sendHandCountUpdate,
    sendCursor,
  };
}
