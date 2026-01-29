/**
 * @typedef {import('./constants.js').HexCoord} HexCoord
 * @typedef {import('./constants.js').Point} Point
 */

import { GRID_WIDTH, GRID_HEIGHT, HEX_SIZE, HEX_WIDTH, HORIZ_SPACING, VERT_SPACING } from './constants.js';

/**
 * Convert hex grid coordinates to pixel coordinates
 * @param {number} col
 * @param {number} row
 * @returns {Point}
 */
export function hexToPixel(col, row) {
    const x = HEX_WIDTH / 2 + col * HORIZ_SPACING + (row % 2) * (HORIZ_SPACING / 2);
    const y = HEX_SIZE + row * VERT_SPACING;
    return { x, y };
}

/**
 * Convert pixel coordinates to hex grid coordinates
 * @param {number} px
 * @param {number} py
 * @param {number} offsetX
 * @param {number} offsetY
 * @param {number} scale
 * @returns {HexCoord | null}
 */
export function pixelToHex(px, py, offsetX, offsetY, scale) {
    // Convert screen coords to world coords
    const worldX = (px - offsetX) / scale;
    const worldY = (py - offsetY) / scale;

    // Approximate row
    const approxRow = Math.round((worldY - HEX_SIZE) / VERT_SPACING);

    // Check nearby rows for the closest hex
    let closest = null;
    let closestDist = Infinity;

    for (let row = approxRow - 1; row <= approxRow + 1; row++) {
        if (row < 0 || row >= GRID_HEIGHT) continue;

        const rowOffset = (row % 2) * (HORIZ_SPACING / 2);
        const approxCol = Math.round((worldX - HEX_WIDTH / 2 - rowOffset) / HORIZ_SPACING);

        for (let col = approxCol - 1; col <= approxCol + 1; col++) {
            if (col < 0 || col >= GRID_WIDTH) continue;

            const { x, y } = hexToPixel(col, row);
            const dist = Math.hypot(worldX - x, worldY - y);

            if (dist < closestDist && dist < HEX_SIZE) {
                closestDist = dist;
                closest = { col, row };
            }
        }
    }

    return closest;
}

/**
 * Get neighboring hex cells
 * @param {number} col
 * @param {number} row
 * @returns {HexCoord[]}
 */
export function getNeighbors(col, row) {
    // Offset coordinates for pointy-topped hex grid (odd-r)
    const evenRowOffsets = [
        [+1, 0], [0, -1], [-1, -1],
        [-1, 0], [-1, +1], [0, +1]
    ];
    const oddRowOffsets = [
        [+1, 0], [+1, -1], [0, -1],
        [-1, 0], [0, +1], [+1, +1]
    ];

    const offsets = (row % 2 === 0) ? evenRowOffsets : oddRowOffsets;
    const neighbors = [];

    for (const [dc, dr] of offsets) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc >= 0 && nc < GRID_WIDTH && nr >= 0 && nr < GRID_HEIGHT) {
            neighbors.push({ col: nc, row: nr });
        }
    }

    return neighbors;
}

/**
 * Heuristic for A* and Greedy (hex distance)
 * @param {number} col1
 * @param {number} row1
 * @param {number} col2
 * @param {number} row2
 * @returns {number}
 */
export function heuristic(col1, row1, col2, row2) {
    // Convert offset to cube coordinates for accurate hex distance
    const x1 = col1 - (row1 - (row1 & 1)) / 2;
    const z1 = row1;
    const y1 = -x1 - z1;

    const x2 = col2 - (row2 - (row2 & 1)) / 2;
    const z2 = row2;
    const y2 = -x2 - z2;

    return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}

/**
 * Convert client (viewport) coordinates to canvas-relative coordinates
 * @param {number} clientX
 * @param {number} clientY
 * @param {HTMLCanvasElement} canvas
 * @returns {Point}
 */
export function toCanvasCoords(clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
}
