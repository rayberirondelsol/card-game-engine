import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

// Table background configurations
const TABLE_BACKGROUNDS = {
  felt: {
    name: 'Felt',
    color: '#1a5c2a',
    pattern: 'felt',
    description: 'Classic card table felt'
  },
  wood: {
    name: 'Wood',
    color: '#8B6914',
    pattern: 'wood',
    description: 'Warm wood texture'
  },
  slate: {
    name: 'Dark Slate',
    color: '#1e293b',
    pattern: 'solid',
    description: 'Dark slate surface'
  },
  navy: {
    name: 'Navy',
    color: '#1e3a5f',
    pattern: 'solid',
    description: 'Deep navy blue'
  },
  green: {
    name: 'Deep Green',
    color: '#14532d',
    pattern: 'solid',
    description: 'Deep forest green'
  }
};

// Grid configuration for snap-to-grid
const GRID_SIZE = 80; // pixels per grid cell
const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;
const SNAP_THRESHOLD = 20; // pixels within which snap activates

// Snap a value to the nearest grid line
function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// Check if value is close enough to snap
function shouldSnap(value) {
  const nearest = snapToGrid(value);
  return Math.abs(value - nearest) < SNAP_THRESHOLD;
}

// Draw felt texture pattern
function drawFeltPattern(ctx, width, height, baseColor) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Add noise-like texture for felt effect
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

// Draw wood texture pattern
function drawWoodPattern(ctx, width, height, baseColor) {
  // Base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Wood grain lines
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += 3 + Math.random() * 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    let x = 0;
    while (x < width) {
      x += 10 + Math.random() * 20;
      const yOff = y + (Math.random() - 0.5) * 3;
      ctx.lineTo(x, yOff);
    }
    ctx.stroke();
  }

  // Add subtle noise
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

