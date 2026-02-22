import React, { useState, useEffect, useRef } from 'react';

// --- State machine states ---
const S = {
  ORIENTATION_HINT: 'orientation-hint',
  MODE_SELECT: 'mode-select',
  BACK_MODE_SELECT: 'back-mode-select',
  SCAN_SHARED_BACK: 'scan-shared-back',
  SCAN_FRONT: 'scan-front',
  FLIP_HINT: 'flip-hint',
  SCAN_BACK_INDIVIDUAL: 'scan-back-individual',
  CONFIRM_CORNERS: 'confirm-corners',
  IMPORTING: 'importing',
  DONE: 'done',
};

const STABLE_FRAMES_NEEDED = 28; // ~1 second at ~30 fps
const DET_SCALE = 0.25;          // run edge detection at 1/4 resolution for performance
const BLUR_THRESHOLD = 50;        // Laplacian variance below this = blurry
const CORNER_STABLE_PIXELS = 10;  // max movement (video px) between frames to count as stable

// ---------------------------------------------------------------------------
// F1 – Automatic card edge detection (Sobel + extreme-point quad detection)
// ---------------------------------------------------------------------------

function detectCardCorners(ctx, w, h) {
  let imageData;
  try { imageData = ctx.getImageData(0, 0, w, h); } catch { return null; }
  const data = imageData.data;

  // Grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
  }

  // Sobel magnitude
  const edge = new Float32Array(w * h);
  let edgeSum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y - 1) * w + (x - 1)], tm = gray[(y - 1) * w + x], tr2 = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)],                                     mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)], bm = gray[(y + 1) * w + x], br = gray[(y + 1) * w + (x + 1)];
      const gx = -tl - 2 * ml - bl + tr2 + 2 * mr + br;
      const gy = -tl - 2 * tm - tr2 + bl + 2 * bm + br;
      const mag = Math.sqrt(gx * gx + gy * gy);
      edge[y * w + x] = mag;
      edgeSum += mag;
    }
  }

  const threshold = (edgeSum / (w * h)) * 2.0;

  // Find 4 extreme edge points:
  //   TL = min(x+y),  TR = max(x-y),  BR = max(x+y),  BL = min(x-y)
  let tlScore = Infinity, trScore = -Infinity, brScore = -Infinity, blScore = Infinity;
  let tl = null, tr = null, br = null, bl = null;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edge[y * w + x] > threshold) {
        const s = x + y, d = x - y;
        if (s < tlScore) { tlScore = s; tl = { x, y }; }
        if (d > trScore) { trScore = d; tr = { x, y }; }
        if (s > brScore) { brScore = s; br = { x, y }; }
        if (d < blScore) { blScore = d; bl = { x, y }; }
      }
    }
  }
  if (!tl || !tr || !br || !bl) return null;

  // Validate area > 15 % of frame
  const pts = [tl, tr, br, bl];
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  if (Math.abs(area) / 2 < w * h * 0.15) return null;

  // Validate all 4 corners are distinct
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < w * 0.05) return null;
    }
  }

  return { tl, tr, br, bl };
}

function cornersMaxDistance(a, b) {
  let max = 0;
  for (const k of ['tl', 'tr', 'br', 'bl']) {
    const dx = a[k].x - b[k].x, dy = a[k].y - b[k].y;
    max = Math.max(max, Math.sqrt(dx * dx + dy * dy));
  }
  return max;
}

function scaleCornersUp(corners, scale) {
  const f = (p) => ({ x: p.x / scale, y: p.y / scale });
  return { tl: f(corners.tl), tr: f(corners.tr), br: f(corners.br), bl: f(corners.bl) };
}

// ---------------------------------------------------------------------------
// F3 – Perspective correction (bilinear quad→rect warp)
// ---------------------------------------------------------------------------

function captureToCanvas(video) {
  const c = document.createElement('canvas');
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  return c;
}

