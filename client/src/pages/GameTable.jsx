import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  // Game objects state (counters, dice, markers, notes)
  const [counters, setCounters] = useState([]);
  const [dice, setDice] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [notes, setNotes] = useState([]);

  // Toolbar modals
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newDiceType, setNewDiceType] = useState('d6');
  const [newMarkerColor, setNewMarkerColor] = useState('#ff0000');
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
    // We'll draw them with camera transform too for positioning consistency
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-width / 2 + camera.x, -height / 2 + camera.y);

    // Draw markers
    markers.forEach(marker => {
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = marker.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

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
      renderCanvas();
    }

    function handleMouseDown(e) {
      // Middle mouse button or left click on empty area for panning
      if (e.button === 1 || (e.button === 0 && !e.target.closest('[data-ui-element]'))) {
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

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
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
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Counter functions
  function createCounter(name) {
    const canvas = canvasRef.current;
    const newCounter = {
      id: crypto.randomUUID(),
      name: name || 'Counter',
      value: 0,
      x: (canvas?.width || 800) / 2,
      y: (canvas?.height || 600) / 2,
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
    // Start rolling animation
    setDice(prev => prev.map(d =>
      d.id === dieId ? { ...d, rolling: true } : d
    ));

    // Animate rolling
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

  // Drag handlers for floating objects (counters, dice)
  function handleObjDragStart(e, objType, objId) {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const obj = objType === 'counter'
      ? counters.find(c => c.id === objId)
      : dice.find(d => d.id === objId);

    if (!obj) return;

    dragOffsetRef.current = {
      x: e.clientX - (obj.x || 0),
      y: e.clientY - (obj.y || 0),
    };
    setDraggingObj({ type: objType, id: objId });
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
    }
  }

  function handleObjDragEnd() {
    setDraggingObj(null);
  }

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

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden select-none"
      onMouseMove={draggingObj ? handleObjDragMove : undefined}
      onMouseUp={draggingObj ? handleObjDragEnd : undefined}
      data-testid="game-table-container"
    >
      {/* PixiJS Canvas (HTML5 Canvas implementation) */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

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
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{ opacity: undefined }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
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
            <span className="text-white/50 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
              Zoom: {Math.round(cameraRef.current.zoom * 100)}%
            </span>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-6 gap-2 mb-4">
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'].map(color => (
                <button
                  key={color}
                  onClick={() => setNewMarkerColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    newMarkerColor === color ? 'border-white scale-125' : 'border-slate-600 hover:border-slate-400'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowMarkerModal(false)}
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
                    x: (canvas?.width || 800) / 2,
                    y: (canvas?.height || 600) / 2,
                  }]);
                  setShowMarkerModal(false);
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
                ['Q', 'Rotate 90° counter-clockwise'],
                ['E', 'Rotate 90° clockwise'],
                ['ALT', 'Preview card under cursor'],
                ['G', 'Group selected cards into stack'],
                ['1-9', 'Draw cards from stack'],
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
    </div>
  );
}