// Draw solid color background
function drawSolidBackground(ctx, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Subtle vignette effect
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.2,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.02)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export default function GameTable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [background, setBackground] = useState('felt');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Save state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const saveLoadedRef = useRef(false);

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const [zoomDisplay, setZoomDisplay] = useState(100); // reactive zoom % for display
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 }); // reactive pan position for display

  // Game objects state (counters, dice, markers, notes)
  const [counters, setCounters] = useState([]);
  const [dice, setDice] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [notes, setNotes] = useState([]);

  // Card state
  const [availableCards, setAvailableCards] = useState([]); // cards from game's card library
  const [tableCards, setTableCards] = useState([]); // cards placed on the table
  const [showCardDrawer, setShowCardDrawer] = useState(false);
  const [draggingCard, setDraggingCard] = useState(null); // card being dragged on table
  const [selectedCards, setSelectedCards] = useState(new Set()); // selected card IDs for grouping
  const cardDragOffsetRef = useRef({ x: 0, y: 0 });
  const [maxZIndex, setMaxZIndex] = useState(1);
  const [gridHighlight, setGridHighlight] = useState(null); // {x, y} of grid highlight position

  // Hand state
  const [handCards, setHandCards] = useState([]); // cards in player's hand
  const [hoveredHandCard, setHoveredHandCard] = useState(null); // card being hovered in hand (for preview)
  const [draggingHandCard, setDraggingHandCard] = useState(null); // card being dragged within hand
  const [handDragOverIndex, setHandDragOverIndex] = useState(null); // index being dragged over for reorder

  // Toolbar modals
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newDiceType, setNewDiceType] = useState('d6');
  const [newMarkerColor, setNewMarkerColor] = useState('#ff0000');
  const [newMarkerLabel, setNewMarkerLabel] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // Drag state for objects
  const [draggingObj, setDraggingObj] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Fetch game data
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${id}`);
        if (!res.ok) throw new Error('Game not found');
        const data = await res.json();
        setGame(data);
        if (data.table_background && TABLE_BACKGROUNDS[data.table_background]) {
          setBackground(data.table_background);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGame();
  }, [id]);

  // Fetch available cards from game's card library
  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(`/api/games/${id}/cards`);
        if (res.ok) {
          const data = await res.json();
          setAvailableCards(data);
        }
      } catch (err) {
        console.error('Failed to fetch cards:', err);
      }
    }
    if (id) fetchCards();
  }, [id]);

  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const camera = cameraRef.current;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Save context state
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-width / 2 + camera.x, -height / 2 + camera.y);

    // Draw background
    const bg = TABLE_BACKGROUNDS[background];
    if (bg.pattern === 'felt') {
      drawFeltPattern(ctx, width * 3, height * 3, bg.color);
    } else if (bg.pattern === 'wood') {
      drawWoodPattern(ctx, width * 3, height * 3, bg.color);
    } else {
      drawSolidBackground(ctx, width * 3, height * 3, bg.color);
    }

    ctx.restore();

    // Draw game objects (counters, dice, markers, notes) in screen space over the background
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-width / 2 + camera.x, -height / 2 + camera.y);

    // Markers are now rendered as DOM overlays (not on canvas)

    // Draw notes
    notes.forEach(note => {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(note.x - 60, note.y - 30, 120, 60);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(note.x - 60, note.y - 30, 120, 60);
      ctx.fillStyle = '#78350f';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = note.text.split('\n').slice(0, 3);
      lines.forEach((line, i) => {
        ctx.fillText(line.substring(0, 18), note.x, note.y - 10 + i * 14);
      });
    });

    ctx.restore();
  }, [background, counters, dice, markers, notes]);

  // Set up canvas sizing and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resize() {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      renderCanvas();
    }

    resize();
    window.addEventListener('resize', resize);

    // Initial render
    renderCanvas();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderCanvas, loading]);

  // Re-render when state changes
  useEffect(() => {
    renderCanvas();
  }, [background, counters, dice, markers, notes, renderCanvas]);

  // Mouse event handlers for canvas (pan & zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e) {
      e.preventDefault();
      const camera = cameraRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      camera.zoom = Math.max(0.2, Math.min(5, camera.zoom * delta));
      setZoomDisplay(Math.round(camera.zoom * 100));
      renderCanvas();
    }

    const container = containerRef.current;

    function handleMouseDown(e) {
      // Pan when clicking on canvas or the container background (not on UI elements)
      const isCanvas = e.target === canvas;
      const isContainer = e.target === container;
      const isUIElement = e.target.closest && e.target.closest('[data-ui-element]');

      if (e.button === 1 || (e.button === 0 && (isCanvas || isContainer) && !isUIElement)) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          camX: cameraRef.current.x,
          camY: cameraRef.current.y,
        };
        canvas.style.cursor = 'grabbing';
      }
      // Right click
      if (e.button === 2) {
        e.preventDefault();
      }
    }

    function handleMouseMove(e) {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        const camera = cameraRef.current;
        camera.x = panStartRef.current.camX + dx / camera.zoom;
        camera.y = panStartRef.current.camY + dy / camera.zoom;
        setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
        renderCanvas();
      }
    }

    function handleMouseUp(e) {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas.style.cursor = 'default';
      }
    }

    function handleContextMenu(e) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
      });
    }

    // Wheel on canvas and container for zoom
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    if (container) container.addEventListener('wheel', handleWheel, { passive: false });
    // Mousedown on both canvas and container for pan start
    canvas.addEventListener('mousedown', handleMouseDown);
    if (container) container.addEventListener('mousedown', handleMouseDown);
    // Mousemove and mouseup on document for reliable tracking
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (container) container.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      if (container) container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [renderCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === '?') {
        setShowShortcuts(prev => !prev);
      }

      // F key - flip selected card(s)
      if (e.key === 'f' || e.key === 'F') {
        if (selectedCards.size > 0) {
          setTableCards(prev => prev.map(c => {
            if (selectedCards.has(c.tableId)) {
              return { ...c, faceDown: !c.faceDown };
            }
            return c;
          }));
        }
      }

      // E key - rotate 90 clockwise
      if (e.key === 'e' || e.key === 'E') {
        if (selectedCards.size > 0) {
          setTableCards(prev => prev.map(c => {
            if (selectedCards.has(c.tableId)) {
              return { ...c, rotation: (c.rotation || 0) + 90 };
            }
            return c;
          }));
        }
      }

      // Q key - rotate 90 counter-clockwise
      if (e.key === 'q' || e.key === 'Q') {
        if (selectedCards.size > 0) {
          setTableCards(prev => prev.map(c => {
            if (selectedCards.has(c.tableId)) {
              return { ...c, rotation: (c.rotation || 0) - 90 };
            }
            return c;
          }));
        }
      }

      // G key - group selected cards into a stack
      if (e.key === 'g' || e.key === 'G') {
        if (selectedCards.size >= 2) {
          groupSelectedCards();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCards, tableCards]);

  // ===== CARD FUNCTIONS =====

  // Place a card from the library onto the table
  function placeCardOnTable(card) {
    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);
    // Spread cards out so they don't overlap too much
    const existingCount = tableCards.length;
    const col = existingCount % 4;
    const row = Math.floor(existingCount / 4);
    const newTableCard = {
      tableId: crypto.randomUUID(),
      cardId: card.id,
      name: card.name,
      image_path: card.image_path,
      x: 250 + col * 150 + (Math.random() - 0.5) * 30,
      y: 300 + row * 180 + (Math.random() - 0.5) * 30,
      zIndex: newZIndex,
      faceDown: false,
      rotation: 0,
      inStack: null, // stack ID if in a stack
    };
    setTableCards(prev => [...prev, newTableCard]);
  }

  // Start dragging a card on the table
  function handleCardDragStart(e, tableId) {
    e.preventDefault();
    e.stopPropagation();
    const card = tableCards.find(c => c.tableId === tableId);
    if (!card) return;

    // If card is in a stack, bring the whole stack to front
    const stackId = card.inStack;
    const newZ = maxZIndex + 1;

    if (stackId) {
      const stackCards = tableCards.filter(c => c.inStack === stackId);
      setMaxZIndex(newZ + stackCards.length);
      setTableCards(prev => prev.map(c => {
        if (c.inStack !== stackId) return c;
        const idx = stackCards.findIndex(sc => sc.tableId === c.tableId);
        return { ...c, zIndex: newZ + idx };
      }));
    } else {
      setMaxZIndex(newZ);
      setTableCards(prev => prev.map(c =>
        c.tableId === tableId ? { ...c, zIndex: newZ } : c
      ));
    }

    cardDragOffsetRef.current = {
      x: e.clientX - card.x,
      y: e.clientY - card.y,
    };
    setDraggingCard(tableId);

    // Select the card if not already selected (and not ctrl-clicking)
    if (!e.ctrlKey && !e.metaKey) {
      // For stacks, select all cards in the stack
      if (stackId) {
        const stackCardIds = tableCards.filter(c => c.inStack === stackId).map(c => c.tableId);
        setSelectedCards(new Set(stackCardIds));
      } else {
        setSelectedCards(new Set([tableId]));
      }
    } else {
      // Toggle selection with ctrl
      setSelectedCards(prev => {
        const next = new Set(prev);
        if (next.has(tableId)) {
          next.delete(tableId);
        } else {
          next.add(tableId);
        }
        return next;
      });
    }
  }

  // Handle card drag move
  function handleCardDragMove(e) {
    if (!draggingCard) return;

    const newX = e.clientX - cardDragOffsetRef.current.x;
    const newY = e.clientY - cardDragOffsetRef.current.y;

    // Calculate grid highlight position
    const snapX = snapToGrid(newX);
    const snapY = snapToGrid(newY);
    const showGrid = shouldSnap(newX) || shouldSnap(newY);

    if (showGrid) {
      setGridHighlight({ x: snapX, y: snapY });
    } else {
      setGridHighlight(null);
    }

    // Move the card (and all cards in the same stack)
    const card = tableCards.find(c => c.tableId === draggingCard);
    if (card && card.inStack) {
      // Move entire stack together
      const dx = newX - card.x;
      const dy = newY - card.y;
      setTableCards(prev => prev.map(c => {
        if (c.inStack === card.inStack) {
          return { ...c, x: c.x + dx, y: c.y + dy };
        }
        return c;
      }));
    } else {
      setTableCards(prev => prev.map(c =>
        c.tableId === draggingCard ? { ...c, x: newX, y: newY } : c
      ));
    }
  }

  // Handle card drag end - snap to grid
  function handleCardDragEnd() {
    if (!draggingCard) return;

    const card = tableCards.find(c => c.tableId === draggingCard);

    // Snap to grid on release
    if (card && card.inStack) {
      // Snap the whole stack
      const finalX = shouldSnap(card.x) ? snapToGrid(card.x) : card.x;
      const finalY = shouldSnap(card.y) ? snapToGrid(card.y) : card.y;
      const dx = finalX - card.x;
      const dy = finalY - card.y;
      setTableCards(prev => prev.map(c => {
        if (c.inStack === card.inStack) {
          return { ...c, x: c.x + dx, y: c.y + dy };
        }
        return c;
      }));
    } else {
      setTableCards(prev => prev.map(c => {
        if (c.tableId !== draggingCard) return c;
        const finalX = shouldSnap(c.x) ? snapToGrid(c.x) : c.x;
        const finalY = shouldSnap(c.y) ? snapToGrid(c.y) : c.y;
        return { ...c, x: finalX, y: finalY };
      }));
    }

    setDraggingCard(null);
    setGridHighlight(null);
  }

  // Group selected cards into a stack
  function groupSelectedCards() {
    if (selectedCards.size < 2) return;
    const stackId = crypto.randomUUID();
    const selectedArray = Array.from(selectedCards);

    // Find the average position for the stack
    let sumX = 0, sumY = 0, count = 0;
    const cardsToStack = tableCards.filter(c => selectedCards.has(c.tableId));
    cardsToStack.forEach(c => { sumX += c.x; sumY += c.y; count++; });
    const avgX = sumX / count;
    const avgY = sumY / count;

    // Update cards to be in the stack, stacked at the same position
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ + count);

    setTableCards(prev => prev.map(c => {
      if (!selectedCards.has(c.tableId)) return c;
      const idx = selectedArray.indexOf(c.tableId);
      return {
        ...c,
        x: avgX,
        y: avgY,
        inStack: stackId,
        zIndex: newZ + idx,
      };
    }));

    setSelectedCards(new Set());
  }

  // Click on table background to deselect all cards
  function handleTableClick(e) {
    if (e.target === canvasRef.current) {
      setSelectedCards(new Set());
    }
  }

  // Counter functions
  function createCounter(name) {
    const canvas = canvasRef.current;
    const offset = counters.length * 160;
    const newCounter = {
      id: crypto.randomUUID(),
      name: name || 'Counter',
      value: 0,
      x: (canvas?.width || 800) / 2 + offset,
      y: (canvas?.height || 600) / 2 - 60,
    };
    setCounters(prev => [...prev, newCounter]);
    setShowCounterModal(false);
    setNewCounterName('');
  }

  function incrementCounter(counterId) {
    setCounters(prev => prev.map(c =>
      c.id === counterId ? { ...c, value: c.value + 1 } : c
    ));
  }

  function decrementCounter(counterId) {
    setCounters(prev => prev.map(c =>
      c.id === counterId ? { ...c, value: c.value - 1 } : c
    ));
  }

  function deleteCounter(counterId) {
    setCounters(prev => prev.filter(c => c.id !== counterId));
  }

  // Dice functions
  function createDie(type) {
    const canvas = canvasRef.current;
    const maxValue = { d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 }[type] || 6;
    const newDie = {
      id: crypto.randomUUID(),
      type: type,
      value: Math.floor(Math.random() * maxValue) + 1,
      maxValue: maxValue,
      x: (canvas?.width || 800) / 2 + (Math.random() - 0.5) * 100,
      y: (canvas?.height || 600) / 2 + (Math.random() - 0.5) * 100,
      rolling: false,
    };
    setDice(prev => [...prev, newDie]);
    setShowDiceModal(false);
  }

  function rollDie(dieId) {
    setDice(prev => prev.map(d =>
      d.id === dieId ? { ...d, rolling: true } : d
    ));

    let count = 0;
    const interval = setInterval(() => {
      setDice(prev => prev.map(d => {
        if (d.id !== dieId) return d;
        return { ...d, value: Math.floor(Math.random() * d.maxValue) + 1 };
      }));
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setDice(prev => prev.map(d =>
          d.id === dieId ? { ...d, rolling: false, value: Math.floor(Math.random() * d.maxValue) + 1 } : d
        ));
      }
    }, 80);
  }

  function deleteDie(dieId) {
    setDice(prev => prev.filter(d => d.id !== dieId));
  }

  // Drag handlers for floating objects (counters, dice, markers)
  function handleObjDragStart(e, objType, objId) {
    e.preventDefault();
    let obj;
    if (objType === 'counter') obj = counters.find(c => c.id === objId);
    else if (objType === 'die') obj = dice.find(d => d.id === objId);
    else if (objType === 'marker') obj = markers.find(m => m.id === objId);
    if (!obj) return;
    dragOffsetRef.current = {
      x: e.clientX - (obj.x || 0),
      y: e.clientY - (obj.y || 0),
    };
    setDraggingObj({ type: objType, id: objId });
  }

  function findNearestCardCorner(px, py) {
    const MARKER_SNAP_DISTANCE = 30;
    let nearest = null;
    let nearestDist = MARKER_SNAP_DISTANCE;
    const allCards = tableCards.filter(c => {
      if (!c.inStack) return true;
      const stackCards2 = tableCards.filter(sc => sc.inStack === c.inStack);
      const maxZ = Math.max(...stackCards2.map(sc => sc.zIndex));
      return c.zIndex === maxZ;
    });
    allCards.forEach(card => {
      const corners = [
        { name: 'top-left', x: card.x - CARD_WIDTH / 2 + 8, y: card.y - CARD_HEIGHT / 2 + 8 },
        { name: 'top-right', x: card.x + CARD_WIDTH / 2 - 8, y: card.y - CARD_HEIGHT / 2 + 8 },
        { name: 'bottom-left', x: card.x - CARD_WIDTH / 2 + 8, y: card.y + CARD_HEIGHT / 2 - 8 },
        { name: 'bottom-right', x: card.x + CARD_WIDTH / 2 - 8, y: card.y + CARD_HEIGHT / 2 - 8 },
      ];
      corners.forEach(corner => {
        const dist = Math.sqrt((px - corner.x) ** 2 + (py - corner.y) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { cardTableId: card.tableId, corner: corner.name, x: corner.x, y: corner.y };
        }
      });
    });
    return nearest;
  }

  function handleObjDragMove(e) {
    if (!draggingObj) return;
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    if (draggingObj.type === 'counter') {
      setCounters(prev => prev.map(c =>
        c.id === draggingObj.id ? { ...c, x: newX, y: newY } : c
      ));
    } else if (draggingObj.type === 'die') {
      setDice(prev => prev.map(d =>
        d.id === draggingObj.id ? { ...d, x: newX, y: newY } : d
      ));
    } else if (draggingObj.type === 'marker') {
      setMarkers(prev => prev.map(m =>
        m.id === draggingObj.id ? { ...m, x: newX, y: newY, attachedTo: null } : m
      ));
    }
  }

  function handleObjDragEnd() {
    if (draggingObj && draggingObj.type === 'marker') {
      const marker = markers.find(m => m.id === draggingObj.id);
      if (marker) {
        const snap = findNearestCardCorner(marker.x, marker.y);
        if (snap) {
          setMarkers(prev => prev.map(m =>
            m.id === draggingObj.id ? { ...m, x: snap.x, y: snap.y, attachedTo: snap.cardTableId, attachedCorner: snap.corner } : m
          ));
        }
      }
    }
    setDraggingObj(null);
  }

  function deleteMarker(markerId) {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
  }

  // Combined mouse move handler (React events on container)
  function handleGlobalMouseMove(e) {
    // Handle panning via React events as well (for better Playwright compatibility)
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const camera = cameraRef.current;
      camera.x = panStartRef.current.camX + dx / camera.zoom;
      camera.y = panStartRef.current.camY + dy / camera.zoom;
      setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
      renderCanvas();
    } else if (draggingCard) {
      handleCardDragMove(e);
    } else if (draggingObj) {
      handleObjDragMove(e);
    }
  }

  // Combined mouse up handler (React events on container)
  function handleGlobalMouseUp(e) {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }
    if (draggingCard) {
      handleCardDragEnd();
    }
    if (draggingObj) {
      handleObjDragEnd();
    }
  }

  // Remove card from table
  function removeCardFromTable(tableId) {
    setTableCards(prev => prev.filter(c => c.tableId !== tableId));
    setSelectedCards(prev => {
      const next = new Set(prev);
      next.delete(tableId);
      return next;
    });
  }

  // ===== HAND FUNCTIONS =====

  // Pick up a card from the table to the player's hand
  function pickUpToHand(tableId) {
    const card = tableCards.find(c => c.tableId === tableId);
    if (!card) return;

    // Add to hand
    const handCard = {
      handId: crypto.randomUUID(),
      cardId: card.cardId,
      name: card.name,
      image_path: card.image_path,
      originalTableId: card.tableId,
    };
    setHandCards(prev => [...prev, handCard]);

    // Remove from table
    removeCardFromTable(tableId);
    setContextMenu(null);
  }

  // Play a card from hand back to the table
  function playCardFromHand(handId) {
    const card = handCards.find(c => c.handId === handId);
    if (!card) return;

    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);

    // Place card in center-ish area of screen
    const canvas = canvasRef.current;
    const centerX = (canvas?.width || 800) / 2;
    const centerY = (canvas?.height || 600) / 2 - 60;

    const newTableCard = {
      tableId: crypto.randomUUID(),
      cardId: card.cardId,
      name: card.name,
      image_path: card.image_path,
      x: centerX + (Math.random() - 0.5) * 60,
      y: centerY + (Math.random() - 0.5) * 60,
      zIndex: newZIndex,
      faceDown: false,
      rotation: 0,
      inStack: null,
    };
    setTableCards(prev => [...prev, newTableCard]);

    // Remove from hand
    setHandCards(prev => prev.filter(c => c.handId !== handId));
    setHoveredHandCard(null);
  }

  // Reorder cards in hand via drag
  function handleHandDragStart(e, index) {
    e.dataTransfer.effectAllowed = 'move';
    setDraggingHandCard(index);
  }

  function handleHandDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHandDragOverIndex(index);
  }

  function handleHandDrop(e, dropIndex) {
    e.preventDefault();
    if (draggingHandCard === null || draggingHandCard === dropIndex) {
      setDraggingHandCard(null);
      setHandDragOverIndex(null);
      return;
    }

    setHandCards(prev => {
      const newHand = [...prev];
      const [moved] = newHand.splice(draggingHandCard, 1);
      newHand.splice(dropIndex, 0, moved);
      return newHand;
    });
    setDraggingHandCard(null);
    setHandDragOverIndex(null);
  }

  function handleHandDragEnd() {
    setDraggingHandCard(null);
    setHandDragOverIndex(null);
  }

  // ===== SAVE/LOAD FUNCTIONS =====

  // Serialize the entire game state into a JSON-friendly object
  function getGameState() {
    const camera = cameraRef.current;
    // Separate stacked cards: identify unique stacks
    const stackMap = {};
    const looseCards = [];
    tableCards.forEach(card => {
      if (card.inStack) {
        if (!stackMap[card.inStack]) stackMap[card.inStack] = [];
        stackMap[card.inStack].push(card);
      } else {
        looseCards.push(card);
      }
    });

    // Build stacks array for serialization
    const stacks = Object.entries(stackMap).map(([stackId, cards]) => {
      const sorted = [...cards].sort((a, b) => a.zIndex - b.zIndex);
      return {
        stackId,
        card_ids: sorted.map(c => c.cardId),
        table_ids: sorted.map(c => c.tableId),
        x: sorted[0].x,
        y: sorted[0].y,
        cards: sorted.map(c => ({
          tableId: c.tableId,
          cardId: c.cardId,
          name: c.name,
          image_path: c.image_path,
          faceDown: c.faceDown,
          rotation: c.rotation || 0,
          zIndex: c.zIndex,
        })),
      };
    });

    return {
      camera: {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        rotation: 0, // no camera rotation implemented yet
      },
      background,
      cards: looseCards.map(c => ({
        tableId: c.tableId,
        cardId: c.cardId,
        name: c.name,
        image_path: c.image_path,
        x: c.x,
        y: c.y,
        zIndex: c.zIndex,
        faceDown: c.faceDown,
        rotation: c.rotation || 0,
        face_up: !c.faceDown,
      })),
      stacks,
      hand: handCards.map(c => ({
        handId: c.handId,
        cardId: c.cardId,
        name: c.name,
        image_path: c.image_path,
      })),
      markers: markers.map(m => ({
        id: m.id,
        color: m.color,
        label: m.label || '',
        x: m.x,
        y: m.y,
        attachedTo: m.attachedTo || null,
        attachedCorner: m.attachedCorner || null,
      })),
      counters: counters.map(c => ({
        id: c.id,
        name: c.name,
        value: c.value,
        x: c.x,
        y: c.y,
      })),
      dice: dice.map(d => ({
        id: d.id,
        type: d.type,
        value: d.value,
        maxValue: d.maxValue,
        x: d.x,
        y: d.y,
      })),
      notes: notes.map(n => ({
        id: n.id,
        text: n.text,
        x: n.x,
        y: n.y,
      })),
      maxZIndex: maxZIndex,
    };
  }

  // Save the game state to the backend
  async function saveGameState(name) {
    setSaving(true);
    try {
      const stateData = getGameState();
      const res = await fetch(`/api/games/${id}/saves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, state_data: stateData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      const saved = await res.json();
      setShowSaveModal(false);
      setSaveName('');
      setSaveToast(`Game saved as "${name}"`);
      setTimeout(() => setSaveToast(null), 4000);
      return saved;
    } catch (err) {
      console.error('Save failed:', err);
      setSaveToast(`Save failed: ${err.message}`);
      setTimeout(() => setSaveToast(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  // Load a game state from serialized data
  function loadGameState(stateData) {
    // Parse state_data if it's a string
    let state = stateData;
    if (typeof state === 'string') {
      try {
        state = JSON.parse(state);
      } catch (err) {
        console.error('Failed to parse state_data:', err);
        return;
      }
    }

    // Restore camera
    if (state.camera) {
      const camera = cameraRef.current;
      camera.x = state.camera.x || 0;
      camera.y = state.camera.y || 0;
      camera.zoom = state.camera.zoom || 1;
      setZoomDisplay(Math.round(camera.zoom * 100));
      setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
    }

    // Restore background
    if (state.background && TABLE_BACKGROUNDS[state.background]) {
      setBackground(state.background);
    }

    // Restore loose cards
    const restoredCards = [];
    let restoredMaxZ = 1;

    if (state.cards && Array.isArray(state.cards)) {
      state.cards.forEach(c => {
        restoredCards.push({
          tableId: c.tableId || crypto.randomUUID(),
          cardId: c.cardId,
          name: c.name,
          image_path: c.image_path,
          x: c.x,
          y: c.y,
          zIndex: c.zIndex || 1,
          faceDown: c.faceDown !== undefined ? c.faceDown : !c.face_up,
          rotation: c.rotation || 0,
          inStack: null,
        });
        if (c.zIndex > restoredMaxZ) restoredMaxZ = c.zIndex;
      });
    }

    // Restore stacks
    if (state.stacks && Array.isArray(state.stacks)) {
      state.stacks.forEach(stack => {
        const stackId = stack.stackId || crypto.randomUUID();
        if (stack.cards && Array.isArray(stack.cards)) {
          stack.cards.forEach(c => {
            restoredCards.push({
              tableId: c.tableId || crypto.randomUUID(),
              cardId: c.cardId,
              name: c.name,
              image_path: c.image_path,
              x: stack.x,
              y: stack.y,
              zIndex: c.zIndex || 1,
              faceDown: c.faceDown !== undefined ? c.faceDown : false,
              rotation: c.rotation || 0,
              inStack: stackId,
            });
            if (c.zIndex > restoredMaxZ) restoredMaxZ = c.zIndex;
          });
        }
      });
    }

    setTableCards(restoredCards);
    setMaxZIndex(state.maxZIndex || restoredMaxZ);
    setSelectedCards(new Set());

    // Restore hand
    if (state.hand && Array.isArray(state.hand)) {
      setHandCards(state.hand.map(c => ({
        handId: c.handId || crypto.randomUUID(),
        cardId: c.cardId,
        name: c.name,
        image_path: c.image_path,
      })));
    } else {
      setHandCards([]);
    }

    // Restore markers
    if (state.markers && Array.isArray(state.markers)) {
      setMarkers(state.markers.map(m => ({
        id: m.id || crypto.randomUUID(),
        color: m.color,
        label: m.label || '',
        x: m.x,
        y: m.y,
        attachedTo: m.attachedTo || null,
        attachedCorner: m.attachedCorner || null,
      })));
    } else {
      setMarkers([]);
    }

    // Restore counters
    if (state.counters && Array.isArray(state.counters)) {
      setCounters(state.counters.map(c => ({
        id: c.id || crypto.randomUUID(),
        name: c.name,
        value: c.value,
        x: c.x,
        y: c.y,
      })));
    } else {
      setCounters([]);
    }

    // Restore dice
    if (state.dice && Array.isArray(state.dice)) {
      setDice(state.dice.map(d => ({
        id: d.id || crypto.randomUUID(),
        type: d.type,
        value: d.value,
        maxValue: d.maxValue || { d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 }[d.type] || 6,
        x: d.x,
        y: d.y,
        rolling: false,
      })));
    } else {
      setDice([]);
    }

    // Restore notes
    if (state.notes && Array.isArray(state.notes)) {
      setNotes(state.notes.map(n => ({
        id: n.id || crypto.randomUUID(),
        text: n.text,
        x: n.x,
        y: n.y,
      })));
    } else {
      setNotes([]);
    }

    // Trigger canvas re-render
    setTimeout(() => renderCanvas(), 100);
  }

  // Load save state from URL query param on mount
  useEffect(() => {
    if (saveLoadedRef.current) return;
    const saveId = searchParams.get('saveId');
    if (!saveId) return;

    saveLoadedRef.current = true;
    async function loadSave() {
      try {
        const res = await fetch(`/api/games/${id}/saves/${saveId}`);
        if (!res.ok) {
          console.error('Failed to load save:', res.status);
          return;
        }
        const save = await res.json();
        loadGameState(save.state_data);
        setSaveToast(`Loaded save: "${save.name}"`);
        setTimeout(() => setSaveToast(null), 4000);
      } catch (err) {
        console.error('Failed to load save:', err);
      }
    }
    // Wait for game data and cards to load first
    if (!loading && game) {
      loadSave();
    }
  }, [loading, game, id, searchParams]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Loading game table...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // React onWheel handler for zoom (backup for native event approach)
  function handleGlobalWheel(e) {
    // Only zoom if not over a UI element
    const isUIElement = e.target.closest && e.target.closest('[data-ui-element]');
    if (isUIElement) return;

    const camera = cameraRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom = Math.max(0.2, Math.min(5, camera.zoom * delta));
    setZoomDisplay(Math.round(camera.zoom * 100));
    renderCanvas();
  }

  // React onMouseDown handler for panning (backup for native event approach)
  function handleGlobalMouseDown(e) {
    const isCanvas = e.target === canvasRef.current;
    const isContainer = e.target === containerRef.current;
    const isUIElement = e.target.closest && e.target.closest('[data-ui-element]');
    const isTableCard = e.target.closest && e.target.closest('[data-table-card]');

    if (e.button === 1 || (e.button === 0 && (isCanvas || isContainer) && !isUIElement && !isTableCard)) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
      };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden select-none"
      onMouseDown={handleGlobalMouseDown}
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      onWheel={handleGlobalWheel}
      onClick={handleTableClick}
      data-testid="game-table-container"
    >
      {/* HTML5 Canvas Background */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* Grid highlight overlay when dragging cards */}
      {gridHighlight && draggingCard && (
        <div
          data-testid="grid-highlight"
          className="absolute pointer-events-none z-10"
          style={{
            left: gridHighlight.x - CARD_WIDTH / 2 - 4,
            top: gridHighlight.y - CARD_HEIGHT / 2 - 4,
            width: CARD_WIDTH + 8,
            height: CARD_HEIGHT + 8,
            border: '2px dashed rgba(59, 130, 246, 0.6)',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          }}
        />
      )}

      {/* Table Cards - render stacks and individual cards */}
      {(() => {
        // Group cards by stack, render only the top card of each stack
        // Non-stacked cards render individually
        const stacks = {};
        const individualCards = [];

        tableCards.forEach(card => {
          if (card.inStack) {
            if (!stacks[card.inStack]) stacks[card.inStack] = [];
            stacks[card.inStack].push(card);
          } else {
            individualCards.push(card);
          }
        });

        // Sort stack cards by zIndex to find the top card
        Object.values(stacks).forEach(stack => {
          stack.sort((a, b) => a.zIndex - b.zIndex);
        });

        const renderCard = (card, stackSize = 0, stackId = null) => {
          const isDragging = draggingCard === card.tableId;
          const isSelected = selectedCards.has(card.tableId);
          const isStack = stackSize > 1;

          return (
            <div
              key={card.tableId}
              data-testid={`table-card-${card.tableId}`}
              data-card-name={card.name}
              data-card-id={card.cardId}
              data-table-card="true"
              data-stack-id={stackId || ''}
              data-stack-size={stackSize}
              data-ui-element="true"
              className="absolute select-none group"
              style={{
                left: card.x - CARD_WIDTH / 2,
                top: card.y - CARD_HEIGHT / 2,
                width: CARD_WIDTH,
                height: CARD_HEIGHT + (isStack ? 6 : 0),
                zIndex: isDragging ? 9999 : card.zIndex,
                transform: `scale(${isDragging ? 1.1 : 1}) rotate(${card.rotation || 0}deg)`,
                transition: isDragging ? 'transform 0.1s ease, box-shadow 0.1s ease' : 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: isDragging ? 'grabbing' : 'grab',
                filter: isDragging
                  ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))'
                  : isStack
                    ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
              onMouseDown={(e) => handleCardDragStart(e, card.tableId)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Select this card so context menu operations apply to it
                if (!selectedCards.has(card.tableId)) {
                  setSelectedCards(new Set([card.tableId]));
                }
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  cardTableId: card.tableId,
                  stackId: stackId,
                });
              }}
              title={isStack ? `Stack: ${stackSize} cards` : card.name}
            >
              {/* Stack offset visual - ghost cards behind */}
              {isStack && (
                <>
                  {/* Bottom ghost card */}
                  <div
                    className="absolute rounded-lg border border-white/20 bg-slate-600"
                    style={{
                      left: 4,
                      top: 8,
                      width: CARD_WIDTH - 4,
                      height: CARD_HEIGHT - 4,
                    }}
                  />
                  {/* Middle ghost card (for 3+ stacks) */}
                  {stackSize >= 3 && (
                    <div
                      className="absolute rounded-lg border border-white/20 bg-slate-500"
                      style={{
                        left: 2,
                        top: 4,
                        width: CARD_WIDTH - 2,
                        height: CARD_HEIGHT - 2,
                      }}
                    />
                  )}
                </>
              )}

              {/* Main card visual */}
              <div
                className={`absolute top-0 left-0 rounded-lg overflow-hidden border-2 ${
                  isSelected ? 'border-blue-400 ring-2 ring-blue-400/50' : isStack ? 'border-yellow-400/50' : 'border-white/30'
                }`}
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  backgroundColor: card.faceDown ? '#2d3748' : '#fff',
                }}
              >
                {card.faceDown ? (
                  // Face-down card back
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                    <div className="w-16 h-20 rounded border-2 border-blue-400/30 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  // Face-up card front
                  <div className="w-full h-full relative bg-white">
                    {card.image_path ? (
                      <img
                        src={card.image_path}
                        alt={card.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="text-[8px] text-gray-500 text-center leading-tight truncate w-full px-1">
                          {card.name}
                        </span>
                      </div>
                    )}
                    {/* Card name label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5 truncate px-1">
                      {card.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Stack count badge */}
              {isStack && (
                <div
                  data-testid={`stack-count-${stackId}`}
                  className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center px-1 shadow-lg z-10"
                >
                  {stackSize}
                </div>
              )}

              {/* Hover tooltip for stacks */}
              {isStack && (
                <div
                  data-testid={`stack-tooltip-${stackId}`}
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                >
                  Stack: {stackSize} cards
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Render individual (non-stacked) cards */}
            {individualCards.map(card => renderCard(card, 1, null))}

            {/* Render stacks - only the top card with stack visuals */}
            {Object.entries(stacks).map(([stackId, stackCards]) => {
              const topCard = stackCards[stackCards.length - 1]; // highest zIndex
              return renderCard(topCard, stackCards.length, stackId);
            })}
          </>
        );
      })()}

      {/* Floating Counter Widgets */}
      {counters.map(counter => (
        <div
          key={counter.id}
          data-testid={`counter-${counter.id}`}
          data-counter-name={counter.name}
          data-ui-element="true"
          className="absolute z-20 select-none"
          style={{
            left: counter.x - 70,
            top: counter.y - 40,
            cursor: draggingObj?.id === counter.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'counter', counter.id)}
        >
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-600 p-3 shadow-xl min-w-[140px]">
            <div className="text-xs text-slate-400 text-center mb-1 font-medium truncate" data-testid={`counter-name-${counter.id}`}>
              {counter.name}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); decrementCounter(counter.id); }}
                data-testid={`counter-decrement-${counter.id}`}
                className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-lg flex items-center justify-center transition-colors"
              >
                -
              </button>
              <span
                className="text-xl font-mono font-bold text-white min-w-[40px] text-center"
                data-testid={`counter-value-${counter.id}`}
              >
                {counter.value}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); incrementCounter(counter.id); }}
                data-testid={`counter-increment-${counter.id}`}
                className="w-7 h-7 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteCounter(counter.id); }}
              data-testid={`counter-delete-${counter.id}`}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 text-white text-xs flex items-center justify-center transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      ))}

      {/* Floating Dice Widgets */}
      {dice.map(die => (
        <div
          key={die.id}
          data-testid={`die-${die.id}`}
          data-die-type={die.type}
          data-ui-element="true"
          className="absolute z-20 select-none"
          style={{
            left: die.x - 35,
            top: die.y - 35,
            cursor: draggingObj?.id === die.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'die', die.id)}
        >
          <div
            className={`bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-600 p-2 shadow-xl text-center ${die.rolling ? 'animate-bounce' : ''}`}
            style={{ minWidth: '70px' }}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
              {die.type}
            </div>
            <div
              className={`text-2xl font-mono font-bold text-white ${die.rolling ? 'text-yellow-400' : ''}`}
              data-testid={`die-value-${die.id}`}
            >
              {die.value}
            </div>
            <div className="flex gap-1 mt-1">
              <button
                onClick={(e) => { e.stopPropagation(); rollDie(die.id); }}
                disabled={die.rolling}
                data-testid={`die-roll-${die.id}`}
                className="flex-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium transition-colors disabled:opacity-50"
              >
                {die.rolling ? '...' : 'Roll'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteDie(die.id); }}
                data-testid={`die-delete-${die.id}`}
                className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Floating Marker Widgets */}
      {markers.map(marker => (
        <div
          key={marker.id}
          data-testid={`marker-${marker.id}`}
          data-marker-color={marker.color}
          data-marker-label={marker.label || ''}
          data-marker-attached={marker.attachedTo || ''}
          data-ui-element="true"
          className="absolute z-20 select-none group"
          style={{
            left: marker.x - 15,
            top: marker.y - 15,
            cursor: draggingObj?.id === marker.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'marker', marker.id)}
        >
          {/* Marker circle */}
          <div
            className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${
              marker.attachedTo ? 'border-white/80 scale-90' : 'border-white/50'
            } ${draggingObj?.id === marker.id ? 'scale-125' : ''}`}
            style={{ backgroundColor: marker.color }}
            title={marker.label || `Marker (${marker.color})`}
          >
            {marker.label && (
              <span className="text-white text-[8px] font-bold leading-none drop-shadow-sm">
                {marker.label.substring(0, 3)}
              </span>
            )}
          </div>
          {/* Delete button on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteMarker(marker.id); }}
            data-testid={`marker-delete-${marker.id}`}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
          {/* Attached indicator */}
          {marker.attachedTo && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm" />
          )}
        </div>
      ))}

      {/* Top bar with game name and back button */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none" data-ui-element="true">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => navigate(`/games/${id}`)}
              data-testid="back-to-game-btn"
              className="px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-colors text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="text-white/80 text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg" data-testid="game-table-title">
              {game?.name || 'Game Table'}
            </span>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Card drawer toggle */}
            <button
              onClick={() => setShowCardDrawer(prev => !prev)}
              data-testid="toggle-card-drawer"
              className={`px-3 py-1.5 backdrop-blur-sm text-white rounded-lg transition-colors text-sm flex items-center gap-2 ${
                showCardDrawer ? 'bg-blue-600/70 hover:bg-blue-600' : 'bg-black/50 hover:bg-black/70'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              Cards ({availableCards.length})
            </button>
            <span className="text-white/50 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded" data-testid="zoom-display">
              Zoom: {zoomDisplay}%
            </span>
            <span className="text-white/50 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded" data-testid="pan-display">
              Pan: {panPosition.x},{panPosition.y}
            </span>
          </div>
        </div>
      </div>

      {/* Card Drawer Panel */}
      {showCardDrawer && (
        <div
          className="absolute top-12 right-0 bottom-16 w-64 z-30 pointer-events-auto"
          data-testid="card-drawer"
          data-ui-element="true"
        >
          <div className="h-full bg-black/80 backdrop-blur-md border-l border-white/10 flex flex-col">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-white/90 text-sm font-semibold">Card Library</h3>
              <p className="text-white/50 text-xs mt-1">
                {availableCards.length === 0
                  ? 'No cards imported yet. Go to game details to upload cards.'
                  : `${availableCards.length} card(s) available. Click to place on table.`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {availableCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  <span>No cards yet</span>
                  <button
                    onClick={() => navigate(`/games/${id}`)}
                    className="mt-2 text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    Import Cards
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => placeCardOnTable(card)}
                      data-testid={`drawer-card-${card.id}`}
                      className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-blue-400 transition-all hover:scale-105 bg-slate-700/50"
                      style={{ aspectRatio: '5/7' }}
                      title={`Place "${card.name}" on table`}
                    >
                      {card.image_path ? (
                        <img
                          src={card.image_path}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] text-center py-0.5 truncate px-1">
                        {card.name}
                      </div>
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                          + Place
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {tableCards.length > 0 && (
              <div className="p-2 border-t border-white/10">
                <div className="text-white/50 text-xs text-center">
                  {tableCards.length} card(s) on table
                  {selectedCards.size > 0 && ` | ${selectedCards.size} selected`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toolbar */}
      {showToolbar && (
        <div
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30"
          data-testid="floating-toolbar"
          data-ui-element="true"
        >
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 shadow-2xl border border-white/10">
            {/* Counter button */}
            <button
              onClick={() => setShowCounterModal(true)}
              data-testid="toolbar-counter-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Add Counter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M12 12h.01" />
                <path d="M17 12h.01" />
                <path d="M7 12h.01" />
              </svg>
              <span className="text-[10px]">Counter</span>
            </button>

            {/* Dice button */}
            <button
              onClick={() => setShowDiceModal(true)}
              data-testid="toolbar-dice-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Add Dice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
              <span className="text-[10px]">Dice</span>
            </button>

            {/* Marker button */}
            <button
              onClick={() => setShowMarkerModal(true)}
              data-testid="toolbar-marker-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Add Marker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8" />
              </svg>
              <span className="text-[10px]">Marker</span>
            </button>

            {/* Note button */}
            <button
              onClick={() => setShowNoteModal(true)}
              data-testid="toolbar-note-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Add Note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              <span className="text-[10px]">Note</span>
            </button>

            <div className="w-px h-8 bg-white/20 mx-1" />

            {/* Background picker */}
            <button
              onClick={() => setShowBgPicker(prev => !prev)}
              data-testid="toolbar-bg-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Change Background"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              <span className="text-[10px]">Table</span>
            </button>

            {/* Shortcuts help */}
            <button
              onClick={() => setShowShortcuts(prev => !prev)}
              data-testid="toolbar-shortcuts-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Keyboard Shortcuts (?)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[10px]">Help</span>
            </button>

            {/* Save button */}
            <button
              onClick={() => setShowSaveModal(true)}
              data-testid="toolbar-save-btn"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Save Game"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17,21 17,13 7,13 7,21" />
                <polyline points="7,3 7,8 15,8" />
              </svg>
              <span className="text-[10px]">Save</span>
            </button>
          </div>
        </div>
      )}

      {/* Background Picker Dropdown */}
      {showBgPicker && (
        <div
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40"
          data-testid="bg-picker"
          data-ui-element="true"
        >
          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10">
            <div className="text-white/60 text-xs mb-2 font-medium">Table Background</div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(TABLE_BACKGROUNDS).map(([key, bg]) => (
                <button
                  key={key}
                  onClick={() => { setBackground(key); setShowBgPicker(false); }}
                  data-testid={`bg-option-${key}`}
                  className={`w-12 h-12 rounded-lg border-2 transition-all ${
                    background === key ? 'border-blue-400 scale-110' : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: bg.color }}
                  title={bg.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Counter Creation Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-ui-element="true">
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl border border-slate-600" data-testid="counter-modal">
            <h3 className="text-white font-semibold mb-3">Create Counter</h3>
            <input
              type="text"
              value={newCounterName}
              onChange={(e) => setNewCounterName(e.target.value)}
              placeholder="Counter name (e.g., Health)"
              data-testid="counter-name-input"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCounterName.trim()) {
                  createCounter(newCounterName.trim());
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowCounterModal(false); setNewCounterName(''); }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createCounter(newCounterName.trim())}
                disabled={!newCounterName.trim()}
                data-testid="counter-create-btn"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dice Creation Modal */}
      {showDiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-ui-element="true">
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl border border-slate-600" data-testid="dice-modal">
            <h3 className="text-white font-semibold mb-3">Add Dice</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['d6', 'd8', 'd10', 'd12', 'd20'].map(type => (
                <button
                  key={type}
                  onClick={() => setNewDiceType(type)}
                  data-testid={`dice-type-${type}`}
                  className={`px-3 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${
                    newDiceType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDiceModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createDie(newDiceType)}
                data-testid="dice-create-btn"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Place Dice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marker Creation Modal */}
      {showMarkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-ui-element="true">
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl border border-slate-600" data-testid="marker-modal">
            <h3 className="text-white font-semibold mb-3">Add Marker</h3>
            <div className="mb-3">
              <label className="text-slate-400 text-xs block mb-1">Color</label>
              <div className="grid grid-cols-6 gap-2">
                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewMarkerColor(color)}
                    data-testid={`marker-color-${color.replace('#', '')}`}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newMarkerColor === color ? 'border-white scale-125' : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-slate-400 text-xs block mb-1">Label (optional, max 3 chars)</label>
              <input
                type="text"
                value={newMarkerLabel}
                onChange={(e) => setNewMarkerLabel(e.target.value.substring(0, 3))}
                placeholder="e.g., HP, ATK"
                data-testid="marker-label-input"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowMarkerModal(false); setNewMarkerLabel(''); }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const canvas = canvasRef.current;
                  setMarkers(prev => [...prev, {
                    id: crypto.randomUUID(),
                    color: newMarkerColor,
                    label: newMarkerLabel.trim(),
                    x: (canvas?.width || 800) / 2,
                    y: (canvas?.height || 600) / 2,
                  }]);
                  setShowMarkerModal(false);
                  setNewMarkerLabel('');
                }}
                data-testid="marker-create-btn"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Place Marker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Creation Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-ui-element="true">
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl border border-slate-600" data-testid="note-modal">
            <h3 className="text-white font-semibold mb-3">Add Note</h3>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Type your note..."
              data-testid="note-text-input"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowNoteModal(false); setNewNoteText(''); }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newNoteText.trim()) return;
                  const canvas = canvasRef.current;
                  setNotes(prev => [...prev, {
                    id: crypto.randomUUID(),
                    text: newNoteText.trim(),
                    x: (canvas?.width || 800) / 2,
                    y: (canvas?.height || 600) / 2,
                  }]);
                  setShowNoteModal(false);
                  setNewNoteText('');
                }}
                disabled={!newNoteText.trim()}
                data-testid="note-create-btn"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Game Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-ui-element="true">
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl border border-slate-600" data-testid="save-modal">
            <h3 className="text-white font-semibold mb-3">Save Game</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter save name..."
              data-testid="save-name-input"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveName.trim() && !saving) {
                  saveGameState(saveName.trim());
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowSaveModal(false); setSaveName(''); }}
                data-testid="save-cancel-btn"
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveGameState(saveName.trim())}
                disabled={!saveName.trim() || saving}
                data-testid="save-confirm-btn"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Toast Notification */}
      {saveToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          data-testid="save-toast"
          data-ui-element="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-sm font-medium">{saveToast}</span>
          <button onClick={() => setSaveToast(null)} className="ml-2 text-white/70 hover:text-white">&times;</button>
        </div>
      )}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-ui-element="true">
          <div className="bg-slate-800 rounded-xl p-6 w-96 shadow-2xl border border-slate-600" data-testid="shortcuts-overlay">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="space-y-2">
              {[
                ['F', 'Flip card/stack'],
                ['Q', 'Rotate 90\u00B0 counter-clockwise'],
                ['E', 'Rotate 90\u00B0 clockwise'],
                ['ALT', 'Preview card under cursor'],
                ['G', 'Group selected cards into stack'],
                ['1-9', 'Draw cards from stack'],
                ['Ctrl+Click', 'Multi-select cards'],
                ['?', 'Toggle this help overlay'],
                ['Scroll', 'Zoom in/out'],
                ['Click + Drag', 'Pan the table'],
                ['Right-click', 'Context menu'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-xs font-mono text-slate-300 min-w-[60px] text-center">
                    {key}
                  </kbd>
                  <span className="text-sm text-slate-300">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          data-testid="context-menu"
          data-ui-element="true"
        >
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-600 py-1 min-w-[160px]">
            <button
              onClick={() => { setShowCounterModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Add Counter
            </button>
            <button
              onClick={() => { setShowDiceModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Add Dice
            </button>
            <button
              onClick={() => { setShowMarkerModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Add Marker
            </button>
            <button
              onClick={() => { setShowNoteModal(true); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Add Note
            </button>
            {selectedCards.size > 0 && (
              <>
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => {
                    // Pick up selected cards to hand
                    const selected = Array.from(selectedCards);
                    selected.forEach(tid => pickUpToHand(tid));
                    setContextMenu(null);
                  }}
                  data-testid="context-pick-up-to-hand"
                  className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-slate-700 hover:text-green-300 transition-colors"
                >
                  Pick up to Hand
                </button>
                <button
                  onClick={() => {
                    selectedCards.forEach(tid => removeCardFromTable(tid));
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                >
                  Remove Selected Card(s)
                </button>
              </>
            )}
            <div className="border-t border-slate-700 my-1" />
            <button
              onClick={() => setContextMenu(null)}
              className="w-full px-4 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Click handler to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Player Hand Area - bottom of screen, auto-hides when empty */}
      {handCards.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none"
          data-testid="hand-area"
          data-ui-element="true"
        >
          <div className="flex justify-center items-end pb-2 pointer-events-auto">
            <div
              className="relative flex items-end justify-center bg-black/40 backdrop-blur-sm rounded-t-xl border border-b-0 border-white/10 px-4 pt-2 pb-1 min-h-[120px]"
              data-testid="hand-container"
              style={{ minWidth: Math.min(handCards.length * 90 + 40, 800) }}
            >
              <div className="absolute top-1 left-3 text-white/40 text-[10px] uppercase tracking-wider font-semibold">
                Hand ({handCards.length})
              </div>
              <div className="flex items-end justify-center" style={{ gap: '2px' }}>
                {handCards.map((card, index) => {
                  const totalCards = handCards.length;
                  const spreadAngle = Math.min(5, 30 / totalCards);
                  const centerIndex = (totalCards - 1) / 2;
                  const rotation = (index - centerIndex) * spreadAngle;
                  const yOffset = Math.abs(index - centerIndex) * 4;
                  const isHovered = hoveredHandCard === card.handId;
                  const isDragging = draggingHandCard === index;
                  const isDragOver = handDragOverIndex === index;
                  return (
                    <div
                      key={card.handId}
                      data-testid={`hand-card-${card.handId}`}
                      data-hand-card="true"
                      data-card-name={card.name}
                      draggable
                      onDragStart={(e) => handleHandDragStart(e, index)}
                      onDragOver={(e) => handleHandDragOver(e, index)}
                      onDrop={(e) => handleHandDrop(e, index)}
                      onDragEnd={handleHandDragEnd}
                      onMouseEnter={() => setHoveredHandCard(card.handId)}
                      onMouseLeave={() => setHoveredHandCard(null)}
                      className={`relative cursor-pointer transition-all duration-200 flex-shrink-0 ${isDragging ? 'opacity-30' : ''} ${isDragOver ? 'scale-105' : ''}`}
                      style={{
                        width: 80,
                        height: 112,
                        transform: `rotate(${rotation}deg) translateY(${isHovered ? -30 - yOffset : -yOffset}px) scale(${isHovered ? 1.15 : 1})`,
                        zIndex: isHovered ? 100 : index,
                        marginLeft: index === 0 ? 0 : -10,
                        transition: 'transform 0.2s ease, opacity 0.15s ease',
                      }}
                    >
                      <div
                        className={`w-full h-full rounded-lg overflow-hidden border-2 shadow-lg ${isHovered ? 'border-yellow-400 shadow-yellow-400/30' : isDragOver ? 'border-blue-400' : 'border-white/30'}`}
                        style={{ backgroundColor: '#fff' }}
                      >
                        {card.image_path ? (
                          <img src={card.image_path} alt={card.name} className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                            <span className="text-[7px] text-gray-500 text-center leading-tight truncate w-full px-1">{card.name}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[7px] text-center py-0.5 truncate px-1">{card.name}</div>
                      </div>
                      {isHovered && (
                        <button
                          onClick={(e) => { e.stopPropagation(); playCardFromHand(card.handId); }}
                          data-testid={`hand-play-${card.handId}`}
                          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-50 transition-colors"
                        >
                          Play
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hand card hover preview - large zoom */}
      {hoveredHandCard && (() => {
        const card = handCards.find(c => c.handId === hoveredHandCard);
        if (!card) return null;
        return (
          <div className="fixed z-50 pointer-events-none" data-testid="hand-card-preview" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -70%)' }}>
            <div className="rounded-xl overflow-hidden border-2 border-yellow-400 shadow-2xl shadow-black/50" style={{ width: 200, height: 280, backgroundColor: '#fff' }}>
              {card.image_path ? (
                <img src={card.image_path} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  <span className="text-sm text-gray-500 text-center px-4">{card.name}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs text-center py-1 px-2 truncate">{card.name}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
