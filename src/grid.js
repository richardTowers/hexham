/**
 * @typedef {import('./constants.js').HexCoord} HexCoord
 * @typedef {import('./constants.js').TileType} TileType
 */

// Grid state - Map with "col,row" keys
/** @type {Map<string, TileType>} */
export const grid = new Map();

/** @type {HexCoord | null} */
let _startHex = null;

/** @type {HexCoord | null} */
let _endHex = null;

// Pathfinding state
/** @type {Map<string, number>} */
export const visitedHexes = new Map();

/** @type {Set<string>} */
export const pathHexes = new Set();

let _isSearching = false;
let _maxVisitOrder = 0;

// Callback for UI updates
/** @type {(() => void) | null} */
let _onGridChange = null;

/**
 * Set callback for grid changes (used for UI updates)
 * @param {() => void} callback
 */
export function setOnGridChange(callback) {
    _onGridChange = callback;
}

/** @returns {HexCoord | null} */
export function getStartHex() {
    return _startHex;
}

/** @param {HexCoord | null} hex */
export function setStartHex(hex) {
    _startHex = hex;
}

/** @returns {HexCoord | null} */
export function getEndHex() {
    return _endHex;
}

/** @param {HexCoord | null} hex */
export function setEndHex(hex) {
    _endHex = hex;
}

/** @returns {boolean} */
export function getIsSearching() {
    return _isSearching;
}

/** @param {boolean} value */
export function setIsSearching(value) {
    _isSearching = value;
}

/** @returns {number} */
export function getMaxVisitOrder() {
    return _maxVisitOrder;
}

/** @param {number} value */
export function setMaxVisitOrder(value) {
    _maxVisitOrder = value;
}

/**
 * @param {number} col
 * @param {number} row
 * @returns {string}
 */
export function getHexKey(col, row) {
    return `${col},${row}`;
}

/**
 * @param {number} col
 * @param {number} row
 * @returns {TileType}
 */
export function getHexType(col, row) {
    return grid.get(getHexKey(col, row)) || 'standard';
}

/**
 * @param {number} col
 * @param {number} row
 * @param {TileType} type
 */
export function setHexType(col, row, type) {
    const key = getHexKey(col, row);

    // Handle unique start/end nodes
    if (type === 'start') {
        if (_startHex) {
            grid.delete(getHexKey(_startHex.col, _startHex.row));
        }
        _startHex = { col, row };
    } else if (type === 'end') {
        if (_endHex) {
            grid.delete(getHexKey(_endHex.col, _endHex.row));
        }
        _endHex = { col, row };
    }

    // Clear start/end reference if overwriting
    if (_startHex && _startHex.col === col && _startHex.row === row && type !== 'start') {
        _startHex = null;
    }
    if (_endHex && _endHex.col === col && _endHex.row === row && type !== 'end') {
        _endHex = null;
    }

    if (type === 'standard') {
        grid.delete(key);
    } else {
        grid.set(key, type);
    }

    if (_onGridChange) {
        _onGridChange();
    }
    clearPathfinding();
}

export function clearPathfinding() {
    visitedHexes.clear();
    pathHexes.clear();
    _isSearching = false;
    _maxVisitOrder = 0;
}

export function clearGrid() {
    grid.clear();
    _startHex = null;
    _endHex = null;
    clearPathfinding();
}
