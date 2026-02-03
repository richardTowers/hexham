/**
 * @typedef {import('./constants.js').HexCoord} HexCoord
 * @typedef {import('./constants.js').ToolType} ToolType
 * @typedef {import('./constants.js').Point} Point
 * @typedef {import('./constants.js').MapType} MapType
 */

import { setHexType, getStartHex, getEndHex, getIsSearching } from './grid.js';
import { pixelToHex, toCanvasCoords } from './hex-utils.js';
import { mapGenerators } from './map-generators.js';
import { runPathfinding, cancelPathfinding } from './pathfinding.js';
import { getCanvas, getOffsetX, getOffsetY, setHoveredHex, getHoveredHex, draw } from './renderer.js';

// Interaction state
/** @type {Point | null} */
let mouseDownPos = null;
let isMouseDown = false;
/** @type {HexCoord | null} */
let lastPaintedHex = null;
/** @type {ToolType} */
let selectedTileType = 'wall';

// DOM elements (initialized via init)
/** @type {NodeListOf<HTMLButtonElement>} */
let tileButtons;
/** @type {HTMLButtonElement} */
let goBtn;
/** @type {HTMLElement} */
let goBtnTooltip;
/** @type {HTMLSelectElement} */
let algorithmSelect;
/** @type {HTMLSelectElement} */
let mapSelect;
/** @type {HTMLButtonElement} */
let generateBtn;

export function updateGoButton() {
    const startHex = getStartHex();
    const endHex = getEndHex();
    const isSearching = getIsSearching();

    const hasStart = startHex !== null;
    const hasEnd = endHex !== null;
    const canGo = hasStart && hasEnd && !isSearching;

    if (isSearching) {
        goBtn.disabled = false;
        goBtn.textContent = 'Cancel';
        goBtn.classList.add('cancel');
        goBtnTooltip.textContent = 'Stop the search';
    } else {
        goBtn.disabled = !canGo;
        goBtn.textContent = 'Go!';
        goBtn.classList.remove('cancel');
        if (canGo) {
            goBtnTooltip.textContent = 'Find path from start to end';
        } else if (!hasStart && !hasEnd) {
            goBtnTooltip.textContent = 'Set a start and end point first';
        } else if (!hasStart) {
            goBtnTooltip.textContent = 'Set a start point first';
        } else {
            goBtnTooltip.textContent = 'Set an end point first';
        }
    }
}

function updateCursor() {
    const canvas = getCanvas();
    if (selectedTileType === 'wall' || selectedTileType === 'standard') {
        canvas.style.cursor = 'crosshair';
    } else {
        canvas.style.cursor = 'pointer';
    }
}

/**
 * @param {MapType} type
 */
function generateMap(type) {
    const generator = mapGenerators[type];
    if (generator) {
        generator();
        updateGoButton();
        draw();
    }
}

/**
 * Initialize input handlers
 */
