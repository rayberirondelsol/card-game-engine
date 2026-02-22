import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- State machine states ---
const S = {
  ORIENTATION_HINT: 'orientation-hint',
  MODE_SELECT: 'mode-select',
  BACK_MODE_SELECT: 'back-mode-select',
  SCAN_SHARED_BACK: 'scan-shared-back',
  SCAN_FRONT: 'scan-front',
  FLIP_HINT: 'flip-hint',
  SCAN_BACK_INDIVIDUAL: 'scan-back-individual',
  IMPORTING: 'importing',
  DONE: 'done',
};

const STABLE_FRAMES_NEEDED = 28; // ~1 second at ~30 fps
const CARD_ASPECT_RATIO = 63 / 88; // ~0.716 portrait (standard card)

/**
 * Sample the average brightness of a rectangular region in the image data.
 */
function getRegionBrightness(imageData, x, y, w, h) {
  const data = imageData.data;
  const imgW = imageData.width;
  let sum = 0;
  let count = 0;
  const x1 = Math.max(0, Math.round(x));
  const y1 = Math.max(0, Math.round(y));
  const x2 = Math.min(imgW - 1, Math.round(x + w));
  const y2 = Math.min(imageData.height - 1, Math.round(y + h));
  for (let py = y1; py < y2; py += 2) {
    for (let px = x1; px < x2; px += 2) {
      const i = (py * imgW + px) * 4;
      sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Compute variance of brightness samples inside the guide box.
 */
function getRegionVariance(imageData, x, y, w, h) {
  const data = imageData.data;
  const imgW = imageData.width;
  const samples = [];
  const x1 = Math.max(0, Math.round(x));
  const y1 = Math.max(0, Math.round(y));
  const x2 = Math.min(imgW - 1, Math.round(x + w));
  const y2 = Math.min(imageData.height - 1, Math.round(y + h));
  for (let py = y1; py < y2; py += 4) {
    for (let px = x1; px < x2; px += 4) {
      const i = (py * imgW + px) * 4;
      samples.push((data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000);
    }
  }
  if (samples.length === 0) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / samples.length;
  return variance;
}

/**
 * Detect if a card is placed within the guide rectangle AND fills it.
 * Strategy:
 * 1. Check contrast between guide interior and outer background.
 * 2. Check that each edge strip of the guide frame is covered by card
 *    (edge strip brightness differs from outer background → card reaches the frame border).
 * 3. Check interior variance is in a card-like range.
 */
function detectCard(ctx, videoW, videoH) {
  // Guide rectangle: portrait-oriented, centered
  const guideW = Math.floor(videoW * 0.60);
  const guideH = Math.floor(guideW / CARD_ASPECT_RATIO);
  const guideX = Math.floor((videoW - guideW) / 2);
  const guideY = Math.floor((videoH - guideH) / 2);

  const borderThickness = Math.max(6, Math.floor(videoW * 0.025));
  // Thin strip just inside each guide edge to check card covers the whole frame
  const edgeStrip = Math.max(5, Math.floor(videoW * 0.012));

  try {
    const full = ctx.getImageData(0, 0, videoW, videoH);

    // Interior brightness and variance (central 60% of guide to avoid edge effects)
    const innerX = guideX + guideW * 0.2;
    const innerY = guideY + guideH * 0.2;
    const innerW = guideW * 0.6;
    const innerH = guideH * 0.6;
    const innerBrightness = getRegionBrightness(full, innerX, innerY, innerW, innerH);
    const innerVariance = getRegionVariance(full, innerX, innerY, innerW, innerH);

    // Outer border zones (just outside the guide box on all four sides)
    const topOuterBrightness    = getRegionBrightness(full, guideX, guideY - borderThickness, guideW, borderThickness);
    const bottomOuterBrightness = getRegionBrightness(full, guideX, guideY + guideH, guideW, borderThickness);
    const leftOuterBrightness   = getRegionBrightness(full, guideX - borderThickness, guideY, borderThickness, guideH);
    const rightOuterBrightness  = getRegionBrightness(full, guideX + guideW, guideY, borderThickness, guideH);

    const avgOuterBrightness = (topOuterBrightness + bottomOuterBrightness + leftOuterBrightness + rightOuterBrightness) / 4;
    const edgeContrast = Math.abs(innerBrightness - avgOuterBrightness);

    // Edge strips *inside* the guide at each border — detect whether card fills the frame.
    // If the card doesn't reach the guide edge, these strips will look like the background.
    const margin = guideW * 0.08; // skip corners to avoid guide-border artifacts
    const topEdgeBrightness    = getRegionBrightness(full, guideX + margin, guideY,                           guideW - 2 * margin, edgeStrip);
    const bottomEdgeBrightness = getRegionBrightness(full, guideX + margin, guideY + guideH - edgeStrip,     guideW - 2 * margin, edgeStrip);
    const leftEdgeBrightness   = getRegionBrightness(full, guideX,                          guideY + margin, edgeStrip,           guideH - 2 * margin);
    const rightEdgeBrightness  = getRegionBrightness(full, guideX + guideW - edgeStrip,     guideY + margin, edgeStrip,           guideH - 2 * margin);

    // Each guide-edge strip should differ from the outer background (card covers the edge)
    const FILL_THRESHOLD = 14;
    const topFills    = Math.abs(topEdgeBrightness    - topOuterBrightness)    > FILL_THRESHOLD;
    const bottomFills = Math.abs(bottomEdgeBrightness - bottomOuterBrightness) > FILL_THRESHOLD;
    const leftFills   = Math.abs(leftEdgeBrightness   - leftOuterBrightness)   > FILL_THRESHOLD;
    const rightFills  = Math.abs(rightEdgeBrightness  - rightOuterBrightness)  > FILL_THRESHOLD;
    const cardFillsFrame = topFills && bottomFills && leftFills && rightFills;

    // Card detected if:
    // 1. Sufficient contrast between guide interior and outer background
    // 2. Interior variance indicates card content (not blank, not chaotic)
    // 3. Card fills all four edges of the guide frame
    const hasContrast = edgeContrast > 25;
    const hasContent  = innerVariance > 100 && innerVariance < 12000;

    return hasContrast && hasContent && cardFillsFrame;
  } catch {
    return false;
  }
}

/**
 * Capture a cropped image of the guide rectangle from the video.
 * Returns a base64 PNG data URL.
 */
function captureGuideArea(video) {
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;

  const guideW = Math.floor(videoW * 0.60);
  const guideH = Math.floor(guideW / CARD_ASPECT_RATIO);
  const guideX = Math.floor((videoW - guideW) / 2);
  const guideY = Math.floor((videoH - guideH) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = guideW;
  canvas.height = guideH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, guideX, guideY, guideW, guideH, 0, 0, guideW, guideH);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Convert base64 data URL to a File object for upload.
 */
function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

/**
 * Upload a captured card image to the server and return the created card.
 */
async function uploadCardImage(gameId, imageDataUrl, name, categoryId, cardBackId) {
  const file = dataUrlToFile(imageDataUrl, `${name}.jpg`);
  const formData = new FormData();
  formData.append('file', file);
  if (categoryId) formData.append('category_id', categoryId);
  if (cardBackId) formData.append('card_back_id', cardBackId);

  const res = await fetch(`/api/games/${gameId}/cards/upload?is_camera_scan=true`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

/**
 * Upload a card back image and return its ID.
 */
async function uploadCardBackImage(gameId, imageDataUrl) {
  const file = dataUrlToFile(imageDataUrl, 'card-back-scan.jpg');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/games/${gameId}/card-backs/upload?is_camera_scan=true`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Card back upload failed');
  return res.json();
}

// --------------------------------------------------------------------------
// CameraCardScanner component
// --------------------------------------------------------------------------

export default function CameraCardScanner({ gameId, categoryId, onClose, onCardsImported }) {
  const [phase, setPhase] = useState(S.ORIENTATION_HINT);
  const [scanMode, setScanMode] = useState(null);   // 'front-only' | 'front-back'
  const [backMode, setBackMode] = useState(null);   // 'shared' | 'individual'
  const [sharedBackId, setSharedBackId] = useState(null);
  const [currentFront, setCurrentFront] = useState(null); // data URL captured front
  const [scannedCount, setScannedCount] = useState(0);
  const [cardDetected, setCardDetected] = useState(false);
  const [stableCount, setStableCount] = useState(0);
  const [importError, setImportError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [importingStatus, setImportingStatus] = useState('');

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const detectionCanvasRef = useRef(null); // offscreen
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectionHistRef = useRef([]);
  const autoCaptureLockRef = useRef(false);

  // Phases that need the camera active
  const cameraPhases = [S.SCAN_SHARED_BACK, S.SCAN_FRONT, S.SCAN_BACK_INDIVIDUAL];
  const cameraActive = cameraPhases.includes(phase);

  // Start camera when entering a camera phase
  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      stopLoop();
    };
  }, [phase]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    autoCaptureLockRef.current = false;
    detectionHistRef.current = [];
    setCardDetected(false);
    setStableCount(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startLoop();
      }
    } catch (err) {
      setCameraError('Kamerazugriff verweigert. Bitte Kameraberechtigung im Browser erteilen.');
      console.error('[CameraCardScanner] Camera error:', err);
    }
  }

  function stopCamera() {
    stopLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function stopLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  // Draw guide overlay on the visible canvas
  function drawOverlay(detected, stable) {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const scaleX = canvas.width / vw;
    const scaleY = canvas.height / vh;

    const guideW = Math.floor(vw * 0.60);
    const guideH = Math.floor(guideW / CARD_ASPECT_RATIO);
    const guideX = Math.floor((vw - guideW) / 2);
    const guideY = Math.floor((vh - guideH) / 2);

    const sx = guideX * scaleX;
    const sy = guideY * scaleY;
    const sw = guideW * scaleX;
    const sh = guideH * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Darken areas outside the guide
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(sx, sy, sw, sh);

    // Guide border
    const progress = stable ? 1 : Math.min(1, detectionHistRef.current.filter(Boolean).length / STABLE_FRAMES_NEEDED);
    const r = Math.round(255 * (1 - progress));
    const g = Math.round(255 * progress);
    ctx.strokeStyle = `rgb(${r},${g},50)`;
    ctx.lineWidth = detected ? 4 : 2.5;
    ctx.strokeRect(sx, sy, sw, sh);

    // Corner markers
    const cornerLen = Math.min(sw, sh) * 0.12;
    ctx.strokeStyle = detected ? `rgb(${r},${g},50)` : 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    const corners = [
      [sx, sy, 1, 1],
      [sx + sw, sy, -1, 1],
      [sx, sy + sh, 1, -1],
      [sx + sw, sy + sh, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * cornerLen, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * cornerLen);
      ctx.stroke();
    }

    // Progress arc in the center when card is detected
    if (detected && progress < 1) {
      const cx2 = sx + sw / 2;
      const cy2 = sy + sh / 2;
      const radius = Math.min(sw, sh) * 0.12;
      ctx.strokeStyle = `rgb(${r},${g},50)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx2, cy2, radius, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
      ctx.stroke();
    }
  }

  function startLoop() {
    function loop() {
      const video = videoRef.current;
      const detCanvas = detectionCanvasRef.current;
      if (!video || !detCanvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (detCanvas.width !== vw) detCanvas.width = vw;
      if (detCanvas.height !== vh) detCanvas.height = vh;

      const ctx = detCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const detected = detectCard(ctx, vw, vh);

      detectionHistRef.current.push(detected);
      if (detectionHistRef.current.length > STABLE_FRAMES_NEEDED) {
        detectionHistRef.current.shift();
      }

      const stableAll = detectionHistRef.current.length === STABLE_FRAMES_NEEDED &&
        detectionHistRef.current.every(Boolean);

      setCardDetected(detected);
      setStableCount(detectionHistRef.current.filter(Boolean).length);

      drawOverlay(detected, stableAll);

      if (stableAll && !autoCaptureLockRef.current) {
        autoCaptureLockRef.current = true;
        handleAutoCapture(video);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  async function handleAutoCapture(video) {
    stopLoop();
    const imageDataUrl = captureGuideArea(video);
    stopCamera();

    if (phase === S.SCAN_SHARED_BACK) {
      // Upload as card back
      try {
        setPhase(S.IMPORTING);
        setImportingStatus('Rückseite wird importiert...');
        const cardBack = await uploadCardBackImage(gameId, imageDataUrl);
        setSharedBackId(cardBack.id);
        setPhase(S.SCAN_FRONT);
      } catch (err) {
        setImportError('Rückseiten-Import fehlgeschlagen: ' + err.message);
        setPhase(S.SCAN_SHARED_BACK);
        autoCaptureLockRef.current = false;
        startCamera();
      }
    } else if (phase === S.SCAN_FRONT) {
      setCurrentFront(imageDataUrl);
      if (scanMode === 'front-only') {
        // Upload immediately
        await importFrontCard(imageDataUrl, null);
      } else if (backMode === 'individual') {
        setPhase(S.FLIP_HINT);
      } else {
        // shared back mode — upload with shared back
        await importFrontCard(imageDataUrl, sharedBackId);
      }
    } else if (phase === S.SCAN_BACK_INDIVIDUAL) {
      // Upload front+back pair
      await importFrontAndBack(currentFront, imageDataUrl);
    }
  }

  async function importFrontCard(frontDataUrl, cardBackId) {
    try {
      setPhase(S.IMPORTING);
      setImportingStatus('Karte wird importiert...');
      const count = scannedCount + 1;
      await uploadCardImage(gameId, frontDataUrl, `Scanned Card ${count}`, categoryId, cardBackId);
      setScannedCount(count);
      setImportError(null);
      // Continue scanning next front
      setCurrentFront(null);
      setPhase(S.SCAN_FRONT);
    } catch (err) {
      setImportError('Import fehlgeschlagen: ' + err.message);
      setPhase(S.SCAN_FRONT);
      autoCaptureLockRef.current = false;
      startCamera();
    }
  }

  async function importFrontAndBack(frontDataUrl, backDataUrl) {
    try {
      setPhase(S.IMPORTING);
      setImportingStatus('Karte (Vorder- und Rückseite) wird importiert...');
      // Upload back first to get its ID
      const cardBack = await uploadCardBackImage(gameId, backDataUrl);
      const count = scannedCount + 1;
      await uploadCardImage(gameId, frontDataUrl, `Scanned Card ${count}`, categoryId, cardBack.id);
      setScannedCount(count);
      setImportError(null);
      setCurrentFront(null);
      // Next card front
      setPhase(S.SCAN_FRONT);
    } catch (err) {
      setImportError('Import fehlgeschlagen: ' + err.message);
      setPhase(S.SCAN_BACK_INDIVIDUAL);
      autoCaptureLockRef.current = false;
      startCamera();
    }
  }

  function handleFinish() {
    stopCamera();
    onCardsImported(scannedCount);
    onClose();
  }

  function handleClose() {
    stopCamera();
    if (scannedCount > 0) {
      onCardsImported(scannedCount);
    }
    onClose();
  }

  // Compute instruction text for active scan phases
  function getScanInstruction() {
    switch (phase) {
      case S.SCAN_SHARED_BACK:
        return 'Rückseite der Karte in den Rahmen legen';
      case S.SCAN_FRONT:
        return scannedCount > 0
          ? `Karte ${scannedCount + 1}: Vorderseite in den Rahmen legen`
          : 'Vorderseite der ersten Karte in den Rahmen legen';
      case S.SCAN_BACK_INDIVIDUAL:
        return 'Karte umdrehen – Rückseite in den Rahmen legen';
      default:
        return '';
    }
  }

  // ---- Render ----

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col bg-black">

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white text-xl leading-none hover:bg-black/80"
          aria-label="Schließen"
        >
          &times;
        </button>

        {/* === ORIENTATION HINT === */}
        {phase === S.ORIENTATION_HINT && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-6">
            <div className="text-6xl">📱</div>
            <h2 className="text-2xl font-bold">Karten scannen</h2>
            <div className="bg-white/10 rounded-2xl p-5 text-sm leading-relaxed space-y-3">
              <p className="font-semibold text-base">Hinweis: Bitte Gerät hochkant halten</p>
              <p className="text-white/80">
                Halte dein Smartphone immer im <strong>Hochformat</strong>, damit die Karten korrekt erkannt werden können.
              </p>
              <div className="flex justify-center py-2">
                {/* Portrait phone icon */}
                <div className="border-4 border-white/70 rounded-xl w-12 h-20 flex items-center justify-center">
                  <div className="border-2 border-white/50 rounded w-6 h-9" />
                </div>
              </div>
            </div>
            <button
              onClick={() => setPhase(S.MODE_SELECT)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-colors"
            >
              Weiter
            </button>
          </div>
        )}

        {/* === MODE SELECT === */}
        {phase === S.MODE_SELECT && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-6">
            <h2 className="text-xl font-bold">Was möchtest du scannen?</h2>
            <div className="w-full space-y-3">
              <button
                onClick={() => { setScanMode('front-only'); setPhase(S.SCAN_FRONT); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20"
              >
                <div className="font-semibold text-base">Nur Vorderseiten</div>
                <div className="text-sm text-white/60 mt-1">Scanne nur die Kartenfront, keine Rückseiten</div>
              </button>
              <button
                onClick={() => { setScanMode('front-back'); setPhase(S.BACK_MODE_SELECT); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20"
              >
                <div className="font-semibold text-base">Vorder- und Rückseiten</div>
                <div className="text-sm text-white/60 mt-1">Scanne sowohl Front als auch Rückseite jeder Karte</div>
              </button>
            </div>
          </div>
        )}

        {/* === BACK MODE SELECT === */}
        {phase === S.BACK_MODE_SELECT && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-6">
            <h2 className="text-xl font-bold">Haben alle Karten die gleiche Rückseite?</h2>
            <div className="w-full space-y-3">
              <button
                onClick={() => { setBackMode('shared'); setPhase(S.SCAN_SHARED_BACK); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20"
              >
                <div className="font-semibold text-base">Ja – alle gleiche Rückseite</div>
                <div className="text-sm text-white/60 mt-1">
                  Rückseite einmal scannen, dann nur noch Vorderseiten
                </div>
              </button>
              <button
                onClick={() => { setBackMode('individual'); setPhase(S.SCAN_FRONT); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20"
              >
                <div className="font-semibold text-base">Nein – individuelle Rückseiten</div>
                <div className="text-sm text-white/60 mt-1">
                  Nach jeder Vorderseite wirst du gebeten, die Karte umzudrehen
                </div>
              </button>
            </div>
            <button onClick={() => setPhase(S.MODE_SELECT)} className="text-sm text-white/50 hover:text-white/80">
              Zurück
            </button>
          </div>
        )}

        {/* === FLIP HINT === */}
        {phase === S.FLIP_HINT && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-6">
            <div className="text-6xl">🔄</div>
            <h2 className="text-xl font-bold">Karte umdrehen</h2>
            <p className="text-white/70 text-base leading-relaxed">
              Vorderseite erfasst! Bitte drehe die Karte jetzt um und halte die <strong>Rückseite</strong> in die Kamera.
            </p>
            <button
              onClick={() => setPhase(S.SCAN_BACK_INDIVIDUAL)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-colors"
            >
              Rückseite scannen
            </button>
          </div>
        )}

        {/* === IMPORTING === */}
        {phase === S.IMPORTING && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-4">
            <svg className="animate-spin w-10 h-10 text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-base text-white/80">{importingStatus}</p>
          </div>
        )}

        {/* === CAMERA VIEW (scan phases) === */}
        {cameraActive && (
          <div className="flex-1 relative overflow-hidden">
            {/* Video element */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Overlay canvas for guide box */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: 'none' }}
            />

            {/* Instruction bar at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-6">
              <p className="text-white text-center text-sm font-medium leading-snug">
                {getScanInstruction()}
              </p>
              {cardDetected && (
                <p className="text-green-400 text-center text-xs mt-1 font-semibold">
                  Karte erkannt – bitte ruhig halten…
                </p>
              )}
              {!cardDetected && (
                <p className="text-white/50 text-center text-xs mt-1">
                  Karte vollständig in den Rahmen legen – Karte muss den Rahmen ganz ausfüllen
                </p>
              )}
              {importError && (
                <p className="text-red-400 text-center text-xs mt-2">{importError}</p>
              )}
              {scannedCount > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-white/60 text-xs">{scannedCount} Karte{scannedCount !== 1 ? 'n' : ''} importiert</span>
                  <button
                    onClick={handleFinish}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Fertig
                  </button>
                </div>
              )}
            </div>

            {/* Portrait orientation reminder (small icon) */}
            <div className="absolute top-4 left-4 text-white/50 text-xs flex items-center gap-1">
              <span>📱</span>
              <span>Hochformat</span>
            </div>

            {/* Camera error overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-6 text-center gap-4">
                <div className="text-4xl">📵</div>
                <p className="text-white text-sm">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Erneut versuchen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hidden offscreen canvas for detection */}
        <canvas ref={detectionCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
