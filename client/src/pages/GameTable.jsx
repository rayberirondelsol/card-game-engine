import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import HoverCard from '../components/HoverCard';
import SwipeModal from '../components/SwipeModal';
import MobileActionBar from '../components/MobileActionBar';
import { useOrientationLayout } from '../hooks/useOrientationLayout';
import PlayerHUD from '../components/PlayerHUD';
import PlayerCursors from '../components/PlayerCursor';
import ZoneOverlay from '../components/ZoneOverlay';
import ZoneEditor from '../components/ZoneEditor';
import GridOverlay from '../components/GridOverlay';
import GridEditor from '../components/GridEditor';
import { zoneAt, zoneContains, zoneRejects, countInZone } from '../../../shared/zoneGeometry.js';
import { resolveGrids, snapInto, placeOnGrids, gridAddress, offGrid } from '../../../shared/gridGeometry.js';
import SetupSequenceEditor from '../components/SetupSequenceEditor';
import { assetPools, assetNames } from '../utils/sequenceSteps.js';
import { executeSequenceWithLog } from '../../../shared/sequenceExecutor.js';
import { resolveZones, anchorBoxes } from '../../../shared/anchoring.js';
import { tableObjectView } from '../utils/tableObjectView';
import { assetToken, assetFace } from '../../../shared/assetToken.js';
import { normalizeCounter, counterDisplay, newCounterValue, counterEdit } from '../../../shared/counters.js';
import { getPointerPosition, handleTouchPrevention, isTouchEvent, getDeviceInfo, isTouchDevice, isMobileDevice, isTabletDevice, isSmartphone, getTouchDistance, getTouchCenter } from '../utils/touchUtils';
import { triggerHaptic, cancelHaptic } from '../utils/hapticUtils';
import { apiFetch } from '../utils/api';
import { menuPlacement, closesMenu } from '../utils/menuPlacement.js';
import { revealZones, revealPlan } from '../utils/revealToZone.js';
import { zoneOccupants } from '../utils/stackDrag.js';
import { escapeTarget } from '../utils/escapeLayers.js';
import { getCardDims } from '../utils/cardDims.js';
import { objectLists, objectDeleters } from '../utils/objectTypes.js';
import { canStartPan } from '../utils/panTarget.js';
import { canZoomTable } from '../utils/wheelTarget.js';
import { shouldApplyBoardState } from '../utils/roomBoardState.js';
import { shelfCount, shelfSlot } from '../utils/libraryShelf.js';
import { stackAt, stackCandidates, looseCandidates } from '../utils/cardDrop.js';
import { normalizeViews, putView, removeView, MAX_VIEWS } from '../utils/tableViews.js';
import { spawnSlot } from '../utils/spawnSlot.js';
import { tableLayers, WIDGET_BOX, pickTopmost } from '../utils/tokenLayer.js';
import { zoomAt, worldAt, ZOOM_MIN, ZOOM_MAX } from '../utils/cameraZoom.js';
import { isEmptyTableState } from '../../../shared/tableState.js';
import { matchesCardSearch } from '../../../shared/cardSearch.js';

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

// Context-menu heading per objType. Types not listed are title-cased from the
// key ("counter" -> "Counter"); only multi-word ones need an entry.
const OBJ_TYPE_LABELS = {
  textField: 'Text Field',
  hitDie: 'Hit Die',
  customDie: 'Custom Die',
};

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
function TokenShape({ shape, color, size = 30, width = null, height = null, label = '', caption = '', imageUrl = null, rotation = 0 }) {
  // M3c: Bild-Token tragen `width`/`height` (Seitenverhältnis des Bildes).
  // Alte Spielstände und die geometrischen Formen haben nur `size`.
  const w = width || size;
  const h = height || size;
  // `label` is painted on the token, `caption` is the tooltip / alt text.
  // They are separate because a face-down token has no label to paint but
  // still needs a tooltip that says so - see utils/tableObjectView.js.
  const tip = caption || label;
  const commonClasses = "flex items-center justify-center shadow-lg border-2 border-white/60";
  const textClasses = "text-white sm:text-[10px] text-xs font-bold leading-none drop-shadow-sm";

  switch (shape) {
    case 'circle':
      return (
        <div
          className={`${commonClasses} rounded-full`}
          style={{ width: w, height: h, backgroundColor: color }}
          title={tip || 'Circle Token'}
        >
          {label && <span className={textClasses}>{label.substring(0, 3)}</span>}
        </div>
      );

    case 'square':
      return (
        <div
          className={`${commonClasses} rounded-sm`}
          style={{ width: w, height: h, backgroundColor: color }}
          title={tip || 'Square Token'}
        >
          {label && <span className={textClasses}>{label.substring(0, 3)}</span>}
        </div>
      );

    case 'triangle':
      return (
        <div
          className="relative flex items-center justify-center"
          style={{ width: w, height: h }}
          title={tip || 'Triangle Token'}
        >
          <svg width={w} height={h} viewBox="0 0 100 100" className="drop-shadow-lg">
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
          style={{ width: w, height: h }}
          title={tip || 'Star Token'}
        >
          <svg width={w} height={h} viewBox="0 0 100 100" className="drop-shadow-lg">
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
          style={{ width: w, height: h }}
          title={tip || 'Hexagon Token'}
        >
          <svg width={w} height={h} viewBox="0 0 100 100" className="drop-shadow-lg">
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
          style={{ width: w, height: h }}
          title={tip || 'Diamond Token'}
        >
          <svg width={w} height={h} viewBox="0 0 100 100" className="drop-shadow-lg">
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

    case 'image': {
      // M7.1: die Drehung dreht **das Bild, nicht den Kasten**. Der Kasten ist
      // w x h, wie der Feldbereich ihn hinlegt - daran haengen die
      // Trefferflaeche zum Ziehen (das aeussere div rechnet `left`/`top` aus
      // tokenW/tokenH) und `cellAt`. Eine Transformation am aeusseren div
      // verschoebe genau die. Das Bild steht darum absolut in der Mitte und
      // tauscht bei 90/270 seine Masse, damit es quer in den Kasten passt.
      const swap = rotation === 90 || rotation === 270;
      return (
        <div
          className="relative shadow-lg rounded-sm overflow-hidden"
          style={{ width: w, height: h }}
          title={tip || 'Image Token'}
          data-rotation={rotation || undefined}
        >
          <img
            src={imageUrl}
            alt={tip || 'token'}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: swap ? h : w,
              height: swap ? w : h,
              objectFit: 'contain',
              transformOrigin: 'center',
              transform: `translate(-50%, -50%) rotate(${rotation || 0}deg)`,
            }}
            draggable={false}
          />
        </div>
      );
    }

    default:
      return (
        <div
          className={`${commonClasses} rounded-full`}
          style={{ width: w, height: h, backgroundColor: color }}
        >
          {label && <span className={textClasses}>{label.substring(0, 3)}</span>}
        </div>
      );
  }
}

/**
 * Die Szenariodaten eines Setups aus der Spalte, so robust wie die Zonen und
 * Raster daneben: kaputtes JSON ist kein Grund, das Setup gar nicht zu laden.
 */