export function initInput() {
    const canvas = getCanvas();

    // Get DOM elements
    tileButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.tile-btn'));
    goBtn = /** @type {HTMLButtonElement} */ (document.getElementById('go-btn'));
    goBtnTooltip = /** @type {HTMLElement} */ (document.getElementById('go-btn-tooltip'));
    algorithmSelect = /** @type {HTMLSelectElement} */ (document.getElementById('algorithm-select'));
    mapSelect = /** @type {HTMLSelectElement} */ (document.getElementById('map-select'));
    generateBtn = /** @type {HTMLButtonElement} */ (document.getElementById('generate-btn'));

    // Mouse handlers
    canvas.addEventListener('mousedown', (e) => {
        const pos = toCanvasCoords(e.clientX, e.clientY, canvas);
        isMouseDown = true;
        mouseDownPos = pos;

        if (selectedTileType === 'wall' || selectedTileType === 'standard') {
            // Draw mode - paint immediately on mousedown
            const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY());
            if (hex) {
                setHexType(hex.col, hex.row, selectedTileType);
                lastPaintedHex = hex;
                draw();
            }
        }
        // Start/End: handled on mouseup (click only)
    });

    canvas.addEventListener('mousemove', (e) => {
        const pos = toCanvasCoords(e.clientX, e.clientY, canvas);
        const hoveredHex = getHoveredHex();

        // Update hover
        const newHovered = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY());
        const hoverChanged = (!hoveredHex && newHovered) ||
                            (hoveredHex && !newHovered) ||
                            (hoveredHex && newHovered && (hoveredHex.col !== newHovered.col || hoveredHex.row !== newHovered.row));

        if (hoverChanged) {
            setHoveredHex(newHovered);
            if (!isMouseDown) draw();
        }

        if (isMouseDown && (selectedTileType === 'wall' || selectedTileType === 'standard')) {
            // Draw mode - paint as we drag
            const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY());
            if (hex && (!lastPaintedHex || hex.col !== lastPaintedHex.col || hex.row !== lastPaintedHex.row)) {
                setHexType(hex.col, hex.row, selectedTileType);
                lastPaintedHex = hex;
                draw();
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        const pos = toCanvasCoords(e.clientX, e.clientY, canvas);
        if (mouseDownPos && (selectedTileType === 'start' || selectedTileType === 'end')) {
            // Start/End: click to place
            const dist = Math.hypot(pos.x - mouseDownPos.x, pos.y - mouseDownPos.y);
            if (dist < 5) {
                const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY());
                if (hex) {
                    setHexType(hex.col, hex.row, selectedTileType);
                    draw();
                }
            }
        }
        isMouseDown = false;
        mouseDownPos = null;
        lastPaintedHex = null;
        updateCursor();
    });

    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
        mouseDownPos = null;
        lastPaintedHex = null;
        setHoveredHex(null);
        updateCursor();
        draw();
    });

    // Touch handlers for drawing on mobile
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        const pos = toCanvasCoords(touch.clientX, touch.clientY, canvas);
        isMouseDown = true;
        mouseDownPos = pos;

        const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY());
        if (hex) {
            setHexType(hex.col, hex.row, selectedTileType);
            lastPaintedHex = hex;
            draw();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1 || !isMouseDown) return;
        e.preventDefault();
        const touch = e.touches[0];
        const pos = toCanvasCoords(touch.clientX, touch.clientY, canvas);

        const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY());
        if (hex && (!lastPaintedHex || hex.col !== lastPaintedHex.col || hex.row !== lastPaintedHex.row)) {
            setHexType(hex.col, hex.row, selectedTileType);
            lastPaintedHex = hex;
            draw();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        isMouseDown = false;
        mouseDownPos = null;
        lastPaintedHex = null;
    });

    canvas.addEventListener('touchcancel', () => {
        isMouseDown = false;
        mouseDownPos = null;
        lastPaintedHex = null;
    });

    // Keyboard shortcuts for tool selection
    document.addEventListener('keydown', (e) => {
        /** @type {Record<string, ToolType>} */
        const typeMap = { '1': 'start', '2': 'end', '3': 'wall', '4': 'standard' };
        if (e.key in typeMap) {
            selectedTileType = typeMap[e.key];
            tileButtons.forEach(b => {
                b.classList.toggle('active', b.dataset.type === selectedTileType);
            });
            updateCursor();
        }
    });

    // Toolbar button handlers
    tileButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tileButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTileType = /** @type {ToolType} */ (btn.dataset.type);
            updateCursor();
        });
    });

    // Go/Cancel button
    goBtn.addEventListener('click', () => {
        const startHex = getStartHex();
        const endHex = getEndHex();
        const isSearching = getIsSearching();
        if (isSearching) {
            cancelPathfinding();
        } else if (startHex && endHex) {
            runPathfinding(algorithmSelect.value, draw, updateGoButton);
        }
    });

    // Generate button
    generateBtn.addEventListener('click', () => {
        const mapType = /** @type {MapType} */ (mapSelect.value);
        generateMap(mapType);
    });

    // Auto-generate when map type is selected
    mapSelect.addEventListener('change', () => {
        const mapType = /** @type {MapType} */ (mapSelect.value);
        generateMap(mapType);
    });

    // Initial cursor
    updateCursor();
}
