/**
 * @typedef {import('./constants.js').HexCoord} HexCoord
 */

import { GRID_WIDTH, GRID_HEIGHT, HEX_SIZE, HEX_WIDTH, HORIZ_SPACING, VERT_SPACING, TILE_TYPES, PATH_COLOR, MIN_SCALE, MAX_SCALE, getVisitedColor } from './constants.js';
import { getHexKey, getHexType, visitedHexes, pathHexes } from './grid.js';
import { hexToPixel } from './hex-utils.js';

// Canvas elements (initialized via init)
/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let ctx;

// View transform state
let offsetX = 0;
let offsetY = 0;
let scale = 1;

// Hovered hex (for rendering)
/** @type {HexCoord | null} */
let _hoveredHex = null;

/**
 * Initialize renderer with canvas element
 * @param {HTMLCanvasElement} canvasEl
 */
export function initRenderer(canvasEl) {
    canvas = canvasEl;
    ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
}

/** @returns {HTMLCanvasElement} */
export function getCanvas() {
    return canvas;
}

/** @returns {number} */
export function getOffsetX() {
    return offsetX;
}

/** @returns {number} */
export function getOffsetY() {
    return offsetY;
}

/** @returns {number} */
export function getScale() {
    return scale;
}

/** @param {number} x */
export function setOffsetX(x) {
    offsetX = x;
}

/** @param {number} y */
export function setOffsetY(y) {
    offsetY = y;
}

/** @param {HexCoord | null} hex */
export function setHoveredHex(hex) {
    _hoveredHex = hex;
}

/** @returns {HexCoord | null} */
export function getHoveredHex() {
    return _hoveredHex;
}

export function fitGridToView() {
    // Calculate total grid world-space dimensions
    const gridWorldWidth = HEX_WIDTH + GRID_WIDTH * HORIZ_SPACING;
    const gridWorldHeight = HEX_SIZE * 2 + GRID_HEIGHT * VERT_SPACING;

    // Calculate scale to fit grid in viewport with some padding
    const padding = 20;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;

    const scaleX = availableWidth / gridWorldWidth;
    const scaleY = availableHeight / gridWorldHeight;
    scale = Math.min(scaleX, scaleY, MAX_SCALE);
    scale = Math.max(scale, MIN_SCALE);

    // Position grid at top left with padding
    offsetX = padding;
    offsetY = padding;
}

export function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    fitGridToView();
    draw();
}

/**
 * Zoom toward a point (used by both wheel and pinch zoom)
 * @param {number} newScale
 * @param {number} focusX
 * @param {number} focusY
 */
export function zoomToward(newScale, focusX, focusY) {
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const scaleChange = newScale / scale;
    offsetX = focusX - (focusX - offsetX) * scaleChange;
    offsetY = focusY - (focusY - offsetY) * scaleChange;
    scale = newScale;
}

function getVisibleRange() {
    const invScale = 1 / scale;
    const left = -offsetX * invScale;
    const top = -offsetY * invScale;
    const right = left + canvas.width * invScale;
    const bottom = top + canvas.height * invScale;

    const minCol = Math.max(0, Math.floor(left / HORIZ_SPACING) - 1);
    const maxCol = Math.min(GRID_WIDTH - 1, Math.ceil(right / HORIZ_SPACING) + 1);
    const minRow = Math.max(0, Math.floor(top / VERT_SPACING) - 1);
    const maxRow = Math.min(GRID_HEIGHT - 1, Math.ceil(bottom / VERT_SPACING) + 1);

    return { minCol, maxCol, minRow, maxRow };
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} size
 */
function drawHexagon(cx, cy, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
}

/**
 * @param {string} hex
 * @param {number} amount
 * @returns {string}
 */
function lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const b = Math.min(255, (num & 0x0000FF) + amount);
    return `rgb(${r},${g},${b})`;
}

export function draw() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const { minCol, maxCol, minRow, maxRow } = getVisibleRange();

    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const { x, y } = hexToPixel(col, row);
            const type = getHexType(col, row);
            const key = getHexKey(col, row);
            const isHovered = _hoveredHex && _hoveredHex.col === col && _hoveredHex.row === row;
            const isPath = pathHexes.has(key);
            const visitOrder = visitedHexes.get(key);
            const isVisited = visitOrder !== undefined;

            // Determine colors based on state
            let colors;
            if (isPath && type !== 'start' && type !== 'end') {
                colors = PATH_COLOR;
            } else if (isVisited && type === 'standard') {
                colors = getVisitedColor(visitOrder);
            } else {
                colors = TILE_TYPES[type];
            }

            drawHexagon(x, y, HEX_SIZE);

            // Fill
            if (isHovered) {
                ctx.fillStyle = lightenColor(colors.fill, 30);
            } else {
                ctx.fillStyle = colors.fill;
            }
            ctx.fill();

            // Stroke
            ctx.strokeStyle = isHovered ? '#fff' : colors.stroke;
            ctx.lineWidth = (isHovered ? 2 : 1) / scale;
            ctx.stroke();
        }
    }

    ctx.restore();
}
