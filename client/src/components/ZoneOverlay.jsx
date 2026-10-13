import React from 'react';
import ZoneShape from './ZoneShape';
import { zoneLabelAbove, zoneShownInPlay, ZONE_LABEL_GAP } from '../../../shared/zoneGeometry.js';

const COLOR_HEX = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  yellow: '#eab308',
  null:   '#94a3b8',
};

/**
 * Renders zone overlays in world space using absolute positioning.
 * Requires camera transform (translate + scale) to be applied by the parent.
 * Parent container must use: transform: `translate(${camX}px, ${camY}px) scale(${zoom})`
 */
export default function ZoneOverlay({ zones = [], myColor = null, all = zones }) {
  // A zone bound to the side of its anchor that is not showing is not there
  // (M10.13 rule 2), so it is not drawn either. Filtered here rather than at
  // the call site because ZoneEditor gets the same resolved zones and must
  // draw them all - you cannot correct a zone you cannot see.
  const shown = zones.filter(z => !z.facingAway);
  if (!shown.length) return null;

  return (
    <>
      {shown.map(zone => {
        const hex = COLOR_HEX[zone.color] || COLOR_HEX.null;
        const isMyZone = zone.color === myColor;
        // M16.1: das Schild sitzt **außerhalb** des Kastens, sonst liegt es auf
        // Platz 1. Wo es hängt, rechnet `zoneLabelAbove` aus `shared/` aus -
        // der Client hat keine Testinfrastruktur, eine Zahl hier wäre ungeprüft.
        const above = zoneLabelAbove(zone, all);
        // M16.3/AX1: beim Ziehen werden auch stillgelegte Zonen gezeichnet -
        // aber als **Rahmen**, nicht mit Namen. Zwölf Leistenschilder über drei
        // Tableaus waren der Grund für AS3 (ein unleserlicher grauer Fleck über
        // genau dem Aufdruck, den sie beschreiben), und beim Ziehen lägen sie
        // dort, wo man hinsieht.
        const labelled = zoneShownInPlay(zone);
        return (
          <div
            key={zone.id}
            className="absolute pointer-events-none"
            style={{
              left: zone.x,
              top: zone.y,
              width: zone.width,
              height: zone.height,
              boxSizing: 'border-box',
            }}
          >
            <ZoneShape shape={zone.shape} width={zone.width} height={zone.height} hex={hex} fill={isMyZone ? '18' : '0C'} />
            {labelled && (
            <div
              className="absolute left-2 whitespace-nowrap text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                [above ? 'bottom' : 'top']: '100%',
                [above ? 'marginBottom' : 'marginTop']: ZONE_LABEL_GAP,
                backgroundColor: zone.anchorMissing ? '#b45309CC' : `${hex}CC`,
                color: '#fff',
                fontSize: '11px',
              }}
              /* An anchored zone whose asset is missing sits at its last known
                 place. Saying so on the badge is the whole point: a zone that
                 quietly stopped covering what it names is noticed mid-game. */
              title={zone.anchorMissing ? 'Anchor asset is not on the table – last known position' : undefined}
            >
              {zone.label || (zone.type === 'shared' ? 'Shared' : zone.color)}
              {zone.anchorMissing ? ' ⚠' : ''}
            </div>
            )}
          </div>
        );
      })}
    </>
  );
}
