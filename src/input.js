/**
 * @typedef {import('./constants.js').HexCoord} HexCoord
 * @typedef {import('./constants.js').ToolType} ToolType
 * @typedef {import('./constants.js').Point} Point
 * @typedef {import('./constants.js').MapType} MapType
 */

import { setHexType, getStartHex, getEndHex, getIsSearching } from './grid.js';
import { pixelToHex, toCanvasCoords } from './hex-utils.js';
import { mapGenerators } from './map-generators.js';
import { runPathfinding } from './pathfinding.js';
import { getCanvas, getOffsetX, getOffsetY, getScale, setOffsetX, setOffsetY, setHoveredHex, getHoveredHex, zoomToward, fitGridToView, draw } from './renderer.js';

// Interaction state
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
/** @type {Point | null} */
let mouseDownPos = null;
let isMouseDown = false;
/** @type {HexCoord | null} */
let lastPaintedHex = null;
/** @type {ToolType} */
let selectedTileType = 'move';

// Pinch zoom state
/** @type {number | null} */
let lastPinchDist = null;
/** @type {Point | null} */
let lastPinchCenter = null;

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

    goBtn.disabled = !canGo;

    if (isSearching) {
        goBtnTooltip.textContent = 'Searching...';
    } else if (canGo) {
        goBtnTooltip.textContent = 'Find path from start to end';
    } else if (!hasStart && !hasEnd) {
        goBtnTooltip.textContent = 'Set a start and end point first';
    } else if (!hasStart) {
        goBtnTooltip.textContent = 'Set a start point first';
    } else {
        goBtnTooltip.textContent = 'Set an end point first';
    }
}

function updateCursor() {
    const canvas = getCanvas();
    if (selectedTileType === 'move') {
        canvas.style.cursor = 'grab';
    } else if (selectedTileType === 'wall' || selectedTileType === 'standard') {
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
 * @param {Touch} t0
 * @param {Touch} t1
 * @returns {Point}
 */
function getTouchCenter(t0, t1) {
    const canvas = getCanvas();
    const clientX = (t0.clientX + t1.clientX) / 2;
    const clientY = (t0.clientY + t1.clientY) / 2;
    return toCanvasCoords(clientX, clientY, canvas);
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

        if (selectedTileType === 'move') {
            // Pan mode
            isPanning = true;
            panStartX = pos.x - getOffsetX();
            panStartY = pos.y - getOffsetY();
            canvas.style.cursor = 'grabbing';
        } else if (selectedTileType === 'wall' || selectedTileType === 'standard') {
            // Draw mode - paint immediately on mousedown
            const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY(), getScale());
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
        const newHovered = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY(), getScale());
        const hoverChanged = (!hoveredHex && newHovered) ||
                            (hoveredHex && !newHovered) ||
                            (hoveredHex && newHovered && (hoveredHex.col !== newHovered.col || hoveredHex.row !== newHovered.row));

        if (hoverChanged) {
            setHoveredHex(newHovered);
            if (!isMouseDown) draw();
        }

        if (isMouseDown) {
            if (selectedTileType === 'move') {
                // Pan
                setOffsetX(pos.x - panStartX);
                setOffsetY(pos.y - panStartY);
                setHoveredHex(pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY(), getScale()));
                draw();
            } else if (selectedTileType === 'wall' || selectedTileType === 'standard') {
                // Draw mode - paint as we drag
                const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY(), getScale());
                if (hex && (!lastPaintedHex || hex.col !== lastPaintedHex.col || hex.row !== lastPaintedHex.row)) {
                    setHexType(hex.col, hex.row, selectedTileType);
                    lastPaintedHex = hex;
                    draw();
                }
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        const pos = toCanvasCoords(e.clientX, e.clientY, canvas);
        if (mouseDownPos && (selectedTileType === 'start' || selectedTileType === 'end')) {
            // Start/End: click to place
            const dist = Math.hypot(pos.x - mouseDownPos.x, pos.y - mouseDownPos.y);
            if (dist < 5) {
                const hex = pixelToHex(pos.x, pos.y, getOffsetX(), getOffsetY(), getScale());
                if (hex) {
                    setHexType(hex.col, hex.row, selectedTileType);
                    draw();
                }
            }
        }
        isMouseDown = false;
        isPanning = false;
        mouseDownPos = null;
        lastPaintedHex = null;
        updateCursor();
    });

    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
        isPanning = false;
        mouseDownPos = null;
        lastPaintedHex = null;
        setHoveredHex(null);
        updateCursor();
        draw();
    });

    // Wheel zoom handler
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const pos = toCanvasCoords(e.clientX, e.clientY, canvas);
        const zoomFactor = e.deltaY < 0 ? 1.03 : 0.97;
        zoomToward(getScale() * zoomFactor, pos.x, pos.y);
        draw();
    }, { passive: false });

    // Touch handlers for pinch-to-zoom
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist = Math.hypot(dx, dy);
            lastPinchCenter = getTouchCenter(e.touches[0], e.touches[1]);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && lastPinchDist !== null && lastPinchCenter !== null) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const pinchDist = Math.hypot(dx, dy);
            const pinchCenter = getTouchCenter(e.touches[0], e.touches[1]);

            // Zoom based on pinch distance change
            const zoomFactor = pinchDist / lastPinchDist;
            zoomToward(getScale() * zoomFactor, pinchCenter.x, pinchCenter.y);

            // Pan based on pinch center movement
            setOffsetX(getOffsetX() + pinchCenter.x - lastPinchCenter.x);
            setOffsetY(getOffsetY() + pinchCenter.y - lastPinchCenter.y);

            lastPinchDist = pinchDist;
            lastPinchCenter = pinchCenter;
            draw();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            lastPinchDist = null;
            lastPinchCenter = null;
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            fitGridToView();
            draw();
        }
        // Number keys for tool selection
        /** @type {Record<string, ToolType>} */
        const typeMap = { '1': 'move', '2': 'start', '3': 'end', '4': 'wall', '5': 'standard' };
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

    // Go button
    goBtn.addEventListener('click', () => {
        const startHex = getStartHex();
        const endHex = getEndHex();
        const isSearching = getIsSearching();
        if (startHex && endHex && !isSearching) {
            runPathfinding(algorithmSelect.value, draw, updateGoButton);
        }
    });

    // Generate button
    generateBtn.addEventListener('click', () => {
        const mapType = /** @type {MapType} */ (mapSelect.value);
        generateMap(mapType);
    });

    // Initial cursor
    updateCursor();
}
