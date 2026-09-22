import React from 'react';

/**
 * Draws a zone's outline: rectangle, circle or hexagon, inscribed in the
 * zone's bounding box (x/y/width/height).
 *
 * An SVG rather than CSS because a clip-path clips the border away with the
 * corners, and a zone whose drawn edge is not the edge the drop test uses is
 * worse than no shapes at all. The vertices below are the same hexagon
 * zoneContains() tests for.
 *
 * Positioning is the caller's job – this fills its parent.
 */
export default function ZoneShape({ shape = 'rect', width, height, hex = '#94a3b8', fill = '0C', dashed = false }) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const skin = {
    fill: `${hex}${fill}`,
    stroke: hex,
    strokeWidth: 2,
    strokeDasharray: dashed ? '6 4' : undefined,
  };

  let figure;
  if (shape === 'circle') {
    figure = <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} {...skin} />;
  } else if (shape === 'hex' || shape === 'hex-pointy') {
    figure = <polygon points={`${w / 2},0 ${w},${h / 4} ${w},${h * 0.75} ${w / 2},${h} 0,${h * 0.75} 0,${h / 4}`} {...skin} />;
  } else if (shape === 'hex-flat') {
    figure = <polygon points={`0,${h / 2} ${w / 4},0 ${w * 0.75},0 ${w},${h / 2} ${w * 0.75},${h} ${w / 4},${h}`} {...skin} />;
  } else {
    figure = <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} {...skin} />;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {figure}
    </svg>
  );
}
