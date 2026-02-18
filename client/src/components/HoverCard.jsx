import { useState, useEffect } from 'react';

/**
 * HoverCard component displays an enlarged preview of a card when hovering
 * @param {Object} props
 * @param {Object} props.card - The card object to display
 * @param {string} props.imagePath - Path to the card image
 * @param {string} props.cardName - Name of the card
 * @param {boolean} props.faceDown - Whether the card is face down
 * @param {string} props.cardBackImageUrl - URL of the assigned card back image (if any)
 * @param {number} props.mouseX - Mouse X position for positioning the preview
 * @param {number} props.mouseY - Mouse Y position for positioning the preview
 * @param {number} props.scale - Scale factor for the preview (default: 2.5)
 */
export default function HoverCard({
  card,
  imagePath,
  cardName,
  faceDown = false,
  cardBackImageUrl = null,
  mouseX = 0,
  mouseY = 0,
  scale = 2.5
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Base card dimensions (matching GameTable.jsx)
  const CARD_WIDTH = 100;
  const CARD_HEIGHT = 140;

  // Scaled dimensions
  const scaledWidth = CARD_WIDTH * scale;
  const scaledHeight = CARD_HEIGHT * scale;

  useEffect(() => {
    // Small delay before showing to avoid flicker on quick mouse movements
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Calculate position to keep preview on screen
    const padding = 20;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let x = mouseX + 20; // Offset from cursor
    let y = mouseY + 20;

    // Keep preview within viewport bounds
    if (x + scaledWidth > windowWidth - padding) {
      x = mouseX - scaledWidth - 20; // Show on left side of cursor
    }
    if (y + scaledHeight > windowHeight - padding) {
      y = windowHeight - scaledHeight - padding;
    }
    if (x < padding) {
      x = padding;
    }
    if (y < padding) {
      y = padding;
    }

    setPosition({ x, y });
  }, [mouseX, mouseY, scaledWidth, scaledHeight]);

  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: position.x,
        top: position.y,
        width: scaledWidth,
        height: scaledHeight,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {/* Card preview with shadow */}
      <div
        className="relative w-full h-full rounded-lg overflow-hidden border-4 border-white/50 shadow-2xl"
        style={{
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))',
        }}
      >
        {/* Flip container */}
        <div
          style={{
            width: '100%',
            height: '100%',
            transition: 'transform 0.4s ease',
            transformStyle: 'preserve-3d',
            transform: faceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 bg-white"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            {imagePath ? (
              <img
                src={imagePath}
                alt={cardName}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={48 * scale / 2}
                  height={48 * scale / 2}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  className="mb-2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span className="text-gray-500 text-center font-medium" style={{ fontSize: `${12 * scale / 2}px` }}>
                  {cardName}
                </span>
              </div>
            )}
            {/* Card name label - scaled */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-1 px-2"
              style={{ fontSize: `${14 * scale / 2}px` }}
            >
              {cardName}
            </div>
          </div>

          {/* Back face - show card back image if assigned, otherwise blue gradient fallback */}
          <div
            className={`absolute inset-0 flex items-center justify-center ${!cardBackImageUrl ? 'bg-gradient-to-br from-blue-900 to-blue-700' : ''}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {cardBackImageUrl ? (
              <img
                src={cardBackImageUrl}
                alt="Card back"
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div
                className="rounded border-4 border-blue-400/30 flex items-center justify-center"
                style={{
                  width: scaledWidth * 0.6,
                  height: scaledHeight * 0.7,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={48 * scale / 2}
                  height={48 * scale / 2}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(147,197,253,0.5)"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
