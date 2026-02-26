import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import HoverCard from '../components/HoverCard';
import SwipeModal from '../components/SwipeModal';
import MobileActionBar from '../components/MobileActionBar';
import { useOrientationLayout } from '../hooks/useOrientationLayout';
import PlayerHUD from '../components/PlayerHUD';
import PlayerCursors from '../components/PlayerCursor';
import ZoneOverlay from '../components/ZoneOverlay';
import ZoneEditor from '../components/ZoneEditor';
import SetupSequenceEditor from '../components/SetupSequenceEditor';
import { executeSequence } from '../utils/sequenceExecutor.js';
import { getPointerPosition, handleTouchPrevention, isTouchEvent, getDeviceInfo, isTouchDevice, isMobileDevice, isTabletDevice, isSmartphone, getTouchDistance, getTouchCenter } from '../utils/touchUtils';
import { triggerHaptic, cancelHaptic } from '../utils/hapticUtils';

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

/**
 * Returns the display dimensions for a card based on its actual image aspect ratio.
 * Landscape cards (width > height) swap the default portrait dimensions so the
 * card fills its container correctly without being cropped.
 */
function getCardDims(card) {
  if (card && card.width > 0 && card.height > 0 && card.width > card.height) {
    // Landscape card – swap so it renders in landscape orientation
    return { w: CARD_HEIGHT, h: CARD_WIDTH };
  }
  return { w: CARD_WIDTH, h: CARD_HEIGHT };
}
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

// Texture cache - generate once, reuse on every frame
const textureCache = {};

function getOrCreateTexture(type, width, height, baseColor) {
  const key = `${type}-${width}-${height}-${baseColor}`;
  if (textureCache[key]) return textureCache[key];

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');

  if (type === 'felt') {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (type === 'wood') {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);
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
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  } else {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.2,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.02)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  textureCache[key] = offscreen;
  return offscreen;
}

// Draw cached texture pattern onto context
function drawFeltPattern(ctx, width, height, baseColor) {
  const tex = getOrCreateTexture('felt', width, height, baseColor);
  ctx.drawImage(tex, 0, 0);
}

function drawWoodPattern(ctx, width, height, baseColor) {
  const tex = getOrCreateTexture('wood', width, height, baseColor);
  ctx.drawImage(tex, 0, 0);
}

function drawSolidBackground(ctx, width, height, color) {
  const tex = getOrCreateTexture('solid', width, height, color);
  ctx.drawImage(tex, 0, 0);
}

