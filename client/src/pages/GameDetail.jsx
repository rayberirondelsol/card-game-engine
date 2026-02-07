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
  const [cardBacks, setCardBacks] = useState([]);
  const [uploadingCardBack, setUploadingCardBack] = useState(false);
  const fileInputRef = useRef(null);
  const cardBackInputRef = useRef(null);

  // Edit game state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Delete game state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Category state
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = "All Cards"
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState(null);
  const [categoryError, setCategoryError] = useState('');
  const [creatingSaving, setCreatingSaving] = useState(false);

  // Edit category state
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryError, setEditCategoryError] = useState('');
  const [editCategorySaving, setEditCategorySaving] = useState(false);

  // Delete category state
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [deleteCategoryName, setDeleteCategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState(false);

  // Edit card name state
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingCardName, setEditingCardName] = useState('');
  const [savingCardName, setSavingCardName] = useState(false);
  const editCardNameRef = useRef(null);

  // Expanded categories in tree
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    fetchGame();
    fetchSaves();
    fetchSetups();
    fetchCards();
    fetchCategories();
    fetchCardBacks();
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

  async function fetchCardBacks() {
    try {
      const res = await fetch(`/api/games/${id}/card-backs`);
      if (res.ok) {
        const data = await res.json();
        setCardBacks(data);
      }
    } catch (err) {
      // Card backs endpoint may not exist yet - that's OK
    }
  }

  async function handleCardBackUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingCardBack(true);
    setUploadMessage(null);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/games/${id}/card-backs/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    // Reset file input
    if (cardBackInputRef.current) {
      cardBackInputRef.current.value = '';
    }

    setUploadingCardBack(false);

    if (successCount > 0) {
      setUploadMessage({
        type: 'success',
        text: `Successfully uploaded ${successCount} card back${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`
      });
      fetchCardBacks();
    } else {
      setUploadMessage({
        type: 'error',
        text: 'Card back upload failed. Please try again.'
      });
    }

    setTimeout(() => setUploadMessage(null), 5000);
  }

  async function handleDeleteCardBack(cardBackId, cardBackName) {
    if (!confirm(`Delete card back "${cardBackName}"? Cards using this back will lose their assignment.`)) return;

    try {
      const res = await fetch(`/api/games/${id}/card-backs/${cardBackId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCardBacks(cardBacks.filter(cb => cb.id !== cardBackId));
        fetchCards(); // Refresh cards since assignments may have changed
        setUploadMessage({ type: 'success', text: `Card back "${cardBackName}" deleted` });
        setTimeout(() => setUploadMessage(null), 3000);
      }
    } catch (err) {
      console.error('Delete card back error:', err);
    }
  }

  async function handleAssignCardBack(cardId, cardBackId) {
    try {
      const res = await fetch(`/api/games/${id}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_back_id: cardBackId || null }),
      });
      if (res.ok) {
        fetchCards();
      }
    } catch (err) {
      console.error('Assign card back error:', err);
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

  async function handleAssignCardToCategory(cardId, categoryId) {
    try {
      const res = await fetch(`/api/games/${id}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId || null }),
      });
      if (res.ok) {
        fetchCards();
      }
    } catch (err) {
      console.error('Assign category error:', err);
    }
  }

  function startEditCardName(card) {
    setEditingCardId(card.id);
    setEditingCardName(card.name);
    // Focus the input after render
    setTimeout(() => {
      if (editCardNameRef.current) {
        editCardNameRef.current.focus();
        editCardNameRef.current.select();
      }
    }, 50);
  }

  async function handleSaveCardName(cardId) {
    const trimmedName = editingCardName.trim();
    if (!trimmedName) {
      // Revert to original name
      setEditingCardId(null);
      return;
    }

    setSavingCardName(true);
    try {
      const res = await fetch(`/api/games/${id}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, name: updated.name } : c));
        setUploadMessage({ type: 'success', text: `Card renamed to "${updated.name}"` });
        setTimeout(() => setUploadMessage(null), 3000);
      } else {
        const errData = await res.json();
        console.error('Failed to rename card:', errData.error);
      }
    } catch (err) {
      console.error('Error renaming card:', err);
    } finally {
      setSavingCardName(false);
      setEditingCardId(null);
    }
  }

  function handleCardNameKeyDown(e, cardId) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCardName(cardId);
    } else if (e.key === 'Escape') {
      setEditingCardId(null);
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
      navigate('/', { state: { deletedGame: game.name } });
    } catch (err) {
      setError(err.message);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  // --- Category CRUD ---
  function openCreateCategoryModal(parentId = null) {
    setNewCategoryName('');
    setNewCategoryParentId(parentId);
    setCategoryError('');
    setShowCreateCategoryModal(true);
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setCategoryError('');

    if (!newCategoryName.trim()) {
      setCategoryError('Category name is required');
      return;
    }

    setCreatingSaving(true);
    try {
      const body = { name: newCategoryName.trim() };
      if (newCategoryParentId) {
        body.parent_category_id = newCategoryParentId;
      }

      const res = await fetch(`/api/games/${id}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        setCategoryError(errData.error || 'Failed to create category');
        return;
      }

      const created = await res.json();
      setShowCreateCategoryModal(false);
      fetchCategories();

      // Auto-expand parent if creating subcategory
      if (newCategoryParentId) {
        setExpandedCategories(prev => {
          const next = new Set(prev);
          next.add(newCategoryParentId);
          return next;
        });
      }

      setSuccessMessage(`Category "${created.name}" created`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setCategoryError('Failed to create category');
    } finally {
      setCreatingSaving(false);
    }
  }

  function openEditCategoryModal(cat) {
    setEditCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryError('');
    setShowEditCategoryModal(true);
  }

  async function handleEditCategory(e) {
    e.preventDefault();
    setEditCategoryError('');

    if (!editCategoryName.trim()) {
      setEditCategoryError('Category name cannot be empty');
      return;
    }

    setEditCategorySaving(true);
    try {
      const res = await fetch(`/api/games/${id}/categories/${editCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setEditCategoryError(errData.error || 'Failed to update category');
        return;
      }

      setShowEditCategoryModal(false);
      fetchCategories();
      setSuccessMessage('Category renamed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setEditCategoryError('Failed to update category');
    } finally {
      setEditCategorySaving(false);
    }
  }

  function openDeleteCategoryModal(cat) {
    setDeleteCategoryId(cat.id);
    setDeleteCategoryName(cat.name);
    setShowDeleteCategoryModal(true);
  }

  async function handleDeleteCategory() {
    setDeletingCategory(true);
    try {
      const res = await fetch(`/api/games/${id}/categories/${deleteCategoryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // If the deleted category was selected, go back to all cards
        if (selectedCategoryId === deleteCategoryId) {
          setSelectedCategoryId(null);
        }
        setShowDeleteCategoryModal(false);
        fetchCategories();
        fetchCards(); // Cards may have been reassigned
        setSuccessMessage(`Category "${deleteCategoryName}" deleted`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Delete category error:', err);
    } finally {
      setDeletingCategory(false);
    }
  }

  function toggleCategoryExpand(catId) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }

  // Build tree structure from flat categories list
  function buildCategoryTree(cats, parentId = null) {
    return cats
      .filter(c => c.parent_category_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  // Get all descendant category IDs (for filtering cards)
  function getDescendantIds(catId) {
    const ids = [catId];
    const children = categories.filter(c => c.parent_category_id === catId);
    for (const child of children) {
      ids.push(...getDescendantIds(child.id));
    }
    return ids;
  }

  // Filter cards by selected category (including subcategories)
  const filteredCards = selectedCategoryId
    ? cards.filter(c => {
        const relevantIds = getDescendantIds(selectedCategoryId);
        return relevantIds.includes(c.category_id);
      })
    : cards;

  // Count cards per category
  function countCardsInCategory(catId) {
    const ids = getDescendantIds(catId);
    return cards.filter(c => ids.includes(c.category_id)).length;
  }

  // Render category tree item
  function renderCategoryItem(cat, depth = 0) {
    const children = buildCategoryTree(categories, cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const isSelected = selectedCategoryId === cat.id;
    const cardCount = countCardsInCategory(cat.id);

    return (
      <div key={cat.id} data-testid={`category-${cat.id}`}>
        <div
          className={`flex items-center group py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[var(--color-primary)] text-white'
              : 'hover:bg-gray-100 text-[var(--color-text)]'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => setSelectedCategoryId(cat.id)}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryExpand(cat.id);
              }}
              className={`mr-1 w-4 h-4 flex items-center justify-center text-xs flex-shrink-0 ${
                isSelected ? 'text-white/80' : 'text-[var(--color-text-secondary)]'
              }`}
              data-testid={`category-toggle-${cat.id}`}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="mr-1 w-4 h-4 flex-shrink-0" />
          )}

          {/* Folder icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 flex-shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>

          {/* Category name */}
          <span className="text-sm truncate flex-1" data-testid={`category-name-${cat.id}`} title={cat.name}>
            {cat.name}
          </span>

          {/* Card count badge */}
          {cardCount > 0 && (
            <span className={`text-xs ml-1 flex-shrink-0 ${
              isSelected ? 'text-white/70' : 'text-[var(--color-text-secondary)]'
            }`}>
              {cardCount}
            </span>
          )}

          {/* Action buttons (visible on hover) */}
          <div className={`flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${
            isSelected ? '' : ''
          }`}>
            {/* Add subcategory */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openCreateCategoryModal(cat.id);
              }}
              className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-[var(--color-text-secondary)]'
              }`}
              title="Add subcategory"
              data-testid={`add-subcategory-${cat.id}`}
            >
              +
            </button>
            {/* Edit category */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditCategoryModal(cat);
              }}
              className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-[var(--color-text-secondary)]'
              }`}
              title="Edit category"
              data-testid={`edit-category-${cat.id}`}
            >
              ✎
            </button>
            {/* Delete category */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDeleteCategoryModal(cat);
              }}
              className={`w-5 h-5 flex items-center justify-center rounded text-xs ${
                isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-red-100 text-red-500'
              }`}
              title="Delete category"
              data-testid={`delete-category-${cat.id}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div data-testid={`category-children-${cat.id}`}>
            {children.map(child => renderCategoryItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-[var(--color-text-secondary)]">Loading game...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-8">
        <div className="max-w-7xl mx-auto">
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

  const rootCategories = buildCategoryTree(categories, null);

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-7xl mx-auto">
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

        {/* Main Content Grid: Sidebar + Cards + Right Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4" data-testid="categories-sidebar">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Categories</h2>
                <button
                  onClick={() => openCreateCategoryModal(null)}
                  data-testid="create-category-btn"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--color-primary)] text-white text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
                  title="Create category"
                >
                  +
                </button>
              </div>

              {/* All Cards item */}
              <div
                className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors mb-1 ${
                  selectedCategoryId === null
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-gray-100 text-[var(--color-text)]'
                }`}
                onClick={() => setSelectedCategoryId(null)}
                data-testid="all-cards-filter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span className="text-sm flex-1">All Cards</span>
                <span className={`text-xs ${selectedCategoryId === null ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>
                  {cards.length}
                </span>
              </div>

              {/* Uncategorized */}
              <div
                className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors mb-1 ${
                  selectedCategoryId === 'uncategorized'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-gray-100 text-[var(--color-text)]'
                }`}
                onClick={() => setSelectedCategoryId('uncategorized')}
                data-testid="uncategorized-filter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                <span className="text-sm flex-1">Uncategorized</span>
                <span className={`text-xs ${selectedCategoryId === 'uncategorized' ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>
                  {cards.filter(c => !c.category_id).length}
                </span>
              </div>

              {/* Category tree */}
              {rootCategories.length > 0 && (
                <div className="mt-1 border-t border-[var(--color-border)] pt-1" data-testid="category-tree">
                  {rootCategories.map(cat => renderCategoryItem(cat, 0))}
                </div>
              )}

              {categories.length === 0 && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-2 text-center" data-testid="no-categories-message">
                  No categories yet
                </p>
              )}
            </div>
          </div>

          {/* Cards Section */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">
                  {selectedCategoryId === null
                    ? 'All Cards'
                    : selectedCategoryId === 'uncategorized'
                    ? 'Uncategorized'
                    : categories.find(c => c.id === selectedCategoryId)?.name || 'Cards'}
                  {' '}
                  {(selectedCategoryId === 'uncategorized'
                    ? cards.filter(c => !c.category_id).length
                    : filteredCards.length) > 0 && (
                    <span className="text-sm font-normal text-[var(--color-text-secondary)]">
                      ({selectedCategoryId === 'uncategorized'
                        ? cards.filter(c => !c.category_id).length
                        : filteredCards.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
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
              {(() => {
                const displayCards = selectedCategoryId === 'uncategorized'
                  ? cards.filter(c => !c.category_id)
                  : filteredCards;

                return displayCards.length === 0 ? (
                  <div className="text-[var(--color-text-secondary)] text-center py-8" data-testid="no-cards-message">
                    {cards.length === 0
                      ? 'No cards imported yet. Import cards to get started.'
                      : selectedCategoryId === 'uncategorized'
                      ? 'No uncategorized cards.'
                      : 'No cards in this category.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4" data-testid="card-grid">
                    {displayCards.map((card) => (
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
                          {editingCardId === card.id ? (
                            <input
                              ref={editCardNameRef}
                              type="text"
                              value={editingCardName}
                              onChange={(e) => setEditingCardName(e.target.value)}
                              onKeyDown={(e) => handleCardNameKeyDown(e, card.id)}
                              onBlur={() => handleSaveCardName(card.id)}
                              disabled={savingCardName}
                              data-testid={`card-name-input-${card.id}`}
                              className="w-full text-xs text-[var(--color-text)] font-medium border border-[var(--color-primary)] rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                          ) : (
                            <div className="flex items-center gap-1 group/name">
                              <p
                                className="text-xs text-[var(--color-text)] truncate font-medium flex-1 cursor-pointer hover:text-[var(--color-primary)]"
                                data-testid={`card-name-${card.id}`}
                                title={`${card.name} (click to edit)`}
                                onClick={() => startEditCardName(card)}
                              >
                                {card.name}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditCardName(card);
                                }}
                                data-testid={`edit-card-name-${card.id}`}
                                className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[var(--color-text-secondary)] opacity-0 group-hover/name:opacity-100 hover:text-[var(--color-primary)] transition-opacity"
                                title="Edit card name"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            </div>
                          )}
                          {/* Category assignment dropdown */}
                          <select
                            value={card.category_id || ''}
                            onChange={(e) => handleAssignCardToCategory(card.id, e.target.value || null)}
                            className="mt-1 w-full text-xs border border-[var(--color-border)] rounded px-1 py-0.5 bg-white text-[var(--color-text)]"
                            data-testid={`card-category-select-${card.id}`}
                          >
                            <option value="">Uncategorized</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.parent_category_id
                                  ? `${categories.find(p => p.id === cat.parent_category_id)?.name || ''} / ${cat.name}`
                                  : cat.name}
                              </option>
                            ))}
                          </select>
                          {/* Card back assignment dropdown */}
                          {cardBacks.length > 0 && (
                            <select
                              value={card.card_back_id || ''}
                              onChange={(e) => handleAssignCardBack(card.id, e.target.value || null)}
                              className="mt-1 w-full text-xs border border-[var(--color-border)] rounded px-1 py-0.5 bg-white text-[var(--color-text)]"
                              data-testid={`card-back-select-${card.id}`}
                            >
                              <option value="">No card back</option>
                              {cardBacks.map(cb => (
                                <option key={cb.id} value={cb.id}>
                                  {cb.name}
                                </option>
                              ))}
                            </select>
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
                );
              })()}
            </div>
          </div>

          {/* Right Sidebar - Card Backs, Setups & Saves */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card Backs */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4" data-testid="card-backs-section">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Card Backs</h2>
                <div>
                  <input
                    ref={cardBackInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleCardBackUpload}
                    className="hidden"
                    id="card-back-upload-input"
                    data-testid="card-back-upload-input"
                  />
                  <button
                    onClick={() => cardBackInputRef.current?.click()}
                    disabled={uploadingCardBack}
                    data-testid="upload-card-back-btn"
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--color-primary)] text-white text-sm hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                    title="Upload card back"
                  >
                    +
                  </button>
                </div>
              </div>

              {uploadingCardBack && (
                <div className="mb-2 px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs" data-testid="card-back-upload-progress">
                  Uploading card back...
                </div>
              )}

              {cardBacks.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]" data-testid="no-card-backs-message">
                  No card backs uploaded yet.
                </p>
              ) : (
                <ul className="space-y-2" data-testid="card-backs-list">
                  {cardBacks.map((cb) => (
                    <li
                      key={cb.id}
                      data-testid={`card-back-${cb.id}`}
                      className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-[var(--color-border)]"
                    >
                      <div className="w-10 h-14 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={cb.image_path}
                          alt={cb.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text)] truncate flex-1" data-testid={`card-back-name-${cb.id}`} title={cb.name}>
                        {cb.name}
                      </span>
                      <button
                        onClick={() => handleDeleteCardBack(cb.id, cb.name)}
                        data-testid={`delete-card-back-${cb.id}`}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all text-xs"
                        title="Delete card back"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Setups */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4" data-testid="setups-section">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Setups</h2>
                <button
                  onClick={() => navigate(`/games/${id}/play?mode=setup`)}
                  data-testid="create-setup-btn"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--color-primary)] text-white text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
                  title="Create new setup"
                >
                  +
                </button>
              </div>
              {setups.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]" data-testid="no-setups-message">
                  No setups created yet. Create a setup to define a starting state for your game.
                </p>
              ) : (
                <ul className="space-y-1" data-testid="setups-list">
                  {setups.map((setup) => (
                    <li
                      key={setup.id}
                      data-testid={`setup-item-${setup.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-[var(--color-text)] block truncate" data-testid={`setup-name-${setup.id}`}>{setup.name}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {new Date(setup.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => navigate(`/games/${id}/play?setupId=${setup.id}`)}
                          data-testid={`setup-load-btn-${setup.id}`}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                          title="Load this setup"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => navigate(`/games/${id}/play?mode=setup&editSetupId=${setup.id}`)}
                          data-testid={`setup-edit-btn-${setup.id}`}
                          className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-500 transition-colors"
                          title="Edit this setup"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete setup "${setup.name}"?`)) return;
                            try {
                              const res = await fetch(`/api/games/${id}/setups/${setup.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                setSetups(prev => prev.filter(s => s.id !== setup.id));
                                setSuccessMessage(`Setup "${setup.name}" deleted`);
                                setTimeout(() => setSuccessMessage(null), 3000);
                              }
                            } catch (err) { console.error('Delete setup failed:', err); }
                          }}
                          data-testid={`setup-delete-btn-${setup.id}`}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                          title="Delete this setup"
                        >
                          &times;
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Saved Games */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide mb-3">Saved Games</h2>
              {saves.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  No saved games yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {saves.map((save) => (
                    <li
                      key={save.id}
                      data-testid={`save-item-${save.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-[var(--color-text)] block truncate">{save.name}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {save.is_auto_save ? 'Auto' : 'Manual'} · {new Date(save.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => navigate(`/games/${id}/play?saveId=${save.id}`)}
                          data-testid={`save-load-btn-${save.id}`}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete save "${save.name}"?`)) return;
                            try {
                              const res = await fetch(`/api/games/${id}/saves/${save.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                setSaves(prev => prev.filter(s => s.id !== save.id));
                              }
                            } catch (err) { console.error('Delete save failed:', err); }
                          }}
                          data-testid={`save-delete-btn-${save.id}`}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </div>
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

        {/* Create Category Modal */}
        {showCreateCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="create-category-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold mb-4">
                {newCategoryParentId
                  ? `Create Subcategory in "${categories.find(c => c.id === newCategoryParentId)?.name || ''}"`
                  : 'Create Category'}
              </h2>
              <form onSubmit={handleCreateCategory}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setCategoryError('');
                    }}
                    data-testid="category-name-input"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      categoryError ? 'border-red-300' : 'border-[var(--color-border)]'
                    }`}
                    placeholder="Enter category name..."
                    autoFocus
                  />
                  {categoryError && (
                    <p className="mt-1 text-sm text-red-600" data-testid="category-name-error">
                      {categoryError}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateCategoryModal(false)}
                    data-testid="create-category-cancel-btn"
                    className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSaving}
                    data-testid="create-category-submit-btn"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingSaving ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {showEditCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="edit-category-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold mb-4">Edit Category</h2>
              <form onSubmit={handleEditCategory}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => {
                      setEditCategoryName(e.target.value);
                      setEditCategoryError('');
                    }}
                    data-testid="edit-category-name-input"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      editCategoryError ? 'border-red-300' : 'border-[var(--color-border)]'
                    }`}
                    placeholder="Enter category name..."
                    autoFocus
                  />
                  {editCategoryError && (
                    <p className="mt-1 text-sm text-red-600" data-testid="edit-category-name-error">
                      {editCategoryError}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditCategoryModal(false)}
                    data-testid="edit-category-cancel-btn"
                    className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editCategorySaving}
                    data-testid="edit-category-save-btn"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editCategorySaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Category Confirmation Modal */}
        {showDeleteCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="delete-category-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-semibold text-red-600 mb-4">Delete Category</h2>
              <p className="text-[var(--color-text)] mb-2">
                Are you sure you want to delete the category <strong>"{deleteCategoryName}"</strong>?
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Cards in this category will become uncategorized. Subcategories will be moved to the root level.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteCategoryModal(false)}
                  data-testid="delete-category-cancel-btn"
                  className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={deletingCategory}
                  data-testid="delete-category-confirm-btn"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingCategory ? 'Deleting...' : 'Delete Category'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
