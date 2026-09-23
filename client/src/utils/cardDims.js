// M2.12 – Karten behalten ihr Seitenverhältnis (docs/spec-setup-system.md).
//
// Tested from server/test/card-dims.test.js, weil der Client keine
// Testinfrastruktur hat.

export const CARD_WIDTH = 100;
export const CARD_HEIGHT = 140;

/**
 * Anzeigemaße einer Karte. Die Karte wird unter Beibehaltung ihres
 * Seitenverhältnisses in einen Bezugsrahmen eingepasst; der Rahmen richtet sich
 * nach der Ausrichtung – hochkant (oder quadratisch) `refW × refH`, quer
 * `refH × refW`. Eine Karte ohne brauchbare Maße bekommt den Rahmen unverändert.
 *
 * Ohne Rahmenangabe gilt der Tisch-Rahmen 100×140. Die Handkarten und ihre
 * Vorschau zeichnen kleiner bzw. größer und geben deshalb ihren eigenen an.
 */
export function getCardDims(card, refW = CARD_WIDTH, refH = CARD_HEIGHT) {
  const w = card && card.width;
  const h = card && card.height;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { w: refW, h: refH };
  }
  const boxW = w > h ? refH : refW;
  const boxH = w > h ? refW : refH;
  const scale = Math.min(boxW / w, boxH / h);
  // Auf ganze Pixel gerundet, mindestens 1 – sonst verschwindet ein extremes
  // Seitenverhältnis ganz.
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}
