# Marker and Token Consolidation Plan

## Date: 2026-02-12

## Problem Statement
The codebase currently has both Markers and Tokens implementations that provide overlapping functionality. Since Tokens now support multiple shapes including circles, Markers are redundant and can be removed.

## Analysis

### Current Marker Implementation
- **Location**: `client/src/pages/GameTable.jsx`
- **Features**:
  - Circular colored widgets
  - 8 predefined color options
  - Optional label (max 3 characters)
  - Draggable positioning
  - Card attachment support (via `attachedTo` property)
  - Save/load persistence
  - Legend display (not currently implemented)

### Current Token Implementation
- **Location**: `client/src/pages/GameTable.jsx`
- **Features**:
  - Multi-shaped widgets (circle, square, triangle, star, hexagon, diamond)
  - Custom color selection
  - Optional label (max 2 characters)
  - Draggable positioning
  - Save/load persistence
  - Legend display (implemented)

### Redundancy Identified
Markers are essentially Tokens with:
- Fixed `shape='circle'`
- Same color, label, positioning, and drag functionality
- Markers support card attachment, which Tokens do not currently have

## Proposed Changes

### 1. Remove Marker-Specific Code
The following will be removed:

#### State Variables (lines ~294, 321, 326-327)
```javascript
const [markers, setMarkers] = useState([]);
const [showMarkerModal, setShowMarkerModal] = useState(false);
const [newMarkerColor, setNewMarkerColor] = useState('#ff0000');
const [newMarkerLabel, setNewMarkerLabel] = useState('');
```

#### Functions (line ~1097)
```javascript
function deleteMarker(markerId) { ... }
```

#### UI Components
- Marker modal (lines ~3032-3093)
- Marker toolbar button (lines ~2812-2823)
- Marker rendering widgets (lines ~2274-2318)

#### References in Other Code
- Canvas rendering comments mentioning markers
- Drag handling for marker type
- Save/load state for markers
- findNearestCardCorner snapping logic for markers

### 2. Enhance Token Implementation (If Needed)
- **Card Attachment**: Add `attachedTo` property support to Tokens if needed
- **Attachment Indicator**: Migrate the visual attachment indicator from Markers
- **Label Length**: Consider increasing token label max length from 2 to 3 characters for consistency

### 3. Migration Path for Existing Data
Add migration logic to convert saved Marker data to Token data:
```javascript
// In loadGameState function
if (state.markers && Array.isArray(state.markers)) {
  const migratedTokens = state.markers.map(m => ({
    id: m.id,
    shape: 'circle',
    color: m.color,
    label: m.label || '',
    x: m.x,
    y: m.y,
    attachedTo: m.attachedTo, // preserve if exists
  }));
  setTokens(prev => [...prev, ...migratedTokens]);
}
```

### 4. Files to Modify
1. **`client/src/pages/GameTable.jsx`** (primary changes)
   - Remove marker state and functions
   - Remove marker UI components
   - Update drag handlers
   - Update save/load logic to migrate markers → tokens
   - Add `attachedTo` support to tokens if needed
   - Update canvas rendering comments

2. **Test files** (if any marker-specific tests exist)
   - Update tests to use tokens instead of markers

## Benefits
1. **Reduced Code Duplication**: ~200+ lines of code removed
2. **Simplified Maintenance**: One implementation instead of two
3. **Consistent UX**: Users have one flexible tool instead of two similar tools
4. **Future Extensibility**: Tokens are more flexible for future shape additions

## Backward Compatibility
- Saved games with markers will automatically migrate to circle-shaped tokens
- No user data loss
- Visual appearance remains the same (circle tokens look identical to markers)

## Risks & Mitigation
1. **Risk**: Loss of card attachment functionality
   - **Mitigation**: Port `attachedTo` property and attachment logic to tokens

2. **Risk**: User confusion about missing Marker button
   - **Mitigation**: None needed - tokens with circle shape provide identical functionality

3. **Risk**: Test failures
   - **Mitigation**: Update test data-testids from `marker-*` to `token-*`

## Implementation Steps
1. ✅ Analyze current implementations
2. ✅ Document consolidation plan
3. ⏳ Add `attachedTo` support to Token implementation
4. ⏳ Add migration logic for existing marker data
5. ⏳ Remove all marker-specific code
6. ⏳ Update comments and documentation
7. ⏳ Test functionality (create, drag, attach, save/load)
8. ⏳ Commit changes to master branch
9. ⏳ Push to origin

## Estimated LOC Changes
- **Lines Removed**: ~250
- **Lines Added**: ~50 (migration logic, attachment support)
- **Net Reduction**: ~200 lines
