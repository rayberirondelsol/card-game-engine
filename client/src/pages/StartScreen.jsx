import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';

export default function StartScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGameDesc, setNewGameDesc] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // game object to delete
  const [deleting, setDeleting] = useState(false);
  const [createRoomTarget, setCreateRoomTarget] = useState(null);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [createRoomSetups, setCreateRoomSetups] = useState([]);

  useEffect(() => {
    fetchGames();
    // Check for deleted game message from navigation state
    if (location.state?.deletedGame) {
      setSuccessMessage(`Game "${location.state.deletedGame}" deleted successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      // Clear location state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, []);

  async function fetchGames() {
    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error('Failed to fetch games');
      const data = await res.json();
      setGames(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createGame(e) {
    e.preventDefault();
    // Validate name field
    if (!newGameName.trim()) {
      setNameError('Game name is required');
      return;
    }
    setNameError(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGameName, description: newGameDesc }),
      });
      if (!res.ok) throw new Error('Failed to create game');
      const created = await res.json();
      setNewGameName('');
      setNewGameDesc('');
      setShowNewGame(false);
      setSuccessMessage(`Game "${created.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchGames();
    } catch (err) {
      setError(err.message);
    }
  }

  function initiateDelete(e, game) {
    e.stopPropagation(); // Prevent navigating to game detail
    setDeleteTarget(game);
  }

  async function handleDeleteGame() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/games/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete game');
      setSuccessMessage(`Game "${deleteTarget.name}" deleted successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setDeleteTarget(null);
      fetchGames();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function openCreateRoom(e, game) {
    e.stopPropagation();
    const res = await fetch(`/api/games/${game.id}/setups`);
    setCreateRoomSetups(res.ok ? await res.json() : []);
    setCreateRoomTarget(game);
  }

  function handleRoomCreated(data) {
    sessionStorage.setItem(`room_${data.room_code}_player_id`, data.player_id);
    sessionStorage.setItem(`room_${data.room_code}_is_host`, 'true');
    navigate(`/rooms/${data.room_code}/lobby`);
  }

  function handleRoomJoined(data) {
    sessionStorage.setItem(`room_${data.room_code}_player_id`, data.player_id);
    sessionStorage.setItem(`room_${data.room_code}_is_host`, 'false');
    navigate(`/rooms/${data.room_code}/lobby`);
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-[var(--color-text)]">
            Card Game Engine
          </h1>
          <button
            onClick={() => setShowJoinRoom(true)}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
          >
            Join Room
          </button>
        </div>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Your virtual tabletop for any card game
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700 ml-4"
            >
              &times;
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-[var(--color-text-secondary)]">Loading games...</div>
        ) : (
          <>
            {games.length === 0 && (
              <div className="text-center py-8 mb-6">
                <p className="text-lg text-[var(--color-text-secondary)] mb-2">
                  No games yet
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Create your first game to get started!
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Create New Game Card */}
              <button
                onClick={() => { setShowNewGame(true); setNameError(null); setNewGameName(''); setNewGameDesc(''); }}
                className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[var(--color-primary)] hover:bg-blue-50/50 transition-colors cursor-pointer min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-light">
                  +
                </div>
                <span className="text-[var(--color-text-secondary)] font-medium">
                  Create New Game
                </span>
              </button>

              {/* Game Cards */}
              {games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => navigate(`/games/${game.id}`)}
                  data-testid={`game-card-${game.id}`}
                  className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 hover:shadow-lg transition-shadow cursor-pointer min-h-[200px] flex flex-col relative"
                >
                  {/* Delete button (shown on hover) */}
                  <button
                    onClick={(e) => initiateDelete(e, game)}
                    data-testid={`delete-game-${game.id}`}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs w-7 h-7 flex items-center justify-center hover:bg-red-600"
                    title="Delete game"
                  >
                    &times;
                  </button>
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                    {game.name}
                  </h3>
                  {game.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] mb-4 flex-1">
                      {game.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {game.card_count || 0} cards
                    </span>
                    <button
                      onClick={(e) => openCreateRoom(e, game)}
                      className="text-xs px-2 py-1 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors"
                    >
                      Multiplayer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* New Game Modal */}
        {showNewGame && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold mb-4">Create New Game</h2>
              <form onSubmit={createGame}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => { setNewGameName(e.target.value); if (nameError) setNameError(null); }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${nameError ? 'border-red-500 focus:ring-red-400' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'}`}
                    placeholder="Enter game name..."
                    autoFocus
                    data-testid="game-name-input"
                  />
                  {nameError && (
                    <p className="text-red-500 text-sm mt-1" data-testid="name-error">{nameError}</p>
                  )}
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newGameDesc}
                    onChange={(e) => setNewGameDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                    rows={3}
                    placeholder="Describe your game..."
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowNewGame(false); setNameError(null); }}
                    data-testid="create-game-cancel"
                    className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="create-game-submit"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    Create Game
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      {/* Delete Game Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-game-modal">
          <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Delete Game</h2>
            <p className="text-[var(--color-text)] mb-2">
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6" data-testid="delete-warning">
              This will permanently delete this game along with all its cards, setups, and saved games. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                data-testid="delete-game-cancel-btn"
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteGame}
                disabled={deleting}
                data-testid="delete-game-confirm-btn"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Game'}
              </button>
            </div>
          </div>
        </div>
      )}
      {createRoomTarget && (
        <CreateRoomModal
          gameId={createRoomTarget.id}
          setups={createRoomSetups}
          onClose={() => setCreateRoomTarget(null)}
          onCreated={handleRoomCreated}
        />
      )}
      {showJoinRoom && (
        <JoinRoomModal
          onClose={() => setShowJoinRoom(false)}
          onJoined={handleRoomJoined}
        />
      )}
      </div>
    </div>
  );
}
