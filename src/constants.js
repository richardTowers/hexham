// Type definitions
/**
 * @typedef {{ col: number, row: number }} HexCoord
 * @typedef {{ fill: string, stroke: string }} ColorPair
 * @typedef {'standard' | 'wall' | 'start' | 'end'} TileType
 * @typedef {'start' | 'end' | 'wall' | 'standard'} ToolType
 * @typedef {{ x: number, y: number }} Point
 * @typedef {'empty' | 'maze' | 'scatter' | 'rooms'} MapType
 */

// Hex size (fixed)
export const HEX_SIZE = 6;

// Hexagon geometry (pointy-topped)
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;
export const HORIZ_SPACING = HEX_WIDTH;
export const VERT_SPACING = HEX_HEIGHT * 0.75;

// Grid dimensions (calculated from canvas size)
let gridWidth = 100;
let gridHeight = 100;

/** @returns {number} */
export function getGridWidth() {
    return gridWidth;
}

/** @returns {number} */
export function getGridHeight() {
    return gridHeight;
}

/**
 * Calculate grid dimensions to fill the given canvas size
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function updateGridDimensions(canvasWidth, canvasHeight) {
    const padding = 10;
    const availableWidth = canvasWidth - padding * 2;
    const availableHeight = canvasHeight - padding * 2;

    // Calculate how many hexes fit
    // gridWorldWidth = HEX_WIDTH + cols * HORIZ_SPACING
    // gridWorldHeight = HEX_SIZE * 2 + rows * VERT_SPACING
    gridWidth = Math.max(1, Math.floor((availableWidth - HEX_WIDTH) / HORIZ_SPACING));
    gridHeight = Math.max(1, Math.floor((availableHeight - HEX_SIZE * 2) / VERT_SPACING));
}

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
