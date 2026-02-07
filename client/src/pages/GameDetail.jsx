import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saves, setSaves] = useState([]);
  const [setups, setSetups] = useState([]);
  const [cards, setCards] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [categories, setCategories] = useState([]);
  const fileInputRef = useRef(null);

  // Edit game state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Delete game state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGame();
    fetchSaves();
    fetchSetups();
    fetchCards();
    fetchCategories();
  }, [id]);

  async function fetchGame() {
    try {
      const res = await fetch(`/api/games/${id}`);
      if (!res.ok) throw new Error('Game not found');
      const data = await res.json();
      setGame(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSaves() {
    try {
      const res = await fetch(`/api/games/${id}/saves`);
      if (res.ok) {
        const data = await res.json();
        setSaves(data);
      }
    } catch (err) {
      // Saves endpoint may not exist yet - that's OK
    }
  }

  async function fetchSetups() {
    try {
      const res = await fetch(`/api/games/${id}/setups`);
      if (res.ok) {
        const data = await res.json();
        setSetups(data);
      }
    } catch (err) {
      // Setups endpoint may not exist yet - that's OK
    }
  }

  async function fetchCards() {
    try {
      const res = await fetch(`/api/games/${id}/cards`);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      // Cards endpoint may not exist yet - that's OK
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/games/${id}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      // Categories endpoint may not exist yet - that's OK
    }
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadMessage(null);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/games/${id}/cards/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          const errData = await res.json();
          console.error('Upload failed for', file.name, errData.error);
        }
      } catch (err) {
        failCount++;
        console.error('Upload error for', file.name, err);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(false);

    if (successCount > 0) {
      setUploadMessage({
        type: 'success',
        text: `Successfully uploaded ${successCount} card${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`
      });
      fetchCards();
    } else {
      setUploadMessage({
        type: 'error',
        text: `Upload failed. Please try again.`
      });
    }

    // Auto-dismiss message
    setTimeout(() => setUploadMessage(null), 5000);
  }

  async function handleDeleteCard(cardId, cardName) {
    if (!confirm(`Delete card "${cardName}"?`)) return;

    try {
      const res = await fetch(`/api/games/${id}/cards/${cardId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCards(cards.filter(c => c.id !== cardId));
        setUploadMessage({ type: 'success', text: `Card "${cardName}" deleted` });
        setTimeout(() => setUploadMessage(null), 3000);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  function openEditModal() {
    setEditName(game.name);
    setEditDesc(game.description || '');
    setShowEditModal(true);
  }

  async function handleEditGame(e) {
    e.preventDefault();
    if (!editName.trim()) return;

    setEditSaving(true);
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update game');
      const updated = await res.json();
      setGame(updated);
      setShowEditModal(false);
      setSuccessMessage('Game updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteGame() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete game');
      // Navigate back to start screen after successful deletion
      navigate('/', { state: { deletedGame: game.name } });
    } catch (err) {
      setError(err.message);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-[var(--color-text-secondary)]">Loading game...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] mb-6 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Games
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Games
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openEditModal}
              data-testid="edit-game-btn"
              className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Edit Game
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              data-testid="delete-game-btn"
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Delete
            </button>
            <button
              onClick={() => navigate(`/games/${id}/play`)}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors font-medium"
            >
              Play Game
            </button>
          </div>
        </div>

        {/* Success Message Toast */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between" data-testid="success-message">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700 ml-4"
            >
              &times;
            </button>
          </div>
        )}

        {/* Game Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2" data-testid="game-name">
            {game.name}
          </h1>
          {game.description && (
            <p className="text-[var(--color-text-secondary)] text-lg" data-testid="game-description">
              {game.description}
            </p>
          )}
        </div>

        {/* Upload Message Toast */}
        {uploadMessage && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between ${
              uploadMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
            data-testid="upload-message"
          >
            <span>{uploadMessage.text}</span>
            <button
              onClick={() => setUploadMessage(null)}
              className="ml-4 text-current opacity-60 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cards Section */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">
                  Cards {cards.length > 0 && <span className="text-sm font-normal text-[var(--color-text-secondary)]">({cards.length})</span>}
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="card-upload-input"
                    data-testid="card-upload-input"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    data-testid="import-cards-btn"
                    className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Import Cards'}
                  </button>
                </div>
              </div>

              {/* Uploading indicator */}
              {uploading && (
                <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg" data-testid="upload-progress">
                  Uploading card image...
                </div>
              )}

              {/* Card Grid */}
              {cards.length === 0 ? (
                <div className="text-[var(--color-text-secondary)] text-center py-8" data-testid="no-cards-message">
                  No cards imported yet. Import cards to get started.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" data-testid="card-grid">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      data-testid={`card-${card.id}`}
                      className="group relative bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
                    >
                      <div className="aspect-[2.5/3.5] overflow-hidden">
                        <img
                          src={card.image_path}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <p
                          className="text-xs text-[var(--color-text)] truncate font-medium"
                          data-testid={`card-name-${card.id}`}
                          title={card.name}
                        >
                          {card.name}
                        </p>
                        {card.category_id && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            {categories.find(c => c.id === card.category_id)?.name || ''}
                          </p>
                        )}
                      </div>
                      {/* Delete button (shown on hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(card.id, card.name);
                        }}
                        data-testid={`delete-card-${card.id}`}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs w-5 h-5 flex items-center justify-center"
                        title="Delete card"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Setups & Saves */}
          <div className="space-y-6">
            {/* Setups */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Setups</h2>
              {setups.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No setups created yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {setups.map((setup) => (
                    <li
                      key={setup.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-[var(--color-text)]">{setup.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Saved Games */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Saved Games</h2>
              {saves.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No saved games yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {saves.map((save) => (
                    <li
                      key={save.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-[var(--color-text)]">{save.name}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {save.is_auto_save ? 'Auto' : 'Manual'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        {/* Edit Game Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-game-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold mb-4">Edit Game</h2>
              <form onSubmit={handleEditGame}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    data-testid="edit-game-name-input"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Enter game name..."
                    autoFocus
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    data-testid="edit-game-desc-input"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                    rows={3}
                    placeholder="Describe your game..."
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    data-testid="edit-game-cancel-btn"
                    className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving || !editName.trim()}
                    data-testid="edit-game-save-btn"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Game Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-game-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold text-red-600 mb-4">Delete Game</h2>
              <p className="text-[var(--color-text)] mb-2">
                Are you sure you want to delete <strong>"{game.name}"</strong>?
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6" data-testid="delete-warning">
                This will permanently delete this game along with all its cards, setups, and saved games. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
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
      </div>
    </div>
  );
}