function warpCanvas(srcCanvas, corners) {
  const { tl, tr, br, bl } = corners;
  const topW    = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH   = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH  = Math.hypot(br.x - tr.x, br.y - tr.y);

  const outW = Math.max(1, Math.round((topW + bottomW) / 2));
  const outH = Math.max(1, Math.round((leftH + rightH) / 2));

  const srcCtx  = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const sw = srcCanvas.width, sh = srcCanvas.height;

  const dst    = document.createElement('canvas');
  dst.width = outW; dst.height = outH;
  const dstCtx  = dst.getContext('2d');
  const dstData = dstCtx.createImageData(outW, outH);

  for (let v = 0; v < outH; v++) {
    const t = v / outH;
    for (let u = 0; u < outW; u++) {
      const s = u / outW;
      // Bilinear inverse mapping: (s,t) → source pixel
      const sx = tl.x * (1 - s) * (1 - t) + tr.x * s * (1 - t) + br.x * s * t + bl.x * (1 - s) * t;
      const sy = tl.y * (1 - s) * (1 - t) + tr.y * s * (1 - t) + br.y * s * t + bl.y * (1 - s) * t;
      const px = Math.round(sx), py = Math.round(sy);
      if (px >= 0 && px < sw && py >= 0 && py < sh) {
        const si = (py * sw + px) * 4, di = (v * outW + u) * 4;
        dstData.data[di]     = srcData.data[si];
        dstData.data[di + 1] = srcData.data[si + 1];
        dstData.data[di + 2] = srcData.data[si + 2];
        dstData.data[di + 3] = 255;
      }
    }
  }
  dstCtx.putImageData(dstData, 0, 0);
  return dst;
}

function captureCenterCrop(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const cw = Math.round(w * 0.65), ch = Math.round(h * 0.82);
  const cx = Math.round((w - cw) / 2), cy = Math.round((h - ch) / 2);
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return out;
}

// ---------------------------------------------------------------------------
// F5 – Blur detection (Laplacian variance)
// ---------------------------------------------------------------------------

function computeBlurScore(canvas) {
  const w = canvas.width, h = canvas.height;
  if (w < 3 || h < 3) return 999;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
  }
  let sum = 0, count = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const lap = gray[(y - 1) * w + x] + gray[(y + 1) * w + x]
                + gray[y * w + (x - 1)] + gray[y * w + (x + 1)]
                - 4 * gray[y * w + x];
      sum += lap * lap; count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ---------------------------------------------------------------------------
// Upload helpers (unchanged)
// ---------------------------------------------------------------------------

function dataUrlToFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: mime });
}

