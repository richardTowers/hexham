// Type definitions
/**
 * @typedef {{ col: number, row: number }} HexCoord
 * @typedef {{ fill: string, stroke: string }} ColorPair
 * @typedef {'standard' | 'wall' | 'start' | 'end'} TileType
 * @typedef {'move' | 'start' | 'end' | 'wall' | 'standard'} ToolType
 * @typedef {{ x: number, y: number }} Point
 * @typedef {'empty' | 'maze' | 'scatter' | 'rooms'} MapType
 */

// Grid configuration
export const GRID_WIDTH = 100;
export const GRID_HEIGHT = 100;
export const HEX_SIZE = 12;

// Hexagon geometry (pointy-topped)
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;
export const HORIZ_SPACING = HEX_WIDTH;
export const VERT_SPACING = HEX_HEIGHT * 0.75;

/** @type {Record<import('./constants.js').TileType, import('./constants.js').ColorPair>} */
export const TILE_TYPES = {
    standard: { fill: '#2a2a4a', stroke: '#4a4a6a' },
    wall:     { fill: '#1a1a1a', stroke: '#333' },
    start:    { fill: '#2ecc71', stroke: '#27ae60' },
    end:      { fill: '#e74c3c', stroke: '#c0392b' }
};

// Pathfinding visualization colors
/** @type {import('./constants.js').ColorPair} */
export const PATH_COLOR = { fill: '#ff08e8', stroke: '#cc06b9' };

// Scale limits
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5;

/**
 * Get visited cell color based on visit order (cycles through hues)
 * @param {number} visitOrder
 * @returns {import('./constants.js').ColorPair}
 */
export function getVisitedColor(visitOrder) {
    // Cycle through hues over ~200 steps, then repeat
    const hue = (visitOrder * 2.5) % 360;
    // OKLCH gives perceptually uniform colors across the hue spectrum
    const fill = `oklch(45% 0.07 ${hue})`;
    const stroke = `oklch(55% 0.09 ${hue})`;
    return { fill, stroke };
}
