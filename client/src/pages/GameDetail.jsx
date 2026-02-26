import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import CameraCardScanner from '../components/CameraCardScanner';
import { isTouchDevice } from '../utils/touchUtils';

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

  // Card rotation state
  const [rotatingCardId, setRotatingCardId] = useState(null);

  // TTS Import state
  const [showTtsImportModal, setShowTtsImportModal] = useState(false);
  const [ttsAnalyzing, setTtsAnalyzing] = useState(false);
  const [ttsAnalysis, setTtsAnalysis] = useState(null);
  const [ttsImporting, setTtsImporting] = useState(false);
  const [ttsSelectedDecks, setTtsSelectedDecks] = useState(new Set());
  const [ttsSelectedTokens, setTtsSelectedTokens] = useState(new Set());
  const [ttsSelectedBoards, setTtsSelectedBoards] = useState(new Set());
  const [ttsSelectedDice, setTtsSelectedDice] = useState(new Set());
  const [ttsCreateCategories, setTtsCreateCategories] = useState(true);
  const [ttsOcrNamePosition, setTtsOcrNamePosition] = useState('none');
  const [ttsRotateCards, setTtsRotateCards] = useState('none');
  const [ocrRenamePosition, setOcrRenamePosition] = useState('top');
  const [ocrRenaming, setOcrRenaming] = useState(false);
  const [ttsError, setTtsError] = useState('');
  const [ttsImportProgress, setTtsImportProgress] = useState('');
  const ttsFileInputRef = useRef(null);

  // Card Split Import state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitAnalyzing, setSplitAnalyzing] = useState(false);
  const [splitAnalysis, setSplitAnalysis] = useState(null);
  const [splitImporting, setSplitImporting] = useState(false);
  const [splitError, setSplitError] = useState('');
  const [splitSelectedGrid, setSplitSelectedGrid] = useState(null);
  const [splitCustomCols, setSplitCustomCols] = useState(2);
  const [splitCustomRows, setSplitCustomRows] = useState(2);
  const [splitUseCustom, setSplitUseCustom] = useState(false);
  const [splitCardPrefix, setSplitCardPrefix] = useState('Card');
  const [splitCategoryId, setSplitCategoryId] = useState('');
  const splitFileInputRef = useRef(null);

  // Expanded categories in tree
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Multiplayer modal state
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);

  // Camera card scanner state
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const isTouchDev = typeof window !== 'undefined' && isTouchDevice();

  // Table assets (tokens & boards from TTS import)
  const [tableAssets, setTableAssets] = useState([]);

  // Custom dice from TTS import
  const [customDice, setCustomDice] = useState([]);

  // Card sort order
  const [cardSortOrder, setCardSortOrder] = useState('name');

  useEffect(() => {
    fetchGame();
    fetchSaves();
    fetchSetups();
    fetchCards();
    fetchCategories();
    fetchCardBacks();
    fetchTableAssets();
    fetchCustomDice();
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

  async function fetchTableAssets() {
    try {
      const res = await fetch(`/api/games/${id}/table-assets`);
      if (res.ok) {
        const data = await res.json();
        setTableAssets(data);
      }
    } catch (err) {
      // Table assets endpoint may not exist yet - that's OK
    }
  }

  async function handleDeleteTableAsset(assetId, name) {
    if (!confirm(`"${name || 'Asset'}" löschen?`)) return;
    const res = await fetch(`/api/games/${id}/table-assets/${assetId}`, { method: 'DELETE' });
    if (res.ok) {
      setTableAssets(prev => prev.filter(a => a.id !== assetId));
    }
  }

  async function fetchCustomDice() {
    try {
      const res = await fetch(`/api/games/${id}/custom-dice`);
      if (res.ok) setCustomDice(await res.json());
    } catch (err) {}
  }

  async function handleDeleteCustomDie(dieId, name) {
    if (!confirm(`"${name || 'Würfel'}" löschen?`)) return;
    const res = await fetch(`/api/games/${id}/custom-dice/${dieId}`, { method: 'DELETE' });
    if (res.ok) setCustomDice(prev => prev.filter(d => d.id !== dieId));
  }

  async function handleRenameCustomDie(dieId, newName) {
    if (!newName.trim()) return;
    const res = await fetch(`/api/games/${id}/custom-dice/${dieId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCustomDice(prev => prev.map(d => d.id === dieId ? updated : d));
    }
  }

  async function handleUpdateTableAsset(assetId, fields) {
    const res = await fetch(`/api/games/${id}/table-assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json();
      setTableAssets(prev => prev.map(a => a.id === assetId ? updated : a));
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

    let totalCardsCreated = 0;
    let filesProcessed = 0;
    let failCount = 0;
    const autoSplitResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        // Use auto-import endpoint that detects and splits multi-card images automatically
        const res = await fetch(`/api/games/${id}/cards/auto-import`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          filesProcessed++;
          totalCardsCreated += data.totalCreated || 1;
          if (data.autoSplit) {
            autoSplitResults.push({
              filename: data.originalFilename,
              grid: data.detectedGrid,
              cardsCreated: data.totalCreated,
            });
          }
        } else {
          failCount++;
          const errData = await res.json();
          // Fallback: try old upload endpoint if auto-import fails
          const fallbackRes = await fetch(`/api/games/${id}/cards/upload`, {
            method: 'POST',
            body: (() => { const fd = new FormData(); fd.append('file', file); return fd; })(),
          });
          if (fallbackRes.ok) {
            filesProcessed++;
            totalCardsCreated += 1;
            failCount--; // Undo the fail count since fallback succeeded
          }
        }
      } catch (err) {
        failCount++;
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(false);

    if (totalCardsCreated > 0) {
      let messageText = '';
      if (autoSplitResults.length > 0) {
        const splitSummary = autoSplitResults.map(r =>
          `"${r.filename}" → ${r.grid.cols}×${r.grid.rows} grid (${r.grid.cardType}), ${r.cardsCreated} cards`
        ).join('; ');
        messageText = `Auto-detected and split: ${splitSummary}. Total: ${totalCardsCreated} card${totalCardsCreated > 1 ? 's' : ''} created.`;
      } else {
        messageText = `Successfully imported ${totalCardsCreated} card${totalCardsCreated > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`;
      }
      setUploadMessage({ type: 'success', text: messageText });
      fetchCards();
    } else {
      setUploadMessage({
        type: 'error',
        text: `Upload failed. Please try again.`
      });
    }

    // Auto-dismiss message (longer for auto-split results)
    setTimeout(() => setUploadMessage(null), autoSplitResults.length > 0 ? 10000 : 5000);
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

  // --- Card Rotation ---
  async function handleRotateCard(cardId, degrees) {
    if (rotatingCardId) return;
    setRotatingCardId(cardId);
    try {
      const res = await fetch(`/api/games/${id}/cards/${cardId}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degrees }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Rotation failed');
      } else {
        fetchCards();
      }
    } catch (err) {
      alert('Rotation failed: ' + err.message);
    } finally {
      setRotatingCardId(null);
    }
  }

  // --- TTS Import ---
  async function handleOcrRename() {
    if (ocrRenaming) return;
    setOcrRenaming(true);
    try {
      const res = await fetch(`/api/games/${id}/ocr-rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrNamePosition: ocrRenamePosition,
          categoryId: selectedCategoryId === 'uncategorized' ? 'uncategorized' : selectedCategoryId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'OCR rename failed');
      } else {
        alert(data.message);
        fetchCards();
      }
    } catch (err) {
      alert('OCR rename failed: ' + err.message);
    } finally {
      setOcrRenaming(false);
    }
  }

  function openTtsImportModal() {
    setShowTtsImportModal(true);
    setTtsAnalysis(null);
    setTtsError('');
    setTtsImporting(false);
    setTtsImportProgress('');
    setTtsSelectedDecks(new Set());
    setTtsSelectedTokens(new Set());
    setTtsSelectedBoards(new Set());
    setTtsCreateCategories(true);
    setTtsOcrNamePosition('none');
    setTtsRotateCards('none');
  }

  async function handleTtsFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setTtsAnalysis(null);
    setTtsError('');
    setTtsAnalyzing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/games/${id}/tts-import/analyze`, {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setTtsError('Server returned an unexpected response. Please ensure the server is running.');
        setTtsAnalyzing(false);
        return;
      }

      if (!res.ok) {
        setTtsError(data.error || 'Failed to analyze TTS file');
        setTtsAnalyzing(false);
        return;
      }

      setTtsAnalysis(data);
      // Select all assets by default
      const allIndices = new Set(data.decks.map(d => d.index));
      setTtsSelectedDecks(allIndices);
      setTtsSelectedTokens(new Set((data.tokens || []).map(t => t.index)));
      setTtsSelectedBoards(new Set((data.boards || []).map(b => b.index)));
      setTtsSelectedDice(new Set((data.dice || []).map(d => d.index)));
    } catch (err) {
      setTtsError('Failed to upload file: ' + err.message);
    } finally {
      setTtsAnalyzing(false);
      // Reset file input
      if (ttsFileInputRef.current) {
        ttsFileInputRef.current.value = '';
      }
    }
  }

  function toggleTtsDeckSelection(deckIndex) {
    setTtsSelectedDecks(prev => {
      const next = new Set(prev);
      if (next.has(deckIndex)) {
        next.delete(deckIndex);
      } else {
        next.add(deckIndex);
      }
      return next;
    });
  }

  function selectAllTtsDecks() {
    if (!ttsAnalysis) return;
    const allIndices = new Set(ttsAnalysis.decks.map(d => d.index));
    setTtsSelectedDecks(allIndices);
  }

  function deselectAllTtsDecks() {
    setTtsSelectedDecks(new Set());
  }

  function toggleTtsTokenSelection(tokenIndex) {
    setTtsSelectedTokens(prev => {
      const next = new Set(prev);
      if (next.has(tokenIndex)) {
        next.delete(tokenIndex);
      } else {
        next.add(tokenIndex);
      }
      return next;
    });
  }

  function toggleTtsBoardSelection(boardIndex) {
    setTtsSelectedBoards(prev => {
      const next = new Set(prev);
      if (next.has(boardIndex)) {
        next.delete(boardIndex);
      } else {
        next.add(boardIndex);
      }
      return next;
    });
  }

  async function handleTtsImport() {
    const hasNonCardAssets = ttsAnalysis && (ttsSelectedTokens.size > 0 || ttsSelectedBoards.size > 0);
    if (!ttsAnalysis || (ttsSelectedDecks.size === 0 && !hasNonCardAssets)) return;

    setTtsImporting(true);
    setTtsImportProgress('Downloading and processing card images...');
    setTtsError('');

    try {
      const res = await fetch(`/api/games/${id}/tts-import/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempId: ttsAnalysis.tempId,
          selectedDeckIndices: Array.from(ttsSelectedDecks),
          selectedTokenIndices: Array.from(ttsSelectedTokens),
          selectedBoardIndices: Array.from(ttsSelectedBoards),
          selectedDiceIndices: Array.from(ttsSelectedDice),
          createCategories: ttsCreateCategories,
          ocrNamePosition: ttsOcrNamePosition !== 'none' ? ttsOcrNamePosition : undefined,
          rotateCards: ttsRotateCards !== 'none' ? (ttsRotateCards === 'auto' ? 'auto' : parseInt(ttsRotateCards)) : undefined,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setTtsError('Import failed: Server returned an unexpected response.');
        return;
      }

      if (!res.ok) {
        setTtsError(data.error || 'Import failed');
        setTtsImporting(false);
        setTtsImportProgress('');
        return;
      }

      // Success
      setShowTtsImportModal(false);

      // Refresh custom dice list if any were imported
      if (data.customDice && data.customDice.length > 0) {
        fetchCustomDice();
      }

      // If tokens or boards were imported, auto-create a save so they appear on the table
      if ((data.tokens && data.tokens.length > 0) || (data.boards && data.boards.length > 0)) {
        try {
          const saveName = `TTS Assets (${new Date().toLocaleDateString()})`;
          const stateData = {
            tokens: data.tokens || [],
            boards: data.boards || [],
          };
          await fetch(`/api/games/${id}/saves`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: saveName, state_data: stateData }),
          });
        } catch (_) {
          // Not critical if save creation fails
        }
      }

      setUploadMessage({
        type: 'success',
        text: data.message || `Imported ${data.totalImported} cards`,
      });
      setTimeout(() => setUploadMessage(null), 8000);

      // Refresh cards and categories
      fetchCards();
      fetchCategories();
      fetchCardBacks();
    } catch (err) {
      setTtsError('Import failed: ' + err.message);
    } finally {
      setTtsImporting(false);
      setTtsImportProgress('');
    }
  }

  // --- Card Split Import ---
  function openSplitImportModal() {
    setShowSplitModal(true);
    setSplitAnalysis(null);
    setSplitError('');
    setSplitImporting(false);
    setSplitSelectedGrid(null);
    setSplitUseCustom(false);
    setSplitCustomCols(2);
    setSplitCustomRows(2);
    setSplitCardPrefix('Card');
    setSplitCategoryId('');
  }

  async function handleSplitFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSplitAnalysis(null);
    setSplitError('');
    setSplitAnalyzing(true);
    setSplitSelectedGrid(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/games/${id}/cards/analyze-split`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setSplitError(data.error || 'Failed to analyze image');
        setSplitAnalyzing(false);
        return;
      }

      setSplitAnalysis(data);
      // Auto-select best suggestion if available
      if (data.suggestions && data.suggestions.length > 0) {
        setSplitSelectedGrid(data.suggestions[0]);
        setSplitCardPrefix(data.filename.replace(/\.[^.]+$/, '') || 'Card');
      }
    } catch (err) {
      setSplitError('Failed to upload file: ' + err.message);
    } finally {
      setSplitAnalyzing(false);
      if (splitFileInputRef.current) {
        splitFileInputRef.current.value = '';
      }
    }
  }

  async function handleSplitExecute() {
    if (!splitAnalysis) return;

    const cols = splitUseCustom ? parseInt(splitCustomCols) : splitSelectedGrid?.cols;
    const rows = splitUseCustom ? parseInt(splitCustomRows) : splitSelectedGrid?.rows;

    if (!cols || !rows || cols < 1 || rows < 1) {
      setSplitError('Please select or specify a valid grid layout.');
      return;
    }

    setSplitImporting(true);
    setSplitError('');

    try {
      const res = await fetch(`/api/games/${id}/cards/execute-split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempId: splitAnalysis.tempId,
          cols,
          rows,
          cardNamePrefix: splitCardPrefix || 'Card',
          categoryId: splitCategoryId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSplitError(data.error || 'Split failed');
        setSplitImporting(false);
        return;
      }

      // Success
      setShowSplitModal(false);
      setUploadMessage({
        type: 'success',
        text: data.message || `Split into ${data.totalCreated} cards`,
      });
      setTimeout(() => setUploadMessage(null), 8000);

      // Refresh cards and categories
      fetchCards();
      fetchCategories();
    } catch (err) {
      setSplitError('Split failed: ' + err.message);
    } finally {
      setSplitImporting(false);
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
    <>
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
            <div className="relative">
              <button
                onClick={() => setShowMultiplayerMenu(v => !v)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
              >
                Multiplayer
              </button>
              {showMultiplayerMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { setShowMultiplayerMenu(false); setShowCreateRoomModal(true); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-gray-100 transition-colors"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => { setShowMultiplayerMenu(false); setShowJoinRoomModal(true); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-gray-100 transition-colors"
                  >
                    Join Room
                  </button>
                </div>
              )}
            </div>
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
                  {/* Hidden file inputs */}
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
                  <input
                    ref={splitFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleSplitFileSelect}
                    className="hidden"
                    id="split-upload-input"
                    data-testid="split-upload-input"
                  />

                  {/* Import Options Dropdown */}
                  <div className="relative group">
                    <select
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'auto') {
                          fileInputRef.current?.click();
                        } else if (value === 'split') {
                          openSplitImportModal();
                        } else if (value === 'tts') {
                          openTtsImportModal();
                        } else if (value === 'ocr') {
                          handleOcrRename();
                        } else if (value === 'camera') {
                          setShowCameraScanner(true);
                        }
                        // Reset selection after action
                        e.target.value = '';
                      }}
                      disabled={uploading || ocrRenaming}
                      className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
                      data-testid="import-dropdown"
                    >
                      <option value="">Karten importieren...</option>
                      <option value="auto">🔄 Bilder hochladen (einzeln oder Spritesheet)</option>
                      <option value="split">✂️ Spritesheet manuell aufteilen</option>
                      <option value="tts">🎲 Tabletop Simulator (.json)</option>
                      <option value="ocr">🔤 Kartenname per OCR erkennen</option>
                      {isTouchDev && (
                        <option value="camera">📷 Kamera-Scan (Android)</option>
                      )}
                    </select>
                  </div>

                  {/* OCR Position Selector (shown when needed) */}
                  {ocrRenaming && (
                    <select
                      value={ocrRenamePosition}
                      onChange={(e) => setOcrRenamePosition(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-[var(--color-text)]"
                      data-testid="ocr-rename-position"
                      title="Select where to look for card names: top, center, or bottom of the card"
                    >
                      <option value="top">OCR: Top</option>
                      <option value="center">OCR: Center</option>
                      <option value="bottom">OCR: Bottom</option>
                    </select>
                  )}

                  {/* Sort Toggle */}
                  <select
                    value={cardSortOrder}
                    onChange={(e) => setCardSortOrder(e.target.value)}
                    className="text-sm border border-[var(--color-border)] rounded-lg px-2 py-2 bg-[var(--color-surface)] text-[var(--color-text)]"
                    data-testid="card-sort-select"
                    title="Sort cards"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="date-desc">Sort: Newest</option>
                    <option value="date-asc">Sort: Oldest</option>
                  </select>
                </div>
              </div>

              {/* Uploading indicator */}
              {uploading && (
                <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg flex items-center gap-2" data-testid="upload-progress">
                  <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Analyzing images for multi-card detection and importing...</span>
                </div>
              )}

              {/* Card Grid */}
              {(() => {
                let displayCards = selectedCategoryId === 'uncategorized'
                  ? cards.filter(c => !c.category_id)
                  : filteredCards;

                if (cardSortOrder === 'date-desc') {
                  displayCards = [...displayCards].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                } else if (cardSortOrder === 'date-asc') {
                  displayCards = [...displayCards].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                } else {
                  displayCards = [...displayCards].sort((a, b) => a.name.localeCompare(b.name));
                }

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
                        <div
                          className="overflow-hidden"
                          style={{ aspectRatio: (card.width > 0 && card.height > 0) ? `${card.width}/${card.height}` : '2.5/3.5' }}
                        >
                          <img
                            src={card.image_path}
                            alt={card.name}
                            className="w-full h-full object-contain"
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
                          {card.created_at && (
                            <p className="text-[10px] text-[var(--color-text-secondary)] truncate mt-0.5">
                              {new Date(card.created_at).toLocaleDateString()}
                            </p>
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
                        {/* Rotate buttons (shown on hover) */}
                        <div className="absolute top-1 left-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotateCard(card.id, -90);
                            }}
                            disabled={rotatingCardId === card.id}
                            data-testid={`rotate-ccw-card-${card.id}`}
                            className="p-1 bg-blue-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center disabled:opacity-50"
                            title="Rotate 90° counter-clockwise"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                              <path d="M3 3v5h5"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotateCard(card.id, 90);
                            }}
                            disabled={rotatingCardId === card.id}
                            data-testid={`rotate-cw-card-${card.id}`}
                            className="p-1 bg-blue-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center disabled:opacity-50"
                            title="Rotate 90° clockwise"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                              <path d="M21 3v5h-5"/>
                            </svg>
                          </button>
                        </div>
                        {/* Delete button (always visible on touch, hover on desktop) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id, card.name);
                          }}
                          data-testid={`delete-card-${card.id}`}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-60 hover:opacity-100 transition-opacity text-xs w-5 h-5 flex items-center justify-center"
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
                      <input
                        type="text"
                        defaultValue={cb.name}
                        onBlur={async (e) => {
                          const newName = e.target.value.trim();
                          if (!newName || newName === cb.name) return;
                          const res = await fetch(`/api/games/${id}/card-backs/${cb.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName }),
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setCardBacks(prev => prev.map(c => c.id === cb.id ? updated : c));
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.value = cb.name; e.target.blur(); } }}
                        data-testid={`card-back-name-${cb.id}`}
                        className="text-xs text-[var(--color-text)] flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none px-0.5 py-0.5 truncate"
                        title="Klicken zum Umbenennen"
                      />
                      <button
                        onClick={() => handleDeleteCardBack(cb.id, cb.name)}
                        data-testid={`delete-card-back-${cb.id}`}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-red-400 opacity-60 hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all text-xs"
                        title="Delete card back"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tokens & Boards */}
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4" data-testid="table-assets-section">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Tokens &amp; Boards</h2>
              </div>

              {tableAssets.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]" data-testid="no-table-assets-message">
                  Noch keine Tokens oder Boards importiert.
                </p>
              ) : (
                <div className="space-y-3" data-testid="table-assets-list">
                  {tableAssets.map((asset) => {
                    const isToken = asset.type === 'token';
                    const cardRef = 100; // CARD_WIDTH in GameTable
                    const sizeVal = asset.width || 60;
                    const sizeRatio = (sizeVal / cardRef).toFixed(1);
                    return (
                      <div
                        key={asset.id}
                        data-testid={`table-asset-${asset.id}`}
                        className="rounded-lg border border-[var(--color-border)] p-2 space-y-2 bg-[var(--color-background)]"
                      >
                        {/* Row 1: Thumbnail + Name + Delete */}
                        <div className="flex items-center gap-2">
                          <div className={`flex-shrink-0 rounded overflow-hidden bg-gray-100 border border-gray-200 ${isToken ? 'w-9 h-9' : 'w-14 h-9'}`}>
                            <img src={asset.image_path} alt={asset.name} className="w-full h-full object-contain" loading="lazy" />
                          </div>
                          <input
                            type="text"
                            defaultValue={asset.name}
                            onBlur={(e) => handleUpdateTableAsset(asset.id, { name: e.target.value })}
                            className="flex-1 text-xs text-[var(--color-text)] bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none px-0.5 py-0.5 min-w-0"
                            placeholder="Name…"
                          />
                          <span className={`text-[9px] px-1 py-0.5 rounded font-medium flex-shrink-0 ${isToken ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isToken ? 'token' : 'board'}
                          </span>
                          <button
                            onClick={() => handleDeleteTableAsset(asset.id, asset.name)}
                            data-testid={`delete-table-asset-${asset.id}`}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-100 hover:text-red-600 transition-all text-xs"
                            title="Löschen"
                          >
                            &times;
                          </button>
                        </div>

                        {/* Row 2: Kategorie */}
                        <select
                          value={asset.category_id || ''}
                          onChange={(e) => handleUpdateTableAsset(asset.id, { category_id: e.target.value || null })}
                          className="w-full text-xs border border-[var(--color-border)] rounded px-1.5 py-1 bg-white text-[var(--color-text)]"
                          data-testid={`asset-category-select-${asset.id}`}
                        >
                          <option value="">Keine Kategorie</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.parent_category_id
                                ? `${categories.find(p => p.id === cat.parent_category_id)?.name || ''} / ${cat.name}`
                                : cat.name}
                            </option>
                          ))}
                        </select>

                        {/* Row 3: Anzahl + Größe */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--color-text-secondary)] flex-shrink-0">Anz.:</span>
                          <button
                            onClick={() => handleUpdateTableAsset(asset.id, { quantity: Math.max(1, (asset.quantity || 1) - 1) })}
                            className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-[var(--color-text)] text-xs font-bold flex-shrink-0"
                          >−</button>
                          <span className="text-xs font-medium text-[var(--color-text)] w-5 text-center flex-shrink-0">{asset.quantity || 1}</span>
                          <button
                            onClick={() => handleUpdateTableAsset(asset.id, { quantity: (asset.quantity || 1) + 1 })}
                            className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-[var(--color-text)] text-xs font-bold flex-shrink-0"
                          >+</button>
                          <span className="text-[10px] text-[var(--color-text-secondary)] ml-auto flex-shrink-0">
                            {sizeVal}px ≈ {sizeRatio}× Karte
                          </span>
                        </div>

                        {/* Row 4: Größen-Regler */}
                        <div className="space-y-0.5">
                          {isToken ? (
                            <>
                              <input
                                type="range"
                                min="20"
                                max="200"
                                value={sizeVal}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value);
                                  setTableAssets(prev => prev.map(a => a.id === asset.id ? { ...a, width: v, height: v } : a));
                                }}
                                onMouseUp={(e) => handleUpdateTableAsset(asset.id, { width: parseInt(e.target.value), height: parseInt(e.target.value) })}
                                onTouchEnd={(e) => handleUpdateTableAsset(asset.id, { width: parseInt(e.target.value), height: parseInt(e.target.value) })}
                                className="w-full h-1.5 accent-[var(--color-primary)]"
                              />
                              <div className="flex justify-between text-[9px] text-[var(--color-text-secondary)]">
                                <span>20</span>
                                <span className="text-[var(--color-primary)]">↑ 1× Karte = 100px</span>
                                <span>200</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[var(--color-text-secondary)]">B:</span>
                              <input
                                type="number"
                                min="20" max="2000"
                                defaultValue={asset.width || 400}
                                onBlur={(e) => handleUpdateTableAsset(asset.id, { width: parseInt(e.target.value) || 400 })}
                                className="w-16 text-xs border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text)]"
                              />
                              <span className="text-[10px] text-[var(--color-text-secondary)]">H:</span>
                              <input
                                type="number"
                                min="20" max="2000"
                                defaultValue={asset.height || 300}
                                onBlur={(e) => handleUpdateTableAsset(asset.id, { height: parseInt(e.target.value) || 300 })}
                                className="w-16 text-xs border border-[var(--color-border)] rounded px-1 py-0.5 text-[var(--color-text)]"
                              />
                              <span className="text-[9px] text-[var(--color-text-secondary)]">px</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Dice */}
            {customDice.length > 0 && (
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4" data-testid="custom-dice-section">
                <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide mb-3">Custom Würfel</h2>
                <div className="space-y-3">
                  {customDice.map(die => (
                    <div key={die.id} className="rounded-lg border border-[var(--color-border)] p-2 space-y-2 bg-[var(--color-background)]" data-testid={`custom-die-${die.id}`}>
                      {/* Name + Delete */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={die.name}
                          onBlur={(e) => handleRenameCustomDie(die.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.value = die.name; e.target.blur(); } }}
                          className="flex-1 text-xs text-[var(--color-text)] bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none px-0.5 py-0.5 min-w-0"
                        />
                        <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 font-medium flex-shrink-0">
                          d{die.num_faces}
                        </span>
                        <button
                          onClick={() => handleDeleteCustomDie(die.id, die.name)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-100 hover:text-red-600 transition-all text-xs"
                          title="Löschen"
                        >&times;</button>
                      </div>
                      {/* Face Images */}
                      <div className="flex flex-wrap gap-1">
                        {(die.face_images || []).map((img, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded border border-[var(--color-border)] overflow-hidden bg-gray-100 flex-shrink-0"
                            title={`Seite ${i + 1}`}
                          >
                            <img src={img} alt={`Seite ${i + 1}`} className="w-full h-full object-contain" loading="lazy" />
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-[var(--color-text-secondary)]">
                        {new Date(die.created_at).toLocaleDateString()} · {die.num_faces} Seiten
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        {/* Card Split Import Modal */}
        {showSplitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="split-import-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">
                  Auto-Split Card Sheet
                </h2>
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-xl w-8 h-8 flex items-center justify-center"
                  data-testid="split-import-close-btn"
                >
                  &times;
                </button>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Upload an image containing multiple cards (e.g., a scanned card sheet or sprite sheet).
                The system will automatically detect the card grid layout and split it into individual cards.
              </p>

              {/* File Input */}
              <div className="mb-4">
                <button
                  onClick={() => splitFileInputRef.current?.click()}
                  disabled={splitAnalyzing || splitImporting}
                  data-testid="split-select-file-btn"
                  className="w-full px-4 py-3 border-2 border-dashed border-teal-300 rounded-lg text-teal-600 hover:bg-teal-50 hover:border-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {splitAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing image...
                    </span>
                  ) : (
                    <span>
                      <strong>Choose Card Sheet Image</strong>
                      <br />
                      <span className="text-xs text-[var(--color-text-secondary)]">PNG or JPG image containing multiple cards in a grid</span>
                    </span>
                  )}
                </button>
              </div>

              {/* Error */}
              {splitError && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" data-testid="split-import-error">
                  {splitError}
                </div>
              )}

              {/* Analysis Results */}
              {splitAnalysis && (
                <div data-testid="split-analysis-results">
                  {/* Image Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]" data-testid="split-filename">
                          {splitAnalysis.filename}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]" data-testid="split-dimensions">
                          {splitAnalysis.width} x {splitAnalysis.height} pixels
                        </p>
                      </div>
                      {splitAnalysis.shouldSplit && splitAnalysis.suggestions.length > 0 && (
                        <span className="ml-auto px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full font-medium" data-testid="split-detected-badge">
                          Multi-card detected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid Suggestions */}
                  {splitAnalysis.suggestions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">Detected Layouts:</h3>
                      <div className="space-y-2" data-testid="split-suggestions-list">
                        {splitAnalysis.suggestions.map((suggestion, idx) => (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              !splitUseCustom && splitSelectedGrid === suggestion
                                ? 'border-teal-400 bg-teal-50'
                                : 'border-[var(--color-border)] hover:bg-gray-50'
                            }`}
                            data-testid={`split-suggestion-${idx}`}
                          >
                            <input
                              type="radio"
                              name="splitGrid"
                              checked={!splitUseCustom && splitSelectedGrid === suggestion}
                              onChange={() => {
                                setSplitSelectedGrid(suggestion);
                                setSplitUseCustom(false);
                              }}
                              className="w-4 h-4 text-teal-600"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--color-text)]">
                                {suggestion.cols} x {suggestion.rows} grid
                                <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                                  ({suggestion.totalCards} cards, ~{suggestion.cardWidth}x{suggestion.cardHeight}px each)
                                </span>
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                Card type: {suggestion.matchedType}
                              </p>
                            </div>
                            <span className="text-sm text-teal-600 font-medium">
                              {suggestion.totalCards} cards
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Grid Option */}
                  <div className="mb-4">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        splitUseCustom
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-[var(--color-border)] hover:bg-gray-50'
                      }`}
                      data-testid="split-custom-option"
                    >
                      <input
                        type="radio"
                        name="splitGrid"
                        checked={splitUseCustom}
                        onChange={() => setSplitUseCustom(true)}
                        className="w-4 h-4 text-teal-600"
                      />
                      <span className="text-sm font-medium text-[var(--color-text)]">Custom grid:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={splitCustomCols}
                          onChange={(e) => {
                            setSplitCustomCols(parseInt(e.target.value) || 1);
                            setSplitUseCustom(true);
                          }}
                          data-testid="split-custom-cols"
                          className="w-16 px-2 py-1 border border-[var(--color-border)] rounded text-sm text-center"
                        />
                        <span className="text-sm text-[var(--color-text-secondary)]">columns</span>
                        <span className="text-sm text-[var(--color-text-secondary)]">x</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={splitCustomRows}
                          onChange={(e) => {
                            setSplitCustomRows(parseInt(e.target.value) || 1);
                            setSplitUseCustom(true);
                          }}
                          data-testid="split-custom-rows"
                          className="w-16 px-2 py-1 border border-[var(--color-border)] rounded text-sm text-center"
                        />
                        <span className="text-sm text-[var(--color-text-secondary)]">rows</span>
                        {splitUseCustom && (
                          <span className="text-xs text-teal-600 font-medium ml-2">
                            = {(parseInt(splitCustomCols) || 1) * (parseInt(splitCustomRows) || 1)} cards
                          </span>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Card Preview Thumbnails */}
                  {splitAnalysis.previewCards && splitAnalysis.previewCards.length > 0 && !splitUseCustom && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">Preview (detected cards):</h3>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg" data-testid="split-preview-grid">
                        {splitAnalysis.previewCards.map((card) => (
                          <div key={card.index} className="relative aspect-[2.5/3.5] rounded border border-[var(--color-border)] overflow-hidden bg-white">
                            <img
                              src={card.thumbnail}
                              alt={`Card ${card.index + 1}`}
                              className="w-full h-full object-contain"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center text-[10px] py-0.5">
                              {card.index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Card name prefix:
                      </label>
                      <input
                        type="text"
                        value={splitCardPrefix}
                        onChange={(e) => setSplitCardPrefix(e.target.value)}
                        data-testid="split-card-prefix"
                        className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Card"
                      />
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        Cards will be named "{splitCardPrefix || 'Card'} 1", "{splitCardPrefix || 'Card'} 2", etc.
                      </p>
                    </div>
                    {categories.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                          Assign to category:
                        </label>
                        <select
                          value={splitCategoryId}
                          onChange={(e) => setSplitCategoryId(e.target.value)}
                          data-testid="split-category-select"
                          className="w-full px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white"
                        >
                          <option value="">No category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--color-text-secondary)]" data-testid="split-summary">
                      {splitUseCustom
                        ? `Will split into ${(parseInt(splitCustomCols) || 1) * (parseInt(splitCustomRows) || 1)} cards (${parseInt(splitCustomCols) || 1}x${parseInt(splitCustomRows) || 1})`
                        : splitSelectedGrid
                        ? `Will split into ${splitSelectedGrid.totalCards} cards (${splitSelectedGrid.cols}x${splitSelectedGrid.rows})`
                        : 'Select a grid layout'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSplitModal(false)}
                        className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                        data-testid="split-import-cancel-btn"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSplitExecute}
                        disabled={splitImporting || (!splitUseCustom && !splitSelectedGrid)}
                        data-testid="split-import-execute-btn"
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {splitImporting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Splitting...
                          </span>
                        ) : 'Split & Import'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No analysis yet */}
              {!splitAnalysis && !splitAnalyzing && !splitError && (
                <div className="text-center py-6 text-[var(--color-text-secondary)]" data-testid="split-import-instructions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-teal-300">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                  </svg>
                  <p className="text-sm mb-1">Upload an image to auto-detect card layout</p>
                  <p className="text-xs">
                    Works with scanned card sheets, sprite sheets, and multi-card images
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TTS Import Modal */}
        {showTtsImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="tts-import-modal">
            <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">
                  Import from Tabletop Simulator
                </h2>
                <button
                  onClick={() => setShowTtsImportModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] text-xl w-8 h-8 flex items-center justify-center"
                  data-testid="tts-import-close-btn"
                >
                  &times;
                </button>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Upload a Tabletop Simulator save file (.json) to import card decks. The file can be found in your TTS Mods folder
                (typically <code className="bg-gray-100 px-1 rounded text-xs">Documents/My Games/Tabletop Simulator/Saves/</code> or Workshop folder).
              </p>

              {/* File Input */}
              <div className="mb-4">
                <input
                  ref={ttsFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleTtsFileSelect}
                  className="hidden"
                  data-testid="tts-file-input"
                />
                <button
                  onClick={() => ttsFileInputRef.current?.click()}
                  disabled={ttsAnalyzing || ttsImporting}
                  data-testid="tts-select-file-btn"
                  className="w-full px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {ttsAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing TTS file...
                    </span>
                  ) : (
                    <span>
                      <strong>Choose TTS JSON File</strong>
                      <br />
                      <span className="text-xs text-[var(--color-text-secondary)]">Drop or click to select a .json save/mod file</span>
                    </span>
                  )}
                </button>
              </div>

              {/* Error */}
              {ttsError && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" data-testid="tts-import-error">
                  {ttsError}
                </div>
              )}

              {/* Analysis Results */}
              {ttsAnalysis && (
                <div data-testid="tts-analysis-results">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-[var(--color-text)]">
                        Found {ttsAnalysis.deckCount} deck{ttsAnalysis.deckCount !== 1 ? 's' : ''}
                        {ttsAnalysis.tokenCount > 0 && `, ${ttsAnalysis.tokenCount} token${ttsAnalysis.tokenCount !== 1 ? 's' : ''}`}
                        {ttsAnalysis.boardCount > 0 && `, ${ttsAnalysis.boardCount} board${ttsAnalysis.boardCount !== 1 ? 's' : ''}`}
                        {ttsAnalysis.diceCount > 0 && `, ${ttsAnalysis.diceCount} custom ${ttsAnalysis.diceCount !== 1 ? 'dice' : 'die'}`}
                      </h3>
                      {ttsAnalysis.saveName && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Save: {ttsAnalysis.saveName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllTtsDecks}
                        className="text-xs text-purple-600 hover:text-purple-800 underline"
                        data-testid="tts-select-all"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAllTtsDecks}
                        className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] underline"
                        data-testid="tts-deselect-all"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Deck List */}
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto" data-testid="tts-deck-list">
                    {ttsAnalysis.decks.map((deck) => (
                      <label
                        key={deck.index}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          ttsSelectedDecks.has(deck.index)
                            ? 'border-purple-400 bg-purple-50'
                            : 'border-[var(--color-border)] hover:bg-gray-50'
                        }`}
                        data-testid={`tts-deck-item-${deck.index}`}
                      >
                        <input
                          type="checkbox"
                          checked={ttsSelectedDecks.has(deck.index)}
                          onChange={() => toggleTtsDeckSelection(deck.index)}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          data-testid={`tts-deck-checkbox-${deck.index}`}
                        />
                        {/* Sprite-Sheet-Vorschau */}
                        {deck.previewUrl ? (
                          <div className="w-12 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <img
                              src={deck.previewUrl}
                              alt={deck.nickname}
                              className="w-full h-full object-cover object-left-top"
                              loading="lazy"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-16 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                            ?
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">
                            {deck.nickname}
                            {deck.isSingleCard && (
                              <span className="ml-1 text-xs text-[var(--color-text-secondary)]">(single card)</span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {deck.totalCards} card{deck.totalCards !== 1 ? 's' : ''}
                            {deck.sheets.length > 1 && ` across ${deck.sheets.length} sheets`}
                          </p>
                        </div>
                        <span className="text-sm text-purple-600 font-medium">
                          {deck.totalCards}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Tokens selection */}
                  {(ttsAnalysis?.tokens || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
                        Tokens
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {ttsAnalysis.tokens.map((token) => (
                          <label
                            key={token.index}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              ttsSelectedTokens.has(token.index)
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-[var(--color-border)] hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={ttsSelectedTokens.has(token.index)}
                              onChange={() => toggleTtsTokenSelection(token.index)}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            {ttsAnalysis.tokenPreviews?.[token.index]?.url ? (
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 border border-purple-200 flex-shrink-0">
                                <img
                                  src={ttsAnalysis.tokenPreviews[token.index].url}
                                  alt={token.nickname}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-400 text-xs border border-purple-200">?</div>
                            )}
                            <span className="text-sm text-[var(--color-text)] truncate">
                              {token.nickname}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Boards selection */}
                  {(ttsAnalysis?.boards || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
                        Boards
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {ttsAnalysis.boards.map((board) => (
                          <label
                            key={board.index}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              ttsSelectedBoards.has(board.index)
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-[var(--color-border)] hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={ttsSelectedBoards.has(board.index)}
                              onChange={() => toggleTtsBoardSelection(board.index)}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            {ttsAnalysis.boardPreviews?.[board.index]?.url ? (
                              <div className="w-12 h-8 rounded overflow-hidden bg-purple-100 border border-purple-200 flex-shrink-0">
                                <img
                                  src={ttsAnalysis.boardPreviews[board.index].url}
                                  alt={board.nickname}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-8 rounded bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-400 text-xs border border-purple-200">?</div>
                            )}
                            <span className="text-sm text-[var(--color-text)] truncate">
                              {board.nickname}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {(ttsSelectedTokens.size > 0 || ttsSelectedBoards.size > 0) && (
                    <div className="mb-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                      Selected tokens and boards will be imported and a save state will be created so you can load them on the game table.
                    </div>
                  )}

                  {/* Dice selection */}
                  {(ttsAnalysis?.dice || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
                        Custom Würfel
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {ttsAnalysis.dice.map((die) => (
                          <label
                            key={die.index}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              ttsSelectedDice.has(die.index)
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-[var(--color-border)] hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={ttsSelectedDice.has(die.index)}
                              onChange={() => {
                                setTtsSelectedDice(prev => {
                                  const next = new Set(prev);
                                  next.has(die.index) ? next.delete(die.index) : next.add(die.index);
                                  return next;
                                });
                              }}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            {die.previewUrl ? (
                              <div className="w-8 h-8 rounded overflow-hidden bg-purple-100 border border-purple-200 flex-shrink-0">
                                <img src={die.previewUrl} alt={die.nickname} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-400 text-xs border border-purple-200">🎲</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-[var(--color-text)] truncate block">{die.nickname}</span>
                              <span className="text-xs text-[var(--color-text-secondary)]">d{die.numFaces} · {die.numFaces} Seiten</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ttsCreateCategories}
                        onChange={(e) => setTtsCreateCategories(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        data-testid="tts-create-categories-checkbox"
                      />
                      <span className="text-sm text-[var(--color-text)]">
                        Create categories for each deck
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text)]">
                        Read card names via OCR:
                      </span>
                      <select
                        value={ttsOcrNamePosition}
                        onChange={(e) => setTtsOcrNamePosition(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-[var(--color-text)] focus:ring-purple-500 focus:border-purple-500"
                        data-testid="tts-ocr-position-select"
                      >
                        <option value="none">Off</option>
                        <option value="top">Top of card</option>
                        <option value="center">Center of card</option>
                        <option value="bottom">Bottom of card</option>
                      </select>
                      {ttsOcrNamePosition !== 'none' && (
                        <span className="text-xs text-amber-600">
                          (slower import)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-text)]">
                        Rotate imported cards:
                      </span>
                      <select
                        value={ttsRotateCards}
                        onChange={(e) => setTtsRotateCards(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-[var(--color-text)] focus:ring-purple-500 focus:border-purple-500"
                        data-testid="tts-rotate-cards-select"
                      >
                        <option value="none">No rotation</option>
                        <option value="auto">Auto-detect (landscape→portrait)</option>
                        <option value="90">90° clockwise</option>
                        <option value="-90">90° counter-clockwise</option>
                        <option value="180">180°</option>
                      </select>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {ttsImportProgress && (
                    <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2" data-testid="tts-import-progress">
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {ttsImportProgress}
                    </div>
                  )}

                  {/* Import Summary */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {ttsSelectedDecks.size} of {ttsAnalysis.deckCount} decks selected
                      {' · '}
                      ~{ttsAnalysis.decks
                        .filter(d => ttsSelectedDecks.has(d.index))
                        .reduce((sum, d) => sum + d.totalCards, 0)} cards
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowTtsImportModal(false)}
                        className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
                        data-testid="tts-import-cancel-btn"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleTtsImport}
                        disabled={ttsImporting || (ttsSelectedDecks.size === 0 && !((ttsAnalysis?.tokenCount || 0) > 0 || (ttsAnalysis?.boardCount || 0) > 0))}
                        data-testid="tts-import-execute-btn"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {ttsImporting ? 'Importing...' : ttsSelectedDecks.size > 0 ? `Import ${ttsSelectedDecks.size} Deck${ttsSelectedDecks.size !== 1 ? 's' : ''}` : 'Import Assets'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No analysis yet - show instructions */}
              {!ttsAnalysis && !ttsAnalyzing && !ttsError && (
                <div className="text-center py-6 text-[var(--color-text-secondary)]" data-testid="tts-import-instructions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-purple-300">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <p className="text-sm mb-1">Select a TTS save file to get started</p>
                  <p className="text-xs">
                    Card sprite sheets will be automatically split into individual cards
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Multiplayer Modals */}
    {showCreateRoomModal && (
      <CreateRoomModal
        gameId={id}
        setups={setups}
        onClose={() => setShowCreateRoomModal(false)}
        onCreated={(data) => {
          setShowCreateRoomModal(false);
          sessionStorage.setItem(`room_${data.room_code}_player_id`, data.player_id);
          sessionStorage.setItem(`room_${data.room_code}_is_host`, 'true');
          navigate(`/rooms/${data.room_code}/lobby`);
        }}
      />
    )}
    {showJoinRoomModal && (
      <JoinRoomModal
        onClose={() => setShowJoinRoomModal(false)}
        onJoined={(data) => {
          setShowJoinRoomModal(false);
          sessionStorage.setItem(`room_${data.room_code}_player_id`, data.player_id);
          sessionStorage.setItem(`room_${data.room_code}_is_host`, 'false');
          navigate(`/rooms/${data.room_code}/lobby`);
        }}
      />
    )}

    {showCameraScanner && (
      <CameraCardScanner
        gameId={id}
        categoryId={selectedCategoryId !== 'uncategorized' ? selectedCategoryId : null}
        onClose={() => setShowCameraScanner(false)}
        onCardsImported={(count) => {
          if (count > 0) {
            fetchCards();
            fetchCardBacks();
            setUploadMessage({
              type: 'success',
              text: `${count} Karte${count !== 1 ? 'n' : ''} per Kamera-Scan importiert`,
            });
            setTimeout(() => setUploadMessage(null), 5000);
          }
        }}
      />
    )}
    </>
  );
}