async function uploadCardImage(gameId, imageDataUrl, name, categoryId, cardBackId) {
  const fd = new FormData();
  fd.append('file', dataUrlToFile(imageDataUrl, `${name}.jpg`));
  if (categoryId) fd.append('category_id', categoryId);
  if (cardBackId)  fd.append('card_back_id', cardBackId);
  const res = await fetch(`/api/games/${gameId}/cards/upload?is_camera_scan=true`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

async function uploadCardBackImage(gameId, imageDataUrl) {
  const fd = new FormData();
  fd.append('file', dataUrlToFile(imageDataUrl, 'card-back-scan.jpg'));
  const res = await fetch(`/api/games/${gameId}/card-backs/upload?is_camera_scan=true`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Card back upload failed');
  return res.json();
}

// ---------------------------------------------------------------------------
// CameraCardScanner component
// ---------------------------------------------------------------------------

export default function CameraCardScanner({ gameId, categoryId, onClose, onCardsImported }) {
  const [phase, setPhase]               = useState(S.ORIENTATION_HINT);
  const [scanMode, setScanMode]         = useState(null);   // 'front-only' | 'front-back'
  const [backMode, setBackMode]         = useState(null);   // 'shared' | 'individual'
  const [sharedBackId, setSharedBackId] = useState(null);
  const [currentFront, setCurrentFront] = useState(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [cardDetected, setCardDetected] = useState(false);
  const [importError, setImportError]   = useState(null);
  const [cameraError, setCameraError]   = useState(null);
  const [importingStatus, setImportingStatus] = useState('');

  // F1/F2 – corner detection state
  const [detectedCorners, setDetectedCorners] = useState(null);

  // F4 – manual corner editing state
  const [pendingCorners, setPendingCorners] = useState(null);
  const [frozenFrame, setFrozenFrame]       = useState(null); // { url, width, height }

  // F5 – blur warning state
  const [blurWarning, setBlurWarning] = useState(false);

  const videoRef           = useRef(null);
  const overlayCanvasRef   = useRef(null);
  const detectionCanvasRef = useRef(null);
  const streamRef          = useRef(null);
  const rafRef             = useRef(null);
  const autoCaptureLockRef = useRef(false);
  const lastCornersRef     = useRef(null);
  const stableCounterRef   = useRef(0);
  const pendingCaptureRef  = useRef(null);   // { imageDataUrl, scanPhase } waiting for blur confirm
  const frozenPhaseRef     = useRef(null);   // which scan phase triggered CONFIRM_CORNERS
  const draggingCornerRef  = useRef(null);   // key of corner being dragged

  const cameraPhases  = [S.SCAN_SHARED_BACK, S.SCAN_FRONT, S.SCAN_BACK_INDIVIDUAL];
  const cameraActive  = cameraPhases.includes(phase);

  useEffect(() => {
    if (cameraActive) startCamera();
    return () => stopLoop();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopCamera(), []);

  // ---- Camera lifecycle ----

  async function startCamera() {
    setCameraError(null);
    autoCaptureLockRef.current  = false;
    lastCornersRef.current      = null;
    stableCounterRef.current    = 0;
    setCardDetected(false);
    setDetectedCorners(null);
    setBlurWarning(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startLoop();
      }
    } catch {
      setCameraError('Kamerazugriff verweigert. Bitte Kameraberechtigung im Browser erteilen.');
    }
  }

  function stopCamera() {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function stopLoop() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }

  // ---- F2 – Overlay drawing ----

  function drawOverlay(corners) {
    const canvas = overlayCanvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0) return;

    const vw = video.videoWidth, vh = video.videoHeight;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const scaleX = canvas.width / vw, scaleY = canvas.height / vh;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (corners) {
      const pts = ['tl', 'tr', 'br', 'bl'].map((k) => ({ x: corners[k].x * scaleX, y: corners[k].y * scaleY }));

      // Darken outside
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear inside quad
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // Color: yellow→green based on stability
      const progress = Math.min(1, stableCounterRef.current / STABLE_FRAMES_NEEDED);
      const r = Math.round(255 * (1 - progress));
      const g = Math.round(150 + 105 * progress);
      const color = `rgb(${r},${g},50)`;

      // Quad border
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath(); ctx.stroke();

      // Corner dots
      ctx.fillStyle = color;
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); ctx.fill(); });

      // Progress arc in center
      if (progress > 0 && progress < 1) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
        const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
        ctx.strokeStyle = color; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
        ctx.stroke();
      }
    } else {
      // F6 – No fixed aspect ratio: loose orientation hint covering ~80% of view
      const hintW = canvas.width  * 0.78;
      const hintH = canvas.height * 0.86;
      const hintX = (canvas.width  - hintW) / 2;
      const hintY = (canvas.height - hintH) / 2;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(hintX, hintY, hintW, hintH);

      ctx.strokeStyle = 'rgba(255,80,80,0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(hintX, hintY, hintW, hintH);
      ctx.setLineDash([]);

      // Corner markers
      const cl = Math.min(hintW, hintH) * 0.09;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
      [
        [hintX, hintY, 1, 1], [hintX + hintW, hintY, -1, 1],
        [hintX, hintY + hintH, 1, -1], [hintX + hintW, hintY + hintH, -1, -1],
      ].forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * cl, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * cl);
        ctx.stroke();
      });
    }
  }

  // ---- Detection loop ----

  function startLoop() {
    function loop() {
      const video    = videoRef.current;
      const detCanvas = detectionCanvasRef.current;
      if (!video || !detCanvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop); return;
      }
      const vw = video.videoWidth, vh = video.videoHeight;
      const dw = Math.round(vw * DET_SCALE), dh = Math.round(vh * DET_SCALE);
      if (detCanvas.width !== dw)  detCanvas.width  = dw;
      if (detCanvas.height !== dh) detCanvas.height = dh;

      const ctx = detCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0, dw, dh);
      const rawCorners = detectCardCorners(ctx, dw, dh);
      const corners    = rawCorners ? scaleCornersUp(rawCorners, DET_SCALE) : null;

      // Stability tracking
      if (corners && lastCornersRef.current) {
        const dist = cornersMaxDistance(corners, lastCornersRef.current);
        stableCounterRef.current = dist < CORNER_STABLE_PIXELS
          ? Math.min(stableCounterRef.current + 1, STABLE_FRAMES_NEEDED)
          : 0;
      } else {
        stableCounterRef.current = 0;
      }
      lastCornersRef.current = corners;

      setCardDetected(!!corners);
      setDetectedCorners(corners);
      drawOverlay(corners);

      const isStable = stableCounterRef.current >= STABLE_FRAMES_NEEDED;
      if (isStable && !autoCaptureLockRef.current) {
        autoCaptureLockRef.current = true;
        handleAutoCapture(video, corners);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  // ---- Capture & process ----

  async function handleAutoCapture(video, corners) {
    stopLoop();
    const srcCanvas    = captureToCanvas(video);
    const resultCanvas = corners ? warpCanvas(srcCanvas, corners) : captureCenterCrop(srcCanvas);
    const blurScore    = computeBlurScore(resultCanvas);
    const imageDataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
    stopCamera();

    if (blurScore < BLUR_THRESHOLD) {
      pendingCaptureRef.current = { imageDataUrl, scanPhase: phase };
      setBlurWarning(true);
      return;
    }
    await processCapture(imageDataUrl, phase);
  }

  // F4 – Manual freeze: user taps "Manuell"
  function handleManualFreeze() {
    const video = videoRef.current;
    if (!video) return;
    stopLoop();
    const srcCanvas = captureToCanvas(video);
    const url = srcCanvas.toDataURL('image/jpeg', 0.92);
    const vw = video.videoWidth, vh = video.videoHeight;
    stopCamera();
    frozenPhaseRef.current = phase;
    setFrozenFrame({ url, width: vw, height: vh });
    const last = lastCornersRef.current;
    setPendingCorners(last || {
      tl: { x: vw * 0.10, y: vh * 0.08 },
      tr: { x: vw * 0.90, y: vh * 0.08 },
      br: { x: vw * 0.90, y: vh * 0.92 },
      bl: { x: vw * 0.10, y: vh * 0.92 },
    });
    setPhase(S.CONFIRM_CORNERS);
  }

  // F4 – Confirm adjusted corners
  async function handleConfirmCorners() {
    if (!frozenFrame || !pendingCorners) return;
    const img = new Image();
    img.src = frozenFrame.url;
    await new Promise((res) => { img.onload = res; });
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.naturalWidth; srcCanvas.height = img.naturalHeight;
    srcCanvas.getContext('2d').drawImage(img, 0, 0);

    const resultCanvas = warpCanvas(srcCanvas, pendingCorners);
    const blurScore    = computeBlurScore(resultCanvas);
    const imageDataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
    const scanPhase    = frozenPhaseRef.current;

    if (blurScore < BLUR_THRESHOLD) {
      pendingCaptureRef.current = { imageDataUrl, scanPhase };
      setBlurWarning(true);
      return;
    }
    await processCapture(imageDataUrl, scanPhase);
  }

  async function processCapture(imageDataUrl, scanPhase) {
    if (scanPhase === S.SCAN_SHARED_BACK) {
      try {
        setPhase(S.IMPORTING); setImportingStatus('Rückseite wird importiert...');
        const cardBack = await uploadCardBackImage(gameId, imageDataUrl);
        setSharedBackId(cardBack.id);
        setPhase(S.SCAN_FRONT);
      } catch (err) {
        setImportError('Rückseiten-Import fehlgeschlagen: ' + err.message);
        setPhase(S.SCAN_SHARED_BACK);
        autoCaptureLockRef.current = false;
        startCamera();
      }
    } else if (scanPhase === S.SCAN_FRONT) {
      setCurrentFront(imageDataUrl);
      if (scanMode === 'front-only') {
        await importFrontCard(imageDataUrl, null);
      } else if (backMode === 'individual') {
        setPhase(S.FLIP_HINT);
      } else {
        await importFrontCard(imageDataUrl, sharedBackId);
      }
    } else if (scanPhase === S.SCAN_BACK_INDIVIDUAL) {
      await importFrontAndBack(currentFront, imageDataUrl);
    }
  }

  async function importFrontCard(frontDataUrl, cardBackId) {
    try {
      setPhase(S.IMPORTING); setImportingStatus('Karte wird importiert...');
      const count = scannedCount + 1;
      await uploadCardImage(gameId, frontDataUrl, `Scanned Card ${count}`, categoryId, cardBackId);
      setScannedCount(count);
      setImportError(null);
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
      setPhase(S.IMPORTING); setImportingStatus('Karte (Vorder- und Rückseite) wird importiert...');
      const cardBack = await uploadCardBackImage(gameId, backDataUrl);
      const count = scannedCount + 1;
      await uploadCardImage(gameId, frontDataUrl, `Scanned Card ${count}`, categoryId, cardBack.id);
      setScannedCount(count);
      setImportError(null);
      setCurrentFront(null);
      setPhase(S.SCAN_FRONT);
    } catch (err) {
      setImportError('Import fehlgeschlagen: ' + err.message);
      setPhase(S.SCAN_BACK_INDIVIDUAL);
      autoCaptureLockRef.current = false;
      startCamera();
    }
  }

  function handleFinish()  { stopCamera(); onCardsImported(scannedCount); onClose(); }
  function handleClose()   { stopCamera(); if (scannedCount > 0) onCardsImported(scannedCount); onClose(); }

  // F7 – Updated scan instructions
  function getScanInstruction() {
    switch (phase) {
      case S.SCAN_SHARED_BACK:      return 'Rückseite der Karte flach über eine einfarbige Unterlage halten';
      case S.SCAN_FRONT:            return scannedCount > 0
        ? `Karte ${scannedCount + 1}: Vorderseite über eine einfarbige Unterlage halten`
        : 'Erste Karte flach über eine einfarbige Unterlage halten';
      case S.SCAN_BACK_INDIVIDUAL:  return 'Karte umdrehen – Rückseite über eine einfarbige Unterlage halten';
      default:                      return '';
    }
  }

  // ---- F4 – Corner drag (SVG pointer events) ----

  function onSvgPointerDown(e, key) {
    e.preventDefault();
    draggingCornerRef.current = key;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSvgPointerMove(e) {
    if (!draggingCornerRef.current || !frozenFrame) return;
    e.preventDefault();
    const svg  = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const fw = frozenFrame.width, fh = frozenFrame.height;
    const scale = Math.min(rect.width / fw, rect.height / fh);
    const renderedW = fw * scale, renderedH = fh * scale;
    const offX = (rect.width - renderedW) / 2, offY = (rect.height - renderedH) / 2;
    const videoX = (e.clientX - rect.left - offX) / scale;
    const videoY = (e.clientY - rect.top  - offY) / scale;
    const key = draggingCornerRef.current;
    setPendingCorners((prev) => ({
      ...prev,
      [key]: { x: Math.max(0, Math.min(fw, videoX)), y: Math.max(0, Math.min(fh, videoY)) },
    }));
  }

  function onSvgPointerUp() { draggingCornerRef.current = null; }

  // ---- Render ----

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col bg-black">

        {/* Close */}
        <button onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white text-xl leading-none hover:bg-black/80"
          aria-label="Schließen">&times;</button>

        {/* === ORIENTATION HINT === */}
        {phase === S.ORIENTATION_HINT && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-6">
            <div className="text-6xl">📱</div>
            <h2 className="text-2xl font-bold">Karten scannen</h2>
            <div className="bg-white/10 rounded-2xl p-5 text-sm leading-relaxed space-y-3">
              <p className="font-semibold text-base">Gerät hochkant halten</p>
              <p className="text-white/80">
                Halte die Karte flach über eine <strong>einfarbige Unterlage</strong> — die App erkennt sie automatisch.
              </p>
              <p className="text-white/60 text-xs">
                Achte auf gute, gleichmäßige Beleuchtung ohne starke Schatten oder Reflexionen.
              </p>
              <div className="flex justify-center py-2">
                <div className="border-4 border-white/70 rounded-xl w-12 h-20 flex items-center justify-center">
                  <div className="border-2 border-white/50 rounded w-6 h-9" />
                </div>
              </div>
            </div>
            <button onClick={() => setPhase(S.MODE_SELECT)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-colors">
              Weiter
            </button>
          </div>
        )}

        {/* === MODE SELECT === */}
        {phase === S.MODE_SELECT && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-white text-center gap-6">
            <h2 className="text-xl font-bold">Was möchtest du scannen?</h2>
            <div className="w-full space-y-3">
              <button onClick={() => { setScanMode('front-only'); setPhase(S.SCAN_FRONT); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20">
                <div className="font-semibold text-base">Nur Vorderseiten</div>
                <div className="text-sm text-white/60 mt-1">Scanne nur die Kartenfront, keine Rückseiten</div>
              </button>
              <button onClick={() => { setScanMode('front-back'); setPhase(S.BACK_MODE_SELECT); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20">
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
              <button onClick={() => { setBackMode('shared'); setPhase(S.SCAN_SHARED_BACK); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20">
                <div className="font-semibold text-base">Ja – alle gleiche Rückseite</div>
                <div className="text-sm text-white/60 mt-1">Rückseite einmal scannen, dann nur noch Vorderseiten</div>
              </button>
              <button onClick={() => { setBackMode('individual'); setPhase(S.SCAN_FRONT); }}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-left px-5 transition-colors border border-white/20">
                <div className="font-semibold text-base">Nein – individuelle Rückseiten</div>
                <div className="text-sm text-white/60 mt-1">Nach jeder Vorderseite wirst du gebeten, die Karte umzudrehen</div>
              </button>
            </div>
            <button onClick={() => setPhase(S.MODE_SELECT)} className="text-sm text-white/50 hover:text-white/80">Zurück</button>
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
            <button onClick={() => setPhase(S.SCAN_BACK_INDIVIDUAL)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg transition-colors">
              Rückseite scannen
            </button>
          </div>
        )}

        {/* === F4 – CONFIRM CORNERS === */}
        {phase === S.CONFIRM_CORNERS && frozenFrame && (
          <div className="flex-1 flex flex-col bg-black">
            <div className="px-4 pt-12 pb-2 text-white text-center">
              <p className="text-sm font-medium">Ecken anpassen und dann aufnehmen</p>
              <p className="text-xs text-white/50 mt-1">Ziehe die blauen Punkte an die Ecken der Karte</p>
            </div>

            {/* SVG overlay for corner editing */}
            <div className="flex-1 relative">
              <img src={frozenFrame.url} alt="" className="w-full h-full object-contain" />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${frozenFrame.width} ${frozenFrame.height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ touchAction: 'none' }}
                onPointerMove={onSvgPointerMove}
                onPointerUp={onSvgPointerUp}
                onPointerLeave={onSvgPointerUp}
              >
                {pendingCorners && (
                  <>
                    <polygon
                      points={['tl','tr','br','bl'].map((k) => `${pendingCorners[k].x},${pendingCorners[k].y}`).join(' ')}
                      fill="none" stroke="rgba(59,130,246,0.7)" strokeWidth="6"
                    />
                    {['tl','tr','br','bl'].map((k) => (
                      <circle key={k}
                        cx={pendingCorners[k].x} cy={pendingCorners[k].y} r="28"
                        fill="rgba(59,130,246,0.85)" stroke="white" strokeWidth="5"
                        style={{ cursor: 'grab' }}
                        onPointerDown={(e) => onSvgPointerDown(e, k)}
                      />
                    ))}
                  </>
                )}
              </svg>
            </div>

            <div className="px-4 py-4 flex gap-3">
              <button
                onClick={() => {
                  setFrozenFrame(null); setPendingCorners(null);
                  setPhase(frozenPhaseRef.current || S.SCAN_FRONT);
                  // useEffect will call startCamera() when phase becomes cameraActive
                }}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors">
                Erneut scannen
              </button>
              <button onClick={handleConfirmCorners}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                Aufnehmen
              </button>
            </div>
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

        {/* === CAMERA VIEW === */}
        {cameraActive && (
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />

            {/* F5 – Blur warning overlay */}
            {blurWarning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 px-6 text-center gap-5 z-10">
                <div className="text-5xl">🌫️</div>
                <p className="text-white font-semibold text-base">Das Bild ist unscharf</p>
                <p className="text-white/60 text-sm">Halte die Karte ruhig und sorge für gute Beleuchtung.</p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => {
                      setBlurWarning(false);
                      pendingCaptureRef.current = null;
                      autoCaptureLockRef.current = false;
                      startCamera();
                    }}
                    className="flex-1 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors">
                    Erneut aufnehmen
                  </button>
                  <button
                    onClick={async () => {
                      const { imageDataUrl, scanPhase } = pendingCaptureRef.current;
                      setBlurWarning(false);
                      pendingCaptureRef.current = null;
                      await processCapture(imageDataUrl, scanPhase);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Trotzdem verwenden
                  </button>
                </div>
              </div>
            )}

            {/* Instruction bar */}
            {!blurWarning && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-6">
                <p className="text-white text-center text-sm font-medium leading-snug">{getScanInstruction()}</p>
                {cardDetected ? (
                  <p className="text-green-400 text-center text-xs mt-1 font-semibold">Karte erkannt – bitte ruhig halten…</p>
                ) : (
                  <p className="text-white/50 text-center text-xs mt-1">
                    Halte die Karte flach über eine einfarbige Unterlage — die App erkennt sie automatisch.
                  </p>
                )}
                {importError && <p className="text-red-400 text-center text-xs mt-2">{importError}</p>}
                <div className="flex items-center justify-between mt-3">
                  <button onClick={handleManualFreeze}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-xs rounded-lg transition-colors">
                    Manuell
                  </button>
                  {scannedCount > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 text-xs">{scannedCount} Karte{scannedCount !== 1 ? 'n' : ''} importiert</span>
                      <button onClick={handleFinish}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
                        Fertig
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Portrait reminder */}
            <div className="absolute top-4 left-4 text-white/50 text-xs flex items-center gap-1">
              <span>📱</span><span>Hochformat</span>
            </div>

            {/* Camera error overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-6 text-center gap-4">
                <div className="text-4xl">📵</div>
                <p className="text-white text-sm">{cameraError}</p>
                <button onClick={startCamera} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
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