// Token shape components
function TokenShape({ shape, color, size = 30, label = '', imageUrl = null }) {
  const commonClasses = "flex items-center justify-center shadow-lg border-2 border-white/60";
  const textClasses = "text-white sm:text-[10px] text-xs font-bold leading-none drop-shadow-sm";

  switch (shape) {
    case 'circle':
      return (
        <div
          className={`${commonClasses} rounded-full`}
          style={{ width: size, height: size, backgroundColor: color }}
          title={label || 'Circle Token'}
        >
          {label && <span className={textClasses}>{label.substring(0, 3)}</span>}
        </div>
      );

    case 'square':
      return (
        <div
          className={`${commonClasses} rounded-sm`}
          style={{ width: size, height: size, backgroundColor: color }}
          title={label || 'Square Token'}
        >
          {label && <span className={textClasses}>{label.substring(0, 3)}</span>}
        </div>
      );

    case 'triangle':
      return (
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
          title={label || 'Triangle Token'}
        >
          <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-lg">
            <polygon
              points="50,10 90,90 10,90"
              fill={color}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="4"
            />
          </svg>
          {label && (
            <span className={`${textClasses} absolute`} style={{ top: '55%' }}>
              {label.substring(0, 3)}
            </span>
          )}
        </div>
      );

    case 'star':
      return (
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
          title={label || 'Star Token'}
        >
          <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-lg">
            <polygon
              points="50,5 61,38 95,38 68,58 79,91 50,71 21,91 32,58 5,38 39,38"
              fill={color}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="3"
            />
          </svg>
          {label && (
            <span className={`${textClasses} absolute`}>
              {label.substring(0, 3)}
            </span>
          )}
        </div>
      );

    case 'hexagon':
      return (
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
          title={label || 'Hexagon Token'}
        >
          <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-lg">
            <polygon
              points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
              fill={color}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="4"
            />
          </svg>
          {label && (
            <span className={`${textClasses} absolute`}>
              {label.substring(0, 3)}
            </span>
          )}
        </div>
      );

    case 'diamond':
      return (
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
          title={label || 'Diamond Token'}
        >
          <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-lg">
            <polygon
              points="50,10 90,50 50,90 10,50"
              fill={color}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="4"
            />
          </svg>
          {label && (
            <span className={`${textClasses} absolute`}>
              {label.substring(0, 3)}
            </span>
          )}
        </div>
      );

    case 'image':
      return (
        <div
          className="relative shadow-lg rounded-sm overflow-hidden"
          style={{ width: size, height: size }}
          title={label || 'Image Token'}
        >
          <img src={imageUrl} alt={label || 'token'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
        </div>
      );

    default:
      return (
        <div
          className={`${commonClasses} rounded-full`}
          style={{ width: size, height: size, backgroundColor: color }}
        >
          {label && <span className={textClasses}>{label.substring(0, 3)}</span>}
        </div>
      );
  }
}

export default function GameTable({ room = null }) {
  const { id: routeId } = useParams();
  // In multiplayer mode, room.gameId takes precedence over the URL param
  const id = room?.gameId || routeId;
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

  // Setup state
  const [setupMode, setSetupMode] = useState(false);
  const [showSetupSaveModal, setShowSetupSaveModal] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [savingSetup, setSavingSetup] = useState(false);
  const [editingSetupId, setEditingSetupId] = useState(null);
  const [sequenceSteps, setSequenceSteps] = useState([]);
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);
  const setupLoadedRef = useRef(false);

  // Multiplayer state
  const [zones, setZones] = useState([]);
  const applyingRemoteRef = useRef(false);
  const roomRef = useRef(null);

  // Register remote action handler on mount (used by MultiplayerGame wrapper)
  useEffect(() => {
    if (room?.registerActionHandler) {
      room.registerActionHandler(applyRemoteAction);
      roomRef.current = { onAction: applyRemoteAction };
    }
  }, [room]);

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const isPinchingRef = useRef(false);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const [zoomDisplay, setZoomDisplay] = useState(100); // reactive zoom % for display
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 }); // reactive pan position for display

  // Convert screen (pixel) coordinates to world coordinates accounting for camera zoom and pan
  // The CSS transform on the world wrapper is: scale(zoom) translate(cam.x, cam.y) with transform-origin 50% 50%
  // This means: screenPos = center + (worldPos + cam - center) * zoom  (where center is container center)
  //           => worldPos = (screenPos - center) / zoom - cam + center
  function screenToWorld(screenX, screenY) {
    const container = containerRef.current;
    if (!container) return { x: screenX, y: screenY };
    const rect = container.getBoundingClientRect();
    const camera = cameraRef.current;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const relX = screenX - rect.left;
    const relY = screenY - rect.top;
    return {
      x: (relX - centerX) / camera.zoom - camera.x + centerX,
      y: (relY - centerY) / camera.zoom - camera.y + centerY,
    };
  }

  // Game objects state (counters, dice, hitDice, notes, tokens, textFields)
  const [counters, setCounters] = useState([]);
  const [dice, setDice] = useState([]);
  const [hitDice, setHitDice] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [boards, setBoards] = useState([]);
  const [textFields, setTextFields] = useState([]);
  const [customDiceOnTable, setCustomDiceOnTable] = useState([]);

  // Card state
  const [availableCards, setAvailableCards] = useState([]); // cards from game's card library
  const [categories, setCategories] = useState([]); // card categories/folders
  const [cardBacks, setCardBacks] = useState([]); // card back images for the game
  const [expandedCategories, setExpandedCategories] = useState(new Set()); // expanded category IDs
  const [tableCards, setTableCards] = useState([]); // cards placed on the table
  const [showCardDrawer, setShowCardDrawer] = useState(false);
  const [draggingCard, setDraggingCard] = useState(null); // card being dragged on table
  const [selectedCards, setSelectedCards] = useState(new Set()); // selected card IDs for grouping
  const cardDragOffsetRef = useRef({ x: 0, y: 0 });
  const [maxZIndex, setMaxZIndex] = useState(1);
  const [gridHighlight, setGridHighlight] = useState(null); // {x, y} of grid highlight position
  const [stackDropTarget, setStackDropTarget] = useState(null); // stackId of stack being targeted for drop
  const [stackNames, setStackNames] = useState({}); // stackId → name for named stacks
  const [hoveredTableCard, setHoveredTableCard] = useState(null); // tableId of card being hovered
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); // mouse position for hover preview
  const [altKeyHeld, setAltKeyHeld] = useState(false); // whether ALT key is currently held

  // Hand state
  const [handCards, setHandCards] = useState([]); // cards in player's hand
  const [hoveredHandCard, setHoveredHandCard] = useState(null); // card being hovered in hand (for preview)
  const [draggingHandCard, setDraggingHandCard] = useState(null); // card being dragged within hand
  const [handDragOverIndex, setHandDragOverIndex] = useState(null); // index being dragged over for reorder

  // Toolbar modals
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [showHitDiceModal, setShowHitDiceModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newDiceType, setNewDiceType] = useState('d6');
  const [newNoteText, setNewNoteText] = useState('');
  const [newTokenShape, setNewTokenShape] = useState('circle');
  const [newTokenColor, setNewTokenColor] = useState('#3b82f6');
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [imageTokenLibrary, setImageTokenLibrary] = useState([]);
  const [customDiceLibrary, setCustomDiceLibrary] = useState([]);
  const [showTextFieldModal, setShowTextFieldModal] = useState(false);
  const [newTextFieldText, setNewTextFieldText] = useState('');
  const [newTextFieldFontSize, setNewTextFieldFontSize] = useState(16);
  const [newTextFieldColor, setNewTextFieldColor] = useState('#ffffff');
  const [editingTextFieldId, setEditingTextFieldId] = useState(null);
  const [editingTextFieldText, setEditingTextFieldText] = useState('');
  const [editingTextFieldFontSize, setEditingTextFieldFontSize] = useState(16);
  const [editingTextFieldColor, setEditingTextFieldColor] = useState('#ffffff');

  // Legend state
  const [showLegend, setShowLegend] = useState(true);

  // Drag state for objects
  const [draggingObj, setDraggingObj] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Number key draw state (TTS-style: press 1-9 or multi-digit like '10' to draw from stack)
  const numberKeyBufferRef = useRef('');
  const numberKeyTimeoutRef = useRef(null);
  const [drawToast, setDrawToast] = useState(null); // toast notification for draw action

  // Split stack modal state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitStackId, setSplitStackId] = useState(null);
  const [splitCount, setSplitCount] = useState('');

  // Browse stack modal state
  const [browseStackId, setBrowseStackId] = useState(null);

  // Press-and-hold state for stack interaction
  const pressHoldTimerRef = useRef(null);
  const [pressHoldActive, setPressHoldActive] = useState(false);
  const PRESS_HOLD_DELAY = 500; // milliseconds to distinguish quick-click from press-hold
  // Track the pending stack interaction (which card was pressed, which stack it's in)
  const pendingStackRef = useRef(null); // { tableId, stackId, event }

  // Double-tap detection for mobile gestures
  const lastTapRef = useRef({ time: 0, cardId: null, x: 0, y: 0, count: 0 });
  const DOUBLE_TAP_DELAY = 350; // milliseconds
  const DOUBLE_TAP_DISTANCE = 30; // pixels
  const pendingTouchRef = useRef(null); // { tableId, event, timer } - delays drag start to detect taps
  const singleTapTimerRef = useRef(null); // timer to delay single-tap action (allows double-tap to cancel)
  const TOUCH_TAP_THRESHOLD = 150; // ms - finger must stay down longer than this to start drag

  // Long-press card preview for touch devices (Feature #58)
  const [longPressPreviewCard, setLongPressPreviewCard] = useState(null); // tableId of card being previewed via long-press
  const longPressPreviewTimerRef = useRef(null);
  const longPressPreviewTouchPosRef = useRef({ x: 0, y: 0 }); // initial touch position to detect movement
  const LONG_PRESS_PREVIEW_DELAY = 500; // milliseconds for long-press to trigger preview

  // Hand-to-table drag state
  const [draggingFromHand, setDraggingFromHand] = useState(null); // handId of card being dragged from hand to table
  const handToTableDragOffsetRef = useRef({ x: 0, y: 0 });
  const [handDragPosition, setHandDragPosition] = useState({ x: 0, y: 0 }); // cursor position during hand-to-table drag

  // Swipe gesture state for drawer
  const drawerSwipeRef = useRef(null); // { startX, startY, startTime }
  const [drawerSwipeOffset, setDrawerSwipeOffset] = useState(0); // pixel offset during swipe (for visual feedback)
  const [isSwipingDrawer, setIsSwipingDrawer] = useState(false);
  const drawerSwipeLockRef = useRef(null); // 'horizontal' | 'vertical' | null

  // Detect touch capability
  const isTouchCapableRef = useRef(
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  // Orientation detection for landscape layout optimization
  const { isLandscape, isMobileLandscape, isTabletLandscape, layoutMode } = useOrientationLayout();

  // Track if hand area is collapsed in landscape mode
  const [handCollapsed, setHandCollapsed] = useState(false);

  // Device detection and debugging on mount
  useEffect(() => {
    // Device detection on mount

    // Log comprehensive device information
    const deviceInfo = getDeviceInfo();

    const handleResize = () => {};
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`/api/games/${id}/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    if (id) fetchCategories();
  }, [id]);

  // Fetch card backs for the game
  useEffect(() => {
    async function fetchCardBacks() {
      try {
        const res = await fetch(`/api/games/${id}/card-backs`);
        if (res.ok) {
          const data = await res.json();
          setCardBacks(data);
        }
      } catch (err) {
        console.error('Failed to fetch card backs:', err);
      }
    }
    if (id) fetchCardBacks();
  }, [id]);

  // Build a lookup map from card_back_id to image_path for quick access
  const cardBackMap = React.useMemo(() => {
    const map = {};
    cardBacks.forEach(cb => {
      map[cb.id] = cb.image_path;
    });
    return map;
  }, [cardBacks]);

  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const camera = cameraRef.current;

    // Clear and fill with background base color so no gaps show at any zoom
    const bg = TABLE_BACKGROUNDS[background];
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);

    // Save context state
    ctx.save();

    // Apply camera transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-width / 2 + camera.x, -height / 2 + camera.y);

    // Draw textured background at a fixed reasonable size (3x viewport)
    // The base color fill above ensures no gaps at any zoom level
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

    // Tokens are now rendered as DOM overlays (not on canvas)

    // Notes are now rendered as DOM overlays (not on canvas)

    ctx.restore();
  }, [background, counters, dice]);

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
  }, [background, counters, dice, renderCanvas]);

  // Mouse event handlers for canvas (pan & zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e) {
      e.preventDefault();
      const camera = cameraRef.current;
      const rect = canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Convert cursor to world coordinates before zoom
      const worldX = (cursorX - rect.width / 2) / camera.zoom + camera.x;
      const worldY = (cursorY - rect.height / 2) / camera.zoom + camera.y;

      // Apply zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      camera.zoom = Math.max(0.2, Math.min(5, camera.zoom * delta));

      // Adjust camera to keep world point under cursor fixed
      camera.x = worldX - (cursorX - rect.width / 2) / camera.zoom;
      camera.y = worldY - (cursorY - rect.height / 2) / camera.zoom;

      setZoomDisplay(Math.round(camera.zoom * 100));
      setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
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
      // Track ALT key for card preview
      if (e.key === 'Alt') {
        e.preventDefault();
        setAltKeyHeld(true);
      }

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
              if (room) room.sendAction({ type: 'card_flip', table_id: c.tableId, face_down: !c.faceDown });
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
              if (room) room.sendAction({ type: 'card_rotate', table_id: c.tableId, rotation: (c.rotation || 0) + 90 });
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
              if (room) room.sendAction({ type: 'card_rotate', table_id: c.tableId, rotation: (c.rotation || 0) - 90 });
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

      // Number keys 0-9: draw cards from hovered/selected stack to hand (TTS-style)
      if (e.key >= '0' && e.key <= '9') {
        // Find the stack under the hovered card or selected card
        let targetStackId = null;
        if (hoveredTableCard) {
          const hovCard = tableCards.find(c => c.tableId === hoveredTableCard);
          if (hovCard && hovCard.inStack) {
            targetStackId = hovCard.inStack;
          }
        }
        if (!targetStackId && selectedCards.size > 0) {
          // Check if any selected card is in a stack
          for (const tid of selectedCards) {
            const sc = tableCards.find(c => c.tableId === tid);
            if (sc && sc.inStack) {
              targetStackId = sc.inStack;
              break;
            }
          }
        }

        if (targetStackId) {
          e.preventDefault();
          // Append digit to buffer
          numberKeyBufferRef.current += e.key;

          // Clear any existing timeout
          if (numberKeyTimeoutRef.current) {
            clearTimeout(numberKeyTimeoutRef.current);
          }

          // Set a 1-second delay to allow multi-digit input (e.g., '10')
          const capturedStackId = targetStackId;
          numberKeyTimeoutRef.current = setTimeout(() => {
            const count = parseInt(numberKeyBufferRef.current, 10);
            numberKeyBufferRef.current = '';
            numberKeyTimeoutRef.current = null;
            if (count > 0) {
              drawCardsFromStack(capturedStackId, count);
            }
          }, 1000);
        }
      }
    }

    function handleKeyUp(e) {
      if (e.key === 'Alt') {
        setAltKeyHeld(false);
      }
    }

    // Clear ALT state if window loses focus
    function handleBlur() {
      setAltKeyHeld(false);
      // Clear number key buffer
      numberKeyBufferRef.current = '';
      if (numberKeyTimeoutRef.current) {
        clearTimeout(numberKeyTimeoutRef.current);
        numberKeyTimeoutRef.current = null;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      // Clean up number key timeout
      if (numberKeyTimeoutRef.current) {
        clearTimeout(numberKeyTimeoutRef.current);
      }
    };
  }, [selectedCards, tableCards, hoveredTableCard]);

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
      card_back_id: card.card_back_id || null,
      width: card.width || 0,
      height: card.height || 0,
      x: 250 + col * 150 + (Math.random() - 0.5) * 30,
      y: 300 + row * 180 + (Math.random() - 0.5) * 30,
      zIndex: newZIndex,
      faceDown: false,
      rotation: 0,
      inStack: null, // stack ID if in a stack
    };
    setTableCards(prev => [...prev, newTableCard]);
  }

  // Place an entire category (all cards in a category) as a stack on the table
  function placeCategoryAsStack(categoryId) {
    const categoryCards = availableCards.filter(card => card.category_id === categoryId);
    if (categoryCards.length === 0) {
      console.warn('No cards in this category to place');
      return;
    }

    // Create a unique stack ID for this category stack
    const stackId = crypto.randomUUID();

    // Calculate position for the stack (centered area with slight offset)
    const existingCount = tableCards.length;
    const col = existingCount % 4;
    const row = Math.floor(existingCount / 4);
    const stackX = 250 + col * 150;
    const stackY = 300 + row * 180;

    // Create table cards for each card in the category
    const newTableCards = categoryCards.map((card, index) => {
      const newZIndex = maxZIndex + 1 + index;
      return {
        tableId: crypto.randomUUID(),
        cardId: card.id,
        name: card.name,
        image_path: card.image_path,
        card_back_id: card.card_back_id || null,
        width: card.width || 0,
        height: card.height || 0,
        x: stackX,
        y: stackY,
        zIndex: newZIndex,
        faceDown: false,
        rotation: 0,
        inStack: stackId, // All cards belong to the same stack
      };
    });

    // Update max z-index
    setMaxZIndex(maxZIndex + categoryCards.length);

    // Add all cards to the table at once
    setTableCards(prev => [...prev, ...newTableCards]);

    // Name the stack after the category
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setStackNames(prev => ({ ...prev, [stackId]: category.name }));
    }
  }

  // Handle a completed tap (finger down + quick release) on mobile
  // Tap handling: 1x = select (action bar), 2x = preview, 3x = context menu
  function handleCardTap(tableId, clientX, clientY) {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    const timeSinceLastTap = now - lastTap.time;
    const distance = Math.sqrt(
      Math.pow(clientX - lastTap.x, 2) +
      Math.pow(clientY - lastTap.y, 2)
    );

    const isContinuation = timeSinceLastTap < DOUBLE_TAP_DELAY &&
      distance < DOUBLE_TAP_DISTANCE &&
      lastTap.cardId === tableId;

    const tapCount = isContinuation ? lastTap.count + 1 : 1;

    // Cancel any pending single-tap timer
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }

    if (tapCount >= 2) {
      // Double tap → show enlarged card preview
      triggerHaptic('action');
      setLongPressPreviewCard(tableId);
      lastTapRef.current = { time: 0, cardId: null, x: 0, y: 0, count: 0 };
    } else {
      // Single tap → select card (shows action bar), delayed to allow double-tap
      lastTapRef.current = { time: now, cardId: tableId, x: clientX, y: clientY, count: 1 };
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        triggerHaptic('action');
        // Select the tapped card (shows MobileActionBar)
        const card = tableCards.find(c => c.tableId === tableId);
        if (card?.inStack) {
          const stackCardIds = tableCards.filter(c => c.inStack === card.inStack).map(c => c.tableId);
          setSelectedCards(new Set(stackCardIds));
        } else {
          setSelectedCards(new Set([tableId]));
        }
      }, DOUBLE_TAP_DELAY);
    }
  }

  function handleCardDragStart(e, tableId) {
    // Only start drag on left mouse button (button 0) - ignore right-click (button 2)
    if (!isTouchEvent(e) && e.button !== 0) return;

    // For touch events: delay drag start to detect taps vs holds
    if (isTouchEvent(e)) {
      handleTouchPrevention(e);
      const pointer = getPointerPosition(e);

      // Cancel any existing pending touch
      if (pendingTouchRef.current?.timer) {
        clearTimeout(pendingTouchRef.current.timer);
      }

      // Store pending touch - if finger lifts before threshold, it's a tap
      const savedPointer = { clientX: pointer.clientX, clientY: pointer.clientY };
      pendingTouchRef.current = {
        tableId,
        clientX: pointer.clientX,
        clientY: pointer.clientY,
        timer: setTimeout(() => {
          // Finger held down long enough → start actual drag
          if (pendingTouchRef.current && pendingTouchRef.current.tableId === tableId) {
            pendingTouchRef.current = null;
            // Create a minimal event-like object with saved coordinates (original event is stale)
            const fakeEvent = { clientX: savedPointer.clientX, clientY: savedPointer.clientY, preventDefault: () => {}, stopPropagation: () => {}, touches: [savedPointer], button: 0, ctrlKey: false, metaKey: false, shiftKey: false, type: 'touchstart' };
            actualCardDragStart(fakeEvent, tableId);
          }
        }, TOUCH_TAP_THRESHOLD),
      };
      return;
    }

    // Mouse events start drag immediately
    e.preventDefault();
    e.stopPropagation();
    actualCardDragStart(e, tableId);
  }

  // Actually start dragging a card (called after tap detection for touch, immediately for mouse)
  function actualCardDragStart(e, tableId) {

    const card = tableCards.find(c => c.tableId === tableId);
    if (!card) return;

    // Don't drag locked cards/stacks
    if (card.locked) return;

    // Get unified pointer position (works for both mouse and touch)
    const pointer = getPointerPosition(e);
    const stackId = card.inStack;

    // If card is in a stack, implement press-and-hold behavior
    if (stackId) {
      const stackCards = tableCards.filter(c => c.inStack === stackId);

      // Only apply press-and-hold if stack has 2+ cards
      if (stackCards.length >= 2) {
        // Find the top card (highest zIndex) - this is the one we'll detach on short press + move
        const topCard = stackCards.reduce((max, c) => c.zIndex > max.zIndex ? c : max);

        // Store pending stack info so handleCardDragMove knows what to do
        pendingStackRef.current = { tableId: topCard.tableId, stackId, event: e };

        // Start timer for press-and-hold (long press = drag entire stack)
        pressHoldTimerRef.current = setTimeout(() => {
          // Haptic feedback on long-press recognition (medium vibration)
          triggerHaptic('longPress');
          // After delay, allow dragging the entire stack
          setPressHoldActive(true);
          pendingStackRef.current = null;
          startDraggingCard(e, topCard.tableId, topCard, stackId);
        }, PRESS_HOLD_DELAY);

        // Store initial pointer position to detect if pointer moves (use world coords for offset)
        const worldPos = screenToWorld(pointer.clientX, pointer.clientY);
        cardDragOffsetRef.current = {
          x: worldPos.x - topCard.x,
          y: worldPos.y - topCard.y,
          initialX: pointer.clientX,
          initialY: pointer.clientY,
        };
        return;
      }
    }

    // For single cards or non-stacks, start dragging immediately
    startDraggingCard(e, tableId, card, stackId);
  }

  // Helper function to actually start dragging a card
  function startDraggingCard(e, tableId, card, stackId) {
    // Haptic feedback on drag start (short vibration)
    triggerHaptic('dragStart');

    const newZ = maxZIndex + 1;

    // Get unified pointer position
    const pointer = getPointerPosition(e);

    if (stackId) {
      const stackCards = tableCards.filter(c => c.inStack === stackId).sort((a, b) => a.zIndex - b.zIndex);
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

    const worldPointer = screenToWorld(pointer.clientX, pointer.clientY);
    cardDragOffsetRef.current = {
      x: worldPointer.x - card.x,
      y: worldPointer.y - card.y,
    };
    setDraggingCard(tableId);

    // Select the card if not already selected (and not ctrl/shift-clicking)
    // Note: Touch events don't have ctrlKey/shiftKey, so they'll always follow the default path
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      // For stacks, select all cards in the stack
      if (stackId) {
        const stackCardIds = tableCards.filter(c => c.inStack === stackId).map(c => c.tableId);
        setSelectedCards(new Set(stackCardIds));
      } else {
        setSelectedCards(new Set([tableId]));
      }
    } else {
      // Toggle selection with ctrl or shift (shift adds to selection)
      setSelectedCards(prev => {
        const next = new Set(prev);
        if (e.shiftKey && !e.ctrlKey) {
          // Shift: always add to selection
          if (stackId) {
            tableCards.filter(c => c.inStack === stackId).forEach(c => next.add(c.tableId));
          } else {
            next.add(tableId);
          }
        } else {
          // Ctrl: toggle selection
          if (next.has(tableId)) {
            next.delete(tableId);
          } else {
            next.add(tableId);
          }
        }
        return next;
      });
    }
  }

  // Handle card drag move
  function handleCardDragMove(e) {
    // Get unified pointer position
    const pointer = getPointerPosition(e);

    // Cancel long-press preview timer if finger moves (Feature #58)
    if (longPressPreviewTimerRef.current) {
      const lpDx = Math.abs(pointer.clientX - longPressPreviewTouchPosRef.current.x);
      const lpDy = Math.abs(pointer.clientY - longPressPreviewTouchPosRef.current.y);
      if (lpDx > 8 || lpDy > 8) {
        clearTimeout(longPressPreviewTimerRef.current);
        longPressPreviewTimerRef.current = null;
      }
    }

    // If timer is active and pointer moves significantly, cancel timer and detach top card from stack
    if (pressHoldTimerRef.current && cardDragOffsetRef.current.initialX !== undefined) {
      const dx = Math.abs(pointer.clientX - cardDragOffsetRef.current.initialX);
      const dy = Math.abs(pointer.clientY - cardDragOffsetRef.current.initialY);
      if (dx > 5 || dy > 5) {
        // Pointer moved before long-press timer - cancel timer
        clearTimeout(pressHoldTimerRef.current);
        pressHoldTimerRef.current = null;
        setPressHoldActive(true);

        // Short press + move: detach only the top card from the stack
        if (!draggingCard && pendingStackRef.current) {
          const { tableId: topCardId, stackId } = pendingStackRef.current;
          pendingStackRef.current = null;

          // Detach the top card from its stack
          const topCard = tableCards.find(c => c.tableId === topCardId);
          if (topCard) {
            // Remove the top card from the stack (set inStack to null)
            setTableCards(prev => {
              const updated = prev.map(c => {
                if (c.tableId === topCardId) {
                  return { ...c, inStack: null };
                }
                return c;
              });
              // If only one card left in the stack, unstack it too
              const remainingInStack = updated.filter(c => c.inStack === stackId);
              if (remainingInStack.length === 1) {
                return updated.map(c => c.inStack === stackId ? { ...c, inStack: null } : c);
              }
              return updated;
            });

            // Start dragging the detached single card (NOT as part of a stack)
            startDraggingCard(e, topCardId, topCard, null);
          }
        } else if (!draggingCard) {
          // Fallback for non-stack cards (shouldn't normally happen)
          const card = tableCards.find(c =>
            Math.abs(c.x - (cardDragOffsetRef.current.initialX - cardDragOffsetRef.current.x)) < 10 &&
            Math.abs(c.y - (cardDragOffsetRef.current.initialY - cardDragOffsetRef.current.y)) < 10
          );
          if (card) {
            startDraggingCard(e, card.tableId, card, card.inStack);
          }
        }
      }
    }

    if (!draggingCard) return;

    const worldPointer = screenToWorld(pointer.clientX, pointer.clientY);
    const newX = worldPointer.x - cardDragOffsetRef.current.x;
    const newY = worldPointer.y - cardDragOffsetRef.current.y;

    // Calculate grid highlight position
    const snapX = snapToGrid(newX);
    const snapY = snapToGrid(newY);
    const showGrid = shouldSnap(newX) || shouldSnap(newY);

    if (showGrid) {
      setGridHighlight({ x: snapX, y: snapY });
    } else {
      setGridHighlight(null);
    }

    // Check if hovering over a stack for visual feedback
    const card = tableCards.find(c => c.tableId === draggingCard);
    const STACK_DROP_THRESHOLD = 80;
    let targetStack = null;

    if (card) {
      if (card.inStack) {
        // Dragging a stack - check for other stacks
        const otherStacks = tableCards.filter(c => c.inStack && c.inStack !== card.inStack);
        const stacksByID = {};
        otherStacks.forEach(c => {
          if (!stacksByID[c.inStack]) {
            stacksByID[c.inStack] = c;
          }
        });

        for (const otherCard of Object.values(stacksByID)) {
          const dist = Math.sqrt((newX - otherCard.x) ** 2 + (newY - otherCard.y) ** 2);
          if (dist < STACK_DROP_THRESHOLD) {
            targetStack = otherCard.inStack;
            break;
          }
        }
      } else {
        // Dragging a single card - check all stacks and single cards
        for (const otherCard of tableCards) {
          if (otherCard.tableId === draggingCard) continue;

          const dist = Math.sqrt((newX - otherCard.x) ** 2 + (newY - otherCard.y) ** 2);
          if (dist < STACK_DROP_THRESHOLD) {
            if (otherCard.inStack) {
              targetStack = otherCard.inStack;
              break;
            } else {
              // Hovering over a single card - show as drop target
              targetStack = '__single_card_target__';
            }
          }
        }
      }
    }

    setStackDropTarget(targetStack);

    // Move the card (and all cards in the same stack or multi-selection)
    const dx = newX - card.x;
    const dy = newY - card.y;
    const isMultiSelected = selectedCards.size > 1 && selectedCards.has(draggingCard);

    if (card && card.inStack) {
      // Move entire stack together (plus any other selected cards/stacks)
      setTableCards(prev => prev.map(c => {
        if (c.inStack === card.inStack) {
          return { ...c, x: c.x + dx, y: c.y + dy };
        }
        // Also move other selected cards that aren't in this stack
        if (isMultiSelected && selectedCards.has(c.tableId) && c.inStack !== card.inStack) {
          return { ...c, x: c.x + dx, y: c.y + dy };
        }
        return c;
      }));
    } else if (isMultiSelected) {
      // Move all selected cards together
      setTableCards(prev => prev.map(c => {
        if (selectedCards.has(c.tableId)) {
          // If this card is in a stack, move all cards in that stack
          if (c.inStack) {
            const stackSelected = prev.some(sc => sc.inStack === c.inStack && selectedCards.has(sc.tableId));
            if (stackSelected) return { ...c, x: c.x + dx, y: c.y + dy };
          }
          return { ...c, x: c.x + dx, y: c.y + dy };
        }
        // Move stack siblings of selected cards
        if (c.inStack && prev.some(sc => sc.inStack === c.inStack && selectedCards.has(sc.tableId))) {
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

  // Handle card drag end - snap to grid and detect drop on stack
  function handleCardDragEnd() {
    // Clear long-press preview timer (Feature #58)
    if (longPressPreviewTimerRef.current) {
      clearTimeout(longPressPreviewTimerRef.current);
      longPressPreviewTimerRef.current = null;
    }

    // Clear press-hold timer if it exists
    if (pressHoldTimerRef.current) {
      clearTimeout(pressHoldTimerRef.current);
      pressHoldTimerRef.current = null;
    }

    // If we have a pending stack interaction that wasn't activated (no movement, no long press)
    // This is a short click with no movement on a stack - just select the stack, don't draw to hand
    const card = draggingCard ? tableCards.find(c => c.tableId === draggingCard) : null;

    if (pendingStackRef.current && !pressHoldActive) {
      // Short click on stack without movement - just select the stack
      const { tableId: topCardId, stackId } = pendingStackRef.current;
      pendingStackRef.current = null;
      const stackCardIds = tableCards.filter(c => c.inStack === stackId).map(c => c.tableId);
      setSelectedCards(new Set(stackCardIds));
      setDraggingCard(null);
      setPressHoldActive(false);
      return;
    }
    pendingStackRef.current = null;

    setPressHoldActive(false);

    if (!draggingCard) return;

    if (!card) {
      setDraggingCard(null);
      return;
    }

    // Check if card/stack is being dropped on another stack
    const STACK_DROP_THRESHOLD = 80; // Distance in pixels to trigger stack merge
    let targetStack = null;

    // Only check for stack merge if not already in the same stack
    if (card.inStack) {
      // If dragging a whole stack, check if it's dropped on another stack
      const otherStacks = tableCards.filter(c => c.inStack && c.inStack !== card.inStack);
      const stacksByID = {};
      otherStacks.forEach(c => {
        if (!stacksByID[c.inStack]) {
          stacksByID[c.inStack] = c;
        }
      });

      for (const otherCard of Object.values(stacksByID)) {
        const dist = Math.sqrt((card.x - otherCard.x) ** 2 + (card.y - otherCard.y) ** 2);
        if (dist < STACK_DROP_THRESHOLD) {
          targetStack = otherCard.inStack;
          break;
        }
      }
    } else {
      // Single card being dropped - check all stacks AND other single cards
      let targetSingleCard = null;
      for (const otherCard of tableCards) {
        if (otherCard.tableId === draggingCard) continue;

        const dist = Math.sqrt((card.x - otherCard.x) ** 2 + (card.y - otherCard.y) ** 2);
        if (dist < STACK_DROP_THRESHOLD) {
          if (otherCard.inStack) {
            targetStack = otherCard.inStack;
            break;
          } else {
            // Dropping on another single card - will create a new stack
            targetSingleCard = otherCard;
          }
        }
      }

      // Create new stack from two single cards
      if (!targetStack && targetSingleCard) {
        const newStackId = crypto.randomUUID();
        const newZ = maxZIndex + 1;
        setTableCards(prev => prev.map(c => {
          if (c.tableId === targetSingleCard.tableId) {
            return { ...c, inStack: newStackId, x: snapToGrid(targetSingleCard.x), y: snapToGrid(targetSingleCard.y), zIndex: newZ };
          }
          if (c.tableId === draggingCard) {
            return { ...c, inStack: newStackId, x: snapToGrid(targetSingleCard.x), y: snapToGrid(targetSingleCard.y), zIndex: newZ + 1 };
          }
          return c;
        }));
        setMaxZIndex(newZ + 1);
        setDraggingCard(null);
        setGridHighlight(null);
        setStackDropTarget(null);
        return;
      }
    }

    // If dropped on a stack, merge them
    if (targetStack) {
      const targetStackCards = tableCards.filter(c => c.inStack === targetStack);
      const targetPosition = targetStackCards[0]; // Get position from any card in target stack
      const maxTargetZ = Math.max(...targetStackCards.map(c => c.zIndex));

      if (card.inStack) {
        // Merging two stacks - add all cards from dragged stack to target stack
        const draggingStackCards = tableCards.filter(c => c.inStack === card.inStack);
        setTableCards(prev => prev.map(c => {
          if (c.inStack === card.inStack) {
            const idx = draggingStackCards.findIndex(sc => sc.tableId === c.tableId);
            return {
              ...c,
              inStack: targetStack,
              x: targetPosition.x,
              y: targetPosition.y,
              zIndex: maxTargetZ + idx + 1,
            };
          }
          return c;
        }));
        setMaxZIndex(Math.max(maxZIndex, maxTargetZ + draggingStackCards.length));
      } else {
        // Adding single card to stack - place it on top
        setTableCards(prev => prev.map(c =>
          c.tableId === draggingCard
            ? { ...c, inStack: targetStack, x: targetPosition.x, y: targetPosition.y, zIndex: maxTargetZ + 1 }
            : c
        ));
        setMaxZIndex(Math.max(maxZIndex, maxTargetZ + 1));
      }

      setDraggingCard(null);
      setGridHighlight(null);
      return;
    }

    // No stack merge - always snap to grid on release
    const isMultiSelected = selectedCards.size > 1 && selectedCards.has(draggingCard);
    const finalX = snapToGrid(card.x);
    const finalY = snapToGrid(card.y);
    const snapDx = finalX - card.x;
    const snapDy = finalY - card.y;

    if (isMultiSelected) {
      // Snap all selected cards/stacks by the same offset as the dragged card
      setTableCards(prev => prev.map(c => {
        const isSelected = selectedCards.has(c.tableId);
        const isInSelectedStack = c.inStack && prev.some(sc => sc.inStack === c.inStack && selectedCards.has(sc.tableId));
        if (isSelected || isInSelectedStack) {
          return { ...c, x: c.x + snapDx, y: c.y + snapDy };
        }
        return c;
      }));
    } else if (card.inStack) {
      // Snap the whole stack
      setTableCards(prev => prev.map(c => {
        if (c.inStack === card.inStack) {
          return { ...c, x: c.x + snapDx, y: c.y + snapDy };
        }
        return c;
      }));
    } else {
      setTableCards(prev => prev.map(c => {
        if (c.tableId !== draggingCard) return c;
        return { ...c, x: finalX, y: finalY };
      }));
      if (room) room.sendAction({ type: 'card_move', table_id: draggingCard, x: finalX, y: finalY });
    }

    // Haptic feedback on card drop (short vibration)
    triggerHaptic('drop');

    setDraggingCard(null);
    setGridHighlight(null);
    setStackDropTarget(null);
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

  // Custom Dice (image-based, imported from TTS)
  function placeCustomDie(template) {
    const canvas = canvasRef.current;
    const newDie = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: template.name,
      faceImages: template.face_images || [],
      numFaces: template.num_faces || template.faceImages?.length || 6,
      currentFace: Math.floor(Math.random() * (template.face_images?.length || 1)),
      x: (canvas?.width || 800) / 2 + (Math.random() - 0.5) * 100,
      y: (canvas?.height || 600) / 2 + (Math.random() - 0.5) * 100,
      rolling: false,
      locked: false,
    };
    setCustomDiceOnTable(prev => [...prev, newDie]);
    if (room) room.sendAction({ type: 'custom_die_place', die: newDie });
    setShowTokenModal(false);
  }

  function rollCustomDie(dieId) {
    setCustomDiceOnTable(prev => prev.map(d => d.id === dieId ? { ...d, rolling: true } : d));
    let count = 0;
    const interval = setInterval(() => {
      setCustomDiceOnTable(prev => prev.map(d => {
        if (d.id !== dieId) return d;
        return { ...d, currentFace: Math.floor(Math.random() * d.faceImages.length) };
      }));
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setCustomDiceOnTable(prev => prev.map(d => {
          if (d.id !== dieId) return d;
          const face = Math.floor(Math.random() * d.faceImages.length);
          if (room) room.sendAction({ type: 'custom_die_roll', die_id: dieId, currentFace: face });
          return { ...d, rolling: false, currentFace: face };
        }));
      }
    }, 80);
  }

  function deleteCustomDieFromTable(dieId) {
    setCustomDiceOnTable(prev => prev.filter(d => d.id !== dieId));
    if (room) room.sendAction({ type: 'custom_die_delete', die_id: dieId });
  }

  // Hit Dice (colored hit/crit/miss dice inspired by 20 Strong)
  const HIT_DIE_FACES = {
    yellow: ['miss', 'miss', 'miss', 'miss', 'hit', 'crit'],
    green:  ['miss', 'miss', 'miss', 'hit', 'hit', 'crit'],
    blue:   ['miss', 'miss', 'hit', 'hit', 'hit', 'crit'],
    purple: ['miss', 'hit', 'hit', 'hit', 'hit', 'crit'],
    red:    ['hit', 'hit', 'hit', 'hit', 'hit', 'crit'],
  };

  function rollHitFace(hitType) {
    const faces = HIT_DIE_FACES[hitType] || HIT_DIE_FACES.yellow;
    return faces[Math.floor(Math.random() * faces.length)];
  }

  function createHitDie(hitType) {
    const canvas = canvasRef.current;
    const newDie = {
      id: crypto.randomUUID(),
      type: 'hit',
      hitType: hitType,
      value: rollHitFace(hitType),
      x: (canvas?.width || 800) / 2 + (Math.random() - 0.5) * 100,
      y: (canvas?.height || 600) / 2 + (Math.random() - 0.5) * 100,
      rolling: false,
      locked: false,
    };
    setHitDice(prev => [...prev, newDie]);
    setShowHitDiceModal(false);
  }

  function rollHitDie(dieId) {
    const die = hitDice.find(d => d.id === dieId);
    if (!die) return;
    setHitDice(prev => prev.map(d =>
      d.id === dieId ? { ...d, rolling: true } : d
    ));
    let count = 0;
    const interval = setInterval(() => {
      setHitDice(prev => prev.map(d => {
        if (d.id !== dieId) return d;
        return { ...d, value: rollHitFace(d.hitType) };
      }));
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setHitDice(prev => prev.map(d =>
          d.id === dieId ? { ...d, rolling: false, value: rollHitFace(d.hitType) } : d
        ));
      }
    }, 80);
  }

  function deleteHitDie(dieId) {
    setHitDice(prev => prev.filter(d => d.id !== dieId));
  }

  // Drag handlers for floating objects (counters, dice, hitDice, notes, tokens, textFields)
  function handleObjDragStart(e, objType, objId) {
    // Only start drag on left mouse button
    if (!isTouchEvent(e) && e.button !== 0) return;

    // Prevent default for touch events
    if (isTouchEvent(e)) {
      handleTouchPrevention(e);
    } else {
      e.preventDefault();
    }

    let obj;
    if (objType === 'counter') obj = counters.find(c => c.id === objId);
    else if (objType === 'die') obj = dice.find(d => d.id === objId);
    else if (objType === 'customDie') obj = customDiceOnTable.find(d => d.id === objId);
    else if (objType === 'hitDie') obj = hitDice.find(d => d.id === objId);
    else if (objType === 'note') obj = notes.find(n => n.id === objId);
    else if (objType === 'token') obj = tokens.find(t => t.id === objId);
    else if (objType === 'board') obj = boards.find(b => b.id === objId);
    else if (objType === 'textField') obj = textFields.find(tf => tf.id === objId);
    if (!obj) return;

    // Don't drag locked objects
    if (obj.locked) return;

    // Get unified pointer position (convert to world coords for offset)
    const pointer = getPointerPosition(e);
    const worldPointer = screenToWorld(pointer.clientX, pointer.clientY);

    dragOffsetRef.current = {
      x: worldPointer.x - (obj.x || 0),
      y: worldPointer.y - (obj.y || 0),
    };
    setDraggingObj({ type: objType, id: objId });
  }

  function findNearestCardCorner(px, py) {
    const TOKEN_SNAP_DISTANCE = 30;
    let nearest = null;
    let nearestDist = TOKEN_SNAP_DISTANCE;
    const allCards = tableCards.filter(c => {
      if (!c.inStack) return true;
      const stackCards2 = tableCards.filter(sc => sc.inStack === c.inStack);
      const maxZ = Math.max(...stackCards2.map(sc => sc.zIndex));
      return c.zIndex === maxZ;
    });
    allCards.forEach(card => {
      const { w: cw, h: ch } = getCardDims(card);
      const corners = [
        { name: 'top-left', x: card.x - cw / 2 + 8, y: card.y - ch / 2 + 8 },
        { name: 'top-right', x: card.x + cw / 2 - 8, y: card.y - ch / 2 + 8 },
        { name: 'bottom-left', x: card.x - cw / 2 + 8, y: card.y + ch / 2 - 8 },
        { name: 'bottom-right', x: card.x + cw / 2 - 8, y: card.y + ch / 2 - 8 },
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

    // Get unified pointer position (convert to world coords)
    const pointer = getPointerPosition(e);
    const worldPointer = screenToWorld(pointer.clientX, pointer.clientY);
    const newX = worldPointer.x - dragOffsetRef.current.x;
    const newY = worldPointer.y - dragOffsetRef.current.y;
    if (draggingObj.type === 'counter') {
      setCounters(prev => prev.map(c =>
        c.id === draggingObj.id ? { ...c, x: newX, y: newY } : c
      ));
    } else if (draggingObj.type === 'die') {
      setDice(prev => prev.map(d =>
        d.id === draggingObj.id ? { ...d, x: newX, y: newY } : d
      ));
    } else if (draggingObj.type === 'customDie') {
      setCustomDiceOnTable(prev => prev.map(d =>
        d.id === draggingObj.id ? { ...d, x: newX, y: newY } : d
      ));
    } else if (draggingObj.type === 'hitDie') {
      setHitDice(prev => prev.map(d =>
        d.id === draggingObj.id ? { ...d, x: newX, y: newY } : d
      ));
    } else if (draggingObj.type === 'note') {
      setNotes(prev => prev.map(n =>
        n.id === draggingObj.id ? { ...n, x: newX, y: newY } : n
      ));
    } else if (draggingObj.type === 'token') {
      setTokens(prev => prev.map(t =>
        t.id === draggingObj.id ? { ...t, x: newX, y: newY, attachedTo: null } : t
      ));
    } else if (draggingObj.type === 'board') {
      setBoards(prev => prev.map(b =>
        b.id === draggingObj.id ? { ...b, x: newX, y: newY } : b
      ));
    } else if (draggingObj.type === 'textField') {
      setTextFields(prev => prev.map(tf =>
        tf.id === draggingObj.id ? { ...tf, x: newX, y: newY } : tf
      ));
    }
  }

  function handleObjDragEnd() {
    if (draggingObj && draggingObj.type === 'token') {
      const token = tokens.find(t => t.id === draggingObj.id);
      if (token) {
        const snap = findNearestCardCorner(token.x, token.y);
        if (snap) {
          setTokens(prev => prev.map(t =>
            t.id === draggingObj.id ? { ...t, x: snap.x, y: snap.y, attachedTo: snap.cardTableId, attachedCorner: snap.corner } : t
          ));
        }
      }
    }
    if (room && draggingObj) {
      const { id: objId, type: objType } = draggingObj;
      if (objType === 'counter') {
        const obj = counters.find(c => c.id === objId);
        if (obj) room.sendAction({ type: 'counter_move', counter_id: objId, x: obj.x, y: obj.y });
      } else if (objType === 'die') {
        const obj = dice.find(d => d.id === objId);
        if (obj) room.sendAction({ type: 'die_move', die_id: objId, x: obj.x, y: obj.y });
      } else if (objType === 'customDie') {
        const obj = customDiceOnTable.find(d => d.id === objId);
        if (obj) room.sendAction({ type: 'custom_die_move', die_id: objId, x: obj.x, y: obj.y });
      } else if (objType === 'note') {
        const obj = notes.find(n => n.id === objId);
        if (obj) room.sendAction({ type: 'note_move', note_id: objId, x: obj.x, y: obj.y });
      } else if (objType === 'token') {
        const obj = tokens.find(t => t.id === objId);
        if (obj) room.sendAction({ type: 'token_move', token_id: objId, x: obj.x, y: obj.y });
      }
    }
    setDraggingObj(null);
  }

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  function deleteNote(noteId) {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (editingNoteId === noteId) {
      setEditingNoteId(null);
      setEditingNoteText('');
    }
  }

  function startEditingNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    setEditingNoteId(noteId);
    setEditingNoteText(note.text);
  }

  function saveNoteEdit(noteId) {
    if (editingNoteText.trim()) {
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, text: editingNoteText.trim() } : n
      ));
    }
    setEditingNoteId(null);
    setEditingNoteText('');
  }

  // Text field functions
  function createTextField(text, fontSize, color) {
    const canvas = canvasRef.current;
    const newField = {
      id: crypto.randomUUID(),
      text: text || 'Text',
      fontSize: fontSize || 16,
      color: color || '#ffffff',
      x: (canvas?.width || 800) / 2 + (Math.random() - 0.5) * 100,
      y: (canvas?.height || 600) / 2 + (Math.random() - 0.5) * 100,
    };
    setTextFields(prev => [...prev, newField]);
    setShowTextFieldModal(false);
    setNewTextFieldText('');
    setNewTextFieldFontSize(16);
    setNewTextFieldColor('#ffffff');
  }

  function deleteTextField(id) {
    setTextFields(prev => prev.filter(tf => tf.id !== id));
  }

  function updateTextField(id, updates) {
    setTextFields(prev => prev.map(tf =>
      tf.id === id ? { ...tf, ...updates } : tf
    ));
  }

  // Lock/unlock any element
  function toggleLockCard(tableId) {
    setTableCards(prev => prev.map(c =>
      c.tableId === tableId ? { ...c, locked: !c.locked } : c
    ));
  }

  function toggleLockStack(stackId) {
    setTableCards(prev => prev.map(c =>
      c.inStack === stackId ? { ...c, locked: !c.locked } : c
    ));
  }

  function toggleLockObj(type, id) {
    const setter = type === 'counter' ? setCounters
      : type === 'die' ? setDice
      : type === 'customDie' ? setCustomDiceOnTable
      : type === 'hitDie' ? setHitDice
      : type === 'note' ? setNotes
      : type === 'token' ? setTokens
      : type === 'textField' ? setTextFields
      : null;
    if (setter) {
      setter(prev => prev.map(obj =>
        obj.id === id ? { ...obj, locked: !obj.locked } : obj
      ));
    }
  }

  // Token functions
  function openTokenModal() {
    setShowTokenModal(true);
    // Load image token library + custom dice library
    if (id) {
      fetch(`/api/games/${id}/table-assets`)
        .then(r => r.ok ? r.json() : [])
        .then(assets => setImageTokenLibrary(assets.filter(a => a.type === 'token')))
        .catch(() => {});
      fetch(`/api/games/${id}/custom-dice`)
        .then(r => r.ok ? r.json() : [])
        .then(dice => setCustomDiceLibrary(dice))
        .catch(() => {});
    }
  }

  function createToken(shape, color, label) {
    const canvas = canvasRef.current;
    const newToken = {
      id: crypto.randomUUID(),
      shape: shape,
      color: color,
      label: label || '',
      x: (canvas?.width || 800) / 2 + (Math.random() - 0.5) * 100,
      y: (canvas?.height || 600) / 2 + (Math.random() - 0.5) * 100,
      attachedTo: null, // support card attachment
    };
    setTokens(prev => [...prev, newToken]);
    if (room) room.sendAction({ type: 'token_create', token: newToken });
    setShowTokenModal(false);
    setNewTokenShape('circle');
    setNewTokenColor('#3b82f6');
    setNewTokenLabel('');
  }

  function deleteToken(tokenId) {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
    if (room) room.sendAction({ type: 'token_delete', token_id: tokenId });
  }

  function deleteBoard(boardId) {
    setBoards(prev => prev.filter(b => b.id !== boardId));
  }

  // Combined move handler (works for both mouse and touch)
  function handleGlobalMove(e) {
    // Don't handle normal move if we're pinching (pinch is handled separately)
    if (isPinchingRef.current) {
      return;
    }

    const pointer = getPointerPosition(e);

    // Handle panning via React events as well (for better Playwright compatibility)
    if (isPanningRef.current) {
      const dx = pointer.clientX - panStartRef.current.x;
      const dy = pointer.clientY - panStartRef.current.y;
      const camera = cameraRef.current;
      camera.x = panStartRef.current.camX + dx / camera.zoom;
      camera.y = panStartRef.current.camY + dy / camera.zoom;
      setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
      renderCanvas();
    } else if (draggingCard || pendingStackRef.current) {
      handleCardDragMove(e);
    } else if (draggingObj) {
      handleObjDragMove(e);
    } else if (draggingFromHand) {
      handleHandToTableDragMove(e);
    }
  }

  // Mouse move handler (React events on container)
  function handleGlobalMouseMove(e) {
    handleGlobalMove(e);
    // Send cursor position to multiplayer room (throttled in hook)
    if (room?.sendCursor) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      room.sendCursor(worldPos.x, worldPos.y);
    }
  }

  // Touch move handler with pinch-to-zoom support
  function handleGlobalTouchMove(e) {
    const touchCount = e.touches ? e.touches.length : 0;

    // Handle two-finger pinch zoom
    if (isPinchingRef.current && touchCount === 2) {
      e.preventDefault(); // Prevent default touch behavior

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);

      // Calculate zoom change based on distance change
      const distanceRatio = currentDistance / pinchStartDistanceRef.current;
      const newZoom = Math.max(0.2, Math.min(5, pinchStartZoomRef.current * distanceRatio));

      // Get canvas position for zooming toward pinch center
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = center.x - rect.left;
        const canvasY = center.y - rect.top;

        // Convert to world coordinates before zoom
        const camera = cameraRef.current;
        const worldX = (canvasX - rect.width / 2) / camera.zoom + camera.x;
        const worldY = (canvasY - rect.height / 2) / camera.zoom + camera.y;

        // Apply new zoom
        camera.zoom = newZoom;

        // Adjust camera position to zoom toward pinch center
        camera.x = worldX - (canvasX - rect.width / 2) / camera.zoom;
        camera.y = worldY - (canvasY - rect.height / 2) / camera.zoom;

        setZoomDisplay(Math.round(camera.zoom * 100));
        setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
        renderCanvas();

      }
    } else {
      // If finger moves during tap detection threshold, cancel tap and start drag
      if (pendingTouchRef.current) {
        const pointer = getPointerPosition(e);
        const dx = Math.abs(pointer.clientX - pendingTouchRef.current.clientX);
        const dy = Math.abs(pointer.clientY - pendingTouchRef.current.clientY);
        if (dx > 8 || dy > 8) {
          const { tableId, timer } = pendingTouchRef.current;
          clearTimeout(timer);
          pendingTouchRef.current = null;
          // Start drag immediately since finger is moving
          actualCardDragStart(e, tableId);
        }
      }
      // Normal touch move (panning or dragging)
      handleGlobalMove(e);
    }
  }

  // Combined end handler (works for both mouse and touch)
  function handleGlobalEnd(e) {
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
    if (draggingFromHand) {
      handleHandToTableDragEnd(e);
    }
  }

  // Mouse up handler (React events on container)
  function handleGlobalMouseUp(e) {
    handleGlobalEnd(e);
  }

  // Touch end handler with pinch cleanup and tap detection
  function handleGlobalTouchEnd(e) {
    const remainingTouches = e.touches ? e.touches.length : 0;

    // Clean up pinch state when fingers are lifted
    if (isPinchingRef.current && remainingTouches < 2) {
      isPinchingRef.current = false;
      pinchStartDistanceRef.current = 0;
      pinchStartZoomRef.current = 1;
    }

    // Check if this is a quick tap (finger lifted before drag threshold)
    if (pendingTouchRef.current) {
      const { tableId, clientX, clientY, timer } = pendingTouchRef.current;
      clearTimeout(timer);
      pendingTouchRef.current = null;
      // Quick release → it's a tap, not a drag
      handleCardTap(tableId, clientX, clientY);
      return; // Don't call handleGlobalEnd since no drag was started
    }

    handleGlobalEnd(e);
  }

  // Touch cancel handler - cleans up all drag/pinch/press-hold state
  // when touch events are interrupted by system events (incoming call,
  // notification overlay, system gesture, etc.)
  function handleGlobalTouchCancel(e) {

    // Cancel pending touch tap detection
    if (pendingTouchRef.current?.timer) {
      clearTimeout(pendingTouchRef.current.timer);
      pendingTouchRef.current = null;
    }

    // Cancel haptic feedback
    cancelHaptic();

    // 0. Clear long-press preview timer (Feature #58)
    if (longPressPreviewTimerRef.current) {
      clearTimeout(longPressPreviewTimerRef.current);
      longPressPreviewTimerRef.current = null;
    }
    setLongPressPreviewCard(null);

    // 1. Clear press-hold timer
    if (pressHoldTimerRef.current) {
      clearTimeout(pressHoldTimerRef.current);
      pressHoldTimerRef.current = null;
    }
    setPressHoldActive(false);
    pendingStackRef.current = null;

    // 2. Reset pinch zoom state
    isPinchingRef.current = false;
    pinchStartDistanceRef.current = 0;
    pinchStartZoomRef.current = 1;

    // 3. Cancel active card drag - place card at last valid position
    if (draggingCard) {
      // Card stays at its current (last valid) position - just stop dragging
      setDraggingCard(null);
      setGridHighlight(null);
      setStackDropTarget(null);
    }

    // 4. Cancel object drag
    if (draggingObj) {
      setDraggingObj(null);
    }

    // 5. Cancel hand-to-table drag
    if (draggingFromHand) {
      setDraggingFromHand(null);
      setHandDragPosition({ x: 0, y: 0 });
    }

    // 6. Reset panning state
    isPanningRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';

    // 7. Reset hand card drag
    if (draggingHandCard) {
      setDraggingHandCard(null);
      setHandDragOverIndex(null);
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

  // ===== STACK FUNCTIONS =====

  // Split a stack: take top N cards and make a new stack
  function performSplit(stackId, count) {
    const stackCards = tableCards.filter(c => c.inStack === stackId);
    if (stackCards.length < 2 || count < 1 || count >= stackCards.length) return;

    const sorted = [...stackCards].sort((a, b) => a.zIndex - b.zIndex);
    // "Top N" = the N cards with highest zIndex
    const splitCards = sorted.slice(sorted.length - count);
    const splitIds = new Set(splitCards.map(c => c.tableId));
    const remainingCount = sorted.length - count;

    // Only create a new stackId if the split group has 2+ cards
    const newStackId = count >= 2 ? crypto.randomUUID() : null;

    setTableCards(prev => prev.map(c => {
      if (c.inStack !== stackId) return c;
      if (splitIds.has(c.tableId)) {
        // Split cards: move to new stack (or individual if count=1), offset to the right
        return { ...c, inStack: newStackId, x: c.x + CARD_WIDTH + 30 };
      }
      // Remaining cards: unstack if only 1 left
      if (remainingCount === 1) {
        return { ...c, inStack: null };
      }
      return c;
    }));
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
      card_back_id: card.card_back_id || null,
      width: card.width || 0,
      height: card.height || 0,
      originalTableId: card.tableId,
    };
    setHandCards(prev => [...prev, handCard]);

    // Remove from table
    removeCardFromTable(tableId);
    setContextMenu(null);
  }

  // Draw N cards from a stack to hand (TTS-style number key draw)
  function drawCardsFromStack(stackId, count) {
    // In multiplayer mode, send request to server - the server will respond privately
    if (room) {
      room.sendAction({ type: 'card_draw_to_hand', stack_id: stackId, count });
      return;
    }
    const stackCards = tableCards.filter(c => c.inStack === stackId);
    if (stackCards.length === 0) return;

    // Clamp count to available cards
    const drawCount = Math.min(count, stackCards.length);
    if (drawCount < 1) return;

    // Sort by zIndex descending to get top cards first
    const sorted = [...stackCards].sort((a, b) => b.zIndex - a.zIndex);
    const cardsToDraw = sorted.slice(0, drawCount);

    // Add drawn cards to hand
    const newHandCards = cardsToDraw.map(card => ({
      handId: crypto.randomUUID(),
      cardId: card.cardId,
      name: card.name,
      image_path: card.image_path,
      card_back_id: card.card_back_id || null,
      width: card.width || 0,
      height: card.height || 0,
      originalTableId: card.tableId,
    }));
    setHandCards(prev => [...prev, ...newHandCards]);

    // Remove drawn cards from table
    const drawnTableIds = new Set(cardsToDraw.map(c => c.tableId));
    setTableCards(prev => {
      const remaining = prev.filter(c => !drawnTableIds.has(c.tableId));
      // If remaining stack has only 1 card, unstack it
      const remainingStack = remaining.filter(c => c.inStack === stackId);
      if (remainingStack.length === 1) {
        return remaining.map(c => c.inStack === stackId ? { ...c, inStack: null } : c);
      }
      return remaining;
    });
    setSelectedCards(prev => {
      const next = new Set(prev);
      drawnTableIds.forEach(tid => next.delete(tid));
      return next;
    });

    // Show draw toast
    setDrawToast(`Drew ${drawCount} card${drawCount > 1 ? 's' : ''} to hand`);
    setTimeout(() => setDrawToast(null), 2000);
  }

  // Play a card from hand back to the table
  function playCardFromHand(handId, targetStackId = null, x = null, y = null) {
    const card = handCards.find(c => c.handId === handId);
    if (!card) return;

    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);

    let newTableCard;

    // If target stack is specified, add card to that stack
    if (targetStackId) {
      const stackCards = tableCards.filter(c => c.inStack === targetStackId);
      if (stackCards.length > 0) {
        const stackPosition = stackCards[0];
        const maxStackZ = Math.max(...stackCards.map(c => c.zIndex));
        newTableCard = {
          tableId: crypto.randomUUID(),
          cardId: card.cardId,
          name: card.name,
          image_path: card.image_path,
          card_back_id: card.card_back_id || null,
          width: card.width || 0,
          height: card.height || 0,
          x: stackPosition.x,
          y: stackPosition.y,
          zIndex: maxStackZ + 1,
          faceDown: false,
          rotation: 0,
          inStack: targetStackId,
        };
        setMaxZIndex(Math.max(maxZIndex, maxStackZ + 1));
      } else {
        // Stack doesn't exist, play as normal
        targetStackId = null;
      }
    }

    // If no target stack or stack doesn't exist, place card at specified position or center
    if (!targetStackId) {
      const canvas = canvasRef.current;
      let posX, posY;

      if (x !== null && y !== null) {
        // Use specified position (from drag-and-drop) - convert screen to world coords
        const worldPos = screenToWorld(x, y);
        posX = worldPos.x;
        posY = worldPos.y;
      } else {
        // Use center with slight randomization (these are already world coords)
        const centerX = (canvas?.width || 800) / 2;
        const centerY = (canvas?.height || 600) / 2 - 60;
        posX = centerX + (Math.random() - 0.5) * 60;
        posY = centerY + (Math.random() - 0.5) * 60;
      }

      newTableCard = {
        tableId: crypto.randomUUID(),
        cardId: card.cardId,
        name: card.name,
        image_path: card.image_path,
        card_back_id: card.card_back_id || null,
        width: card.width || 0,
        height: card.height || 0,
        x: posX,
        y: posY,
        zIndex: newZIndex,
        faceDown: false,
        rotation: 0,
        inStack: null,
      };
    }

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

  // Hand-to-table drag handlers (using mouse/touch events for more control)
  function handleHandCardStart(e, handId) {
    // Only initiate hand-to-table drag with left mouse button (or any touch)
    if (!isTouchEvent(e) && e.button !== 0) return;

    const card = handCards.find(c => c.handId === handId);
    if (!card) return;

    // Get unified pointer position
    const pointer = getPointerPosition(e);

    // Store initial offset
    handToTableDragOffsetRef.current = {
      x: pointer.clientX,
      y: pointer.clientY,
    };

    setDraggingFromHand(handId);
    e.preventDefault();
  }

  // Mouse down handler for hand cards (backward compatibility)
  function handleHandCardMouseDown(e, handId) {
    handleHandCardStart(e, handId);
  }

  // Touch start handler for hand cards
  function handleHandCardTouchStart(e, handId) {
    if (isTouchEvent(e)) {
      handleTouchPrevention(e);
    }
    handleHandCardStart(e, handId);
  }

  function handleHandToTableDragMove(e) {
    if (!draggingFromHand) return;

    // Get unified pointer position
    const pointer = getPointerPosition(e);

    // Update cursor position for ghost card rendering
    setHandDragPosition({ x: pointer.clientX, y: pointer.clientY });
  }

  function handleHandToTableDragEnd(e) {
    if (!draggingFromHand) return;

    const card = handCards.find(c => c.handId === draggingFromHand);
    if (!card) {
      setDraggingFromHand(null);
      return;
    }

    // Get unified pointer position
    const pointer = getPointerPosition(e);

    // Check if dropped on table (not on hand area)
    const handContainer = document.querySelector('[data-testid="hand-container"]');
    if (handContainer) {
      const handRect = handContainer.getBoundingClientRect();
      const isOverHand = pointer.clientX >= handRect.left && pointer.clientX <= handRect.right &&
                         pointer.clientY >= handRect.top && pointer.clientY <= handRect.bottom;

      if (!isOverHand) {
        // Dropped on table - place card at pointer position
        playCardFromHand(draggingFromHand, null, pointer.clientX, pointer.clientY);
      }
    }

    setDraggingFromHand(null);
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
        label: stackNames[stackId] || null,
        card_ids: sorted.map(c => c.cardId),
        table_ids: sorted.map(c => c.tableId),
        x: sorted[0].x,
        y: sorted[0].y,
        cards: sorted.map(c => ({
          tableId: c.tableId,
          cardId: c.cardId,
          name: c.name,
          image_path: c.image_path,
          card_back_id: c.card_back_id || null,
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
        card_back_id: c.card_back_id || null,
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
        card_back_id: c.card_back_id || null,
      })),
      counters: counters.map(c => ({
        id: c.id,
        name: c.name,
        value: c.value,
        x: c.x,
        y: c.y,
        locked: c.locked || false,
      })),
      dice: dice.map(d => ({
        id: d.id,
        type: d.type,
        value: d.value,
        maxValue: d.maxValue,
        x: d.x,
        y: d.y,
        locked: d.locked || false,
      })),
      hitDice: hitDice.map(d => ({
        id: d.id,
        type: d.type,
        hitType: d.hitType,
        value: d.value,
        x: d.x,
        y: d.y,
        locked: d.locked || false,
      })),
      customDice: customDiceOnTable.map(d => ({
        id: d.id,
        templateId: d.templateId,
        name: d.name,
        faceImages: d.faceImages,
        numFaces: d.numFaces,
        currentFace: d.currentFace,
        x: d.x,
        y: d.y,
        locked: d.locked || false,
      })),
      notes: notes.map(n => ({
        id: n.id,
        text: n.text,
        x: n.x,
        y: n.y,
        locked: n.locked || false,
      })),
      tokens: tokens.map(t => ({
        id: t.id,
        shape: t.shape,
        color: t.color,
        label: t.label || '',
        imageUrl: t.imageUrl || null,
        size: t.size || null,
        x: t.x,
        y: t.y,
        attachedTo: t.attachedTo || null,
        attachedCorner: t.attachedCorner || null,
        locked: t.locked || false,
      })),
      boards: boards.map(b => ({
        id: b.id,
        imageUrl: b.imageUrl,
        name: b.name || '',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        locked: b.locked || false,
      })),
      textFields: textFields.map(tf => ({
        id: tf.id,
        text: tf.text,
        fontSize: tf.fontSize,
        color: tf.color,
        x: tf.x,
        y: tf.y,
        locked: tf.locked || false,
      })),
      stackNames: stackNames,
      maxZIndex: maxZIndex,
    };
  }

  // ─── Multiplayer: Apply remote actions from the server ────────────────────
  function applyRemoteAction(msg) {
    if (!msg || !msg.type) return;
    applyingRemoteRef.current = true;
    try {
      switch (msg.type) {
        case 'card_move':
          setTableCards(prev => prev.map(c =>
            c.tableId === msg.table_id ? { ...c, x: msg.x, y: msg.y } : c
          ));
          break;
        case 'card_flip':
          setTableCards(prev => prev.map(c =>
            c.tableId === msg.table_id ? { ...c, faceDown: msg.face_down } : c
          ));
          break;
        case 'card_rotate':
          setTableCards(prev => prev.map(c =>
            c.tableId === msg.table_id ? { ...c, rotation: msg.rotation } : c
          ));
          break;
        case 'stack_move':
          setTableCards(prev => prev.map(c =>
            c.inStack === msg.stack_id ? { ...c, x: msg.x, y: msg.y } : c
          ));
          break;
        case 'stack_take_top':
          if (msg.card) {
            setTableCards(prev => {
              const withoutOld = prev.filter(c => c.tableId !== msg.card.tableId);
              return [...withoutOld, { ...msg.card, tableId: msg.card.tableId, inStack: null }];
            });
          }
          break;
        case 'stack_removed':
          setTableCards(prev => prev.filter(c => c.inStack !== msg.stack_id));
          break;
        case 'stack_size_update':
          // Server already handled removal - just update the visual stack count by removing extras
          // (the server's boardState is authoritative; we rely on full sync for accuracy)
          break;
        case 'card_play_from_hand':
          if (msg.card) {
            setTableCards(prev => {
              const exists = prev.find(c => c.tableId === msg.card.tableId);
              if (exists) return prev;
              return [...prev, {
                ...msg.card,
                tableId: msg.card.tableId,
                inStack: null,
                faceDown: false,
                rotation: 0,
                zIndex: maxZIndex + 1,
              }];
            });
            setMaxZIndex(z => z + 1);
          }
          break;
        case 'draw_response':
          // Private cards drawn to our hand
          if (msg.cards && msg.cards.length > 0) {
            const newHandCards = msg.cards.map(card => ({
              handId: crypto.randomUUID(),
              cardId: card.id || card.cardId,
              name: card.name,
              image_path: card.image_path,
              card_back_id: card.card_back_id || null,
              width: card.width || 0,
              height: card.height || 0,
            }));
            setHandCards(prev => [...prev, ...newHandCards]);
          }
          break;
        case 'dice_roll':
          setDice(prev => prev.map(d => d.id === msg.dice_id ? { ...d, value: msg.value } : d));
          break;
        case 'counter_update':
          setCounters(prev => prev.map(c => c.id === msg.counter_id ? { ...c, value: msg.value } : c));
          break;
        case 'note_edit':
          setNotes(prev => prev.map(n => n.id === msg.note_id ? { ...n, text: msg.text } : n));
          break;
        case 'token_move':
          setTokens(prev => prev.map(t => t.id === msg.token_id ? { ...t, x: msg.x, y: msg.y } : t));
          break;
        case 'token_create':
          setTokens(prev => {
            if (prev.find(t => t.id === msg.token?.id)) return prev;
            return [...prev, msg.token];
          });
          break;
        case 'token_delete':
          setTokens(prev => prev.filter(t => t.id !== msg.token_id));
          break;
        case 'counter_move':
          setCounters(prev => prev.map(c => c.id === msg.counter_id ? { ...c, x: msg.x, y: msg.y } : c));
          break;
        case 'die_move':
          setDice(prev => prev.map(d => d.id === msg.die_id ? { ...d, x: msg.x, y: msg.y } : d));
          break;
        case 'note_move':
          setNotes(prev => prev.map(n => n.id === msg.note_id ? { ...n, x: msg.x, y: msg.y } : n));
          break;
        case 'custom_die_place':
          setCustomDiceOnTable(prev => {
            if (prev.find(d => d.id === msg.die?.id)) return prev;
            return [...prev, { ...msg.die, rolling: false }];
          });
          break;
        case 'custom_die_move':
          setCustomDiceOnTable(prev => prev.map(d => d.id === msg.die_id ? { ...d, x: msg.x, y: msg.y } : d));
          break;
        case 'custom_die_roll':
          setCustomDiceOnTable(prev => prev.map(d => d.id === msg.die_id ? { ...d, currentFace: msg.currentFace } : d));
          break;
        case 'custom_die_delete':
          setCustomDiceOnTable(prev => prev.filter(d => d.id !== msg.die_id));
          break;
        case 'board_sync':
          if (msg.board_state) {
            if (msg.board_state.cards) setTableCards(msg.board_state.cards);
            if (msg.board_state.counters) setCounters(msg.board_state.counters);
            if (msg.board_state.dice) setDice(msg.board_state.dice);
            if (msg.board_state.notes) setNotes(msg.board_state.notes);
            if (msg.board_state.tokens) setTokens(msg.board_state.tokens);
            if (msg.board_state.customDice)
              setCustomDiceOnTable(msg.board_state.customDice.map(d => ({ ...d, rolling: false })));
          }
          break;
        case 'room_started':
          if (msg.board_state) {
            if (msg.board_state.cards) setTableCards(msg.board_state.cards);
            if (msg.board_state.counters) setCounters(msg.board_state.counters);
            if (msg.board_state.dice) setDice(msg.board_state.dice);
            if (msg.board_state.notes) setNotes(msg.board_state.notes);
            if (msg.board_state.tokens) setTokens(msg.board_state.tokens);
            if (msg.board_state.customDice)
              setCustomDiceOnTable(msg.board_state.customDice.map(d => ({ ...d, rolling: false })));
          }
          if (msg.zones) setZones(msg.zones);
          break;
        default:
          // Unknown or cursor/player messages handled by useGameRoom hook
          break;
      }
    } finally {
      applyingRemoteRef.current = false;
    }
  }

  // Sync hand card count to server in multiplayer mode
  useEffect(() => {
    if (room) {
      room.sendHandCountUpdate(handCards.length);
    }
  }, [handCards.length, room]);

  // Load zones from room welcome message
  useEffect(() => {
    if (room?.zones && room.zones.length > 0) {
      setZones(room.zones);
    }
  }, [room?.zones]);

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

  // Auto-save functionality: periodically save game state
  const autoSaveIntervalRef = useRef(null);
  const lastAutoSaveRef = useRef(null);
  const autoSaveEnabledRef = useRef(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved

  // Auto-save function (uses refs to avoid stale closures)
  const performAutoSaveRef = useRef(null);
  performAutoSaveRef.current = async function performAutoSave() {
    // Disable auto-save in multiplayer mode
    if (room) return;
    // Only auto-save if there's something on the table
    if (tableCards.length === 0 && handCards.length === 0 && tokens.length === 0 && counters.length === 0 && dice.length === 0 && notes.length === 0) {
      return;
    }

    try {
      setAutoSaveStatus('saving');
      const stateData = getGameState();
      const res = await fetch(`/api/games/${id}/saves/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state_data: stateData }),
      });
      if (res.ok) {
        lastAutoSaveRef.current = new Date().toISOString();
        setAutoSaveStatus('saved');
        setSaveToast('Auto-saved');
        setTimeout(() => setSaveToast(null), 2000);
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
        // Auto-saved
      }
    } catch (err) {
      console.error('[Auto-save] Failed:', err);
      setAutoSaveStatus('idle');
    }
  };

  // Set up auto-save interval (every 60 seconds)
  useEffect(() => {
    if (!game) return;

    // Start auto-save interval
    const AUTO_SAVE_INTERVAL = 60000; // 60 seconds
    autoSaveIntervalRef.current = setInterval(() => {
      if (autoSaveEnabledRef.current && performAutoSaveRef.current) {
        performAutoSaveRef.current();
      }
    }, AUTO_SAVE_INTERVAL);

    // Also auto-save when navigating away
    function handleBeforeUnload() {
      if (autoSaveEnabledRef.current && performAutoSaveRef.current) {
        // Use sendBeacon for reliable save on page unload
        const stateData = typeof getGameState === 'function' ? getGameState() : null;
        if (stateData) {
          navigator.sendBeacon(`/api/games/${id}/saves/auto`,
            new Blob([JSON.stringify({ state_data: stateData })], { type: 'application/json' })
          );
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [game, id]);

  // Save or update a setup (predefined starting state)
  async function saveSetup(name) {
    setSavingSetup(true);
    try {
      const stateData = getGameState();
      let res;
      if (editingSetupId) {
        // Update existing setup
        res = await fetch(`/api/games/${id}/setups/${editingSetupId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, state_data: stateData, zone_data: zones, sequence_data: sequenceSteps }),
        });
      } else {
        // Create new setup
        res = await fetch(`/api/games/${id}/setups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, state_data: stateData, zone_data: zones, sequence_data: sequenceSteps }),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Setup save failed');
      }
      const saved = await res.json();
      setShowSetupSaveModal(false);
      setSetupName('');
      setSaveToast(editingSetupId ? `Setup "${name}" updated` : `Setup "${name}" saved`);
      setTimeout(() => setSaveToast(null), 4000);
      // Update editingSetupId if it was a new setup, so future saves update it
      setEditingSetupId(saved.id);
      return saved;
    } catch (err) {
      console.error('Setup save failed:', err);
      setSaveToast(`Setup save failed: ${err.message}`);
      setTimeout(() => setSaveToast(null), 4000);
    } finally {
      setSavingSetup(false);
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
          card_back_id: c.card_back_id || null,
          width: c.width || 0,
          height: c.height || 0,
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
    const newStackNames = {};
    if (state.stacks && Array.isArray(state.stacks)) {
      state.stacks.forEach(stack => {
        const stackId = stack.stackId || crypto.randomUUID();
        if (stack.label) newStackNames[stackId] = stack.label;
        if (stack.cards && Array.isArray(stack.cards)) {
          stack.cards.forEach(c => {
            restoredCards.push({
              tableId: c.tableId || crypto.randomUUID(),
              cardId: c.cardId,
              name: c.name,
              image_path: c.image_path,
              card_back_id: c.card_back_id || null,
              width: c.width || 0,
              height: c.height || 0,
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
        card_back_id: c.card_back_id || null,
      })));
    } else {
      setHandCards([]);
    }

    // Migrate old markers to tokens (backward compatibility)
    const migratedTokens = [];
    if (state.markers && Array.isArray(state.markers)) {
      state.markers.forEach(m => {
        migratedTokens.push({
          id: m.id || crypto.randomUUID(),
          shape: 'circle',
          color: m.color,
          label: m.label || '',
          x: m.x,
          y: m.y,
          attachedTo: m.attachedTo || null,
          attachedCorner: m.attachedCorner || null,
        });
      });
    }

    // Restore counters
    if (state.counters && Array.isArray(state.counters)) {
      setCounters(state.counters.map(c => ({
        id: c.id || crypto.randomUUID(),
        name: c.name,
        value: c.value,
        x: c.x,
        y: c.y,
        locked: c.locked || false,
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
        locked: d.locked || false,
      })));
    } else {
      setDice([]);
    }

    // Restore hit dice
    if (state.hitDice && Array.isArray(state.hitDice)) {
      setHitDice(state.hitDice.map(d => ({
        id: d.id || crypto.randomUUID(),
        type: 'hit',
        hitType: d.hitType || 'yellow',
        value: d.value || 'miss',
        x: d.x,
        y: d.y,
        rolling: false,
        locked: d.locked || false,
      })));
    } else {
      setHitDice([]);
    }

    // Restore custom dice
    if (state.customDice && Array.isArray(state.customDice)) {
      setCustomDiceOnTable(state.customDice.map(d => ({
        id: d.id || crypto.randomUUID(),
        templateId: d.templateId,
        name: d.name || 'Würfel',
        faceImages: d.faceImages || [],
        numFaces: d.numFaces || d.faceImages?.length || 6,
        currentFace: d.currentFace || 0,
        x: d.x,
        y: d.y,
        rolling: false,
        locked: d.locked || false,
      })));
    } else {
      setCustomDiceOnTable([]);
    }

    // Restore notes
    if (state.notes && Array.isArray(state.notes)) {
      setNotes(state.notes.map(n => ({
        id: n.id || crypto.randomUUID(),
        text: n.text,
        x: n.x,
        y: n.y,
        locked: n.locked || false,
      })));
    } else {
      setNotes([]);
    }

    // Restore tokens
    if (state.tokens && Array.isArray(state.tokens)) {
      const restoredTokens = state.tokens.map(t => ({
        id: t.id || crypto.randomUUID(),
        shape: t.shape,
        color: t.color,
        label: t.label || '',
        imageUrl: t.imageUrl || null,
        size: t.size || null,
        x: t.x,
        y: t.y,
        attachedTo: t.attachedTo || null,
        attachedCorner: t.attachedCorner || null,
        locked: t.locked || false,
      }));
      // Merge migrated markers with existing tokens
      setTokens([...restoredTokens, ...migratedTokens]);
    } else {
      // Only migrated markers
      setTokens(migratedTokens);
    }

    // Restore boards
    if (state.boards && Array.isArray(state.boards)) {
      setBoards(state.boards.map(b => ({
        id: b.id || crypto.randomUUID(),
        imageUrl: b.imageUrl,
        name: b.name || '',
        x: b.x,
        y: b.y,
        width: b.width || 200,
        height: b.height || 200,
        locked: b.locked || false,
      })));
    } else {
      setBoards([]);
    }

    // Restore text fields
    if (state.textFields && Array.isArray(state.textFields)) {
      setTextFields(state.textFields.map(tf => ({
        id: tf.id || crypto.randomUUID(),
        text: tf.text || 'Text',
        fontSize: tf.fontSize || 16,
        color: tf.color || '#ffffff',
        x: tf.x,
        y: tf.y,
        locked: tf.locked || false,
      })));
    } else {
      setTextFields([]);
    }

    // Restore stack names (merge embedded labels from stack objects + legacy stackNames map)
    if (state.stackNames && typeof state.stackNames === 'object') {
      setStackNames({ ...newStackNames, ...state.stackNames });
    } else {
      setStackNames(newStackNames);
    }

    // Trigger canvas re-render
    setTimeout(() => renderCanvas(), 100);
  }

  // Load save state from URL query param on mount
  useEffect(() => {
    if (saveLoadedRef.current) return;
    const saveId = searchParams.get('saveId');
    if (!saveId) return;
    // Wait for game data to load first
    if (loading || !game) return;

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
    loadSave();
  }, [loading, game, id, searchParams]);

  // Load setup state from URL query param on mount (setupId or mode=setup&editSetupId)
  useEffect(() => {
    if (setupLoadedRef.current) return;
    if (loading || !game) return;

    const mode = searchParams.get('mode');
    const setupId = searchParams.get('setupId');
    const editSetupIdParam = searchParams.get('editSetupId');

    // Enter setup mode if mode=setup
    if (mode === 'setup') {
      setSetupMode(true);
    }

    // If loading a setup to play (setupId param)
    if (setupId && !editSetupIdParam) {
      setupLoadedRef.current = true;
      async function loadSetup() {
        try {
          const res = await fetch(`/api/games/${id}/setups/${setupId}`);
          if (!res.ok) {
            console.error('Failed to load setup:', res.status);
            return;
          }
          const setup = await res.json();
          let parsedZones = [];
          if (setup.zone_data) {
            try { parsedZones = JSON.parse(setup.zone_data); } catch {}
          }
          setZones(parsedZones);

          // Execute setup sequence for new games (not savegame loads)
          let parsedSeq = [];
          try { parsedSeq = JSON.parse(setup.sequence_data || '[]'); } catch {}

          let stateToLoad = setup.state_data;
          if (parsedSeq.length > 0) {
            try {
              const parsed = typeof stateToLoad === 'string' ? JSON.parse(stateToLoad) : stateToLoad;
              stateToLoad = executeSequence(parsed, parsedSeq, parsedZones);
            } catch (err) {
              console.error('Sequence execution failed:', err);
            }
          }
          loadGameState(stateToLoad);
          setSaveToast(`Loaded setup: "${setup.name}"`);
          setTimeout(() => setSaveToast(null), 4000);
        } catch (err) {
          console.error('Failed to load setup:', err);
        }
      }
      loadSetup();
      return;
    }

    // If editing an existing setup (mode=setup&editSetupId param)
    if (mode === 'setup' && editSetupIdParam) {
      setupLoadedRef.current = true;
      setEditingSetupId(editSetupIdParam);
      async function loadSetupForEdit() {
        try {
          const res = await fetch(`/api/games/${id}/setups/${editSetupIdParam}`);
          if (!res.ok) {
            console.error('Failed to load setup for editing:', res.status);
            return;
          }
          const setup = await res.json();
          setSetupName(setup.name);
          loadGameState(setup.state_data);
          if (setup.zone_data) {
            try { setZones(JSON.parse(setup.zone_data)); } catch {}
          }
          if (setup.sequence_data) {
            try { setSequenceSteps(JSON.parse(setup.sequence_data)); } catch { setSequenceSteps([]); }
          }
          setSaveToast(`Editing setup: "${setup.name}"`);
          setTimeout(() => setSaveToast(null), 4000);
        } catch (err) {
          console.error('Failed to load setup for editing:', err);
        }
      }
      loadSetupForEdit();
      return;
    }

    // New setup mode - just enter setup mode with empty table
    if (mode === 'setup') {
      setupLoadedRef.current = true;
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
    const container = containerRef.current;
    const rect = container ? container.getBoundingClientRect() : null;

    if (rect) {
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Convert cursor to world coordinates before zoom
      const worldX = (cursorX - rect.width / 2) / camera.zoom + camera.x;
      const worldY = (cursorY - rect.height / 2) / camera.zoom + camera.y;

      // Apply zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      camera.zoom = Math.max(0.2, Math.min(5, camera.zoom * delta));

      // Adjust camera to keep world point under cursor fixed
      camera.x = worldX - (cursorX - rect.width / 2) / camera.zoom;
      camera.y = worldY - (cursorY - rect.height / 2) / camera.zoom;
    } else {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      camera.zoom = Math.max(0.2, Math.min(5, camera.zoom * delta));
    }

    setZoomDisplay(Math.round(camera.zoom * 100));
    setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
    renderCanvas();
  }

  // Combined start handler for panning (works for both mouse and touch)
  function handleGlobalStart(e) {
    // Don't start panning if we're pinching
    if (isPinchingRef.current) {
      return;
    }

    const pointer = getPointerPosition(e);
    const isCanvas = e.target === canvasRef.current;
    const isContainer = e.target === containerRef.current;
    const isUIElement = e.target.closest && e.target.closest('[data-ui-element]');
    const isTableCard = e.target.closest && e.target.closest('[data-table-card]');

    // For mouse: check button; for touch: no button check needed
    const isTouchStart = isTouchEvent(e);
    const isValidMouseStart = !isTouchStart && (e.button === 1 || (e.button === 0 && (isCanvas || isContainer) && !isUIElement && !isTableCard));
    const isValidTouchStart = isTouchStart && (isCanvas || isContainer) && !isUIElement && !isTableCard;

    if (isValidMouseStart || isValidTouchStart) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: pointer.clientX,
        y: pointer.clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
      };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
  }

  // Mouse down handler for panning (backup for native event approach)
  function handleGlobalMouseDown(e) {
    handleGlobalStart(e);
  }

  // Touch start handler for panning and pinch-to-zoom
  function handleGlobalTouchStart(e) {
    const touchCount = e.touches ? e.touches.length : 0;

    // Detect two-finger interaction
    if (touchCount === 2) {
      e.preventDefault();

      // If currently dragging a card, second finger = rotate
      if (draggingCard) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        // Determine which touch is the new one (second finger)
        // The second finger is the one that just appeared
        const newTouch = touch2; // touches[1] is usually the newer one
        const holdTouch = touch1;

        // If second finger is LEFT of the holding finger → rotate CCW
        // If second finger is RIGHT → rotate CW
        if (newTouch.clientX < holdTouch.clientX) {
          // Rotate 90° counter-clockwise
          triggerHaptic('action');
          setTableCards(prev => prev.map(c => {
            if (c.tableId === draggingCard || (c.inStack && prev.find(dc => dc.tableId === draggingCard)?.inStack === c.inStack)) {
              return { ...c, rotation: (c.rotation || 0) - 90 };
            }
            return c;
          }));
        } else {
          // Rotate 90° clockwise
          triggerHaptic('action');
          setTableCards(prev => prev.map(c => {
            if (c.tableId === draggingCard || (c.inStack && prev.find(dc => dc.tableId === draggingCard)?.inStack === c.inStack)) {
              return { ...c, rotation: (c.rotation || 0) + 90 };
            }
            return c;
          }));
        }
        return; // Don't start pinch zoom
      }

      // No card being dragged → normal pinch zoom
      isPinchingRef.current = true;
      isPanningRef.current = false;

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      pinchStartDistanceRef.current = getTouchDistance(touch1, touch2);
      pinchStartZoomRef.current = cameraRef.current.zoom;

    } else {
      // Single touch - normal panning behavior
      handleGlobalStart(e);
    }
  }

  // ===== SWIPE GESTURE HANDLERS FOR DRAWER =====
  const DRAWER_SWIPE_MIN_DISTANCE = 50; // minimum distance in px
  const DRAWER_SWIPE_MAX_TIME = 500; // max time in ms
  const DRAWER_EDGE_ZONE = 30; // px from left edge to detect edge swipe

  function handleDrawerSwipeTouchStart(e) {
    if (!isTouchCapableRef.current || e.touches.length !== 1) return;

    // Don't interfere with card drags or other interactive elements
    const target = e.target;
    if (target.closest('[data-table-card], [data-drag-handle]')) return;

    const touch = e.touches[0];
    const isEdge = touch.clientX <= DRAWER_EDGE_ZONE;

    // For opening: only from left edge when drawer is closed
    // For closing: from anywhere on the drawer when it's open
    if (!showCardDrawer && !isEdge) return;
    if (showCardDrawer && !target.closest('[data-testid="card-drawer"]')) return;

    drawerSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isEdge,
    };
    drawerSwipeLockRef.current = null;
    setIsSwipingDrawer(false);
    setDrawerSwipeOffset(0);
  }

  function handleDrawerSwipeTouchMove(e) {
    if (!drawerSwipeRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - drawerSwipeRef.current.startX;
    const dy = touch.clientY - drawerSwipeRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Lock direction after 10px of movement
    if (!drawerSwipeLockRef.current && (absDx > 10 || absDy > 10)) {
      drawerSwipeLockRef.current = absDx > absDy ? 'horizontal' : 'vertical';
    }

    // Only handle horizontal swipes
    if (drawerSwipeLockRef.current !== 'horizontal') return;

    // Visual feedback: update offset
    if (!showCardDrawer && dx > 0) {
      // Opening: swipe right from edge
      setDrawerSwipeOffset(Math.min(dx, 280));
      setIsSwipingDrawer(true);
      if (e.cancelable) e.preventDefault();
    } else if (showCardDrawer && dx < 0) {
      // Closing: swipe left on drawer
      setDrawerSwipeOffset(Math.max(dx, -280));
      setIsSwipingDrawer(true);
      if (e.cancelable) e.preventDefault();
    }
  }

  function handleDrawerSwipeTouchEnd(e) {
    if (!drawerSwipeRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - drawerSwipeRef.current.startX;
    const elapsed = Date.now() - drawerSwipeRef.current.startTime;
    const absDx = Math.abs(dx);

    // Check if swipe meets threshold
    if (absDx >= DRAWER_SWIPE_MIN_DISTANCE && elapsed <= DRAWER_SWIPE_MAX_TIME) {
      if (!showCardDrawer && dx > 0 && drawerSwipeRef.current.isEdge) {
        // Open drawer
        setShowCardDrawer(true);
      } else if (showCardDrawer && dx < 0) {
        // Close drawer
        setShowCardDrawer(false);
      }
    }

    // Reset swipe state
    drawerSwipeRef.current = null;
    drawerSwipeLockRef.current = null;
    setDrawerSwipeOffset(0);
    setIsSwipingDrawer(false);
  }

  // ===== MODAL DISMISS HELPERS =====
  function dismissCounterModal() { setShowCounterModal(false); setNewCounterName(''); }
  function dismissDiceModal() { setShowDiceModal(false); }
  function dismissHitDiceModal() { setShowHitDiceModal(false); }
  function dismissNoteModal() { setShowNoteModal(false); setNewNoteText(''); }
  function dismissTokenModal() { setShowTokenModal(false); }
  function dismissTextFieldModal() { setShowTextFieldModal(false); setNewTextFieldText(''); setNewTextFieldFontSize(16); setNewTextFieldColor('#ffffff'); }
  function dismissSaveModal() { setShowSaveModal(false); setSaveName(''); }
  function dismissSetupSaveModal() { setShowSetupSaveModal(false); }
  function dismissSplitModal() { setShowSplitModal(false); setSplitStackId(null); setSplitCount(''); }

  // ===== MOBILE ACTION BAR HANDLERS =====
  function handleMobileFlip() {
    if (selectedCards.size > 0) {
      setTableCards(prev => prev.map(c => {
        if (selectedCards.has(c.tableId)) {
          return { ...c, faceDown: !c.faceDown };
        }
        return c;
      }));
    }
  }

  function handleMobileRotateCW() {
    if (selectedCards.size > 0) {
      setTableCards(prev => prev.map(c => {
        if (selectedCards.has(c.tableId)) {
          return { ...c, rotation: (c.rotation || 0) + 90 };
        }
        return c;
      }));
    }
  }

  function handleMobileRotateCCW() {
    if (selectedCards.size > 0) {
      setTableCards(prev => prev.map(c => {
        if (selectedCards.has(c.tableId)) {
          return { ...c, rotation: (c.rotation || 0) - 90 };
        }
        return c;
      }));
    }
  }

  function handleMobileDraw(count) {
    // Find stack from selected cards
    for (const tid of selectedCards) {
      const card = tableCards.find(c => c.tableId === tid);
      if (card && card.inStack) {
        drawCardsFromStack(card.inStack, count);
        return;
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden select-none"
      data-testid="game-table-container"
      data-layout-mode={layoutMode}
      data-orientation={isLandscape ? 'landscape' : 'portrait'}
      onMouseDown={handleGlobalMouseDown}
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      onTouchStart={(e) => { handleDrawerSwipeTouchStart(e); handleGlobalTouchStart(e); }}
      onTouchMove={(e) => { handleDrawerSwipeTouchMove(e); handleGlobalTouchMove(e); }}
      onTouchEnd={(e) => { handleDrawerSwipeTouchEnd(e); handleGlobalTouchEnd(e); }}
      onTouchCancel={handleGlobalTouchCancel}
      onWheel={handleGlobalWheel}
      onClick={handleTableClick}
      onContextMenu={(e) => {
        // Only show table context menu if clicking on canvas/background (not on a card)
        if (e.target === canvasRef.current || e.target.dataset.testid === 'game-table-container') {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            cardTableId: null,
            stackId: null,
          });
        }
      }}
      data-testid="game-table-container"
    >
      {/* HTML5 Canvas Background */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* World-space transform wrapper - applies camera zoom and pan to all table objects */}
      <div
        className="absolute inset-0 pointer-events-none"
        data-testid="world-transform-wrapper"
        style={{
          transformOrigin: '50% 50%',
          transform: `scale(${zoomDisplay / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
          willChange: 'transform',
        }}
      >
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
          const isDropTarget = stackDropTarget === stackId; // Highlight if this stack is a drop target
          const { w: cardW, h: cardH } = getCardDims(card);

          return (
            <div
              key={card.tableId}
              data-testid={`table-card-${card.tableId}`}
              data-card-name={card.name}
              data-card-id={card.cardId}
              data-table-card="true"
              data-rotation={card.rotation || 0}
              data-stack-id={stackId || ''}
              data-stack-size={stackSize}
              data-ui-element="true"
              className="absolute select-none group pointer-events-auto"
              style={{
                left: card.x - cardW / 2,
                top: card.y - cardH / 2,
                width: cardW,
                height: cardH + (isStack ? 6 : 0),
                zIndex: isDragging ? 9999 : card.zIndex,
                transform: `scale(${isDragging ? 1.1 : isDropTarget ? 1.05 : 1}) rotate(${card.rotation || 0}deg)`,
                transition: isDragging ? 'transform 0.1s ease, box-shadow 0.1s ease' : 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: isDragging ? 'grabbing' : 'grab',
                filter: isDragging
                  ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))'
                  : isDropTarget
                    ? 'drop-shadow(0 6px 12px rgba(34,197,94,0.6))'
                    : isStack
                      ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
              onMouseDown={(e) => handleCardDragStart(e, card.tableId)}
              onTouchStart={(e) => handleCardDragStart(e, card.tableId)}
              onMouseEnter={() => {
                setHoveredTableCard(card.tableId);
              }}
              onMouseLeave={() => {
                setHoveredTableCard(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // On touch devices, context menu is handled via single tap - suppress native long-press menu
                if (isTouchCapableRef.current) return;
                // Desktop: open context menu via right-click
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
              title={isStack ? (stackNames[stackId] ? `${stackNames[stackId]} (${stackSize})` : `Stack: ${stackSize} cards`) : card.name}
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
                      width: cardW - 4,
                      height: cardH - 4,
                    }}
                  />
                  {/* Middle ghost card (for 3+ stacks) */}
                  {stackSize >= 3 && (
                    <div
                      className="absolute rounded-lg border border-white/20 bg-slate-500"
                      style={{
                        left: 2,
                        top: 4,
                        width: cardW - 2,
                        height: cardH - 2,
                      }}
                    />
                  )}
                </>
              )}

              {/* Main card visual with flip animation */}
              <div
                className={`absolute top-0 left-0 rounded-lg overflow-hidden border-2 ${
                  isDropTarget
                    ? 'border-green-500 ring-4 ring-green-500/50'
                    : isSelected
                      ? 'border-blue-400 ring-2 ring-blue-400/50'
                      : isStack
                        ? 'border-yellow-400/50'
                        : 'border-white/30'
                }`}
                data-testid={`card-face-container-${card.tableId}`}
                data-face-down={card.faceDown ? 'true' : 'false'}
                style={{
                  width: cardW,
                  height: cardH,
                  perspective: '600px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    transition: 'transform 0.4s ease',
                    transformStyle: 'preserve-3d',
                    transform: card.faceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    position: 'relative',
                  }}
                >
                  {/* Front face */}
                  <div
                    className="absolute inset-0 bg-white"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    {card.image_path ? (
                      <img
                        src={card.image_path}
                        alt={card.name}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="sm:text-[8px] text-xs text-gray-500 text-center leading-tight truncate w-full px-1">
                          {card.name}
                        </span>
                      </div>
                    )}
                    {/* Card name label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white sm:text-[8px] text-xs text-center py-0.5 truncate px-1">
                      {card.name}
                    </div>
                  </div>

                  {/* Back face - show card back image if assigned, otherwise blue gradient fallback */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${!(card.card_back_id && cardBackMap[card.card_back_id]) ? 'bg-gradient-to-br from-blue-900 to-blue-700' : ''}`}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {card.card_back_id && cardBackMap[card.card_back_id] ? (
                      <img
                        src={cardBackMap[card.card_back_id]}
                        alt="Card back"
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-16 h-20 rounded border-2 border-blue-400/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M12 8v8M8 12h8" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stack count badge */}
              {isStack && (
                <div
                  data-testid={`stack-count-${stackId}`}
                  className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-yellow-500 text-black sm:text-[10px] text-xs font-bold flex items-center justify-center px-1 shadow-lg z-10"
                >
                  {stackSize}
                </div>
              )}

              {/* Hover tooltip for stacks */}
              {isStack && (
                <div
                  data-testid={`stack-tooltip-${stackId}`}
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white sm:text-[10px] text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                >
                  {stackNames[stackId] ? `${stackNames[stackId]} (${stackSize})` : `Stack: ${stackSize} cards`}
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

      {/* Board / Player Mat Widgets - rendered behind cards */}
      {boards.map(board => (
        <div
          key={board.id}
          data-testid={`board-${board.id}`}
          data-ui-element="true"
          className="absolute select-none group pointer-events-auto"
          style={{
            left: board.x - board.width / 2,
            top: board.y - board.height / 2,
            width: board.width,
            height: board.height,
            zIndex: 1,
            cursor: board.locked ? 'default' : (draggingObj?.id === board.id ? 'grabbing' : 'grab'),
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'board', board.id)}
          onTouchStart={(e) => handleObjDragStart(e, 'board', board.id)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'board', objId: board.id, cardTableId: null, stackId: null }); }}
        >
          <img
            src={board.imageUrl}
            alt={board.name || 'Board'}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
          {/* Delete button on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
            data-testid={`board-delete-${board.id}`}
            className="absolute -top-1 -right-1 w-11 h-11 rounded-full bg-red-500 hover:bg-red-400 text-white text-base flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
          {/* Board name label */}
          {board.name && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {board.name}
            </div>
          )}
        </div>
      ))}

      {/* Floating Counter Widgets */}
      {counters.map(counter => (
        <div
          key={counter.id}
          data-testid={`counter-${counter.id}`}
          data-counter-name={counter.name}
          data-ui-element="true"
          className="absolute z-20 select-none pointer-events-auto"
          style={{
            left: counter.x - 70,
            top: counter.y - 40,
            cursor: draggingObj?.id === counter.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'counter', counter.id)}
          onTouchStart={(e) => handleObjDragStart(e, 'counter', counter.id)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'counter', objId: counter.id, cardTableId: null, stackId: null }); }}
        >
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-600 p-3 shadow-xl min-w-[140px]">
            <div className="text-xs text-slate-400 text-center mb-1 font-medium truncate" data-testid={`counter-name-${counter.id}`}>
              {counter.name}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); decrementCounter(counter.id); }}
                data-testid={`counter-decrement-${counter.id}`}
                className="w-11 h-11 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xl flex items-center justify-center transition-colors"
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
                className="w-11 h-11 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xl flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteCounter(counter.id); }}
              data-testid={`counter-delete-${counter.id}`}
              className="absolute -top-2 -right-2 w-11 h-11 rounded-full bg-red-500 hover:bg-red-400 text-white text-base flex items-center justify-center transition-colors"
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
          className="absolute z-20 select-none pointer-events-auto"
          style={{
            left: die.x - 35,
            top: die.y - 35,
            cursor: draggingObj?.id === die.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'die', die.id)}
          onTouchStart={(e) => handleObjDragStart(e, 'die', die.id)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'die', objId: die.id, cardTableId: null, stackId: null }); }}
        >
          <div
            className={`bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-600 p-2 shadow-xl text-center ${die.rolling ? 'animate-bounce' : ''}`}
            style={{ minWidth: '70px' }}
          >
            <div className="sm:text-[10px] text-xs text-slate-400 uppercase font-bold mb-0.5">
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
                className="flex-1 h-11 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {die.rolling ? '...' : 'Roll'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteDie(die.id); }}
                data-testid={`die-delete-${die.id}`}
                className="w-11 h-11 rounded bg-red-600 hover:bg-red-500 text-white text-base flex items-center justify-center transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Floating Custom Dice Widgets */}
      {customDiceOnTable.map(die => (
        <div
          key={die.id}
          data-testid={`custom-die-${die.id}`}
          data-ui-element="true"
          className="absolute z-20 select-none pointer-events-auto"
          style={{ left: die.x - 40, top: die.y - 48, cursor: draggingObj?.id === die.id ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => handleObjDragStart(e, 'customDie', die.id)}
          onTouchStart={(e) => handleObjDragStart(e, 'customDie', die.id)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'customDie', objId: die.id, cardTableId: null, stackId: null }); }}
        >
          <div className={`bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-600 p-2 shadow-xl text-center ${die.rolling ? 'animate-bounce' : ''}`} style={{ width: '80px' }}>
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 truncate" title={die.name}>{die.name}</div>
            {die.faceImages[die.currentFace] ? (
              <div className="w-12 h-12 mx-auto rounded-lg overflow-hidden bg-slate-700 border border-slate-500 mb-1">
                <img
                  src={die.faceImages[die.currentFace]}
                  alt={`Seite ${die.currentFace + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="text-2xl font-mono font-bold text-white mb-1">{die.currentFace + 1}</div>
            )}
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); rollCustomDie(die.id); }}
                disabled={die.rolling}
                data-testid={`custom-die-roll-${die.id}`}
                className="flex-1 h-8 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {die.rolling ? '...' : 'Roll'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteCustomDieFromTable(die.id); }}
                className="w-8 h-8 rounded bg-red-600 hover:bg-red-500 text-white text-sm flex items-center justify-center transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Floating Hit Dice Widgets */}
      {hitDice.map(die => {
        const hitDieColors = {
          yellow: { bg: 'rgba(202,138,4,0.92)', border: '#fbbf24', text: '#fff', label: 'Yellow' },
          green:  { bg: 'rgba(22,101,52,0.92)',  border: '#4ade80', text: '#fff', label: 'Green' },
          blue:   { bg: 'rgba(29,78,216,0.92)',   border: '#60a5fa', text: '#fff', label: 'Blue' },
          purple: { bg: 'rgba(88,28,135,0.92)',   border: '#c084fc', text: '#fff', label: 'Purple' },
          red:    { bg: 'rgba(153,27,27,0.92)',   border: '#f87171', text: '#fff', label: 'Red' },
        };
        const colors = hitDieColors[die.hitType] || hitDieColors.yellow;
        const faceSymbol = die.value === 'hit' ? '⊕' : die.value === 'crit' ? '✦' : '○';
        const faceLabel = die.value === 'hit' ? 'Hit' : die.value === 'crit' ? 'Crit' : 'Miss';
        return (
          <div
            key={die.id}
            data-testid={`hit-die-${die.id}`}
            data-die-type={`hit-${die.hitType}`}
            data-ui-element="true"
            className="absolute z-20 select-none pointer-events-auto"
            style={{
              left: die.x - 38,
              top: die.y - 42,
              cursor: draggingObj?.id === die.id ? 'grabbing' : 'grab',
            }}
            onMouseDown={(e) => handleObjDragStart(e, 'hitDie', die.id)}
            onTouchStart={(e) => handleObjDragStart(e, 'hitDie', die.id)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'hitDie', objId: die.id, cardTableId: null, stackId: null }); }}
          >
            <div
              className={`rounded-xl border-2 shadow-xl text-center ${die.rolling ? 'animate-bounce' : ''}`}
              style={{
                minWidth: '76px',
                background: colors.bg,
                borderColor: colors.border,
                padding: '8px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle glitter overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '10px', pointerEvents: 'none',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 5px)',
              }} />
              <div className="text-[10px] uppercase font-bold mb-0.5" style={{ color: colors.border, letterSpacing: '0.05em' }}>
                {colors.label}
              </div>
              <div
                className={`text-3xl font-bold leading-none ${die.rolling ? 'opacity-50' : ''}`}
                style={{ color: colors.text }}
                data-testid={`hit-die-symbol-${die.id}`}
              >
                {die.rolling ? '?' : faceSymbol}
              </div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: colors.border }}>
                {die.rolling ? '...' : faceLabel}
              </div>
              <div className="flex gap-1 mt-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); rollHitDie(die.id); }}
                  disabled={die.rolling}
                  data-testid={`hit-die-roll-${die.id}`}
                  className="flex-1 h-10 rounded text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; }}
                >
                  {die.rolling ? '...' : 'Roll'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteHitDie(die.id); }}
                  data-testid={`hit-die-delete-${die.id}`}
                  className="w-10 h-10 rounded text-white text-base flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.7)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; }}
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Note Widgets (sticky notes on table) */}
      {notes.map(note => (
        <div
          key={note.id}
          data-testid={`note-${note.id}`}
          data-note-id={note.id}
          data-ui-element="true"
          className="absolute z-20 select-none group pointer-events-auto"
          style={{
            left: note.x - 80,
            top: note.y - 50,
            cursor: draggingObj?.id === note.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => {
            // Don't start drag when clicking on textarea or buttons
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            handleObjDragStart(e, 'note', note.id);
          }}
          onTouchStart={(e) => {
            // Don't start drag when touching textarea or buttons
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            handleObjDragStart(e, 'note', note.id);
          }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'note', objId: note.id, cardTableId: null, stackId: null }); }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (editingNoteId !== note.id) {
              startEditingNote(note.id);
            }
          }}
        >
          <div className="bg-amber-100 rounded-lg border border-amber-300 shadow-lg min-w-[160px] max-w-[200px] relative"
               style={{ boxShadow: '2px 3px 8px rgba(0,0,0,0.2)' }}>
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
              data-testid={`note-delete-${note.id}`}
              className="absolute -top-2 -right-2 w-11 h-11 rounded-full bg-red-500 hover:bg-red-400 text-white text-base flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              &times;
            </button>
            {/* Edit button */}
            {editingNoteId !== note.id && (
              <button
                onClick={(e) => { e.stopPropagation(); startEditingNote(note.id); }}
                data-testid={`note-edit-${note.id}`}
                className="absolute -top-2 -left-2 w-11 h-11 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Edit note"
              >
                &#9998;
              </button>
            )}
            <div className="p-2.5">
              {editingNoteId === note.id ? (
                <div>
                  <textarea
                    value={editingNoteText}
                    onChange={(e) => setEditingNoteText(e.target.value)}
                    data-testid={`note-edit-input-${note.id}`}
                    className="w-full px-2 py-1 bg-amber-50 border border-amber-400 rounded text-amber-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveNoteEdit(note.id);
                      }
                      if (e.key === 'Escape') {
                        setEditingNoteId(null);
                        setEditingNoteText('');
                      }
                      e.stopPropagation();
                    }}
                  />
                  <div className="flex gap-1 justify-end mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingNoteId(null); setEditingNoteText(''); }}
                      className="px-2 py-0.5 sm:text-[10px] text-xs text-amber-700 hover:text-amber-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); saveNoteEdit(note.id); }}
                      data-testid={`note-save-edit-${note.id}`}
                      className="px-2 py-0.5 sm:text-[10px] text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-amber-900 text-xs whitespace-pre-wrap break-words min-h-[20px]"
                  data-testid={`note-text-${note.id}`}
                  title="Double-click to edit"
                >
                  {note.text}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Floating Token Widgets */}
      {tokens.map(token => {
        const tokenSize = token.size || 30;
        const halfSize = Math.floor(tokenSize / 2);
        return (
        <div
          key={token.id}
          data-testid={`token-${token.id}`}
          data-token-shape={token.shape}
          data-token-color={token.color}
          data-token-label={token.label || ''}
          data-ui-element="true"
          className="absolute z-20 select-none group pointer-events-auto"
          style={{
            left: token.x - halfSize,
            top: token.y - halfSize,
            cursor: draggingObj?.id === token.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'token', token.id)}
          onTouchStart={(e) => handleObjDragStart(e, 'token', token.id)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'token', objId: token.id, cardTableId: null, stackId: null }); }}
        >
          <TokenShape shape={token.shape} color={token.color} size={tokenSize} label={token.label} imageUrl={token.imageUrl || null} />
          {/* Delete button on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteToken(token.id); }}
            data-testid={`token-delete-${token.id}`}
            className="absolute -top-1 -right-1 w-11 h-11 rounded-full bg-red-500 hover:bg-red-400 text-white text-base flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
          {/* Attached indicator */}
          {token.attachedTo && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm" />
          )}
        </div>
        );
      })}
      {/* Text Field Widgets */}
      {textFields.map(tf => {
        return (
          <div
            key={tf.id}
            data-testid={`textfield-${tf.id}`}
            className={`absolute select-none group pointer-events-auto ${tf.locked ? 'ring-1 ring-yellow-500/40 rounded' : ''}`}
            style={{
              left: tf.x,
              top: tf.y,
              transform: 'translate(-50%, -50%)',
              cursor: tf.locked ? 'default' : 'grab',
              zIndex: 15,
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if (editingTextFieldId === tf.id) return;
              handleObjDragStart(e, 'textField', tf.id);
            }}
            onTouchStart={(e) => {
              if (editingTextFieldId === tf.id) return;
              handleObjDragStart(e, 'textField', tf.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                objType: 'textField',
                objId: tf.id,
                cardTableId: null,
                stackId: null,
              });
            }}
            onDoubleClick={() => {
              setEditingTextFieldId(tf.id);
              setEditingTextFieldText(tf.text);
              setEditingTextFieldFontSize(tf.fontSize);
              setEditingTextFieldColor(tf.color);
            }}
          >
            {editingTextFieldId === tf.id ? (
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border border-blue-400 shadow-xl" style={{ minWidth: 150 }}>
                <textarea
                  autoFocus
                  value={editingTextFieldText}
                  onChange={(e) => setEditingTextFieldText(e.target.value)}
                  className="w-full bg-transparent text-white border-none outline-none resize-none"
                  style={{ fontSize: editingTextFieldFontSize, color: editingTextFieldColor, minHeight: 30 }}
                  rows={2}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 mt-1 border-t border-slate-700 pt-1">
                  <label className="text-xs text-slate-400">Size:</label>
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={editingTextFieldFontSize}
                    onChange={(e) => setEditingTextFieldFontSize(parseInt(e.target.value) || 16)}
                    className="w-12 bg-slate-700 text-white text-xs px-1 py-0.5 rounded"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <label className="text-xs text-slate-400">Color:</label>
                  <input
                    type="color"
                    value={editingTextFieldColor}
                    onChange={(e) => setEditingTextFieldColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => {
                      updateTextField(tf.id, {
                        text: editingTextFieldText,
                        fontSize: editingTextFieldFontSize,
                        color: editingTextFieldColor,
                      });
                      setEditingTextFieldId(null);
                    }}
                    className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-500"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="whitespace-pre-wrap"
                style={{
                  fontSize: tf.fontSize,
                  color: tf.color,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
                  lineHeight: 1.2,
                  pointerEvents: 'auto',
                }}
              >
                {tf.text}
                {tf.locked && (
                  <span className="ml-1 text-yellow-500/60 text-xs align-top">{'\u{1F512}'}</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      </div>{/* End world-space transform wrapper */}

      {/* Top bar with game name and back button - compact in landscape */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none safe-area-top transition-all duration-300 ease-in-out" data-ui-element="true" data-layout-mode={layoutMode}>
        <div className={`flex items-center justify-between transition-all duration-300 ease-in-out ${isMobileLandscape ? 'p-1.5' : 'p-3'}`} style={{ paddingLeft: isMobileLandscape ? 'max(0.5rem, env(safe-area-inset-left, 0px))' : 'max(0.75rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))' }}>
          <div className={`flex items-center ${isMobileLandscape ? 'gap-1.5' : 'gap-3'} pointer-events-auto`}>
            <button
              onClick={() => navigate(`/games/${id}`)}
              data-testid="back-to-game-btn"
              className={`bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-colors flex items-center gap-2 ${isMobileLandscape ? 'px-2 py-1.5 text-xs min-h-[36px]' : 'px-4 py-3 text-sm min-h-[44px]'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 14 : 16} height={isMobileLandscape ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {!isMobileLandscape && 'Back'}
            </button>
            {!isMobileLandscape && (
              <span className="text-white/80 text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg" data-testid="game-table-title">
                {game?.name || 'Game Table'}
              </span>
            )}
          </div>
          <div className={`pointer-events-auto flex items-center ${isMobileLandscape ? 'gap-1' : 'gap-2'}`}>
            {/* Card drawer toggle */}
            <button
              onClick={() => setShowCardDrawer(prev => !prev)}
              data-testid="toggle-card-drawer"
              className={`backdrop-blur-sm text-white rounded-lg transition-colors flex items-center gap-2 ${
                isMobileLandscape ? 'px-2 py-1.5 text-xs min-h-[36px]' : 'px-4 py-3 text-sm min-h-[44px]'
              } ${
                showCardDrawer ? 'bg-blue-600/70 hover:bg-blue-600' : 'bg-black/50 hover:bg-black/70'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 14 : 16} height={isMobileLandscape ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              {isMobileLandscape ? availableCards.length : `Cards (${availableCards.length})`}
            </button>
            {!isMobileLandscape && (
              <span className="text-white/50 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded" data-testid="zoom-display">
                Zoom: {zoomDisplay}%
              </span>
            )}
            {!isMobileLandscape && (
              <span className="text-white/50 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded" data-testid="pan-display">
                Pan: {panPosition.x},{panPosition.y}
              </span>
            )}
            <span
              className={`text-xs backdrop-blur-sm px-2 py-1 rounded cursor-pointer ${
                autoSaveStatus === 'saving' ? 'text-yellow-300 bg-yellow-900/30' :
                autoSaveStatus === 'saved' ? 'text-green-300 bg-green-900/30' :
                'text-white/50 bg-black/30'
              }`}
              data-testid="auto-save-status"
              data-auto-save-enabled={autoSaveEnabledRef.current ? 'true' : 'false'}
              onClick={() => {
                // Manual auto-save trigger for testing
                if (performAutoSaveRef.current) {
                  performAutoSaveRef.current();
                }
              }}
              title="Click to trigger auto-save manually"
            >
              {autoSaveStatus === 'saving' ? 'Saving...' :
               autoSaveStatus === 'saved' ? 'Auto-saved' :
               'Auto-save: ON'}
            </span>
          </div>
        </div>
      </div>

      {/* Token Legend */}
      {showLegend && tokens.length > 0 && (
        <div
          className="absolute z-30 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3 max-w-xs"
          style={{ top: 'calc(4rem + env(safe-area-inset-top, 0px))', right: 'max(1rem, env(safe-area-inset-right, 0px))' }}
          data-testid="token-legend"
          data-ui-element="true"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white/90 text-sm font-semibold">Token Legend</h4>
            <button
              onClick={() => setShowLegend(false)}
              className="text-white/60 hover:text-white/90 transition-colors"
              title="Hide Legend"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {tokens.map(token => (
              <div
                key={token.id}
                className="flex items-center gap-2 text-white/80 text-xs"
                data-testid={`legend-token-${token.id}`}
              >
                <TokenShape shape={token.shape} color={token.color} size={20} label={token.label} />
                <span className="flex-1">
                  {token.label && <span className="font-semibold">{token.label}: </span>}
                  <span className="capitalize">{token.shape}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend Toggle Button (when legend is hidden) */}
      {!showLegend && tokens.length > 0 && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute z-30 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-2 text-white/80 hover:text-white/90 transition-colors"
          style={{ top: 'calc(4rem + env(safe-area-inset-top, 0px))', right: 'max(1rem, env(safe-area-inset-right, 0px))' }}
          data-testid="show-legend-btn"
          data-ui-element="true"
          title="Show Token Legend"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      )}

      {/* Swipe edge indicator for mobile - visible when drawer is closed on touch devices */}
      {!showCardDrawer && isTouchCapableRef.current && (
        <div
          className="absolute left-0 z-30 pointer-events-none"
          style={{
            top: 'calc(50% - 40px)',
            width: '4px',
            height: '80px',
          }}
          data-testid="swipe-edge-indicator"
        >
          <div className="w-full h-full bg-white/20 rounded-r-full" />
        </div>
      )}

      {/* Swipe-preview drawer (shown during opening swipe when drawer is closed) */}
      {!showCardDrawer && isSwipingDrawer && drawerSwipeOffset > 0 && (
        <div
          className="absolute left-0 sm:w-64 w-full z-30 pointer-events-none safe-area-left"
          style={{
            top: 'calc(3rem + env(safe-area-inset-top, 0px))',
            bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
            transform: `translateX(${-280 + drawerSwipeOffset}px)`,
            transition: 'none',
            opacity: Math.min(1, drawerSwipeOffset / 100),
          }}
          data-testid="drawer-swipe-preview"
        >
          <div className="h-full bg-black/80 backdrop-blur-md border-r border-white/10 flex flex-col">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-white/90 text-sm font-semibold">Card Library</h3>
              <p className="text-white/50 text-xs mt-1">Swipe to open</p>
            </div>
          </div>
        </div>
      )}

      {/* Card Drawer Panel - landscape: narrower side panel */}
      {showCardDrawer && (
        <div
          className={`absolute right-0 z-30 pointer-events-auto safe-area-right transition-all duration-300 ease-in-out ${
            isMobileLandscape ? 'w-48' : 'sm:w-64 w-full'
          }`}
          style={{
            top: isMobileLandscape ? 'calc(2.5rem + env(safe-area-inset-top, 0px))' : 'calc(3rem + env(safe-area-inset-top, 0px))',
            bottom: isMobileLandscape ? 'env(safe-area-inset-bottom, 0px)' : 'calc(4rem + env(safe-area-inset-bottom, 0px))',
            transform: isSwipingDrawer && drawerSwipeOffset < 0 ? `translateX(${-drawerSwipeOffset}px)` : 'translateX(0)',
            transition: isSwipingDrawer ? 'none' : 'transform 0.3s ease-out',
          }}
          data-testid="card-drawer"
          data-ui-element="true"
        >
          <div className="h-full bg-black/80 backdrop-blur-md border-l border-white/10 flex flex-col">
            <div className={isMobileLandscape ? 'p-2 border-b border-white/10' : 'p-3 border-b border-white/10'}>
              <h3 className="text-white/90 text-sm font-semibold">Card Library</h3>
              {!isMobileLandscape && (
                <p className="text-white/50 text-xs mt-1">
                  {availableCards.length === 0
                    ? 'No cards imported yet. Go to game details to upload cards.'
                    : `${availableCards.length} card(s) available. Click to place on table.`}
                </p>
              )}
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
                <div className="space-y-2">
                  {/* Categories */}
                  {categories.map(category => {
                    const categoryCards = availableCards.filter(c => c.category_id === category.id);
                    const isExpanded = expandedCategories.has(category.id);
                    if (categoryCards.length === 0) return null;
                    return (
                      <div key={category.id} className="border border-white/10 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-1 bg-slate-700/30 p-2">
                          <button
                            onClick={() => {
                              setExpandedCategories(prev => {
                                const next = new Set(prev);
                                if (next.has(category.id)) {
                                  next.delete(category.id);
                                } else {
                                  next.add(category.id);
                                }
                                return next;
                              });
                            }}
                            className="text-white/60 hover:text-white/90 transition-colors"
                            data-testid={`category-toggle-${category.id}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </button>
                          <span className="text-white/80 text-xs font-medium flex-1 truncate" title={category.name}>
                            {category.name} ({categoryCards.length})
                          </span>
                          <button
                            onClick={() => placeCategoryAsStack(category.id)}
                            data-testid={`place-category-stack-${category.id}`}
                            className="text-emerald-400 hover:text-emerald-300 sm:text-[10px] text-xs px-2 py-0.5 rounded bg-emerald-900/30 hover:bg-emerald-900/50 transition-colors font-medium"
                            title={`Place all ${categoryCards.length} cards as a stack`}
                          >
                            + Stack
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-2 p-2 bg-black/20">
                            {categoryCards.map(card => (
                              <button
                                key={card.id}
                                onClick={() => placeCardOnTable(card)}
                                data-testid={`drawer-card-${card.id}`}
                                className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-blue-400 transition-all hover:scale-105 bg-slate-700/50"
                                style={{ aspectRatio: (card.width > 0 && card.height > 0) ? `${card.width}/${card.height}` : '5/7' }}
                                title={`Place "${card.name}" on table`}
                              >
                                {card.image_path ? (
                                  <img
                                    src={card.image_path}
                                    alt={card.name}
                                    className="w-full h-full object-contain"
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
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white sm:text-[9px] text-xs text-center py-0.5 truncate px-1">
                                  {card.name}
                                </div>
                                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="bg-blue-600 text-white sm:text-[10px] text-xs px-2 py-0.5 rounded-full font-medium">
                                    + Place
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Uncategorized cards */}
                  {(() => {
                    const uncategorizedCards = availableCards.filter(c => !c.category_id);
                    if (uncategorizedCards.length === 0) return null;
                    const isExpanded = expandedCategories.has('uncategorized');
                    return (
                      <div className="border border-white/10 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-1 bg-slate-700/30 p-2">
                          <button
                            onClick={() => {
                              setExpandedCategories(prev => {
                                const next = new Set(prev);
                                if (next.has('uncategorized')) {
                                  next.delete('uncategorized');
                                } else {
                                  next.add('uncategorized');
                                }
                                return next;
                              });
                            }}
                            className="text-white/60 hover:text-white/90 transition-colors"
                            data-testid="category-toggle-uncategorized"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </button>
                          <span className="text-white/80 text-xs font-medium flex-1 truncate">
                            Uncategorized ({uncategorizedCards.length})
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="grid grid-cols-2 gap-2 p-2 bg-black/20">
                            {uncategorizedCards.map(card => (
                              <button
                                key={card.id}
                                onClick={() => placeCardOnTable(card)}
                                data-testid={`drawer-card-${card.id}`}
                                className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-blue-400 transition-all hover:scale-105 bg-slate-700/50"
                                style={{ aspectRatio: (card.width > 0 && card.height > 0) ? `${card.width}/${card.height}` : '5/7' }}
                                title={`Place "${card.name}" on table`}
                              >
                                {card.image_path ? (
                                  <img
                                    src={card.image_path}
                                    alt={card.name}
                                    className="w-full h-full object-contain"
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
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white sm:text-[9px] text-xs text-center py-0.5 truncate px-1">
                                  {card.name}
                                </div>
                                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="bg-blue-600 text-white sm:text-[10px] text-xs px-2 py-0.5 rounded-full font-medium">
                                    + Place
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

      {/* Floating Toolbar - landscape: vertical on left side, portrait: horizontal at bottom */}
      {showToolbar && (
        <div
          className={`absolute z-30 transition-all duration-300 ease-in-out ${
            isMobileLandscape
              ? 'top-1/2 -translate-y-1/2 left-0'
              : 'left-1/2 -translate-x-1/2'
          }`}
          style={isMobileLandscape
            ? { left: 'env(safe-area-inset-left, 0px)' }
            : { bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }
          }
          data-testid="floating-toolbar"
          data-ui-element="true"
        >
          <div className={`flex ${isMobileLandscape ? 'flex-col' : 'flex-row'} items-center gap-0.5 bg-black/70 backdrop-blur-md rounded-xl ${isMobileLandscape ? 'px-1 py-2' : 'px-3 py-2'} shadow-2xl border border-white/10`}>
            {/* Counter button */}
            <button
              onClick={() => setShowCounterModal(true)}
              data-testid="toolbar-counter-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Add Counter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M12 12h.01" />
                <path d="M17 12h.01" />
                <path d="M7 12h.01" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Counter</span>}
            </button>

            {/* Dice button */}
            <button
              onClick={() => setShowDiceModal(true)}
              data-testid="toolbar-dice-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Add Dice"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Dice</span>}
            </button>

            {/* Hit Dice button */}
            <button
              onClick={() => setShowHitDiceModal(true)}
              data-testid="toolbar-hit-dice-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Add Hit Die"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Hit Die</span>}
            </button>

            {/* Note button */}
            <button
              onClick={() => setShowNoteModal(true)}
              data-testid="toolbar-note-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Add Note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Note</span>}
            </button>

            {/* Text Field button */}
            <button
              onClick={() => setShowTextFieldModal(true)}
              data-testid="toolbar-text-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Add Text Field"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Text</span>}
            </button>

            {/* Token button */}
            <button
              onClick={() => openTokenModal()}
              data-testid="toolbar-token-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Add Token"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Token</span>}
            </button>

            <div className={isMobileLandscape ? 'h-px w-8 bg-white/20 my-0.5' : 'w-px h-8 bg-white/20 mx-1'} />

            {/* Background picker */}
            <button
              onClick={() => setShowBgPicker(prev => !prev)}
              data-testid="toolbar-bg-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Change Background"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Table</span>}
            </button>

            {/* Shortcuts help */}
            <button
              onClick={() => setShowShortcuts(prev => !prev)}
              data-testid="toolbar-shortcuts-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Keyboard Shortcuts (?)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Help</span>}
            </button>

            {/* Save button */}
            <button
              onClick={() => setShowSaveModal(true)}
              data-testid="toolbar-save-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Save Game"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17,21 17,13 7,13 7,21" />
                <polyline points="7,3 7,8 15,8" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Save</span>}
            </button>

            {/* Save Setup button (visible in setup mode or always as convenience) */}
            {setupMode && (
              <button
                onClick={() => {
                  if (!setupName && !editingSetupId) {
                    setShowSetupSaveModal(true);
                  } else if (editingSetupId) {
                    // Quick-save existing setup
                    saveSetup(setupName || 'Untitled Setup');
                  } else {
                    setShowSetupSaveModal(true);
                  }
                }}
                data-testid="toolbar-save-setup-btn"
                className={`flex flex-col items-center gap-0.5 rounded-lg text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/30 transition-colors ${isMobileLandscape ? 'px-2 py-1.5' : 'px-3 py-1.5'}`}
                title="Save Setup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17,21 17,13 7,13 7,21" />
                  <polyline points="7,3 7,8 15,8" />
                </svg>
                {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Setup</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Background Picker Dropdown */}
      {showBgPicker && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-40"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
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
      <SwipeModal isOpen={showCounterModal} onDismiss={dismissCounterModal} testId="counter-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="counter-modal">
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
              onClick={dismissCounterModal}
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
      </SwipeModal>

      {/* Dice Creation Modal */}
      <SwipeModal isOpen={showDiceModal} onDismiss={dismissDiceModal} testId="dice-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="dice-modal">
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
              onClick={dismissDiceModal}
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
      </SwipeModal>

      {/* Hit Dice Creation Modal */}
      <SwipeModal isOpen={showHitDiceModal} onDismiss={dismissHitDiceModal} testId="hit-dice-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="hit-dice-modal">
          <h3 className="text-white font-semibold mb-1">Add Hit Die</h3>
          <p className="text-slate-400 text-xs mb-4">Select a die by strength. More hits = stronger die.</p>
          <div className="flex flex-col gap-2 mb-4">
            {[
              { type: 'yellow', label: 'Yellow — 1 Hit', hits: 1, bg: '#ca8a04', border: '#fbbf24', desc: '4× Miss, 1× Hit, 1× Crit' },
              { type: 'green',  label: 'Green — 2 Hits', hits: 2, bg: '#166534', border: '#4ade80', desc: '3× Miss, 2× Hit, 1× Crit' },
              { type: 'blue',   label: 'Blue — 3 Hits',  hits: 3, bg: '#1d4ed8', border: '#60a5fa', desc: '2× Miss, 3× Hit, 1× Crit' },
              { type: 'purple', label: 'Purple — 4 Hits', hits: 4, bg: '#581c87', border: '#c084fc', desc: '1× Miss, 4× Hit, 1× Crit' },
              { type: 'red',    label: 'Red — 5 Hits',   hits: 5, bg: '#991b1b', border: '#f87171', desc: '5× Hit, 1× Crit (no miss)' },
            ].map(opt => (
              <button
                key={opt.type}
                onClick={() => createHitDie(opt.type)}
                data-testid={`hit-die-${opt.type}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all hover:scale-[1.02]"
                style={{ background: opt.bg + 'cc', borderColor: opt.border }}
              >
                <span className="text-2xl font-bold text-white">⊕</span>
                <div>
                  <div className="text-white text-sm font-semibold">{opt.label}</div>
                  <div className="text-xs" style={{ color: opt.border }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={dismissHitDiceModal}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </SwipeModal>

      {/* Note Creation Modal */}
      <SwipeModal isOpen={showNoteModal} onDismiss={dismissNoteModal} testId="note-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="note-modal">
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
              onClick={dismissNoteModal}
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
      </SwipeModal>

      {/* Token Modal */}
      <SwipeModal isOpen={showTokenModal} onDismiss={dismissTokenModal} testId="token-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-96 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="token-modal">
          <h3 className="text-white font-semibold mb-4">Add Token</h3>

          {/* Bild-Tokens aus der Bibliothek */}
          {imageTokenLibrary.length > 0 && (
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">Bild-Token</label>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {imageTokenLibrary.map(token => (
                  <button
                    key={token.id}
                    onClick={() => {
                      const canvas = canvasRef.current;
                      const size = token.width || 60;
                      const newToken = {
                        id: crypto.randomUUID(),
                        shape: 'image',
                        imageUrl: token.image_path,
                        label: token.name || '',
                        size,
                        x: (canvas?.width || 800) / 2 + (Math.random() - 0.5) * 100,
                        y: (canvas?.height || 600) / 2 + (Math.random() - 0.5) * 100,
                        color: null,
                        attachedTo: null,
                        attachedCorner: null,
                        locked: false,
                      };
                      setTokens(prev => [...prev, newToken]);
                      if (room) room.sendAction({ type: 'token_create', token: newToken });
                      setShowTokenModal(false);
                    }}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 border-slate-600 hover:border-blue-400 bg-slate-700 hover:bg-slate-600 transition-all"
                    title={`${token.name || 'Token'}${token.quantity > 1 ? ` (×${token.quantity})` : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-600 flex items-center justify-center">
                      <img src={token.image_path} alt={token.name} className="w-full h-full object-contain" loading="lazy" />
                    </div>
                    <span className="text-[10px] text-slate-300 truncate w-12 text-center leading-tight">
                      {token.name || '—'}
                    </span>
                    {token.quantity > 1 && (
                      <span className="text-[9px] text-blue-400">×{token.quantity}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-slate-600 pt-2">
                <label className="block text-slate-300 text-sm mb-2">Geometrische Form</label>
              </div>
            </div>
          )}

          {/* Custom Würfel aus der Bibliothek */}
          {customDiceLibrary.length > 0 && (
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">Custom Würfel</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                {customDiceLibrary.map(die => (
                  <button
                    key={die.id}
                    onClick={() => placeCustomDie(die)}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 border-slate-600 hover:border-purple-400 bg-slate-700 hover:bg-slate-600 transition-all"
                    title={`${die.name} (d${die.num_faces})`}
                  >
                    <div className="w-10 h-10 rounded overflow-hidden bg-slate-600 flex items-center justify-center">
                      {die.face_images?.[0] ? (
                        <img src={die.face_images[0]} alt={die.name} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <span className="text-lg">🎲</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-300 truncate w-12 text-center leading-tight">{die.name}</span>
                    <span className="text-[9px] text-purple-400">d{die.num_faces}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-slate-600 pt-2" />
            </div>
          )}

          {/* Shape Selection */}
          <div className="mb-4">
            {imageTokenLibrary.length === 0 && customDiceLibrary.length === 0 && <label className="block text-slate-300 text-sm mb-2">Shape</label>}
            <div className="grid grid-cols-3 gap-2">
              {['circle', 'square', 'triangle', 'star', 'hexagon', 'diamond'].map(shape => (
                <button
                  key={shape}
                  onClick={() => setNewTokenShape(shape)}
                  data-testid={`token-shape-${shape}`}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                    newTokenShape === shape
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-700'
                  }`}
                >
                  <TokenShape shape={shape} color={newTokenColor} size={24} />
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm mb-2">Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={newTokenColor}
                onChange={(e) => setNewTokenColor(e.target.value)}
                data-testid="token-color-input"
                className="w-12 h-10 rounded cursor-pointer bg-slate-700 border border-slate-600"
              />
              <input
                type="text"
                value={newTokenColor}
                onChange={(e) => setNewTokenColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </div>

          {/* Label Input */}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm mb-2">Label (optional)</label>
            <input
              type="text"
              value={newTokenLabel}
              onChange={(e) => setNewTokenLabel(e.target.value)}
              placeholder="e.g., A, 1, HP"
              maxLength={3}
              data-testid="token-label-input"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-slate-400 text-xs mt-1">Max 3 characters displayed</p>
          </div>

          {/* Preview */}
          <div className="mb-4 p-3 bg-slate-700 rounded-lg">
            <p className="text-slate-300 text-sm mb-2">Preview:</p>
            <div className="flex items-center justify-center p-4">
              <TokenShape shape={newTokenShape} color={newTokenColor} size={40} label={newTokenLabel} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                dismissTokenModal();
                setNewTokenShape('circle');
                setNewTokenColor('#3b82f6');
                setNewTokenLabel('');
              }}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createToken(newTokenShape, newTokenColor, newTokenLabel)}
              data-testid="token-create-btn"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Add Token
            </button>
          </div>
        </div>
      </SwipeModal>

      {/* Text Field Modal */}
      <SwipeModal isOpen={showTextFieldModal} onDismiss={dismissTextFieldModal} testId="textfield-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="textfield-modal">
          <h3 className="text-white font-semibold mb-3">Add Text Field</h3>
          <div className="mb-3">
            <label className="block text-slate-300 text-sm mb-1">Text</label>
            <textarea
              value={newTextFieldText}
              onChange={(e) => setNewTextFieldText(e.target.value)}
              placeholder="Enter text..."
              rows={2}
              data-testid="textfield-text-input"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              autoFocus
            />
          </div>
          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <label className="block text-slate-300 text-sm mb-1">Font Size</label>
              <input
                type="number"
                min="8"
                max="72"
                value={newTextFieldFontSize}
                onChange={(e) => setNewTextFieldFontSize(parseInt(e.target.value) || 16)}
                data-testid="textfield-fontsize-input"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-slate-300 text-sm mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={newTextFieldColor}
                  onChange={(e) => setNewTextFieldColor(e.target.value)}
                  data-testid="textfield-color-input"
                  className="w-10 h-10 rounded cursor-pointer bg-slate-700 border border-slate-600"
                />
                <input
                  type="text"
                  value={newTextFieldColor}
                  onChange={(e) => setNewTextFieldColor(e.target.value)}
                  className="flex-1 px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="mb-3 p-3 bg-slate-900 rounded-lg">
            <p className="text-slate-400 text-xs mb-1">Preview:</p>
            <div style={{ fontSize: newTextFieldFontSize, color: newTextFieldColor, lineHeight: 1.2 }}>
              {newTextFieldText || 'Text'}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={dismissTextFieldModal}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createTextField(newTextFieldText || 'Text', newTextFieldFontSize, newTextFieldColor)}
              data-testid="textfield-create-btn"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Add Text
            </button>
          </div>
        </div>
      </SwipeModal>

      {/* Save Game Modal */}
      <SwipeModal isOpen={showSaveModal} onDismiss={dismissSaveModal} testId="save-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="save-modal">
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
              onClick={dismissSaveModal}
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
      </SwipeModal>

      {/* Save Setup Modal */}
      <SwipeModal isOpen={showSetupSaveModal} onDismiss={dismissSetupSaveModal} testId="setup-save-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-80 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="setup-save-modal">
          <h3 className="text-white font-semibold mb-3">{editingSetupId ? 'Update Setup' : 'Save Setup'}</h3>
          <p className="text-slate-400 text-sm mb-3">
            {editingSetupId ? 'Update the setup with the current table state.' : 'Save the current table arrangement as a reusable game setup.'}
          </p>
          <input
            type="text"
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
            placeholder="Enter setup name..."
            data-testid="setup-name-input"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && setupName.trim() && !savingSetup) {
                saveSetup(setupName.trim());
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={dismissSetupSaveModal}
              data-testid="setup-save-cancel-btn"
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveSetup(setupName.trim())}
              disabled={!setupName.trim() || savingSetup}
              data-testid="setup-save-confirm-btn"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSetup ? 'Saving...' : (editingSetupId ? 'Update Setup' : 'Save Setup')}
            </button>
          </div>
        </div>
      </SwipeModal>

      {/* Setup Mode Banner */}
      {setupMode && (
        <div
          className="fixed top-4 right-4 z-40 bg-emerald-700/90 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-sm"
          data-testid="setup-mode-banner"
          data-ui-element="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span className="text-sm font-medium">
            {editingSetupId ? `Editing Setup: ${setupName}` : 'Setup Editor Mode'}
          </span>
          <button
            onClick={() => setShowSequenceEditor(prev => !prev)}
            data-testid="setup-banner-sequence-btn"
            className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Sequence{sequenceSteps.length > 0 ? ` (${sequenceSteps.length})` : ''}
          </button>
          <button
            onClick={() => setShowSetupSaveModal(true)}
            data-testid="setup-banner-save-btn"
            className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            {editingSetupId ? 'Save' : 'Save Setup'}
          </button>
          <button
            onClick={() => navigate(`/games/${id}`)}
            data-testid="setup-banner-exit-btn"
            className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {/* Split Stack Modal */}
      {showSplitModal && splitStackId && (() => {
        const stackCards = tableCards.filter(c => c.inStack === splitStackId);
        const maxSplit = stackCards.length - 1;
        return (
          <SwipeModal isOpen={true} onDismiss={dismissSplitModal} testId="split-modal-swipe">
            <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl border border-slate-600" data-testid="split-modal">
              <h3 className="text-white font-semibold mb-3">Split Stack</h3>
              <p className="text-slate-400 text-sm mb-3">
                Stack has {stackCards.length} cards. How many cards to split from the top?
              </p>
              <input
                type="number"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value)}
                min={1}
                max={maxSplit}
                placeholder={`1 to ${maxSplit}`}
                data-testid="split-count-input"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const n = parseInt(splitCount);
                    if (n >= 1 && n <= maxSplit) {
                      performSplit(splitStackId, n);
                      dismissSplitModal();
                    }
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={dismissSplitModal}
                  data-testid="split-cancel-btn"
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const n = parseInt(splitCount);
                    if (n >= 1 && n <= maxSplit) {
                      performSplit(splitStackId, n);
                      dismissSplitModal();
                    }
                  }}
                  disabled={!splitCount || parseInt(splitCount) < 1 || parseInt(splitCount) > maxSplit}
                  data-testid="split-confirm-btn"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Split
                </button>
              </div>
            </div>
          </SwipeModal>
        );
      })()}

      {/* Browse Stack Overlay */}
      {browseStackId && (() => {
        const stackCards = tableCards
          .filter(c => c.inStack === browseStackId)
          .sort((a, b) => b.zIndex - a.zIndex); // Top card first
        if (stackCards.length === 0) {
          setBrowseStackId(null);
          return null;
        }
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            data-testid="browse-stack-overlay"
            data-ui-element="true"
            onClick={(e) => { if (e.target === e.currentTarget) setBrowseStackId(null); }}
          >
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600 max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col" data-testid="browse-stack-panel">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
                <h3 className="text-white font-semibold text-base">
                  Stack Contents ({stackCards.length} cards)
                </h3>
                <button
                  onClick={() => setBrowseStackId(null)}
                  data-testid="browse-close-btn"
                  className="text-slate-400 hover:text-white transition-colors text-xl leading-none px-2"
                >
                  &times;
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {stackCards.map((card, index) => (
                    <div
                      key={card.tableId}
                      data-testid={`browse-card-${card.tableId}`}
                      className="flex flex-col items-center"
                    >
                      <div className="relative rounded-lg overflow-hidden border border-slate-600 hover:border-slate-400 transition-colors"
                        style={{
                          width: (card.width > 0 && card.height > 0 && card.width > card.height) ? 140 : 100,
                          height: (card.width > 0 && card.height > 0 && card.width > card.height) ? 100 : 140,
                          backgroundColor: '#fff'
                        }}>
                        {card.faceDown ? (
                          card.card_back_id && cardBackMap[card.card_back_id] ? (
                            <img src={cardBackMap[card.card_back_id]} alt="Card back" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                              <div className="w-12 h-16 rounded border border-blue-400/30 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <path d="M12 8v8M8 12h8" />
                                </svg>
                              </div>
                            </div>
                          )
                        ) : card.image_path ? (
                          <img src={card.image_path} alt={card.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <span className="sm:text-[9px] text-xs text-gray-500 text-center px-1">{card.name}</span>
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/70 text-white sm:text-[9px] text-xs px-1.5 py-0.5 rounded font-mono">
                          {index + 1}
                        </div>
                      </div>
                      <span className="text-slate-300 text-xs mt-1 truncate w-full text-center" title={card.name}>
                        {card.name}
                      </span>
                      {card.faceDown && (
                        <span className="text-slate-500 sm:text-[10px] text-xs">(face down)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-700 flex justify-end">
                <button
                  onClick={() => setBrowseStackId(null)}
                  data-testid="browse-done-btn"
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Draw Cards Toast Notification */}
      {drawToast && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          data-testid="draw-toast"
          data-ui-element="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
          <span className="text-sm font-medium" data-testid="draw-toast-text">{drawToast}</span>
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
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            marginLeft: 'env(safe-area-inset-left, 0px)',
            marginTop: 'env(safe-area-inset-top, 0px)',
            maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
            overflow: 'auto',
          }}
          data-testid="context-menu"
          data-ui-element="true"
        >
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-600 py-1 min-w-[180px]">
            {/* Card-specific actions (shown when right-clicking a card or stack) */}
            {contextMenu.cardTableId && (
              <>
                <div className="px-3 py-1 sm:text-[10px] text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  {contextMenu.stackId ? 'Stack Actions' : 'Card Actions'}
                </div>
                <button
                  onClick={() => {
                    setTableCards(prev => prev.map(c => {
                      if (selectedCards.has(c.tableId)) {
                        return { ...c, faceDown: !c.faceDown };
                      }
                      return c;
                    }));
                    setContextMenu(null);
                  }}
                  data-testid="context-flip"
                  className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>Flip</span>
                  <span className="ml-auto text-xs text-slate-500">F</span>
                </button>
                <button
                  onClick={() => {
                    setTableCards(prev => prev.map(c => {
                      if (selectedCards.has(c.tableId)) {
                        return { ...c, rotation: (c.rotation || 0) + 90 };
                      }
                      return c;
                    }));
                    setContextMenu(null);
                  }}
                  data-testid="context-rotate-cw"
                  className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>Rotate CW</span>
                  <span className="ml-auto text-xs text-slate-500">E</span>
                </button>
                <button
                  onClick={() => {
                    setTableCards(prev => prev.map(c => {
                      if (selectedCards.has(c.tableId)) {
                        return { ...c, rotation: (c.rotation || 0) - 90 };
                      }
                      return c;
                    }));
                    setContextMenu(null);
                  }}
                  data-testid="context-rotate-ccw"
                  className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>Rotate CCW</span>
                  <span className="ml-auto text-xs text-slate-500">Q</span>
                </button>
                <button
                  onClick={() => {
                    const selected = Array.from(selectedCards);
                    selected.forEach(tid => pickUpToHand(tid));
                    setContextMenu(null);
                  }}
                  data-testid="context-pick-up-to-hand"
                  className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-slate-700 hover:text-green-300 transition-colors"
                >
                  Pick Up to Hand
                </button>

                {/* Stack-specific actions */}
                {contextMenu.stackId && (
                  <>
                    <div className="border-t border-slate-700 my-1" />
                    <div className="px-3 py-1 sm:text-[10px] text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Stack
                    </div>
                    <button
                      onClick={() => {
                        const sid = contextMenu.stackId;
                        setTableCards(prev => {
                          const stackCards = prev.filter(c => c.inStack === sid);
                          const otherCards = prev.filter(c => c.inStack !== sid);
                          for (let i = stackCards.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            const tempZ = stackCards[i].zIndex;
                            stackCards[i] = { ...stackCards[i], zIndex: stackCards[j].zIndex };
                            stackCards[j] = { ...stackCards[j], zIndex: tempZ };
                          }
                          return [...otherCards, ...stackCards];
                        });
                        setContextMenu(null);
                      }}
                      data-testid="context-shuffle"
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Shuffle
                    </button>
                    <button
                      onClick={() => {
                        const sid = contextMenu.stackId;
                        const stackCards = tableCards.filter(c => c.inStack === sid);
                        if (stackCards.length < 2) { setContextMenu(null); return; }
                        setSplitStackId(sid);
                        setSplitCount(Math.floor(stackCards.length / 2).toString());
                        setShowSplitModal(true);
                        setContextMenu(null);
                      }}
                      data-testid="context-split"
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Split Stack
                    </button>
                    <button
                      onClick={() => {
                        const sid = contextMenu.stackId;
                        setTableCards(prev => prev.map(c => {
                          if (c.inStack === sid) {
                            return { ...c, faceDown: !c.faceDown };
                          }
                          return c;
                        }));
                        setContextMenu(null);
                      }}
                      data-testid="context-flip-stack"
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Flip Stack
                    </button>
                    <button
                      onClick={() => {
                        setBrowseStackId(contextMenu.stackId);
                        setContextMenu(null);
                      }}
                      data-testid="context-browse"
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Browse
                    </button>
                    <button
                      onClick={() => {
                        const sid = contextMenu.stackId;
                        const stackCards = tableCards.filter(c => c.inStack === sid);
                        if (stackCards.length === 0) { setContextMenu(null); return; }
                        const topCard = stackCards.reduce((max, c) => c.zIndex > max.zIndex ? c : max, stackCards[0]);
                        if (stackCards.length <= 2) {
                          setTableCards(prev => prev.map(c => c.inStack === sid ? { ...c, inStack: null } : c));
                        }
                        pickUpToHand(topCard.tableId);
                        setContextMenu(null);
                      }}
                      data-testid="context-draw"
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Draw Card
                    </button>
                  </>
                )}

                <div className="border-t border-slate-700 my-1" />
                {/* Lock/Unlock */}
                {(() => {
                  const ctxCard = tableCards.find(c => c.tableId === contextMenu.cardTableId);
                  const stackId = ctxCard?.inStack;
                  const isLocked = ctxCard?.locked;
                  return (
                    <button
                      onClick={() => {
                        if (stackId) {
                          toggleLockStack(stackId);
                        } else {
                          toggleLockCard(contextMenu.cardTableId);
                        }
                        setContextMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                    >
                      {isLocked ? '\u{1F513} Unlock' : '\u{1F512} Lock'}
                    </button>
                  );
                })()}
                <button
                  onClick={() => {
                    selectedCards.forEach(tid => removeCardFromTable(tid));
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                >
                  Remove from Table
                </button>
              </>
            )}

            {/* General table actions (always shown) */}
            {!contextMenu.cardTableId && (
              <>
                <div className="px-3 py-1 sm:text-[10px] text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Table Actions
                </div>
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
                  onClick={() => { setShowHitDiceModal(true); setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Add Hit Die
                </button>
                <button
                  onClick={() => { setShowNoteModal(true); setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Add Note
                </button>
                <button
                  onClick={() => { openTokenModal(); setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Add Token
                </button>
                <button
                  onClick={() => { setShowTextFieldModal(true); setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Add Text Field
                </button>
              </>
            )}

            {/* Object actions (counter, die, note, token, textField) */}
            {contextMenu.objType && (
              <>
                <div className="px-3 py-1 sm:text-[10px] text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  {contextMenu.objType === 'textField' ? 'Text Field' : contextMenu.objType === 'hitDie' ? 'Hit Die' : contextMenu.objType.charAt(0).toUpperCase() + contextMenu.objType.slice(1)}
                </div>
                <button
                  onClick={() => {
                    toggleLockObj(contextMenu.objType, contextMenu.objId);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {(() => {
                    const lists = { counter: counters, die: dice, hitDie: hitDice, note: notes, token: tokens, textField: textFields };
                    const obj = (lists[contextMenu.objType] || []).find(o => o.id === contextMenu.objId);
                    return obj?.locked ? '\u{1F513} Unlock' : '\u{1F512} Lock';
                  })()}
                </button>
                {contextMenu.objType === 'textField' && (
                  <button
                    onClick={() => {
                      const tf = textFields.find(t => t.id === contextMenu.objId);
                      if (tf) {
                        setEditingTextFieldId(tf.id);
                        setEditingTextFieldText(tf.text);
                        setEditingTextFieldFontSize(tf.fontSize);
                        setEditingTextFieldColor(tf.color);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Edit Text
                  </button>
                )}
                <button
                  onClick={() => {
                    const { objType, objId } = contextMenu;
                    if (objType === 'counter') setCounters(prev => prev.filter(c => c.id !== objId));
                    else if (objType === 'die') setDice(prev => prev.filter(d => d.id !== objId));
                    else if (objType === 'hitDie') setHitDice(prev => prev.filter(d => d.id !== objId));
                    else if (objType === 'note') deleteNote(objId);
                    else if (objType === 'token') { setTokens(prev => prev.filter(t => t.id !== objId)); if (room) room.sendAction({ type: 'token_delete', token_id: objId }); }
                    else if (objType === 'board') setBoards(prev => prev.filter(b => b.id !== objId));
                    else if (objType === 'textField') deleteTextField(objId);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                >
                  Delete
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
      {/* In landscape mobile: reduced height, collapsible via toggle */}
      {handCards.length > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 pointer-events-none safe-area-bottom transition-all duration-300 ease-in-out ${
            isMobileLandscape && handCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
          }`}
          data-testid="hand-area"
          data-ui-element="true"
          style={{
            paddingLeft: isMobileLandscape ? 'calc(52px + env(safe-area-inset-left, 0px))' : 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          {/* Collapse/expand toggle for landscape mode */}
          {isMobileLandscape && (
            <div className="flex justify-center pointer-events-auto">
              <button
                onClick={() => setHandCollapsed(prev => !prev)}
                data-testid="hand-collapse-toggle"
                className="bg-black/60 backdrop-blur-sm text-white/70 hover:text-white px-4 py-0.5 rounded-t-lg text-[10px] uppercase tracking-wider font-semibold transition-colors border border-b-0 border-white/10"
              >
                Hand ({handCards.length}) {handCollapsed ? '▲' : '▼'}
              </button>
            </div>
          )}
          <div className="flex justify-center items-end pb-2 pointer-events-auto">
            <div
              className={`relative flex items-end justify-center bg-black/40 backdrop-blur-sm rounded-t-xl border border-b-0 border-white/10 sm:px-4 px-2 pt-2 pb-1 ${
                isMobileLandscape ? 'min-h-[70px]' : 'sm:min-h-[120px] min-h-[100px]'
              }`}
              data-testid="hand-container"
              style={{ minWidth: Math.min(handCards.length * (isMobileLandscape ? 60 : 90) + 40, isMobileLandscape ? 600 : 800) }}
            >
              {!isMobileLandscape && (
                <div className="absolute top-1 left-3 text-white/40 sm:text-[10px] text-xs uppercase tracking-wider font-semibold">
                  Hand ({handCards.length})
                </div>
              )}
              <div className="flex items-end justify-center" style={{ gap: '2px' }}>
                {handCards.map((card, index) => {
                  const isMobile = window.innerWidth < 640;
                  const isLandscapeCard = card.width > 0 && card.height > 0 && card.width > card.height;
                  const baseW = isMobileLandscape ? 45 : (isMobile ? 60 : 80);
                  const baseH = isMobileLandscape ? 63 : (isMobile ? 84 : 112);
                  const cardWidth = isLandscapeCard ? baseH : baseW;
                  const cardHeight = isLandscapeCard ? baseW : baseH;
                  const totalCards = handCards.length;
                  const spreadAngle = isMobileLandscape ? Math.min(2, 15 / totalCards) : (isMobile ? Math.min(3, 20 / totalCards) : Math.min(5, 30 / totalCards));
                  const centerIndex = (totalCards - 1) / 2;
                  const rotation = (index - centerIndex) * spreadAngle;
                  const yOffset = Math.abs(index - centerIndex) * (isMobileLandscape ? 2 : 4);
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
                      onMouseDown={(e) => {
                        // Right-click for hand-to-table drag (Alt + left-click also works)
                        if (e.button === 2 || (e.button === 0 && e.altKey)) {
                          e.preventDefault();
                          handleHandCardMouseDown(e, card.handId);
                        }
                      }}
                      onTouchStart={(e) => {
                        // Long press for hand-to-table drag on touch devices
                        // For now, treat any touch as potential hand-to-table drag
                        handleHandCardTouchStart(e, card.handId);
                      }}
                      onContextMenu={(e) => {
                        // Prevent context menu when using right-click for drag
                        if (draggingFromHand === card.handId) {
                          e.preventDefault();
                        }
                      }}
                      onMouseEnter={() => setHoveredHandCard(card.handId)}
                      onMouseLeave={() => setHoveredHandCard(null)}
                      className={`relative cursor-pointer transition-all duration-200 flex-shrink-0 ${isDragging ? 'opacity-30' : ''} ${isDragOver ? 'scale-105' : ''} ${draggingFromHand === card.handId ? 'opacity-50' : ''}`}
                      style={{
                        width: cardWidth,
                        height: cardHeight,
                        transform: `rotate(${rotation}deg) translateY(${isHovered ? -30 - yOffset : -yOffset}px) scale(${isHovered ? 1.15 : 1})`,
                        zIndex: isHovered ? 100 : index,
                        marginLeft: index === 0 ? 0 : (isMobileLandscape ? -6 : (isMobile ? -8 : -10)),
                        transition: 'transform 0.2s ease, opacity 0.15s ease',
                      }}
                    >
                      <div
                        className={`w-full h-full rounded-lg overflow-hidden border-2 shadow-lg ${isHovered ? 'border-yellow-400 shadow-yellow-400/30' : isDragOver ? 'border-blue-400' : 'border-white/30'}`}
                        style={{ backgroundColor: '#fff' }}
                      >
                        {card.image_path ? (
                          <img src={card.image_path} alt={card.name} className="w-full h-full object-contain" draggable={false} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 14 : 20} height={isMobileLandscape ? 14 : 20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                            <span className="sm:text-[7px] text-[9px] text-gray-500 text-center leading-tight truncate w-full px-1">{card.name}</span>
                          </div>
                        )}
                        {!isMobileLandscape && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white sm:text-[7px] text-[9px] text-center py-0.5 truncate px-1">{card.name}</div>
                        )}
                      </div>
                      {isHovered && (
                        <button
                          onClick={(e) => { e.stopPropagation(); playCardFromHand(card.handId); }}
                          data-testid={`hand-play-${card.handId}`}
                          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-500 text-white sm:text-[9px] text-xs font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-50 transition-colors"
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
      {hoveredHandCard && !draggingFromHand && (() => {
        const card = handCards.find(c => c.handId === hoveredHandCard);
        if (!card) return null;
        return (
          <div className="fixed z-50 pointer-events-none" data-testid="hand-card-preview" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -70%)' }}>
            <div className="rounded-xl overflow-hidden border-2 border-yellow-400 shadow-2xl shadow-black/50" style={{
              width: (card.width > 0 && card.height > 0 && card.width > card.height) ? 280 : 200,
              height: (card.width > 0 && card.height > 0 && card.width > card.height) ? 200 : 280,
              backgroundColor: '#fff'
            }}>
              {card.image_path ? (
                <img src={card.image_path} alt={card.name} className="w-full h-full object-contain" />
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

      {/* Ghost card during hand-to-table drag */}
      {draggingFromHand && (() => {
        const card = handCards.find(c => c.handId === draggingFromHand);
        if (!card) return null;
        const ghostDims = (card.width > 0 && card.height > 0 && card.width > card.height)
          ? { w: CARD_HEIGHT, h: CARD_WIDTH }
          : { w: CARD_WIDTH, h: CARD_HEIGHT };
        return (
          <div
            className="fixed z-[70] pointer-events-none"
            data-testid="hand-drag-ghost"
            style={{
              left: handDragPosition.x - ghostDims.w / 2,
              top: handDragPosition.y - ghostDims.h / 2,
            }}
          >
            <div
              className="rounded-lg overflow-hidden border-2 border-blue-400 shadow-2xl shadow-blue-400/50 opacity-70"
              style={{ width: ghostDims.w, height: ghostDims.h, backgroundColor: '#fff' }}
            >
              {card.image_path ? (
                <img src={card.image_path} alt={card.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  <span className="text-[7px] text-gray-500 text-center leading-tight truncate w-full px-1">{card.name}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[7px] text-center py-0.5 truncate px-1">{card.name}</div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Action Bar - floating action buttons for touch devices */}
      <MobileActionBar
        selectedCards={selectedCards}
        tableCards={tableCards}
        onFlip={handleMobileFlip}
        onRotateCW={handleMobileRotateCW}
        onRotateCCW={handleMobileRotateCCW}
        onGroup={groupSelectedCards}
        onDraw={handleMobileDraw}
        onPickUpToHand={() => {
          selectedCards.forEach(tid => pickUpToHand(tid));
        }}
        onLockToggle={() => {
          for (const tid of selectedCards) {
            const card = tableCards.find(c => c.tableId === tid);
            if (card?.inStack) { toggleLockStack(card.inStack); break; }
            else { toggleLockCard(tid); break; }
          }
        }}
        onShuffle={() => {
          let stackId = null;
          for (const tid of selectedCards) {
            const card = tableCards.find(c => c.tableId === tid);
            if (card?.inStack) { stackId = card.inStack; break; }
          }
          if (!stackId) return;
          setTableCards(prev => {
            const stackCards = prev.filter(c => c.inStack === stackId);
            const otherCards = prev.filter(c => c.inStack !== stackId);
            for (let i = stackCards.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              const tempZ = stackCards[i].zIndex;
              stackCards[i] = { ...stackCards[i], zIndex: stackCards[j].zIndex };
              stackCards[j] = { ...stackCards[j], zIndex: tempZ };
            }
            return [...otherCards, ...stackCards];
          });
        }}
        onSplitStack={() => {
          let stackId = null;
          for (const tid of selectedCards) {
            const card = tableCards.find(c => c.tableId === tid);
            if (card?.inStack) { stackId = card.inStack; break; }
          }
          if (!stackId) return;
          const stackCards = tableCards.filter(c => c.inStack === stackId);
          if (stackCards.length < 2) return;
          setSplitStackId(stackId);
          setSplitCount(Math.floor(stackCards.length / 2).toString());
          setShowSplitModal(true);
        }}
        onBrowse={() => {
          let stackId = null;
          for (const tid of selectedCards) {
            const card = tableCards.find(c => c.tableId === tid);
            if (card?.inStack) { stackId = card.inStack; break; }
          }
          if (stackId) setBrowseStackId(stackId);
        }}
        onFlipStack={() => {
          let stackId = null;
          for (const tid of selectedCards) {
            const card = tableCards.find(c => c.tableId === tid);
            if (card?.inStack) { stackId = card.inStack; break; }
          }
          if (!stackId) return;
          setTableCards(prev => prev.map(c => c.inStack === stackId ? { ...c, faceDown: !c.faceDown } : c));
        }}
        onRemove={() => {
          selectedCards.forEach(tid => removeCardFromTable(tid));
          setSelectedCards(new Set());
        }}
        isLandscape={isMobileLandscape}
      />

      {/* Hover-to-enlarge preview removed - use ALT key for card zoom instead */}

      {/* Long-press card preview popup for touch devices (Feature #58) */}
      {longPressPreviewCard && (() => {
        const previewCard = tableCards.find(c => c.tableId === longPressPreviewCard);
        if (!previewCard) return null;
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center"
            data-testid="longpress-card-preview-overlay"
            onTouchStart={(e) => {
              e.stopPropagation();
              setLongPressPreviewCard(null);
            }}
            onClick={() => setLongPressPreviewCard(null)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative z-10"
              data-testid="longpress-card-preview"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-xl overflow-hidden border-2 border-cyan-400 shadow-2xl shadow-black/60"
                style={{ width: 280, height: 392, backgroundColor: '#fff' }}
              >
                {previewCard.faceDown ? (
                  previewCard.card_back_id && cardBackMap[previewCard.card_back_id] ? (
                    <img src={cardBackMap[previewCard.card_back_id]} alt="Card back" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                      <div className="w-24 h-32 rounded border-2 border-blue-400/30 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M12 8v8M8 12h8" />
                        </svg>
                      </div>
                    </div>
                  )
                ) : previewCard.image_path ? (
                  <img src={previewCard.image_path} alt={previewCard.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span className="text-sm text-gray-500 text-center px-4">{previewCard.name}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-sm text-center py-1.5 px-2 truncate font-medium">
                  {previewCard.name}
                </div>
              </div>
              <div className="text-center mt-3">
                <span className="text-white/80 text-xs bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Tap anywhere to close
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Multiplayer Overlays ─── */}
      {room && (
        <>
          <PlayerHUD
            players={room.players || []}
            myPlayerId={room.myPlayerId}
          />
          <PlayerCursors
            cursors={(() => {
              // Convert world coords to screen coords for rendering
              const container = containerRef.current;
              if (!container) return {};
              const rect = container.getBoundingClientRect();
              const cam = cameraRef.current;
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const result = {};
              for (const [pid, pos] of Object.entries(room.remoteCursors || {})) {
                result[pid] = {
                  screenX: (pos.x - centerX + cam.x) * cam.zoom + centerX,
                  screenY: (pos.y - centerY + cam.y) * cam.zoom + centerY,
                };
              }
              return result;
            })()}
            players={room.players || []}
          />
          {zones.length > 0 && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                transform: `scale(${zoomDisplay / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                transformOrigin: '50% 50%',
              }}
            >
              <ZoneOverlay zones={zones} myColor={room.myColor} />
            </div>
          )}
        </>
      )}

      {/* Zone editor overlays in setup mode */}
      {setupMode && (
        <ZoneEditor
          zones={zones}
          onZonesChange={setZones}
          camera={cameraRef.current}
          containerRef={containerRef}
        />
      )}

      {/* Setup sequence editor */}
      {setupMode && (
        <SetupSequenceEditor
          steps={sequenceSteps}
          onStepsChange={setSequenceSteps}
          availableStackLabels={
            [...new Set(tableCards.filter(c => c.inStack).map(c => c.inStack))]
              .map(id => stackNames[id]).filter(Boolean)
          }
          availableZoneLabels={zones.map(z => z.label).filter(Boolean)}
          isOpen={showSequenceEditor}
          onToggle={() => setShowSequenceEditor(prev => !prev)}
        />
      )}

      {/* ALT key card zoom preview - desktop only (Feature #58) */}
      {altKeyHeld && hoveredTableCard && !isTouchCapableRef.current && (() => {
        const card = tableCards.find(c => c.tableId === hoveredTableCard);
        if (!card) return null;
        // Show the front face image regardless of faceDown state for preview
        return (
          <div
            className="fixed z-[60] pointer-events-none"
            data-testid="alt-card-preview"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -60%)' }}
          >
            <div
              className="rounded-xl overflow-hidden border-2 border-cyan-400 shadow-2xl shadow-black/60"
              style={{ width: 250, height: 350, backgroundColor: '#fff' }}
            >
              {card.faceDown ? (
                card.card_back_id && cardBackMap[card.card_back_id] ? (
                  <img src={cardBackMap[card.card_back_id]} alt="Card back" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                    <div className="w-24 h-32 rounded border-2 border-blue-400/30 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    </div>
                  </div>
                )
              ) : card.image_path ? (
                <img src={card.image_path} alt={card.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-sm text-gray-500 text-center px-4">{card.name}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-sm text-center py-1.5 px-2 truncate font-medium">
                {card.name}
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-white/60 text-xs bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                Hold ALT to preview
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