function parseScenarioData(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
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
  // M10.8/U5: die Leiste lag zweimal ueber einem Lebenszaehler, und der Spieler
  // musste den ganzen Tisch schwenken, um an ein Minuszeichen zu kommen. Der
  // Zustand gab es seit jeher, der Setter wurde nie gerufen
  // (audit-dead-controls Fund 6). Bewusst nicht gespeichert: die Regel erlaubt
  // es ("ueberlebt einen Neuaufbau nicht zwingend"), und alles andere waere die
  // Frage "je Spiel oder je Geraet?", die niemand gestellt hat.
  const [showToolbar, setShowToolbar] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // M10.7/U2: der Schwenkmodus – der Weg zum Schwenken ohne mittlere Maustaste,
  // also auf Tastfeld und Trackpad. Begruendung in `panTarget.js`.
  const [panMode, setPanMode] = useState(false);
  // M10.6/U4: die benannten Ansichten dieses Spielstands.
  const [views, setViews] = useState([]);
  const [showViews, setShowViews] = useState(false);

  // Save state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  // Steps of the last setup sequence that did not work - shown until dismissed,
  // because a setup with silently skipped steps looks exactly like a correct one.
  const [setupIssues, setSetupIssues] = useState(null);
  // M5: Aktionen des geladenen Setups - benannte Sequenzen, die der Spieler
  // mitten im Spiel ausloest. Leer = am Tisch ist dazu nichts zu sehen.
  const [setupActions, setSetupActions] = useState([]);
  // M7/T5: die abgelesenen Szenariodaten des Setups - welches Gelaende auf
  // welches Rasterfeld. Hier nur getragen: gelesen wird sie beim Speichern und
  // (ab T6) von `build_scenario`. Wer sie nicht laedt, wuerde sie beim naechsten
  // Speichern ueberschreiben - deshalb haengt sie an *beiden* Ladewegen.
  const [scenarioData, setScenarioData] = useState({});
  const [runningActionId, setRunningActionId] = useState(null);
  const saveLoadedRef = useRef(false);

  // Setup state
  const [setupMode, setSetupMode] = useState(false);
  const [showSetupSaveModal, setShowSetupSaveModal] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [savingSetup, setSavingSetup] = useState(false);
  const [editingSetupId, setEditingSetupId] = useState(null);
  const [sequenceSteps, setSequenceSteps] = useState([]);
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);
  // The game's table assets, only needed in setup mode: the sequence editor
  // addresses them by name and draws from their categories (= pools).
  const [tableAssets, setTableAssets] = useState([]);
  const setupLoadedRef = useRef(false);

  // Multiplayer state
  const [zones, setZones] = useState([]);
  const [grids, setGrids] = useState([]);
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
  // Die nativen Horcher haengen in einem `useEffect` und sehen `panMode` nicht.
  const panModeRef = useRef(false);
  panModeRef.current = panMode;
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
    // M10.2/W4: die Umkehrung steht in `cameraZoom.js`, einmal. Sie hier
    // auszuschreiben war die vierte Kopie derselben Matrix – und eine der vier
    // hatte das Vorzeichen falsch.
    return worldAt(
      camera,
      { x: screenX - rect.left, y: screenY - rect.top },
      { x: rect.width / 2, y: rect.height / 2 },
    );
  }

  /**
   * Wo der Spieler hinsieht, in Weltkoordinaten (M10.5/J5). Dieselbe eine
   * Umkehrung wie `screenToWorld`; `canvas.width / 2` war eine
   * Bildschirmbreite als Weltkoordinate.
   */
  function viewCenter() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 600, y: 400 };
    const center = { x: rect.width / 2, y: rect.height / 2 };
    return worldAt(cameraRef.current, center, center);
  }

  /**
   * Die Stapel, denen eine gezogene Karte beitreten kann (M10.4/J3): je Stapel
   * ein Eintrag mit seiner Stelle und den Anzeigemassen seiner Karten – die
   * Eingabe fuer `stackAt`. Der eigene Stapel ist nie dabei.
   */
  function dropCandidates(ownStackId) {
    // M10.9/U6: die Liste steht jetzt in `cardDrop.js`, neben `stackAt` und
    // neben der Schwesterliste fuer lose Karten – hier war sie ungeprueft.
    return stackCandidates(tableCards, ownStackId);
  }

  // Game objects state (counters, dice, hitDice, notes, tokens, textFields)
  const [counters, setCounters] = useState([]);
  // M8.6 Regel 1: welcher Zaehlerwert gerade als Eingabefeld dasteht.
  const [editingCounterId, setEditingCounterId] = useState(null);
  const [editingCounterText, setEditingCounterText] = useState('');
  const [dice, setDice] = useState([]);
  const [hitDice, setHitDice] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [boards, setBoards] = useState([]);
  const [textFields, setTextFields] = useState([]);
  const [customDiceOnTable, setCustomDiceOnTable] = useState([]);

  // The one place zones are resolved for the table (spec M3a). `zones` keeps
  // what was saved - the anchor plus the last absolute box; everything that
  // draws or hit-tests a zone gets `tableZones` and never sees an anchor, so
  // the overlay, the editor and the drop test cannot end up disagreeing about
  // where a zone is. The executor resolves the same way against the state it
  // builds, because it runs before any of this exists.
  const anchors = useMemo(() => anchorBoxes(boards, tokens), [boards, tokens]);
  const tableZones = useMemo(() => resolveZones(zones, anchors), [zones, anchors]);
  // Grids (M3b) go the same way and through the same resolution: `grids` is
  // what was saved, `tableGrids` is where the fields are right now.
  const tableGrids = useMemo(() => resolveGrids(grids, anchors), [grids, anchors]);

  // Card state
  const [availableCards, setAvailableCards] = useState([]); // cards from game's card library
  const [categories, setCategories] = useState([]); // card categories/folders
  const [cardBacks, setCardBacks] = useState([]); // card back images for the game
  const [expandedCategories, setExpandedCategories] = useState(new Set()); // expanded category IDs
  // M8.5: die Suche in der Kartenbibliothek. Leer heisst: Schublade wie bisher.
  const [cardSearch, setCardSearch] = useState('');
  // M8.5: die Treffer der Bibliothekssuche - ueber ALLE Kategorien, gleich ob
  // aufgeklappt oder nicht. `null` heisst "keine Suche", und dann steht die
  // Schublade unveraendert da (Abnahme 5).
  const cardSearchHits = useMemo(() => (
    cardSearch.trim()
      ? availableCards.filter(c => matchesCardSearch(c.name, cardSearch))
      : null
  ), [cardSearch, availableCards]);
  const categoryNames = useMemo(
    () => new Map(categories.map(c => [c.id, c.name])),
    [categories]
  );
  const [tableCards, setTableCards] = useState([]); // cards placed on the table
  const [showCardDrawer, setShowCardDrawer] = useState(false);
  const [draggingCard, setDraggingCard] = useState(null); // card being dragged on table
  const [selectedCards, setSelectedCards] = useState(new Set()); // selected card IDs for grouping
  const cardDragOffsetRef = useRef({ x: 0, y: 0 });
  const [maxZIndex, setMaxZIndex] = useState(1);

  // M8.2/M9.1: je groesser die belegte Flaeche, desto weiter hinten - fuer
  // **alles**, was auf dem Tisch liegt, nicht nur fuer Token. Ein Brett liegt
  // unter dem, was darauf liegt, egal ob das eine Karte, ein Wuerfel, ein
  // Zaehler oder ein Token ist.
  //
  // Die Reihenfolge in dieser Liste ist der Tie-Break bei gleicher Flaeche:
  // Token in DOM-Reihenfolge (wie bisher), Karten nach ihrer eigenen Reihe
  // `card.zIndex` - damit bleibt die Stapelreihenfolge aus M8.9 erhalten,
  // obwohl alle Karten eines Decks gleich gross sind.
  //
  // `boards` stehen ausdruecklich nicht drin: sie sind das groesste am Tisch
  // und liegen mit `zIndex: 1` schon ganz hinten. Sie hochzuheben brachte sie
  // nur ueber die Raster-Ueberlagerung (z-10).
  const layerZ = useMemo(() => tableLayers([
    ...tokens.map(t => ({ key: `token:${t.id}`, width: t.width, height: t.height, size: t.size })),
    ...[...tableCards]
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map(c => {
        const { w, h } = getCardDims(c);
        return { key: `card:${c.tableId}`, width: w, height: h };
      }),
    ...counters.map(c => ({ key: `counter:${c.id}`, ...WIDGET_BOX.counter })),
    ...notes.map(n => ({ key: `note:${n.id}`, ...WIDGET_BOX.note })),
    ...textFields.map(tf => ({ key: `textField:${tf.id}`, ...WIDGET_BOX.textField })),
    ...customDiceOnTable.map(d => ({ key: `customDie:${d.id}`, ...WIDGET_BOX.customDie })),
    ...hitDice.map(d => ({ key: `hitDie:${d.id}`, ...WIDGET_BOX.hitDie })),
    ...dice.map(d => ({ key: `die:${d.id}`, ...WIDGET_BOX.die })),
  ]), [tokens, tableCards, counters, notes, textFields, customDiceOnTable, hitDice, dice]);
  const [gridHighlight, setGridHighlight] = useState(null); // {x, y} of grid highlight position
  const [stackDropTarget, setStackDropTarget] = useState(null); // stackId of stack being targeted for drop
  // M10.9/U7: die **lose** Karte, auf der die gezogene liegenbleibt, wenn man
  // beim Ablegen haelt. Was leuchtet, ist was passiert – beim Loslassen wird
  // nicht noch einmal die Uhr befragt.
  const [mergeTarget, setMergeTarget] = useState(null);
  const mergeHoldRef = useRef({ x: 0, y: 0, timer: null });
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
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterMax, setNewCounterMax] = useState('');
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
  const contextMenuRef = useRef(null);
  // M2.9: Die Platzierung gehört zu genau diesem Menü. Bei einem neuen Klick –
  // und bei anderem Inhalt, also anderer Höhe – ist sie sofort ungültig, damit
  // der Layout-Effekt die *ungebremste* Höhe misst und nicht die zuletzt
  // gekappte; sonst beantwortet sich „passt es?" selbst mit ja.
  const [placedMenu, setPlacedMenu] = useState(null);
  const menuPlace = placedMenu && placedMenu.for === contextMenu ? placedMenu : null;

  useLayoutEffect(() => {
    const el = contextMenuRef.current;
    if (!contextMenu || !el) return;
    const rect = el.getBoundingClientRect();
    // Die Insets stehen als Custom Properties auf :root (index.css); sie hier
    // zu lesen ersetzt die früheren env()-Margins am Element, die die berechnete
    // Position sonst wieder verschoben hätten.
    const rootStyle = getComputedStyle(document.documentElement);
    const inset = (side) => parseFloat(rootStyle.getPropertyValue(`--safe-area-inset-${side}`)) || 0;
    setPlacedMenu({
      for: contextMenu,
      ...menuPlacement({
        x: contextMenu.x,
        y: contextMenu.y,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        insets: { top: inset('top'), right: inset('right'), bottom: inset('bottom'), left: inset('left') },
      }),
    });
  }, [contextMenu]);

  // M10.12: Das offene Menue schliesst beim naechsten Zeigerdruck daneben -
  // am `document`, nicht mit einer Flaeche davor. `pointerdown` deckt Maus und
  // Finger in einem ab und laeuft vor `contextmenu`/`mousedown`/`touchstart`:
  // der Rechtsklick auf ein anderes Objekt schliesst also das alte Menue und
  // oeffnet gleich darauf dessen eigenes, und der Langdruck auf Touch
  // (M2.11) bekommt seinen `touchstart` zurueck. Escape bleibt, wo es war
  // (M2.10, `escapeLayers`).
  useEffect(() => {
    if (!contextMenu) return;
    function onPointerDown(e) {
      if (closesMenu(e.target, contextMenuRef.current)) setContextMenu(null);
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [contextMenu]);

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

  // M9.4: Der Zeitgeber ist weg - ein Zug am Stapel verschiebt ihn sofort.
  // Geblieben ist die Schwelle: `pendingStackRef` haelt den gedrueckten Stapel,
  // bis der Zeiger sich wirklich bewegt, und `pressHoldActive` sagt, ob daraus
  // ein Zug wurde oder nur ein Klick.
  const [pressHoldActive, setPressHoldActive] = useState(false);
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
  // M10.9/U7: so lange muss der Zeiger ueber einer losen Karte stehen, damit
  // sie zum Stapelziel wird.
  //
  // **Ja, wieder ein Langdruck** – aber am anderen Ende des Zuges. M9.4 hat
  // ihn gestrichen, weil er am *Anfang* sass: wer einen Stapel nur verschieben
  // wollte, der alltaegliche Griff, musste eine halbe Sekunde warten, bevor
  // ueberhaupt etwas geschah. Hier zahlt nur, wer stapeln will; wer gewoehnlich
  // ablegt, laesst los und zahlt nichts. Der teure Weg ist jetzt der seltene.
  const MERGE_HOLD_DELAY = 600; // milliseconds
  // M2.11: Langdruck auf ein Tisch-Objekt öffnet das Kontextmenü (auf Touch gibt
  // es keinen Rechtsklick, und das Löschen-Kreuz ist abgeschafft). Eigene Refs,
  // damit der Karten-Langdruck oben unberührt bleibt.
  const longPressMenuTimerRef = useRef(null);
  const longPressMenuTouchPosRef = useRef({ x: 0, y: 0 });

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
        const res = await apiFetch(`/api/games/${id}`);
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
        const res = await apiFetch(`/api/games/${id}/cards`);
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
        const res = await apiFetch(`/api/games/${id}/categories`);
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

  // Fetch table assets for the sequence editor (pools = their categories)
  useEffect(() => {
    if (!id || !setupMode) return;
    apiFetch(`/api/games/${id}/table-assets`)
      .then(r => (r.ok ? r.json() : []))
      .then(setTableAssets)
      .catch(() => {});
  }, [id, setupMode]);

  // Fetch card backs for the game
  useEffect(() => {
    async function fetchCardBacks() {
      try {
        const res = await apiFetch(`/api/games/${id}/card-backs`);
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
      // M8.5 Regel 3: ueber einer scrollenden Liste gehoert das Rad ihr. Muss
      // VOR dem preventDefault stehen - das allein erstickt das Scrollen schon,
      // auch ohne den Zoom darunter. Nicht `data-ui-element` fragen: das tragen
      // Boards und Token selbst (M2.13), das Rad ueber dem Hauptplan zoomt.
      if (!canZoomTable(e.target, containerRef.current)) return;
      e.preventDefault();
      const camera = cameraRef.current;
      const rect = canvas.getBoundingClientRect();

      // M10.2 Regel 2: der Zoom folgt dem Mauszeiger. Die Rechnung steht in
      // `cameraZoom.js` – hier stand sie mit umgekehrtem Vorzeichen, und das
      // Ziel flog beim Zoomen doppelt so schnell aus dem Bild.
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      Object.assign(camera, zoomAt(
        camera,
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        { x: rect.width / 2, y: rect.height / 2 },
        camera.zoom * delta,
      ));

      setZoomDisplay(Math.round(camera.zoom * 100));
      setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
      renderCanvas();
    }

    const container = containerRef.current;

    function handleMouseDown(e) {
      // M2.13: pan on the background – and on anything that cannot be dragged,
      // e.g. a locked board filling the screen. One rule, three callers.
      //
      // M10.7/U1: die Tastennummer und der Schwenkmodus stehen jetzt **in**
      // `canStartPan`. `e.button === 1` stand hier und in `handleGlobalStart`
      // daneben – zwei Antworten auf dieselbe Frage, und der Modus waere die
      // dritte gewesen.
      if (canStartPan(e.target, canvas, container, { button: e.button, panMode: panModeRef.current })) {
        // Ohne das startet Windows bei der mittleren Taste die
        // Bildlauf-Automatik samt eigenem Zeiger.
        if (e.button === 1) e.preventDefault();
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

      // M2.10: Escape schließt die oberste offene Schicht. Muss VOR dem
      // Eingabefeld-Ausstieg laufen — bei offenem Modal steht der Cursor genau
      // dort, Escape käme sonst nie an.
      if (e.key === 'Escape') {
        const target = escapeTarget({
          contextMenu, splitModal: showSplitModal, saveModal: showSaveModal,
          setupSaveModal: showSetupSaveModal, counterModal: showCounterModal,
          diceModal: showDiceModal, noteModal: showNoteModal,
          tokenModal: showTokenModal, textFieldModal: showTextFieldModal,
          editingTextField: editingTextFieldId, shortcuts: showShortcuts,
          bgPicker: showBgPicker, cardDrawer: showCardDrawer,
        });
        if (!target) return; // keine Schicht offen: Escape nicht schlucken
        e.preventDefault();
        switch (target) {
          case 'contextMenu': setContextMenu(null); break;
          case 'splitModal': dismissSplitModal(); break;
          case 'saveModal': dismissSaveModal(); break;
          case 'setupSaveModal': dismissSetupSaveModal(); break;
          case 'counterModal': dismissCounterModal(); break;
          case 'diceModal': dismissDiceModal(); break;
          case 'noteModal': dismissNoteModal(); break;
          case 'tokenModal': dismissTokenModal(); break;
          case 'textFieldModal': dismissTextFieldModal(); break;
          case 'editingTextField': setEditingTextFieldId(null); break;
          case 'shortcuts': setShowShortcuts(false); break;
          case 'bgPicker': setShowBgPicker(false); break;
          case 'cardDrawer': setShowCardDrawer(false); break;
        }
        return;
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
  }, [selectedCards, tableCards, hoveredTableCard,
      // M2.10: der Handler liest den Zustand direkt, er wird bei Änderung neu registriert
      contextMenu, showSplitModal, showSaveModal, showSetupSaveModal, showCounterModal,
      showDiceModal, showNoteModal, showTokenModal, showTextFieldModal,
      editingTextFieldId, showShortcuts, showBgPicker, showCardDrawer]);

  // ===== CARD FUNCTIONS =====

  // Place a card from the library onto the table
  function placeCardOnTable(card) {
    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);
    // Spread cards out so they don't overlap too much. M8.1: counted is what
    // *lies* on the table - a card inside a stack takes no place in the shelf.
    const slot = shelfSlot(shelfCount(tableCards));
    const newTableCard = {
      tableId: crypto.randomUUID(),
      cardId: card.id,
      name: card.name,
      image_path: card.image_path,
      card_back_id: card.card_back_id || null,
      width: card.width || 0,
      height: card.height || 0,
      x: slot.x + (Math.random() - 0.5) * 30,
      y: slot.y + (Math.random() - 0.5) * 30,
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

    // Calculate position for the stack. Same count as placeCardOnTable (M8.1):
    // every free card once, every stack once - otherwise two categories placed
    // in a row would land on the same spot.
    const { x: stackX, y: stackY } = shelfSlot(shelfCount(tableCards));

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
    // M10.7/U2: im Schwenkmodus zieht nichts. Sonst zoege ein Zug auf einer
    // Karte die Karte **und** den Tisch.
    if (panModeRef.current) return;

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

    // M9.4: Ein Zug am Stapel verschiebt den Stapel.
    //
    // Vorher stand hier die Geste aus Tabletop Simulator: wer eine halbe
    // Sekunde hielt, zog den Stapel, wer sofort zog, hob die oberste Karte ab.
    // Gebaut war das absichtlich, verteilt war es falsch herum - der
    // alltaegliche Griff kostete Wartezeit, der seltene war die Vorgabe. Am
    // Tisch hat niemand gewartet: aus "Aktionen: Deputy Waggums (15)" wurde
    // dreimal (14) plus einer losen Karte. Der Zeitgeber ist darum weg; der
    // Zug gilt dem ganzen Stapel.
    //
    // `pendingStackRef` bleibt, aber nur noch als Schwelle: bis zum ersten
    // echten Zeigerweg passiert nichts, damit ein blosser Klick den Stapel
    // auswaehlt und ihn nicht auf das Raster rueckt.
    //
    // Abheben gibt es weiterhin, im Kontextmenue: "Take Top Card" (verdeckt
    // daneben), "Draw Card" (auf die Hand) und "Reveal Top Card to ..." (offen
    // in eine Zone).
    if (stackId) {
      const stackCards = tableCards.filter(c => c.inStack === stackId);

      if (stackCards.length >= 2) {
        // Der Zug haengt am obersten Blatt - es ist das, was gezeichnet wird.
        const topCard = stackCards.reduce((max, c) => c.zIndex > max.zIndex ? c : max);

        pendingStackRef.current = { tableId: topCard.tableId, stackId, event: e };

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
      // where it came from - a zone that refuses the drop puts it back here
      originX: card.x,
      originY: card.y,
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

    // M9.4: der erste echte Zeigerweg auf einem Stapel startet den Zug des
    // *ganzen* Stapels. Die 5-px-Schwelle bleibt, damit ein Klick ohne Weg den
    // Stapel nur auswaehlt (handleCardDragEnd) und ihn nicht aufs Raster rueckt.
    if (!draggingCard && pendingStackRef.current && cardDragOffsetRef.current.initialX !== undefined) {
      const dx = Math.abs(pointer.clientX - cardDragOffsetRef.current.initialX);
      const dy = Math.abs(pointer.clientY - cardDragOffsetRef.current.initialY);
      if (dx > 5 || dy > 5) {
        const { tableId: topCardId, stackId } = pendingStackRef.current;
        pendingStackRef.current = null;
        setPressHoldActive(true);
        const topCard = tableCards.find(c => c.tableId === topCardId);
        if (topCard) startDraggingCard(e, topCardId, topCard, stackId);
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
    // M10.4/J1: der 80-Pixel-Umkreis ist weg – eine Karte ist 100 x 140, und
    // 80 Abstand hiess 20 Pixel Ueberlappung. Gefragt wird die Flaeche, und
    // zwar mit dem Rasterpunkt, den das Gitter-Aufleuchten ohnehin ausrechnet:
    // die endgueltige Stelle steht erst beim Loslassen fest (ein Zonenplatz
    // kann sie noch verschieben), und der Irrtum geht dann nur in die Richtung
    // "es verschmilzt weniger als die Vorschau versprach".
    // M10.4/J2: '__single_card_target__' entfaellt mit der Geste selbst.
    setStackDropTarget(
      card ? stackAt({ x: snapX, y: snapY }, dropCandidates(card.inStack)) : null,
    );

    // M10.9/U7: Halten beim Ablegen. Der Zeitgeber wird bei **jeder** echten
    // Bewegung neu gestellt; er laeuft also nur ab, wenn der Zeiger steht.
    // Keine Uhr beim Loslassen – die Hervorhebung *ist* die Bedingung.
    // Nur fuer eine lose Karte: einem Stapel tritt man wie bisher sofort bei.
    const held = mergeHoldRef.current;
    if (Math.abs(pointer.clientX - held.x) > 3 || Math.abs(pointer.clientY - held.y) > 3) {
      held.x = pointer.clientX;
      held.y = pointer.clientY;
      clearTimeout(held.timer);
      held.timer = null;
      setMergeTarget(null);
      if (card && !card.inStack) {
        // Die Mitgezogenen einer Mehrfachauswahl sind kein Ziel fuer sich.
        const moving = new Set(selectedCards.has(draggingCard) ? selectedCards : [draggingCard]);
        moving.add(draggingCard);
        const at = { x: snapX, y: snapY };
        const cards = tableCards;
        held.timer = setTimeout(() => {
          held.timer = null;
          setMergeTarget(stackAt(at, looseCandidates(cards, moving)));
        }, MERGE_HOLD_DELAY);
      }
    }

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
    // M10.9/U7: der Haltezeitgeber endet mit dem Zug, egal welcher der Ausgaenge
    // unten genommen wird. `mergeTarget` selbst steht als Wert dieses Renders
    // fest und wird davon nicht leer – das Leeren gilt dem naechsten Zug.
    clearTimeout(mergeHoldRef.current.timer);
    mergeHoldRef.current.timer = null;
    setMergeTarget(null);

    // Clear long-press preview timer (Feature #58)
    if (longPressPreviewTimerRef.current) {
      clearTimeout(longPressPreviewTimerRef.current);
      longPressPreviewTimerRef.current = null;
    }

    // If we have a pending stack interaction that wasn't activated (no movement)
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

    // A zone may refuse the drop (wrong kind of object, or full) or snap it
    // onto one of its places. Same rules and the same wording as in the setup
    // sequence, shown in the same hint block - a drag that silently does
    // nothing is indistinguishable from one that worked.
    const dropZone = zoneAt(tableZones, card.x, card.y);
    let hit = null;
    if (dropZone) {
      const mine = new Set(card.inStack
        ? tableCards.filter(c => c.inStack === card.inStack).map(c => c.tableId)
        : [draggingCard]);
      // M9.4/H2: was schon in der Zone liegt - ein Stapel zaehlt als *ein*
      // Ding. Ohne `zoneOccupants` waere ein Aktionsdeck mit fuenfzehn Karten
      // fuenfzehn Belegungen, und eine Zone mit `capacity: 1` wiese jeden
      // weiteren Zug ab, obwohl nur ein Ding darin liegt.
      const others = zoneOccupants(tableCards.filter(c => !mine.has(c.tableId)));
      const refusal = zoneRejects(dropZone, 'card', countInZone(dropZone, others, tokens));
      if (refusal) {
        const { originX, originY } = cardDragOffsetRef.current;
        const dx = (originX ?? card.x) - card.x;
        const dy = (originY ?? card.y) - card.y;
        setTableCards(prev => prev.map(c => (mine.has(c.tableId) ? { ...c, x: c.x + dx, y: c.y + dy } : c)));
        setSetupIssues([{ index: 0, type: 'drop', target: dropZone.label || null, status: 'skipped', reason: refusal }]);
        setDraggingCard(null);
        setGridHighlight(null);
        setStackDropTarget(null);
        return;
      }
      const taken = [...others, ...tokens].filter(o => zoneContains(dropZone, o.x, o.y));
      hit = snapInto(card.x, card.y, { zone: dropZone, grids: tableGrids, taken });
    }
    // Outside any zone a grid still claims the drop (M3b).
    // Beide Aufrufe geben **absichtlich** kein `size` mit (M7.2): eine Karte
    // auf Feldmasse zu ziehen verloere ihr Seitenverhaeltnis (M2.12), und der
    // Karten-Zweig schreibt weder `hit.width` auf die Karte noch schickt
    // `card_move` Masse in den Raum – Tisch und Raum sagten Verschiedenes.
    if (!hit) hit = snapInto(card.x, card.y, { grids: tableGrids });

    // A zone's places or a grid field own the position; where neither claims
    // the drop, the table's own 80px lattice does, exactly as before.
    //
    // M10.4/J3: **vor** der Stapelfrage. Bisher wurde der Zonenplatz hier
    // ausgerechnet, dann vom Verschmelzen ueberschrieben und erst danach
    // benutzt – so fiel eine Karte, die auf die `Ablage` gelegt wurde, in den
    // Nachziehstapel daneben (der belegte Schadensfall der dritten Partie).
    const finalX = hit.snapped ? hit.x : snapToGrid(card.x);
    const finalY = hit.snapped ? hit.y : snapToGrid(card.y);

    // M10.4/J1: eine Karte tritt einem Stapel bei, wenn sie am Ende **auf ihm
    // liegt** – gefragt wird die Stelle, die sie wirklich einnimmt, gegen die
    // Flaeche des Stapels. Der 80-Pixel-Umkreis auf der ungerasterten
    // Loslassstelle ist weg.
    // M10.4/J2: Karte auf Karte gruendet keinen Stapel mehr. Dafuer gibt es
    // `G` (`groupSelectedCards`) – das Ablegen braucht keine zweite Geste.
    const targetStack = stackAt({ x: finalX, y: finalY }, dropCandidates(card.inStack));

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
              gridId: null,
              cell: null,
            };
          }
          return c;
        }));
        setMaxZIndex(Math.max(maxZIndex, maxTargetZ + draggingStackCards.length));
      } else {
        // Adding single card to stack - place it on top
        setTableCards(prev => prev.map(c =>
          c.tableId === draggingCard
            ? { ...c, inStack: targetStack, x: targetPosition.x, y: targetPosition.y, zIndex: maxTargetZ + 1, gridId: null, cell: null }
            : c
        ));
        setMaxZIndex(Math.max(maxZIndex, maxTargetZ + 1));
      }

      setDraggingCard(null);
      setGridHighlight(null);
      // Sonst bleibt der Zielstapel nach dem Verschmelzen leuchtend stehen.
      setStackDropTarget(null);
      return;
    }

    // M10.9/U7: kein Stapel, aber eine lose Karte, ueber der lange genug
    // gehalten wurde – das ist der absichtliche Weg, den M10.4 offengelassen
    // hat. Gestapelt wird an der Stelle der **liegenden** Karte: sie ist die,
    // die sich nicht bewegt hat.
    //
    // Das Halten sagt die **Absicht**, die endgueltige Stelle sagt die
    // **Geometrie** – dieselbe Trennung wie in M10.4/J3. Die Vorschau rechnet
    // mit dem Rasterpunkt, ein Zonenplatz kann die Karte danach noch
    // verschieben; wer dann nicht mehr auf der anderen Karte liegt, stapelt
    // auch nicht. Genau andersherum fiel in der dritten Partie eine aufgedeckte
    // Karte von der `Ablage` in den Nachziehstapel.
    if (mergeTarget && !card.inStack && mergeTarget !== draggingCard
        && stackAt({ x: finalX, y: finalY },
                   looseCandidates(tableCards, new Set([draggingCard]))) === mergeTarget) {
      const below = tableCards.find(c => c.tableId === mergeTarget);
      if (below && !below.inStack) {
        stackCards([mergeTarget, draggingCard], { x: below.x, y: below.y });
        triggerHaptic('drop');
        setDraggingCard(null);
        setGridHighlight(null);
        setStackDropTarget(null);
        return;
      }
    }

    // No stack merge - always snap to grid on release
    const isMultiSelected = selectedCards.size > 1 && selectedCards.has(draggingCard);
    const snapDx = finalX - card.x;
    const snapDy = finalY - card.y;

    if (isMultiSelected) {
      // Snap all selected cards/stacks by the same offset as the dragged card
      setTableCards(prev => prev.map(c => {
        const isSelected = selectedCards.has(c.tableId);
        const isInSelectedStack = c.inStack && prev.some(sc => sc.inStack === c.inStack && selectedCards.has(sc.tableId));
        if (isSelected || isInSelectedStack) {
          // Moved as part of a selection, not dropped on a field of its own.
          return { ...c, x: c.x + snapDx, y: c.y + snapDy, gridId: null, cell: null };
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
      // M9.4: der Zug am Stapel geht in den Raum. Den Empfaenger gab es seit
      // jeher (audit-dead-controls Fund 9), er suchte den Stapel nur unter dem
      // falschen Feldnamen - siehe `findStack` in messageHandler.js.
      if (room) room.sendAction({ type: 'stack_move', stack_id: card.inStack, x: finalX, y: finalY });
    } else {
      setTableCards(prev => prev.map(c => {
        if (c.tableId !== draggingCard) return c;
        // The field, not the coordinates, is what makes a card come back to the
        // same place after the board moved. A card in a multi-selection or in a
        // stack keeps no field: it moved as part of something else.
        return { ...c, x: finalX, y: finalY, gridId: hit.gridId, cell: hit.cell };
      }));
      // Dieselbe Luecke wie bei `token_move`: Karten tragen seit M3b
      // `gridId`/`cell`, und ohne sie behielte der Raum das alte Feld (G5).
      if (room) room.sendAction({
        type: 'card_move', table_id: draggingCard, x: finalX, y: finalY,
        gridId: hit.gridId ?? null, cell: hit.cell ?? null,
      });
    }

    // Haptic feedback on card drop (short vibration)
    triggerHaptic('drop');

    setDraggingCard(null);
    setGridHighlight(null);
    setStackDropTarget(null);
  }

  /**
   * Aus mehreren Karten einen Stapel machen (M10.9/U7).
   *
   * Der Kern hinter `G` **und** hinter dem Halten beim Ablegen und dem Eintrag
   * im Kartenmenue. Drei Wege, eine Tat – sonst stuenden drei Fassungen des
   * Stapelbaus nebeneinander, und die naechste Aenderung erwischte zwei davon.
   *
   * Die Reihenfolge von `ids` ist die Reihenfolge im Stapel: der letzte liegt
   * oben.
   */
  function stackCards(ids, at) {
    const wanted = ids.filter(id => tableCards.some(c => c.tableId === id));
    if (wanted.length < 2) return null;

    const stackId = crypto.randomUUID();
    const cardsToStack = tableCards.filter(c => wanted.includes(c.tableId));
    const x = at ? at.x : cardsToStack.reduce((s, c) => s + c.x, 0) / cardsToStack.length;
    const y = at ? at.y : cardsToStack.reduce((s, c) => s + c.y, 0) / cardsToStack.length;

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ + wanted.length);

    setTableCards(prev => prev.map(c => {
      if (!wanted.includes(c.tableId)) return c;
      return {
        ...c,
        x,
        y,
        inStack: stackId,
        zIndex: newZ + wanted.indexOf(c.tableId),
        // Eine gestapelte Karte sitzt auf keinem eigenen Rasterfeld mehr –
        // sonst zoege `placeOnGrids` den Stapel beim naechsten Laden
        // auseinander. Dieselbe Zeile steht im Beitritts-Zweig von
        // `handleCardDragEnd`, sie fehlte nur hier.
        gridId: null,
        cell: null,
      };
    }));
    return stackId;
  }

  /**
   * Die lose Karte unter einer losen Karte (M10.9/U7) – die Frage, die der
   * Menueeintrag stellt. Dieselbe Geometrie wie das Halten beim Ablegen und
   * wie der Beitritt zu einem Stapel: `stackAt`.
   */
  function cardBelow(tableId) {
    const card = tableCards.find(c => c.tableId === tableId);
    if (!card || card.inStack) return null;
    return stackAt({ x: card.x, y: card.y }, looseCandidates(tableCards, new Set([tableId])));
  }

  // Group selected cards into a stack
  function groupSelectedCards() {
    if (selectedCards.size < 2) return;
    stackCards(Array.from(selectedCards), null);
    setSelectedCards(new Set());
  }

  // Click on table background to deselect all cards
  function handleTableClick(e) {
    if (e.target === canvasRef.current) {
      setSelectedCards(new Set());
    }
  }

  // Counter functions
  function createCounter(name, max) {
    // max kommt aus dem Dialog und ist optional - leer heisst "keine Obergrenze"
    // (normalizeCounter wirft es dann weg).
    //
    // M8.6 Regel 2: ein Vorrat ist beim Anlegen voll. Der Startwert wird *hier*
    // entschieden und nicht in normalizeCounter - dort gesetzt, aenderte er
    // auch place_counter aus einer Sequenz (Abnahme 6).
    //
    // M8.6 Regel 3: die Ablage kam aus `counters.length * 160`, also ab dem
    // zehnten Zaehler ausserhalb jedes Bildes. Dieselbe Reihe wie die
    // Bibliothek (M8.1), damit keine zweite Rechnung danebensteht - ein neuer
    // Zaehler kann dadurch auf einer ausgelegten Karte landen, und sichtbar zu
    // bleiben ist mehr wert als ueberschneidungsfrei zu liegen.
    const newCounter = normalizeCounter({
      name: name || 'Counter',
      value: newCounterValue(max),
      max,
      ...shelfSlot(counters.length),
    });
    setCounters(prev => [...prev, newCounter]);
    setShowCounterModal(false);
    setNewCounterName('');
    setNewCounterMax('');
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

  // M8.6 Regel 1: ein Klick auf den Wert oeffnet ein Feld. Ein Einkauf ueber 21
  // Muenzen waren 21 Klicks.
  function startCounterEdit(counter) {
    setEditingCounterId(counter.id);
    setEditingCounterText(String(counter.value));
  }

  function cancelCounterEdit() {
    setEditingCounterId(null);
    setEditingCounterText('');
  }

  /**
   * M10.3: Escape verwirft, alles andere uebernimmt. Die Fahne steht hier,
   * weil Escape das Feld abmeldet und ein `blur` aus dem Abmelden sonst doch
   * noch uebernaehme - in dieser Reihenfolge ist "verwerfen" wirklich
   * verworfen.
   */
  const counterEditDiscardedRef = useRef(false);

  function discardCounterEdit() {
    counterEditDiscardedRef.current = true;
    cancelCounterEdit();
  }

  /**
   * Wegklicken uebernimmt, was dasteht - wie Enter (M10.3).
   *
   * Vorher stand hier `cancelCounterEdit`: `11` getippt, auf den Tisch
   * geklickt, Feld zu, Wert unveraendert - und zwar wortlos. Das hat den
   * Spieler dreimal erwischt, bevor er es verstand, und widerspricht M9.5
   * Regel 2 ("eine ungueltige Eingabe wird nicht stillschweigend verworfen")
   * an der Stelle, an der eine **gueltige** verschwand.
   *
   * **Warum uebernehmen und nicht verwerfen.** Beide Richtungen verlieren
   * manchmal etwas; den Ausschlag gibt, welcher Verlust sichtbar ist. Ein
   * ungewolltes Uebernehmen steht danach am Tisch und ist einen Klick weit
   * weg. Ein stilles Verwerfen sieht aus wie "hat geklappt" - genau der
   * Befund. Der Vertipper bleibt ausserdem gedeckt: was sich nicht lesen
   * laesst, geht seit M9.5 in den Meldekasten, nicht in den Wert. Und Escape
   * steht als ausdrueckliches Verwerfen daneben.
   */
  function blurCounterEdit(counterId) {
    if (counterEditDiscardedRef.current) {
      counterEditDiscardedRef.current = false;
      return;
    }
    commitCounterEdit(counterId);
  }

  /**
   * Die Eingabe uebernehmen. Was sie *bedeutet*, steht in shared/counters.js:
   * eine Zahl setzt, `+21`/`-21` rechnet, `max` fuellt auf die Obergrenze - die
   * vier Lesarten, die auch `set_counter` benutzt.
   *
   * M9.5 Regel 2: was sich nicht lesen laesst, verschwindet nicht mehr
   * stillschweigend. `counterEdit` gibt den Grund, und der steht in demselben
   * Meldekasten, in dem auch eine abgewiesene Zone ihren nennt - am Tisch sah
   * "Enter tut nichts" sonst genauso aus wie "Enter hat gespeichert".
   */
  function commitCounterEdit(counterId) {
    const counter = counters.find(c => c.id === counterId);
    const result = counterEdit(counter, editingCounterText);
    if (result.reason) {
      setSetupIssues([{ index: 0, type: 'counter', target: counter?.name || null, status: 'skipped', reason: result.reason }]);
      cancelCounterEdit();
      return;
    }
    setCounters(prev => prev.map(c => (c.id === counterId ? { ...c, value: result.value } : c)));
    cancelCounterEdit();
  }

  // Dice functions

  /**
   * Was um die Blickmitte schon liegt (M10.5/J5) – **alle drei Wuerfelsorten**
   * zusammen. Z7 vermutete hier einen gemeinsamen Zaehler; eine Liste ist das
   * bessere Mittel, weil ein geloeschter Wuerfel seinen Platz wieder freigibt.
   * Zaehler und Karten bleiben auf ihrer absoluten Ablagereihe (M8.1, M8.6) –
   * sie teilen kein Koordinatensystem mit den Wuerfeln.
   */
  function dieSpots() {
    return [...dice, ...customDiceOnTable, ...hitDice];
  }

  function createDie(type) {
    const maxValue = { d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 }[type] || 6;
    const newDie = {
      id: crypto.randomUUID(),
      type: type,
      value: Math.floor(Math.random() * maxValue) + 1,
      maxValue: maxValue,
      // M10.5/J5: dort, wo der Spieler hinsieht, auf dem ersten freien Platz.
      // `canvas.width / 2` war eine Bildschirmbreite als Weltkoordinate, und
      // der Zufall daneben verhinderte kein Uebereinanderliegen.
      ...spawnSlot(viewCenter(), dieSpots()),
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
    const newDie = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: template.name,
      faceImages: template.face_images || [],
      numFaces: template.num_faces || template.faceImages?.length || 6,
      currentFace: Math.floor(Math.random() * (template.face_images?.length || 1)),
      // M10.5/J5, siehe createDie.
      ...spawnSlot(viewCenter(), dieSpots()),
      rolling: false,
      locked: false,
    };
    setCustomDiceOnTable(prev => [...prev, newDie]);
    if (room) room.sendAction({ type: 'custom_die_place', die: newDie });
    setShowDiceModal(false); // custom dice are placed from the dice modal
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
    const newDie = {
      id: crypto.randomUUID(),
      type: 'hit',
      hitType: hitType,
      value: rollHitFace(hitType),
      // M10.5/J5, siehe createDie.
      ...spawnSlot(viewCenter(), dieSpots()),
      rolling: false,
      locked: false,
    };
    setHitDice(prev => [...prev, newDie]);
    setShowDiceModal(false); // the hit-die buttons live in the dice modal
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

  // M2.11: eine Quelle für "welche Objekttypen gibt es" – Nachschlagen beim
  // Ziehen, Sperren und Löschen hängen alle hier dran.
  const objLists = objectLists({
    counters, dice, customDice: customDiceOnTable, hitDice,
    notes, tokens, boards, textFields,
  });
  const objDeleters = objectDeleters({
    deleteCounter, deleteDie, deleteCustomDie: deleteCustomDieFromTable, deleteHitDie,
    deleteNote, deleteToken, deleteBoard, deleteTextField,
  });

  // Drag handlers for floating objects (counters, dice, hitDice, notes, tokens, textFields)
  function handleObjDragStart(e, objType, objId) {
    // Only start drag on left mouse button
    if (!isTouchEvent(e) && e.button !== 0) return;
    // M10.7/U2: im Schwenkmodus zieht nichts – siehe handleCardDragStart.
    if (panModeRef.current) return;

    // Prevent default for touch events
    if (isTouchEvent(e)) {
      handleTouchPrevention(e);
    } else {
      e.preventDefault();
    }

    // Get unified pointer position (convert to world coords for offset)
    const pointer = getPointerPosition(e);

    // M10.1: welche Figur war gemeint? Das Ereignisziel sagt es nicht – eine
    // Figur belegt zwei mal zwei Felder, zwei benachbarte ueberlappen sich um
    // ein volles Feld, und wer oben liegt, bekaeme den ganzen Streifen. Bei
    // *gleicher* Flaeche entscheidet deshalb der naehere Mittelpunkt
    // (`pickTopmost`), nicht die Zeichenreihenfolge. Hier und nicht am DOM:
    // kein Kasten schrumpft, kein `pointer-events` faellt weg, also sieht
    // M2.13 (`canStartPan`) keinen Unterschied.
    //
    // Vor dem Langdruck-Zeitgeber, damit das Kontextmenue auf Touch denselben
    // Token meint wie der Zug. Nur Token: Zaehler und Wuerfel sind klein und
    // liegen nach M9.1 ohnehin oben, und Karten laufen ueber
    // `handleCardDragStart` – ihre Stapel liegen deckungsgleich, der Abstand
    // waere dort fuer alle derselbe.
    const worldPointer = screenToWorld(pointer.clientX, pointer.clientY);

    let obj = (objLists[objType] || []).find(o => o.id === objId);
    if (!obj) return;

    // Gesperrte Token bleiben aussen vor – auf beiden Seiten. Ein Druck auf ein
    // gesperrtes Objekt pant den Tisch (M2.13), und `canStartPan` fragt dazu
    // das **Ereignisziel**. Wer von einem gesperrten Token wegloeste, zoege
    // gleichzeitig ein anderes und pannte; wer auf eines hinloeste, taete gar
    // nichts mehr. Beides bleibt darum genau wie bisher.
    if (objType === 'token' && !obj.locked) {
      const hit = pickTopmost(worldPointer, tokens
        .filter(t => !t.locked)
        .map(t => ({ key: t.id, x: t.x, y: t.y, width: t.width, height: t.height, size: t.size })));
      const picked = hit == null ? null : tokens.find(t => t.id === hit);
      if (picked) {
        objId = hit;
        obj = picked;
      }
    }

    // M2.11: Langdruck öffnet das Kontextmenü – auch auf einem gesperrten
    // Objekt, sonst gäbe es auf Touch keinen Weg zum Entsperren.
    if (isTouchEvent(e)) {
      clearTimeout(longPressMenuTimerRef.current);
      longPressMenuTouchPosRef.current = { x: pointer.clientX, y: pointer.clientY };
      longPressMenuTimerRef.current = setTimeout(() => {
        longPressMenuTimerRef.current = null;
        triggerHaptic('longPress');
        // Langdruck ist kein Zug: den angefangenen Drag abbrechen, sonst
        // schöbe der nächste touchmove das Objekt unter dem Menü weg.
        setDraggingObj(null);
        setContextMenu({
          x: longPressMenuTouchPosRef.current.x,
          y: longPressMenuTouchPosRef.current.y,
          objType, objId, cardTableId: null, stackId: null,
        });
      }, LONG_PRESS_PREVIEW_DELAY);
    }

    // Don't drag locked objects
    if (obj.locked) return;

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
    // Wo das Token zur Ruhe kommt. `setTokens` wirkt erst beim naechsten
    // Render, `tokens` traegt beim Senden also noch die Werte von vor dem
    // Einrasten – ohne dieses Zwischenergebnis gingen der ungerastete Punkt
    // und die alte Adresse in den Raum (M7.1/G5).
    let movedToken = null;
    let movedPlace = null;
    if (draggingObj && draggingObj.type === 'token') {
      const token = tokens.find(t => t.id === draggingObj.id);
      if (token) {
        // Attaching to a card is the most specific thing a token can do – it
        // was dropped on a particular card – so it beats both a zone's places
        // and a grid field, and clears any field the token used to hold.
        const snap = findNearestCardCorner(token.x, token.y);
        let moved = null;
        if (snap) {
          // An einer Karte zu haengen ist eine Stelle, keine verlorene: die
          // Marke aus M10.10 geht dabei weg.
          moved = { x: snap.x, y: snap.y, attachedTo: snap.cardTableId, attachedCorner: snap.corner, gridId: null, cell: null, offGrid: false };
        } else {
          const dropZone = zoneAt(tableZones, token.x, token.y);
          const taken = dropZone
            ? [...tableCards, ...tokens.filter(t => t.id !== token.id)].filter(o => zoneContains(dropZone, o.x, o.y))
            : [];
          // Die Adresse, die das Token jetzt hat, geht mit: ein Stueck auf
          // `E3:G4` behaelt beim Ziehen seine Kantenlaenge und bekommt den
          // gleich grossen Bereich darunter (M7.1). Ohne das schriebe snapInto
          // ein Einzelfeld zurueck, und der Zaun spraenge beim naechsten Laden
          // einen halben Feldversatz weit.
          // Die Groesse geht mit: traegt das Token keinen Bereichsnamen, folgt
          // die Grundflaeche ihr (M7.2) – eine Figur auf 100x100 ueber einem
          // 50er-Raster belegt vier Felder statt eines. `|| token.size` faengt
          // Tisch-Token aus Staenden vor M3c ab, die nur `size` tragen.
          const hit = snapInto(token.x, token.y, {
            zone: dropZone, grids: tableGrids, taken, cell: token.cell,
            size: { width: token.width || token.size, height: token.height || token.size },
          });
          if (hit.snapped) {
            // `snapped` ist die Antwort auf die Frage, nicht Teil des
            // Ergebnisses – der Rest (x, y, gridId, cell und bei einem Bereich
            // dessen Masse) ist, was am Token gilt und in den Raum geht.
            const { snapped, ...place } = hit;
            // M10.10: eingerastet ist gesetzt – eine alte Marke gilt nicht mehr.
            moved = { ...place, offGrid: false };
          } else if (offGrid(token, hit)) {
            // Dragged off the grid: the field it names is no longer where it
            // is, and a stale field would teleport it on the next load.
            //
            // M10.10: und das darf nicht still geschehen. Das Stueck merkt
            // sich, dass es seinen Platz verloren hat, und traegt es sichtbar
            // – zurueckspringen oder am Rand einrasten schied aus, beides
            // naehme dem Spieler das Beiseitelegen.
            moved = { gridId: null, cell: null, offGrid: true };
          }
        }
        if (moved) setTokens(prev => prev.map(t => (t.id === draggingObj.id ? { ...t, ...moved } : t)));
        movedPlace = moved;
        movedToken = { ...token, ...moved };
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
        const obj = movedToken || tokens.find(t => t.id === objId);
        // Die Adresse geht mit, sonst behielte der Raum die alte und
        // `placeOnGrids` zoege das Stueck beim naechsten Laden dorthin
        // zurueck (M7.1/G5). `null` ist hier eine Aussage – vom Raster
        // gezogen – und kein fehlendes Feld.
        if (obj) room.sendAction({
          type: 'token_move', token_id: objId, x: obj.x, y: obj.y,
          gridId: obj.gridId ?? null, cell: obj.cell ?? null,
          // M10.10: die Marke gehoert zur Adresse und geht denselben Weg.
          offGrid: !!obj.offGrid,
          // Nur ein Bereich bringt nachgerechnete Masse mit; ein Einzelfeld
          // behaelt die Groesse seines Assets, und ein Zug, der keine schickt,
          // darf die vorhandenen nicht ueberschreiben.
          ...(movedPlace && 'width' in movedPlace ? { width: obj.width, height: obj.height } : {}),
        });
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
    const newField = {
      id: crypto.randomUUID(),
      text: text || 'Text',
      fontSize: fontSize || 16,
      color: color || '#ffffff',
      // M10.5/J5: dieselbe Rechnung wie bei den Wuerfeln. Der Befund nennt
      // Wuerfel, die Regel nennt "ein neu angelegtes Ding" – und
      // `canvas.width / 2` stand woertlich hier wie dort.
      ...spawnSlot(viewCenter(), textFields),
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
      : type === 'board' ? setBoards
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
    if (id) {
      apiFetch(`/api/games/${id}/table-assets`)
        .then(r => r.ok ? r.json() : [])
        .then(assets => setImageTokenLibrary(assets.filter(a => a.type === 'token')))
        .catch(() => {});
    }
  }

  function openDiceModal() {
    setShowDiceModal(true);
    if (id) {
      apiFetch(`/api/games/${id}/custom-dice`)
        .then(r => r.ok ? r.json() : [])
        .then(dice => setCustomDiceLibrary(dice))
        .catch(() => {});
    }
  }

  function createToken(shape, color, label) {
    const newToken = {
      id: crypto.randomUUID(),
      shape: shape,
      color: color,
      label: label || '',
      // M10.5/J5, siehe createDie.
      ...spawnSlot(viewCenter(), tokens),
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

    // M2.11: wandert der Finger, ist es ein Zug – kein Langdruck.
    if (longPressMenuTimerRef.current) {
      const dx = Math.abs(pointer.clientX - longPressMenuTouchPosRef.current.x);
      const dy = Math.abs(pointer.clientY - longPressMenuTouchPosRef.current.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(longPressMenuTimerRef.current);
        longPressMenuTimerRef.current = null;
      }
    }

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
      const newZoom = pinchStartZoomRef.current * distanceRatio;

      // Get canvas position for zooming toward pinch center
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        // M10.2 Regel 2, dritte Zoomstelle: dieselbe Rechnung wie am Mausrad,
        // nur mit der Mitte zwischen den Fingern statt dem Zeiger.
        const camera = cameraRef.current;
        Object.assign(camera, zoomAt(
          camera,
          { x: center.x - rect.left, y: center.y - rect.top },
          { x: rect.width / 2, y: rect.height / 2 },
          newZoom,
        ));

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

    // M2.11: Finger weg vor Ablauf der Zeit → kein Kontextmenü.
    clearTimeout(longPressMenuTimerRef.current);
    longPressMenuTimerRef.current = null;

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

    // 0b. M2.11: Objekt-Langdruck (Kontextmenü)
    clearTimeout(longPressMenuTimerRef.current);
    longPressMenuTimerRef.current = null;

    // 1. Drop a pending stack press
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
      // M10.9/U7: ein abgebrochener Zug stapelt nichts.
      clearTimeout(mergeHoldRef.current.timer);
      mergeHoldRef.current.timer = null;
      setMergeTarget(null);
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
        return { ...c, inStack: newStackId, x: c.x + getCardDims(c).w + 30 };
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
  // ─── M10.6/U4: benannte Ansichten ────────────────────────────────────────
  //
  // Der Befund: bei spielbarem Zoom liegen die zwoelf Attributzaehler der drei
  // Doerfler mehrere hundert Pixel unterhalb des Bildes; ein Kampf kostete
  // etwa fuenfzehn Ausfluege. Die Spec verweist auf `cameraX/Y/Zoom` an der
  // Zone – die aber jede Zone hat und die niemand entschieden hat. Warum das
  // der falsche Traeger ist, steht in `client/src/utils/tableViews.js`.

  /** Die Kamera auf eine gespeicherte Ansicht setzen. */
  function goToView(view) {
    const camera = cameraRef.current;
    camera.x = view.x;
    camera.y = view.y;
    camera.zoom = view.zoom;
    setZoomDisplay(Math.round(camera.zoom * 100));
    setPanPosition({ x: Math.round(camera.x), y: Math.round(camera.y) });
    renderCanvas();
    setShowViews(false);
  }

  /** Was man gerade sieht, unter einem Namen ablegen. */
  function saveCurrentView() {
    // `prompt` statt eines eigenen Dialogs: er geht auf Maus und auf Tastfeld,
    // und ein Dialog fuer ein Textfeld waere der teurere Weg zum selben Wort.
    const label = window.prompt('Name der Ansicht (z. B. "Schlachtfeld")');
    if (label === null) return;
    setViews(prev => putView(prev, label, cameraRef.current));
  }

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
          width: c.width || 0,
          height: c.height || 0,
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
        // Ohne Breite/Hoehe kaeme eine Querformat-Karte nach dem naechsten
        // loadGameState als Hochformat zurueck - loadGameState liest beide
        // Felder, getGameState schrieb sie bisher nicht.
        width: c.width || 0,
        height: c.height || 0,
        x: c.x,
        y: c.y,
        zIndex: c.zIndex,
        faceDown: c.faceDown,
        rotation: c.rotation || 0,
        face_up: !c.faceDown,
        gridId: c.gridId || null,
        cell: c.cell || null,
      })),
      stacks,
      hand: handCards.map(c => ({
        handId: c.handId,
        cardId: c.cardId,
        name: c.name,
        image_path: c.image_path,
        card_back_id: c.card_back_id || null,
      })),
      // M4a: die Felder stehen in shared/counters.js, nicht hier - eine zweite
      // Liste verlöre das nächste neue Feld (zuletzt `max`) beim Speichern.
      counters: counters.map(normalizeCounter),
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
        width: t.width || null,
        height: t.height || null,
        x: t.x,
        y: t.y,
        attachedTo: t.attachedTo || null,
        attachedCorner: t.attachedCorner || null,
        locked: t.locked || false,
        // M7.1: die Drehung des Bildes. Sie muss in **beide** Feldlisten -
        // bei Karten stand sie schon in beiden, bei Token in keiner, und ein
        // Feld, das nur eine der beiden fuehrt, ueberlebt kein Speichern.
        rotation: t.rotation || 0,
        // The grid field this object sits on (M3b), if any. Coordinates alone
        // stop meaning "C7" as soon as the board they belong to has moved.
        gridId: t.gridId || null,
        cell: t.cell || null,
        // M10.10: "hat seinen Rasterplatz verloren". Muss in die Feldliste,
        // sonst ueberlebt die Marke das naechste Speichern nicht - und genau
        // spaeter faellt der Feldversatz auf, nicht im Moment des Zugs.
        offGrid: t.offGrid || false,
        // set by the setup sequence's asset steps (place_asset / draw_assets)
        assetId: t.assetId || null,
        faceDown: t.faceDown || false,
        frontImageUrl: t.frontImageUrl || null,
        backImageUrl: t.backImageUrl || null,
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
      // M10.6/U4: die benannten Ansichten reisen im Spielstand mit – dort, wo
      // `camera`, `background` und `stackNames` schon stehen. `state_data` ist
      // beim Server ein undurchsichtiger JSON-Text, also kostet das keine
      // Migration. **Nicht** an der Zone, Begruendung in `tableViews.js`.
      views,
    };
  }

  // ─── Multiplayer: Apply remote actions from the server ────────────────────
  function applyRemoteAction(msg) {
    if (!msg || !msg.type) return;
    applyingRemoteRef.current = true;
    try {
      switch (msg.type) {
        case 'card_move':
          // `gridAddress` nimmt nur die Felder, die wirklich in der Nachricht
          // stehen: ein aelterer Client schickt keine Adresse, und sein Zug
          // darf die vorhandene nicht loeschen (M7.1/G5).
          setTableCards(prev => prev.map(c =>
            c.tableId === msg.table_id ? { ...c, x: msg.x, y: msg.y, ...gridAddress(msg) } : c
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
          setTokens(prev => prev.map(t => (
            t.id === msg.token_id ? { ...t, x: msg.x, y: msg.y, ...gridAddress(msg) } : t
          )));
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
        case 'token_flip':
          setTokens(prev => prev.map(t => (
            t.id === msg.token_id ? { ...t, ...(assetFace(t, msg.face_down) || {}) } : t
          )));
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
          if (msg.grids) setGrids(msg.grids);
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

  // Same for the grids, so a room table snaps like a hotseat one.
  useEffect(() => {
    if (room?.grids && room.grids.length > 0) {
      setGrids(room.grids);
    }
  }, [room?.grids]);

  // M6-Nachtrag 2: Uebergibt der Raum einen Brettzustand, zeigt der Tisch ihn
  // an. Der Server hat die Aufbau-Sequenz beim Start bereits ausgefuehrt - hier
  // wird nur noch geladen, derselbe Weg wie Setup und Spielstand. Die Raster
  // gehen ausdruecklich mit: `grids` steht erst im naechsten Render, die
  // Objekte muessen aber jetzt auf ihre Felder.
  //
  // `loadGameState` setzt nur State, es sendet nichts - eine Schleife kann hier
  // also nicht entstehen. Der Referenzvergleich verhindert, dass derselbe
  // Zustand bei jedem Render erneut geladen wird (`room` ist in
  // MultiplayerGame.jsx bei jedem Render ein neues Objekt, `room.boardState`
  // dagegen nur nach einer Server-Nachricht).
  const appliedBoardStateRef = useRef(null);
  useEffect(() => {
    if (!shouldApplyBoardState(room?.boardState, appliedBoardStateRef.current)) return;
    appliedBoardStateRef.current = room.boardState;
    loadGameState(room.boardState, room.grids || null);
  }, [room?.boardState, room?.grids]);

  // Save the game state to the backend
  async function saveGameState(name) {
    setSaving(true);
    try {
      const stateData = getGameState();
      const res = await apiFetch(`/api/games/${id}/saves`, {
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
    // M9.2: ein leerer Tisch schreibt nichts. Die Liste der Objektarten steht
    // in shared/tableState.js - die handgeschriebene hier kannte `customDice`,
    // `hitDice`, `textFields` und `boards` nicht, ein Tisch mit nur eigenen
    // Wuerfeln galt ihr als leer. Durchgesetzt wird die Regel in der Route
    // (nur sie kennt den gespeicherten Stand); hier wird die sinnlose Anfrage
    // gespart.
    const stateData = getGameState();
    if (isEmptyTableState(stateData)) return;

    try {
      setAutoSaveStatus('saving');
      const res = await apiFetch(`/api/games/${id}/saves/auto`, {
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

    // Also auto-save when navigating away. Im Raum nicht: der Zustand gehoert
    // dem Server, und das Verlassen eines Raums darf ihn nicht als
    // Einzelspieler-Autosave des Spiels wegschreiben (das Intervall oben
    // schliesst den Raum bereits aus, dieser Pfad tat es bisher nicht).
    function handleBeforeUnload() {
      if (room) return;
      if (autoSaveEnabledRef.current && performAutoSaveRef.current) {
        // sendBeacon cannot set an Authorization header, so the guarded API
        // would 401 it. keepalive:true is the fetch equivalent that survives
        // unload (payload cap ~64KB, which a table state stays well under).
        // M9.2: dieselbe Sperre wie im Intervall daneben. Dieser Pfad hatte
        // sie nicht - Tisch aufmachen, wieder weg, und der leere Stand stand.
        const stateData = typeof getGameState === 'function' ? getGameState() : null;
        if (stateData && !isEmptyTableState(stateData)) {
          apiFetch(`/api/games/${id}/saves/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state_data: stateData }),
            keepalive: true,
          }).catch(() => {});
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
        res = await apiFetch(`/api/games/${id}/setups/${editingSetupId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, state_data: stateData, zone_data: zones, sequence_data: sequenceSteps, grid_data: grids, action_data: setupActions, scenario_data: scenarioData }),
        });
      } else {
        // Create new setup
        res = await apiFetch(`/api/games/${id}/setups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, state_data: stateData, zone_data: zones, sequence_data: sequenceSteps, grid_data: grids, action_data: setupActions, scenario_data: scenarioData }),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Setup save failed');
      }
      const saved = await res.json();
      setShowSetupSaveModal(false);
      // Keep the name the setup now has. Clearing it here was why the update
      // dialog came back empty, and why the quick-save path below renamed a
      // saved setup to "Untitled Setup" on the second press.
      setSetupName(saved.name || name);
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
  function loadGameState(stateData, gridsForPlacement = null) {
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

    // M10.6/U4: die benannten Ansichten. Ueber `normalizeViews`, weil ein
    // Spielstand alles enthalten kann – auch einen aelteren ohne das Feld.
    setViews(normalizeViews(state.views));

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
          gridId: c.gridId || null,
          cell: c.cell || null,
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
    let allTokens = [];
    let restoredBoards = [];
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
      setCounters(state.counters.map(normalizeCounter));
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
        width: t.width || null,
        height: t.height || null,
        x: t.x,
        y: t.y,
        attachedTo: t.attachedTo || null,
        attachedCorner: t.attachedCorner || null,
        locked: t.locked || false,
        // Ein Zustand ohne das Feld liest sich als 0 (M7.1) - wie `locked`.
        rotation: t.rotation || 0,
        gridId: t.gridId || null,
        cell: t.cell || null,
        // M10.10: die Marke muss durch beide Feldlisten, sonst ueberlebt sie
        // das Speichern nicht - und spaeter faellt der Feldversatz auf, nicht
        // im Moment des Zugs.
        offGrid: t.offGrid || false,
        assetId: t.assetId || null,
        faceDown: t.faceDown || false,
        frontImageUrl: t.frontImageUrl || null,
        backImageUrl: t.backImageUrl || null,
      }));
      // Merge migrated markers with existing tokens
      allTokens = [...restoredTokens, ...migratedTokens];
      setTokens(allTokens);
    } else {
      // Only migrated markers
      allTokens = migratedTokens;
      setTokens(migratedTokens);
    }

    // Restore boards
    if (state.boards && Array.isArray(state.boards)) {
      restoredBoards = state.boards.map(b => ({
        id: b.id || crypto.randomUUID(),
        imageUrl: b.imageUrl,
        name: b.name || '',
        x: b.x,
        y: b.y,
        width: b.width || 200,
        height: b.height || 200,
        locked: b.locked || false,
      }));
      setBoards(restoredBoards);
    } else {
      setBoards([]);
    }

    // M3b: anything that remembers a grid field goes back onto that field,
    // against the grids as they resolve on the table just restored. This is
    // what makes a figure on C7 be on C7 again and not merely at the
    // coordinates C7 happened to have when it was put down - the board may
    // have been moved or re-imported at another size in between.
    //
    // The grids are passed in where the caller has just read them from a setup
    // (`grids` state would still be empty at that point); otherwise they are
    // the ones already on the table.
    const gridsNow = resolveGrids(gridsForPlacement || grids, anchorBoxes(restoredBoards, allTokens));
    if (gridsNow.length) {
      setTokens(prev => placeOnGrids(prev, gridsNow));
      setTableCards(prev => placeOnGrids(prev, gridsNow));
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

  // M7/T3: die Kartenbibliothek so, wie der Executor sie braucht - jede Zeile
  // mit dem *Namen* ihrer Kategorie, genau wie `table-assets` ihn schon
  // mitliefert. `place_stack` adressiert die Kategorie über diesen Namen; die
  // Kartenzeile selbst kennt nur eine `category_id`. Frisch geladen statt aus
  // `availableCards`/`categories`: beide kommen aus eigenen Effekten und sind
  // beim Aufbau eines Setups nicht verlässlich schon da.
  async function loadCardLibrary() {
    const [cardsRes, catsRes] = await Promise.all([
      apiFetch(`/api/games/${id}/cards`),
      apiFetch(`/api/games/${id}/categories`),
    ]);
    const cardRows = cardsRes.ok ? await cardsRes.json() : [];
    const catRows = catsRes.ok ? await catsRes.json() : [];
    const nameById = new Map(catRows.map(c => [c.id, c.name]));
    return cardRows.map(c => ({ ...c, category: nameById.get(c.category_id) || null }));
  }

  // M5: eine Aktion des Setups am Tisch ausloesen. Gleiche Maschinerie wie die
  // Aufbau-Sequenz, nur laeuft sie gegen den *aktuellen* Tisch: getGameState
  // liefert genau die Form, die der Executor erwartet und loadGameState wieder
  // einliest. Die Raster gehen mit in die `options` (M7/T1): ein Schritt darf
  // auf ein Rasterfeld zielen, und er loest es gegen den Tisch auf, wie er ihn
  // vorfindet. `loadGameState` bekommt sie nicht - dort stehen sie schon.
  async function runSetupAction(action) {
    if (runningActionId !== null) return;
    setRunningActionId(action.id);
    try {
      const assetsRes = await apiFetch(`/api/games/${id}/table-assets`);
      const assets = assetsRes.ok ? await assetsRes.json() : [];
      const cards = await loadCardLibrary();
      const { state: next, log } = executeSequenceWithLog(getGameState(), action.steps || [], zones, { assets, cards, grids, scenarioData });
      loadGameState(next);
      const bad = log.filter(e => e.status !== 'ok');
      setSetupIssues(bad.length ? bad : null);
    } catch (err) {
      console.error('Action failed:', err);
      setSetupIssues([{ index: -1, type: action.label || action.id, target: null, status: 'failed', reason: err.message }]);
    } finally {
      setRunningActionId(null);
    }
  }

  // M8.9: die oberste Karte eines Stapels offen in eine Zone aufdecken - ein
  // Griff statt Flip, Ziehen und Ablegen. Dieselbe Maschinerie wie
  // `runSetupAction`, nur mit einem Schritt, den `revealPlan` schreibt: der
  // Schritt ist `deal_to_zone` mit count 1, und einen zweiten Weg, eine Karte
  // vom Stapel in eine Zone zu legen, gibt es damit nicht.
  function revealTopCardToZone(stackId, zoneLabel) {
    const plan = revealPlan(getGameState(), stackId, zoneLabel);
    const { state: next, log } = executeSequenceWithLog(plan.state, plan.steps, zones, { grids });
    loadGameState(next);
    // Der Hilfsname fuer einen namenlosen Stapel war nur die Adresse des
    // Schritts - in der Oberflaeche hat er nichts zu suchen.
    if (plan.tempLabel) {
      setStackNames(prev => {
        const next2 = { ...prev };
        delete next2[stackId];
        return next2;
      });
    }
    const bad = log.filter(e => e.status !== 'ok');
    setSetupIssues(bad.length ? bad : null);
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
        const res = await apiFetch(`/api/games/${id}/saves/${saveId}`);
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
          const res = await apiFetch(`/api/games/${id}/setups/${setupId}`);
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
          let parsedGrids = [];
          if (setup.grid_data) {
            try { parsedGrids = JSON.parse(setup.grid_data); } catch {}
          }
          setGrids(parsedGrids);
          // M5: Aktionen gehoeren zum Setup, laufen aber erst spaeter - hier
          // nur merken, nicht ausfuehren.
          let parsedActions = [];
          try { parsedActions = JSON.parse(setup.action_data || '[]'); } catch {}
          setSetupActions(Array.isArray(parsedActions) ? parsedActions : []);
          // Die Szenariodaten wie die Raster frisch aus dem Setup: `scenarioData`
          // im State steht erst beim naechsten Rendern, und `build_scenario`
          // braucht sie jetzt (M7/T6).
          const parsedScenario = parseScenarioData(setup.scenario_data);
          setScenarioData(parsedScenario);

          // Execute setup sequence for new games (not savegame loads)
          let parsedSeq = [];
          try { parsedSeq = JSON.parse(setup.sequence_data || '[]'); } catch {}

          let stateToLoad = setup.state_data;
          if (parsedSeq.length > 0) {
            try {
              const parsed = typeof stateToLoad === 'string' ? JSON.parse(stateToLoad) : stateToLoad;
              // Asset steps (place_asset / draw_assets / ...) draw from the game's table assets.
              const assetsRes = await apiFetch(`/api/games/${id}/table-assets`);
              const assets = assetsRes.ok ? await assetsRes.json() : [];
              // Dasselbe fuer die Kartenbibliothek: `place_stack` baut aus einer
              // Kartenkategorie einen Nachziehstapel (M7/T3).
              const cardLibrary = await loadCardLibrary();
              // Die Raster wie die Zonen frisch aus dem Setup: `grids` im State
              // ist an dieser Stelle noch leer (M7/T1).
              const { state: built, log } = executeSequenceWithLog(parsed, parsedSeq, parsedZones, { assets, cards: cardLibrary, grids: parsedGrids, scenarioData: parsedScenario });
              stateToLoad = built;
              const bad = log.filter(e => e.status !== 'ok');
              setSetupIssues(bad.length ? bad : null);
            } catch (err) {
              console.error('Sequence execution failed:', err);
            }
          }
          // The grids go along explicitly: `grids` is only set on the next
          // render, and the objects have to be placed now.
          loadGameState(stateToLoad, parsedGrids);
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
          const res = await apiFetch(`/api/games/${id}/setups/${editSetupIdParam}`);
          if (!res.ok) {
            console.error('Failed to load setup for editing:', res.status);
            return;
          }
          const setup = await res.json();
          setSetupName(setup.name);
          let editGrids = [];
          if (setup.grid_data) {
            try { editGrids = JSON.parse(setup.grid_data); } catch {}
          }
          setGrids(editGrids);
          // M5/M7 T7: auch hier laden, nicht nur im Spiel-Ladeweg. `saveSetup`
          // schickt `action_data` jetzt mit - ohne dieses Laden würde der erste
          // Speichervorgang aus dem Editor alle Aktionen des Setups löschen.
          let editActions = [];
          try { editActions = JSON.parse(setup.action_data || '[]'); } catch {}
          setSetupActions(Array.isArray(editActions) ? editActions : []);
          setScenarioData(parseScenarioData(setup.scenario_data));
          loadGameState(setup.state_data, editGrids);
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
    // M8.5 Regel 3: dieselbe Frage wie im nativen Horcher oben, fuer Panels,
    // die kein data-ui-element tragen.
    if (!canZoomTable(e.target, containerRef.current)) return;

    const camera = cameraRef.current;
    const container = containerRef.current;
    const rect = container ? container.getBoundingClientRect() : null;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    if (rect) {
      // M10.2 Regel 2, dieselbe Rechnung wie im nativen Horcher oben.
      Object.assign(camera, zoomAt(
        camera,
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        { x: rect.width / 2, y: rect.height / 2 },
        camera.zoom * delta,
      ));
    } else {
      camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom * delta));
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
    // M2.13: same rule as the native mouse handler above – the background pans,
    // and so does a locked object, which no drag would pick up anyway.
    // M10.7/U1: dazu die mittlere Maustaste und der Schwenkmodus, in derselben
    // Funktion statt daneben. Eine Beruehrung hat keine Taste und bekommt die
    // Vorgabe 0.
    const isTouchStart = isTouchEvent(e);
    const mayPan = canStartPan(e.target, canvasRef.current, containerRef.current, {
      button: isTouchStart ? 0 : e.button,
      panMode: panModeRef.current,
    });

    if (mayPan) {
      if (!isTouchStart && e.button === 1) e.preventDefault();
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
  function dismissCounterModal() { setShowCounterModal(false); setNewCounterName(''); setNewCounterMax(''); }
  function dismissDiceModal() { setShowDiceModal(false); }
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
      {gridHighlight && draggingCard && (() => {
        const { w: hlW, h: hlH } = getCardDims(tableCards.find(c => c.tableId === draggingCard));
        return (
        <div
          data-testid="grid-highlight"
          className="absolute pointer-events-none z-10"
          style={{
            left: gridHighlight.x - hlW / 2 - 4,
            top: gridHighlight.y - hlH / 2 - 4,
            width: hlW + 8,
            height: hlH + 8,
            border: '2px dashed rgba(59, 130, 246, 0.6)',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          }}
        />
        );
      })()}

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
          // Highlight if this stack is a drop target – oder, seit M10.9/U7, wenn
          // diese lose Karte das Ziel des Haltens ist.
          //
          // `stackDropTarget === stackId` allein war falsch: lose Karten werden
          // mit `stackId === null` gezeichnet, und `stackDropTarget` ist null,
          // solange nichts gezogen wird. Jede lose Karte lag also dauerhaft im
          // gruenen Leuchten und um 5 % vergroessert da – und genau dieses
          // Leuchten ist jetzt eine Aussage.
          const isDropTarget = (stackId !== null && stackDropTarget === stackId)
            || mergeTarget === card.tableId;
          const { w: cardW, h: cardH } = getCardDims(card);
          // Spec section 6: a face-down card keeps its name to itself. The front
          // face stays mounted for the flip animation, so its alt text and name
          // label are readable in the DOM even while rotated away - and the
          // wrapper's tooltip is plainly visible on hover.
          const view = tableObjectView(card, 'Card');

          return (
            <div
              key={card.tableId}
              data-testid={`table-card-${card.tableId}`}
              data-card-name={view.name}
              data-card-id={card.cardId}
              data-table-card="true"
              data-rotation={card.rotation || 0}
              data-stack-id={stackId || ''}
              data-stack-size={stackSize}
              data-ui-element="true"
              data-locked={card.locked ? 'true' : undefined}
              className="absolute select-none group pointer-events-auto"
              style={{
                left: card.x - cardW / 2,
                top: card.y - cardH / 2,
                width: cardW,
                height: cardH + (isStack ? 6 : 0),
                zIndex: isDragging ? 9999 : layerZ(`card:${card.tableId}`),
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
              title={isStack ? (stackNames[stackId] ? `${stackNames[stackId]} (${stackSize})` : `Stack: ${stackSize} cards`) : view.caption}
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
                        alt={view.caption}
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
                          {view.name}
                        </span>
                      </div>
                    )}
                    {/* M10.2 Regel 3: hier lag das graue Namensschild ueber dem
                        Kartenbild und verdeckte dessen unterste Zeile. Es
                        skalierte nicht mit, verdeckte bei kleinem Zoom also
                        relativ mehr – genau dann, wenn man ohnehin schlecht
                        liest. Der Name ist damit nicht verloren: der aeussere
                        Rahmen traegt ihn als `title`, eine Karte ohne Bild
                        zeichnet ihn mittig (Zweig darueber), das Kontextmenue
                        nennt ihn, und die Grossansicht schreibt ihn unter das
                        Bild. Unter die Karte geschoben stuende er ausserhalb
                        des Kartenkastens, finge dort Zeiger ab und verschoebe
                        genau die Trefferflaechen, die M10.1 geradezieht. */}
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
      {boards.map(board => {
        // A board can be turned face down too - set_asset_face looks in
        // state.boards as well as state.tokens (sequenceExecutor.findPlaced).
        const view = tableObjectView(board, 'Board');
        return (
        <div
          key={board.id}
          data-testid={`board-${board.id}`}
          data-ui-element="true"
          data-locked={board.locked ? 'true' : undefined}
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
            alt={view.caption}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
          {/* Board name label */}
          {view.name && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5 truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {view.name}
            </div>
          )}
        </div>
        );
      })}

      {/* Floating Counter Widgets */}
      {counters.map(counter => (
        <div
          key={counter.id}
          data-testid={`counter-${counter.id}`}
          data-counter-name={counter.name}
          data-ui-element="true"
          data-locked={counter.locked ? 'true' : undefined}
          className="absolute select-none pointer-events-auto"
          style={{
            left: counter.x - 70,
            top: counter.y - 40,
            zIndex: layerZ(`counter:${counter.id}`),
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
              {editingCounterId === counter.id ? (
                /* M8.6 Regel 1 + M10.3: Enter und Fokusverlust uebernehmen,
                   Escape verwirft. Escape wird hier abgefangen
                   (stopPropagation) und steht bewusst NICHT in ESCAPE_LAYERS -
                   dieselbe Form wie die Notiz-Bearbeitung weiter unten, und
                   M2.10 bleibt unberuehrt. */
                <input
                  type="text"
                  value={editingCounterText}
                  autoFocus
                  /* M9.5 Regel 1: der alte Wert ist markiert, Tippen ersetzt
                     ihn. Das steht der relativen Eingabe nicht im Weg - `+2`
                     ist die ganze Eingabe, nicht ein Zusatz zum Feldinhalt.
                     Genau weil der alte Wert stehenblieb, wurde aus `-2` ein
                     `-2-3`, und das ist keine Zahl. Regel 3 steht daneben im
                     Platzhalter und im Titel. */
                  onFocus={(e) => e.target.select()}
                  placeholder="21, +21, -21, max"
                  title="A plain number sets the value, +n and -n add, max fills up"
                  onChange={(e) => setEditingCounterText(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  /* M10.3: Wegklicken uebernimmt, wie Enter. Escape verwirft. */
                  onBlur={() => blurCounterEdit(counter.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitCounterEdit(counter.id); }
                    if (e.key === 'Escape') { e.preventDefault(); discardCounterEdit(); }
                    e.stopPropagation();
                  }}
                  data-testid={`counter-value-input-${counter.id}`}
                  className="w-[72px] px-1 py-0.5 bg-slate-900 border border-blue-400 rounded text-xl font-mono font-bold text-white text-center focus:outline-none"
                />
              ) : (
                <span
                  className="text-xl font-mono font-bold text-white min-w-[40px] text-center cursor-text"
                  data-testid={`counter-value-${counter.id}`}
                  title="Click to set a value (21, +21, -21, max)"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); startCounterEdit(counter); }}
                >
                  {/* M4a: mit Obergrenze steht hier "2 / 3". Erzwungen wird sie
                      nicht - der rote Marker liegt daneben, der Tisch rechnet nicht. */}
                  {counterDisplay(counter)}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); incrementCounter(counter.id); }}
                data-testid={`counter-increment-${counter.id}`}
                className="w-11 h-11 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xl flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
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
          data-locked={die.locked ? 'true' : undefined}
          className="absolute select-none pointer-events-auto"
          style={{
            left: die.x - 35,
            top: die.y - 35,
            zIndex: layerZ(`die:${die.id}`),
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
          data-locked={die.locked ? 'true' : undefined}
          className="absolute select-none pointer-events-auto"
          style={{ left: die.x - 40, top: die.y - 48, zIndex: layerZ(`customDie:${die.id}`), cursor: draggingObj?.id === die.id ? 'grabbing' : 'grab' }}
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
            data-locked={die.locked ? 'true' : undefined}
            className="absolute select-none pointer-events-auto"
            style={{
              left: die.x - 38,
              top: die.y - 42,
              zIndex: layerZ(`hitDie:${die.id}`),
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
          data-locked={note.locked ? 'true' : undefined}
          className="absolute select-none group pointer-events-auto"
          style={{
            left: note.x - 80,
            top: note.y - 50,
            zIndex: layerZ(`note:${note.id}`),
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
        // M3c: Bild-Token haben ein Seitenverhältnis, alte nur `size`.
        const tokenW = token.width || token.size || 30;
        const tokenH = token.height || token.size || 30;
        // Spec section 6: face down means the name is off the element too -
        // TokenShape paints it on the token and puts it in the tooltip, and
        // data-token-label would hand it to anyone reading the DOM.
        const view = tableObjectView(token, 'Token');
        return (
        <div
          key={token.id}
          data-testid={`token-${token.id}`}
          data-token-shape={token.shape}
          data-token-color={token.color}
          data-token-label={view.name}
          data-face-down={view.hidden ? 'true' : 'false'}
          data-ui-element="true"
          data-locked={token.locked ? 'true' : undefined}
          data-off-grid={token.offGrid ? 'true' : undefined}
          className="absolute select-none group pointer-events-auto"
          style={{
            left: token.x - Math.floor(tokenW / 2),
            top: token.y - Math.floor(tokenH / 2),
            // M10.10: vom Raster gezogen und dort liegengeblieben. Der
            // gestrichelte Rand ist die ganze Abhilfe - das Stueck bleibt, wo
            // es hingelegt wurde, sieht aber nicht mehr aus wie gesetzt.
            outline: token.offGrid ? '2px dashed #fbbf24' : undefined,
            outlineOffset: token.offGrid ? '3px' : undefined,
            // M8.2/M9.1: das groessere Stueck liegt darunter. Kein z-20 mehr in
            // der Klassenliste - sonst stuenden zwei Werte an einem Element.
            zIndex: layerZ(`token:${token.id}`),
            cursor: draggingObj?.id === token.id ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleObjDragStart(e, 'token', token.id)}
          onTouchStart={(e) => handleObjDragStart(e, 'token', token.id)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, objType: 'token', objId: token.id, cardTableId: null, stackId: null }); }}
        >
          <TokenShape shape={token.shape} color={token.color} size={tokenW} width={tokenW} height={tokenH} label={view.name} caption={view.caption} imageUrl={token.imageUrl || null} rotation={token.rotation || 0} />
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
            data-locked={tf.locked ? 'true' : undefined}
            className={`absolute select-none group pointer-events-auto ${tf.locked ? 'ring-1 ring-yellow-500/40 rounded' : ''}`}
            style={{
              left: tf.x,
              top: tf.y,
              transform: 'translate(-50%, -50%)',
              cursor: tf.locked ? 'default' : 'grab',
              zIndex: layerZ(`textField:${tf.id}`),
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
      <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none safe-area-top transition-all duration-300 ease-in-out" data-ui-element="true" data-layout-mode={layoutMode}>
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

        {/* M5-Aktionen als eigene Zeile im Fluss derselben Kopfleiste - aus
            demselben Grund wie Banner und Legende (M2.8): eine Zeile im Fluss
            kann die Zeile darueber nicht ueberdecken, egal wie hoch sie wird,
            und sie erbt `data-ui-element` vom Kopfleisten-Container. Links,
            damit sie dem rechts geoeffneten Kartenschrank nicht in die Quere
            kommt. Ohne Aktionen steht hier nichts - kein leerer Balken. */}
        {setupActions.length > 0 && (
          <div
            className={`flex justify-start ${isMobileLandscape ? 'px-1.5 pb-1.5' : 'px-3 pb-3'}`}
            style={{ paddingLeft: isMobileLandscape ? 'max(0.5rem, env(safe-area-inset-left, 0px))' : 'max(0.75rem, env(safe-area-inset-left, 0px))' }}
          >
            <div
              className="pointer-events-auto flex flex-wrap items-center gap-2"
              data-testid="table-actions"
              data-ui-element="true"
            >
              {setupActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => runSetupAction(action)}
                  disabled={runningActionId !== null}
                  data-testid={`table-action-${action.id}`}
                  data-ui-element="true"
                  className={`bg-indigo-700/90 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-wait backdrop-blur-sm text-white rounded-lg shadow-xl transition-colors ${isMobileLandscape ? 'px-2 py-1.5 text-xs min-h-[36px]' : 'px-4 py-2 text-sm min-h-[44px]'}`}
                >
                  {runningActionId === action.id ? '...' : (action.label || action.id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Setup-Banner als zweite Zeile derselben Kopfleiste. Es lag vorher
            `fixed top-4 right-4` und beanspruchte damit einen Streifen, dessen
            Höhe es nie gemessen hat - genau über den Knöpfen aus Zeile 1. Im
            Fluss kann es die erste Zeile nicht mehr überdecken, egal wie hoch
            die wird, und `env(safe-area-inset-top)` gilt automatisch mit. */}
        {setupMode && (
          <div
            className={`flex justify-end ${isMobileLandscape ? 'px-1.5 pb-1.5' : 'px-3 pb-3'}`}
            style={{ paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))' }}
          >
            <div
              className="pointer-events-auto bg-emerald-700/90 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-sm"
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
          </div>
        )}

        {/* Die Token-Legende hing an `top: calc(4rem + …)` - derselbe geratene
            Streifen wie beim Banner. Sie steht jetzt als dritte Zeile im Fluss
            derselben Kopfleiste und rutscht damit automatisch unter das Banner,
            sobald der Setup-Modus die zweite Zeile einblendet. */}
        {tokens.length > 0 && (
          <div
            className={`flex justify-end pointer-events-none ${isMobileLandscape ? 'px-1.5 pb-1.5' : 'px-3 pb-3'}`}
            /* Der offene Kartenschrank belegt rechts 16rem. Die Legende rueckt
               entsprechend nach links, statt sich darunter zu schieben. */
            style={{ paddingRight: showCardDrawer ? '17rem' : 'max(0.75rem, env(safe-area-inset-right, 0px))' }}
          >
          {/* Token Legend */}
          {showLegend && (
            <div
              className="pointer-events-auto bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3 max-w-xs"
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
                {tokens.map(token => {
                  // Spec section 6: a face-down token gets a row, but no name. The
                  // row stays because the table shows the token anyway - the count
                  // is already public, and dropping the row would only make the
                  // legend disagree with what is lying there. What goes is the one
                  // thing the face-down bar exists to hide.
                  const view = tableObjectView(token);
                  return (
                  <div
                    key={token.id}
                    className="flex items-center gap-2 text-white/80 text-xs"
                    data-testid={`legend-token-${token.id}`}
                    data-face-down={view.hidden ? 'true' : 'false'}
                  >
                    {/* token.imageUrl is whichever face is up, so it is safe as-is. */}
                    <TokenShape shape={token.shape} color={token.color} size={20} label={view.name} imageUrl={token.imageUrl || null} />
                    <span className="flex-1">
                      {view.hidden
                        ? <span className="italic text-white/50">{view.caption}</span>
                        : <>
                            {view.name && <span className="font-semibold">{view.name}: </span>}
                            <span className="capitalize">{token.shape}</span>
                          </>}
                    </span>
                  </div>
                );
                })}
              </div>
            </div>
          )}

          {/* Legend Toggle Button (when legend is hidden) */}
          {!showLegend && (
            <button
              onClick={() => setShowLegend(true)}
              className="pointer-events-auto bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-2 text-white/80 hover:text-white/90 transition-colors"
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
          </div>
        )}
      </div>


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
          className={`absolute right-0 z-50 pointer-events-auto safe-area-right transition-all duration-300 ease-in-out ${
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
                    : cardSearchHits
                      ? `${cardSearchHits.length} of ${availableCards.length} card(s) match.`
                      : `${availableCards.length} card(s) available. Click to place on table.`}
                </p>
              )}
              {/* M8.5: das einzige Eingabefeld der Oberflaeche. Sucht ueber alle
                  Kategorien, auch die zugeklappten, und lebt mit den kaputten
                  OCR-Namen (shared/cardSearch.js). */}
              {availableCards.length > 0 && (
                <input
                  type="search"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  onKeyDown={(e) => {
                    // Escape raeumt erst die Suche; ist sie leer, bleibt es
                    // M2.10 ueberlassen (dann schliesst es die Schublade).
                    if (e.key === 'Escape' && cardSearch) {
                      e.preventDefault();
                      e.stopPropagation();
                      setCardSearch('');
                    }
                  }}
                  placeholder="Search all categories…"
                  data-testid="card-search-input"
                  className="mt-2 w-full px-2 py-1 bg-slate-900/80 border border-white/15 rounded text-white text-xs placeholder-white/30 focus:outline-none focus:border-blue-400"
                />
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
              ) : cardSearchHits ? (
                /* M8.5: ein Treffer nennt seine Kategorie (Abnahme 3) - sonst
                   waere er genauso wenig auffindbar wie vorher. */
                cardSearchHits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/40 text-xs px-2 text-center">
                    <span data-testid="card-search-empty">No card matches “{cardSearch}”.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2" data-testid="card-search-results">
                    {cardSearchHits.map(card => (
                      <button
                        key={card.id}
                        onClick={() => placeCardOnTable(card)}
                        data-testid={`drawer-card-${card.id}`}
                        className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-blue-400 transition-all bg-slate-700/50 flex flex-col"
                        title={`Place "${card.name}" on table`}
                      >
                        <div
                          className="w-full"
                          style={{ aspectRatio: (card.width > 0 && card.height > 0) ? `${card.width}/${card.height}` : '5/7' }}
                        >
                          {card.image_path ? (
                            <img src={card.image_path} alt={card.name} className="w-full h-full object-contain" draggable={false} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-600 text-white/40 text-[10px]">no image</div>
                          )}
                        </div>
                        <div className="w-full bg-black/70 text-white sm:text-[9px] text-xs text-center py-0.5 truncate px-1">
                          {card.name}
                        </div>
                        <div
                          className="w-full bg-black/40 text-blue-300 sm:text-[8px] text-[10px] text-center py-0.5 truncate px-1"
                          data-testid={`drawer-card-category-${card.id}`}
                        >
                          {categoryNames.get(card.category_id) || 'Uncategorized'}
                        </div>
                      </button>
                    ))}
                  </div>
                )
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
              onClick={() => openDiceModal()}
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

            {/* M10.7/U2: der Schwenkmodus. Die mittlere Maustaste gibt es auf
                einem Tastfeld und auf vielen Trackpads nicht; zwei Finger sind
                schon doppelt belegt (Kneifzoom, Drehen bei gezogener Karte).
                Ein Modus kollidiert mit keiner Geste und ist weniger Code. */}
            <button
              onClick={() => setPanMode(prev => !prev)}
              data-testid="toolbar-pan-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'} ${panMode ? 'bg-blue-600/80 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title="Pan mode – drag anywhere to move the table (middle mouse button does the same)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Pan</span>}
            </button>

            {/* M10.6/U4: benannte Ansichten. Der Knopf steht am Tisch und nicht
                im Setup-Editor, weil der Befund aus der Partie stammt. */}
            <button
              onClick={() => setShowViews(prev => !prev)}
              data-testid="toolbar-views-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-4 py-3'}`}
              title="Saved views"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {!isMobileLandscape && <span className="sm:text-[10px] text-xs">Views</span>}
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
                  // An existing setup already has a name, so updating it needs
                  // no dialog. Without one, ask – never invent "Untitled Setup"
                  // and rename the user's setup behind his back.
                  if (editingSetupId && setupName.trim()) saveSetup(setupName.trim());
                  else setShowSetupSaveModal(true);
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

            {/* M10.8/U5: einklappen. Ein Lebenszaehler lag zweimal unter der
                Leiste, und der Spieler musste den ganzen Tisch schwenken, um an
                ein Minuszeichen zu kommen. */}
            <button
              onClick={() => setShowToolbar(false)}
              data-testid="toolbar-collapse-btn"
              className={`flex flex-col items-center gap-0.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] ${isMobileLandscape ? 'px-2 py-1.5' : 'px-3 py-3'}`}
              title="Hide toolbar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobileLandscape ? 18 : 20} height={isMobileLandscape ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isMobileLandscape
                  ? <polyline points="15,18 9,12 15,6" />
                  : <polyline points="6,9 12,15 18,9" />}
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* M10.8/U5 Abnahme 3: eingeklappt bleibt ein sichtbarer Weg zurueck.
          Ausserhalb des `showToolbar`-Zweigs, sonst verschwaende er mit der
          Leiste; 44 Pixel wie jeder andere Knopf, damit ein Finger ihn trifft. */}
      {!showToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          data-testid="toolbar-show-btn"
          data-ui-element="true"
          className={`absolute z-30 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white/70 hover:text-white shadow-2xl ${
            isMobileLandscape ? 'top-1/2 -translate-y-1/2 left-0' : 'left-1/2 -translate-x-1/2'
          }`}
          style={isMobileLandscape
            ? { left: 'env(safe-area-inset-left, 0px)' }
            : { bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }
          }
          title="Show toolbar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMobileLandscape
              ? <polyline points="9,18 15,12 9,6" />
              : <polyline points="18,15 12,9 6,15" />}
          </svg>
        </button>
      )}

      {/* M10.6/U4: die Auswahl der Ansichten. Leer, solange nichts gespeichert
          ist – Abnahme 3 und 4 fallen damit zusammen. */}
      {showViews && showToolbar && (
        <div
          className={`absolute z-40 ${isMobileLandscape ? 'top-1/2 -translate-y-1/2 left-16' : 'left-1/2 -translate-x-1/2'}`}
          style={isMobileLandscape ? {} : { bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          data-testid="views-picker"
          data-ui-element="true"
        >
          <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10 min-w-[220px]">
            <div className="text-white/60 text-xs mb-2 font-medium">Saved Views</div>
            {views.length === 0 && (
              <div className="text-white/40 text-xs mb-2">Noch keine Ansicht gespeichert.</div>
            )}
            {views.map(v => (
              <div key={v.label} className="flex items-center gap-1">
                <button
                  onClick={() => goToView(v)}
                  data-testid={`view-go-${v.label}`}
                  className="flex-1 text-left px-3 py-2 min-h-[44px] text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {v.label}
                  <span className="ml-2 text-xs text-white/40">{Math.round(v.zoom * 100)}%</span>
                </button>
                <button
                  onClick={() => setViews(prev => removeView(prev, v.label))}
                  data-testid={`view-del-${v.label}`}
                  className="px-3 py-2 min-h-[44px] text-white/40 hover:text-red-300 transition-colors"
                  title="Delete view"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              onClick={saveCurrentView}
              disabled={views.length >= MAX_VIEWS}
              data-testid="view-save-btn"
              className="w-full mt-2 px-3 py-2 min-h-[44px] text-sm text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-40"
            >
              Save current view
            </button>
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
                createCounter(newCounterName.trim(), newCounterMax);
              }
            }}
          />
          {/* M4a: die Obergrenze gehoert in denselben Dialog - ein eigener Weg
              "Max nachtragen" waere ein zweiter Knopf fuer ein Feld. Leer heisst
              keine Obergrenze, und erzwungen wird sie nie. */}
          <input
            type="number"
            value={newCounterMax}
            onChange={(e) => setNewCounterMax(e.target.value)}
            placeholder="Maximum (optional, e.g. 3)"
            data-testid="counter-max-input"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCounterName.trim()) {
                createCounter(newCounterName.trim(), newCounterMax);
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
              onClick={() => createCounter(newCounterName.trim(), newCounterMax)}
              disabled={!newCounterName.trim()}
              data-testid="counter-create-btn"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      </SwipeModal>

      {/* Dice Modal — Standard, Hit Dice, Custom (unified) */}
      <SwipeModal isOpen={showDiceModal} onDismiss={dismissDiceModal} testId="dice-modal-swipe">
        <div className="bg-slate-800 rounded-xl p-5 sm:w-96 w-full sm:max-w-none max-w-sm shadow-2xl border border-slate-600" data-testid="dice-modal">
          <h3 className="text-white font-semibold mb-4">Add Dice</h3>

          {/* Standard Dice */}
          <div className="mb-4">
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Standard</label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {['d6', 'd8', 'd10', 'd12', 'd20'].map(type => (
                <button
                  key={type}
                  onClick={() => setNewDiceType(type)}
                  data-testid={`dice-type-${type}`}
                  className={`px-2 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${
                    newDiceType === type ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => createDie(newDiceType)}
              data-testid="dice-create-btn"
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
            >
              Place {newDiceType}
            </button>
          </div>

          <div className="border-t border-slate-600 pt-4 mb-4">
            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Hit Dice</label>
            <p className="text-slate-500 text-xs mb-2">More hits = stronger die.</p>
            <div className="flex flex-col gap-1.5">
              {[
                { type: 'yellow', label: 'Yellow — 1 Hit', bg: '#ca8a04', border: '#fbbf24', desc: '4× Miss, 1× Hit, 1× Crit' },
                { type: 'green',  label: 'Green — 2 Hits',  bg: '#166534', border: '#4ade80', desc: '3× Miss, 2× Hit, 1× Crit' },
                { type: 'blue',   label: 'Blue — 3 Hits',   bg: '#1d4ed8', border: '#60a5fa', desc: '2× Miss, 3× Hit, 1× Crit' },
                { type: 'purple', label: 'Purple — 4 Hits', bg: '#581c87', border: '#c084fc', desc: '1× Miss, 4× Hit, 1× Crit' },
                { type: 'red',    label: 'Red — 5 Hits',    bg: '#991b1b', border: '#f87171', desc: '5× Hit, 1× Crit (no miss)' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => createHitDie(opt.type)}
                  data-testid={`hit-die-${opt.type}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border-2 text-left transition-all hover:scale-[1.01]"
                  style={{ background: opt.bg + 'cc', borderColor: opt.border }}
                >
                  <span className="text-xl font-bold text-white">⊕</span>
                  <div>
                    <div className="text-white text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px]" style={{ color: opt.border }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {customDiceLibrary.length > 0 && (
            <div className="border-t border-slate-600 pt-4 mb-4">
              <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">Custom Dice</label>
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
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={dismissDiceModal} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">
              Close
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
                setNotes(prev => [...prev, {
                  id: crypto.randomUUID(),
                  text: newNoteText.trim(),
                  // M10.5/J5, siehe createDie.
                  ...spawnSlot(viewCenter(), notes),
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
                      // M3c: dieselbe Fabrik wie der Schritt `place_asset` -
                      // sonst fehlen assetId, beide Bildseiten und das
                      // Seitenverhältnis, und das Brett taugt nicht als Anker.
                      // Immer aufgedeckt: der Dialog hat keine Seitenwahl.
                      // M10.5/J5: die Stelle kommt jetzt von dort, wo der
                      // Spieler hinsieht.
                      const spot = spawnSlot(viewCenter(), tokens);
                      const newToken = assetToken(token, spot.x, spot.y, false);
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

          {/* Shape Selection */}
          <div className="mb-4">
            {imageTokenLibrary.length === 0 && <label className="block text-slate-300 text-sm mb-2">Shape</label>}
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
            {editingSetupId
              ? 'Update the setup with the current table state. It keeps its name unless you change it here.'
              : 'Save the current table arrangement as a reusable game setup.'}
          </p>
          <input
            type="text"
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
            placeholder={editingSetupId ? 'Setup name' : 'Enter setup name...'}
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
                  {stackCards.map((card, index) => {
                    // This panel already draws the back of a face-down card -
                    // and then printed its name right underneath it.
                    const view = tableObjectView(card, 'Card');
                    const { w: browseW, h: browseH } = getCardDims(card);
                    return (
                    <div
                      key={card.tableId}
                      data-testid={`browse-card-${card.tableId}`}
                      className="flex flex-col items-center"
                    >
                      <div className="relative rounded-lg overflow-hidden border border-slate-600 hover:border-slate-400 transition-colors"
                        style={{
                          width: browseW,
                          height: browseH,
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
                          <img src={card.image_path} alt={view.caption} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-1">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <span className="sm:text-[9px] text-xs text-gray-500 text-center px-1">{view.name}</span>
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/70 text-white sm:text-[9px] text-xs px-1.5 py-0.5 rounded font-mono">
                          {index + 1}
                        </div>
                      </div>
                      <span
                        className={`text-xs mt-1 truncate w-full text-center ${view.hidden ? 'text-slate-500 italic' : 'text-slate-300'}`}
                        title={view.caption}
                      >
                        {view.caption}
                      </span>
                    </div>
                    );
                  })}
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

      {/* Setup Sequence Problems - stays until dismissed */}
      {setupIssues && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg bg-amber-600 text-white px-5 py-3 rounded-xl shadow-2xl"
          data-testid="setup-issues"
          data-ui-element="true"
        >
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div className="text-sm">
              <div className="font-medium mb-1">
                {setupIssues.length} action{setupIssues.length > 1 ? 's' : ''} did not work
              </div>
              <ul className="space-y-0.5 text-white/90">
                {setupIssues.map(e => (
                  <li key={e.index}>
                    #{e.index + 1} {e.type}{e.target ? ' "' + e.target + '"' : ''} &mdash; {e.status}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setSetupIssues(null)} className="ml-2 text-white/70 hover:text-white">&times;</button>
          </div>
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
              {/* M8.9 Regel 4: die Hilfe behauptet nichts, was nicht geht.
                  Gegen den Horcher oben geprueft, Zeile fuer Zeile:
                  - F/Q/E wirken auf `selectedCards`. Ein Stapel steht dort bei
                    einem gewoehnlichen Klick nicht (actualCardDragStart steigt
                    bei 2+ Karten vorher aus), also versprach "Flip card/stack"
                    etwas, das es nicht gibt - der Spieler hat genau daran
                    zwanzig Minuten verloren. Das Stapelstueck dazu heisst
                    "Flip Stack" und steht im Kontextmenue.
                  - 1-9 zieht auf die **Hand**. Wohin gezogen wird, war der
                    springende Punkt von M8.9 und stand nicht da.
                  - Escape (M2.10) und Shift+Click fehlten ganz.
                  - Aufdecken bekommt keine Taste: ohne Zielzone waere sie
                    geraten, und eine geratene Zone ist derselbe Fehler noch
                    einmal. Es steht im Kontextmenue, mit der Zone im Namen. */}
              {[
                ['F', 'Flip selected card(s)'],
                ['Q', 'Rotate selected card(s) 90\u00B0 counter-clockwise'],
                ['E', 'Rotate selected card(s) 90\u00B0 clockwise'],
                ['ALT', 'Preview card under cursor'],
                ['G', 'Group selected cards into stack'],
                ['1-9', 'Draw that many cards from the stack to your hand'],
                ['Ctrl+Click', 'Toggle a card in the selection'],
                ['Shift+Click', 'Add a card or stack to the selection'],
                ['Esc', 'Close the topmost menu or dialog'],
                ['?', 'Toggle this help overlay'],
                ['Scroll', 'Zoom in/out'],
                ['Drag empty table', 'Pan the table'],
                /* M10.7: die mittlere Taste pant seit jeher von jeder Stelle
                   aus – sie stand nur nicht hier, und der Spieler hat statt
                   dessen leere Flaechen gesucht. Der Knopf daneben ist der Weg
                   fuer Tastfeld und Trackpad, die keine mittlere Taste haben. */
                ['Middle-drag', 'Pan the table from anywhere, even over an object'],
                ['Pan button', 'Same without a middle mouse button (toolbar, works on touch)'],
                /* M10.9: der absichtliche Weg zurueck zum Stapeln, den M10.4
                   offengelassen hat – auf Maus und Finger derselbe. */
                ['Hold on drop', 'Hold a dragged card over another one until it lights up, then release: both become a stack'],
                /* M9.4: der Zug am Stapel verschiebt ihn - ohne Wartezeit und
                   ohne dass eine Karte hängenbleibt. Abheben steht daneben. */
                ['Drag a stack', 'Move the whole stack (take one card off via the context menu)'],
                ['Right-click', 'Context menu (flip, rotate, reveal, stack actions)'],
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
          ref={contextMenuRef}
          className="fixed z-50"
          style={{
            // Der Messdurchlauf setzt das Menue in die Ecke, nicht auf den
            // Klickpunkt: am rechten Rand bleiben sonst nur ein paar Pixel
            // Platz, der Browser bricht die Eintraege um, und gemessen wird
            // eine Breite, die das Menue danach gar nicht hat (gesehen: 189
            // statt 510). Der Layout-Effekt laeuft vor dem Paint, die Ecke
            // sieht also niemand.
            left: menuPlace ? menuPlace.left : 0,
            top: menuPlace ? menuPlace.top : 0,
            maxHeight: menuPlace && menuPlace.maxHeight !== null ? menuPlace.maxHeight : undefined,
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
                {/* M10.2 Abnahme 1: ein Griff zeigt die Karte lesbar. Das
                    Kontextmenue hatte dafuer keinen Eintrag - die Grossansicht
                    gab es nur ueber ALT (Desktop) und Langdruck/Doppeltipp
                    (Touch). Hier keine zweite Ansicht, sondern dieselbe. */}
                <button
                  onClick={() => {
                    setLongPressPreviewCard(contextMenu.cardTableId);
                    setContextMenu(null);
                  }}
                  data-testid="context-enlarge"
                  className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>Enlarge</span>
                  <span className="ml-auto text-xs text-slate-500">ALT</span>
                </button>
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

                {/* M10.9 Regel 4: der Weg steht im Menue. Auf Beruehrung oeffnet
                    es der Langdruck – das ist der Weg zum Stapeln ohne Tastatur
                    und ohne Zeitdruck. Nur sichtbar, wenn wirklich eine lose
                    Karte darunter liegt; sonst waere es ein Knopf, der nichts
                    tut (audit-dead-controls, das Muster dieses ganzen Kapitels). */}
                {cardBelow(contextMenu.cardTableId) && (
                  <button
                    onClick={() => {
                      const below = cardBelow(contextMenu.cardTableId);
                      if (below) stackCards([below, contextMenu.cardTableId], null);
                      setSelectedCards(new Set());
                      setContextMenu(null);
                    }}
                    data-testid="context-stack-with-below"
                    className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span>Stack with card below</span>
                    <span className="ml-auto text-xs text-slate-500">hold</span>
                  </button>
                )}

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
                    {/* M9.4 Abnahme 3: die oberste Karte abheben, seit der Zug
                        am Stapel den Stapel verschiebt. Es ist `performSplit`
                        mit Anzahl 1 - genau das, was "Split Stack" schon tut,
                        nur ohne Dialog und getippte Eins. Die Karte landet
                        verdeckt neben dem Stapel, also da, wo sie der alte Zug
                        auch hingelegt hat. */}
                    <button
                      onClick={() => {
                        performSplit(contextMenu.stackId, 1);
                        setContextMenu(null);
                      }}
                      data-testid="context-take-top"
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Take Top Card
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
                    {/* M8.9: die oberste Karte offen in eine Zone aufdecken -
                        ein Griff. Ein Eintrag je Zielzone, weil das Menue
                        ohnehin offen ist: die Wahl der Zone *ist* der Klick,
                        der sonst "Reveal" hiesse. Liegt ein Ablagestapel im
                        Setup (layout: "stack"), steht genau einer da. */}
                    {revealZones(zones).map(zone => (
                      <button
                        key={zone.label}
                        onClick={() => {
                          revealTopCardToZone(contextMenu.stackId, zone.label);
                          setContextMenu(null);
                        }}
                        data-testid={`context-reveal-${zone.label}`}
                        className="w-full px-4 py-2 text-left text-sm text-amber-300 hover:bg-slate-700 hover:text-amber-200 transition-colors"
                      >
                        Reveal Top Card to "{zone.label}"
                      </button>
                    ))}
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
                  onClick={() => { openDiceModal(); setContextMenu(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Add Dice
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
                  {OBJ_TYPE_LABELS[contextMenu.objType] || contextMenu.objType.charAt(0).toUpperCase() + contextMenu.objType.slice(1)}
                </div>
                <button
                  onClick={() => {
                    toggleLockObj(contextMenu.objType, contextMenu.objId);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {(() => {
                    const obj = (objLists[contextMenu.objType] || []).find(o => o.id === contextMenu.objId);
                    return obj?.locked ? '\u{1F513} Unlock' : '\u{1F512} Lock';
                  })()}
                </button>
                {contextMenu.objType === 'token' && (() => {
                  // Nur Bild-Token mit Rueckseite bekommen den Eintrag (Spec M3d):
                  // geometrische Token haben keine Seiten, und ein Knopf, der
                  // nichts tut, ist genau der Fehler aus docs/audit-dead-controls.md.
                  // Gesperrt heisst unbeweglich, nicht unumdrehbar - `locked` wird
                  // hier absichtlich nicht geprueft.
                  const tok = tokens.find(t => t.id === contextMenu.objId);
                  if (!tok || tok.shape !== 'image' || !tok.backImageUrl) return null;
                  return (
                    <button
                      onClick={() => {
                        const face = assetFace(tok, !tok.faceDown);
                        if (face) {
                          setTokens(prev => prev.map(t => (t.id === tok.id ? { ...t, ...face } : t)));
                          if (room) room.sendAction({ type: 'token_flip', token_id: tok.id, face_down: face.faceDown });
                        }
                        setContextMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      {'\u{1F504} Flip'}
                    </button>
                  );
                })()}
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
                    // M2.11: einziger Löschweg. Die Tabelle steht in
                    // utils/objectTypes.js und ist dort unter Test.
                    const { objType, objId } = contextMenu;
                    objDeleters[objType]?.(objId);
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

      {/* M10.12: Der Klickfaenger, der hier stand, ist weg. Geschlossen wird
          am `document` (siehe `closesMenu`) - eine Flaeche ueber dem Tisch
          nahm dem naechsten Rechtsklick und dem Langdruck ihr Ziel. */}

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
                  const baseW = isMobileLandscape ? 45 : (isMobile ? 60 : 80);
                  const baseH = isMobileLandscape ? 63 : (isMobile ? 84 : 112);
                  const { w: cardWidth, h: cardHeight } = getCardDims(card, baseW, baseH);
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
        const previewDims = getCardDims(card, 200, 280);
        return (
          <div className="fixed z-50 pointer-events-none" data-testid="hand-card-preview" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -70%)' }}>
            <div className="rounded-xl overflow-hidden border-2 border-yellow-400 shadow-2xl shadow-black/50" style={{
              width: previewDims.w,
              height: previewDims.h,
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
        const ghostDims = getCardDims(card);
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
        // The preview shows the back of a face-down card - and used to caption
        // it with the name, which undoes its own branching.
        const view = tableObjectView(previewCard, 'Card');
        // M10.2 Abnahme 1: lesbar heisst bildschirmfuellend. 280 x 392 waren
        // 280 % einer Tischkarte (100 x 140); gelesen werden konnte der
        // Fliesstext erst bei 450 bis 500 %. Das Seitenverhaeltnis kommt aus
        // derselben Quelle wie am Tisch (`getCardDims`), die Groesse aus dem
        // Fenster - nicht aus einer festen Zahl, die auf dem naechsten
        // Bildschirm wieder zu klein ist.
        const previewRatio = getCardDims(previewCard, 1000, 1400);
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
                style={{
                  aspectRatio: `${previewRatio.w} / ${previewRatio.h}`,
                  // 74vh und nicht 100: darunter stehen Name und Schliesshinweis.
                  height: '74vh',
                  maxHeight: '74vh',
                  maxWidth: '92vw',
                  backgroundColor: '#fff',
                }}
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
                  <img src={previewCard.image_path} alt={view.caption} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span className="text-sm text-gray-500 text-center px-4">{view.name}</span>
                  </div>
                )}
              </div>
              {/* M10.2 Regel 3: die Bildunterschrift steht UNTER dem Bild.
                  Ueber dem Bild verdeckte sie dessen unterste Zeile - genau
                  der Fehler, den das Namensschild am Tisch gemacht hat. */}
              <div className="text-center mt-3 text-white text-base font-medium px-4 truncate">
                {view.caption}
              </div>
              <div className="text-center mt-1">
                <span className="text-white/60 text-xs bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                  Click anywhere to close
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
              <ZoneOverlay zones={tableZones} myColor={room.myColor} />
            </div>
          )}
        </>
      )}

      {/* A grid is line art over a board that usually has one printed on it,
          so while playing only the grids that explicitly ask for it are drawn.
          In setup mode GridEditor draws them all, with their field names.
          Snapping never depends on this. */}
      {!setupMode && tableGrids.some(g => g.showInPlay) && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            transform: `scale(${zoomDisplay / 100}) translate(${panPosition.x}px, ${panPosition.y}px)`,
            transformOrigin: '50% 50%',
          }}
        >
          <GridOverlay grids={tableGrids.filter(g => g.showInPlay)} />
        </div>
      )}

      {/* Gemeinsamer Anker für die Werkzeugleisten des Setup-Modus. Raster- und
          Zonenleiste hängen sich hier per Portal hinein und stapeln sich im
          Fluss (Rasterleiste oben, Zonenleiste unten - die DOM-Reihenfolge
          ergibt sich aus der Mount-Reihenfolge weiter unten). Vorher stapelten
          sie über geratene Abstände (`bottom-28`/`bottom-40`), und sobald eine
          Leiste umbrach, verdeckte sie die andere. */}
      {setupMode && (
        <div
          id="setup-toolbar-stack"
          data-ui-element="true"
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
        />
      )}

      {/* Zone and grid editor overlays in setup mode */}
      {setupMode && (
        <GridEditor
          grids={tableGrids}
          anchors={anchors}
          onGridsChange={setGrids}
          camera={cameraRef.current}
        />
      )}
      {setupMode && (
        <ZoneEditor
          zones={tableZones}
          anchors={anchors}
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
          actions={setupActions}
          onActionsChange={setSetupActions}
          availableStackLabels={
            [...new Set(tableCards.filter(c => c.inStack).map(c => c.inStack))]
              .map(id => stackNames[id]).filter(Boolean)
          }
          availableZoneLabels={zones.map(z => z.label).filter(Boolean)}
          availablePools={assetPools(tableAssets)}
          availableAssetNames={assetNames(tableAssets)}
          availableGrids={grids}
          availableCardCategories={categories.map(c => c.name).filter(Boolean)}
          availableCards={availableCards}
          isOpen={showSequenceEditor}
          onToggle={() => setShowSequenceEditor(prev => !prev)}
        />
      )}

      {/* ALT key card zoom preview - desktop only (Feature #58) */}
      {altKeyHeld && hoveredTableCard && !isTouchCapableRef.current && (() => {
        const card = tableCards.find(c => c.tableId === hoveredTableCard);
        if (!card) return null;
        const view = tableObjectView(card, 'Card');
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
                <img src={card.image_path} alt={view.caption} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="text-sm text-gray-500 text-center px-4">{view.name}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-sm text-center py-1.5 px-2 truncate font-medium">
                {view.caption}
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
