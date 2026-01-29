/**
 * @typedef {import('./constants.js').HexCoord} HexCoord
 * @typedef {import('./constants.js').MapType} MapType
 */

import { GRID_WIDTH, GRID_HEIGHT } from './constants.js';
import { grid, getHexKey, clearGrid, setStartHex, setEndHex, getStartHex, getEndHex } from './grid.js';
import { getNeighbors, heuristic } from './hex-utils.js';

/** @type {Record<MapType, () => void>} */
export const mapGenerators = {
    empty: generateEmpty,
    maze: generateMaze,
    scatter: generateScattered,
    rooms: generateRooms
};

export function generateEmpty() {
    clearGrid();
    const startHex = { col: 5, row: 5 };
    const endHex = { col: GRID_WIDTH - 6, row: GRID_HEIGHT - 6 };
    setStartHex(startHex);
    setEndHex(endHex);
    grid.set(getHexKey(startHex.col, startHex.row), 'start');
    grid.set(getHexKey(endHex.col, endHex.row), 'end');
}

/**
 * Check if path exists between two points (BFS)
 * @param {number} fromCol
 * @param {number} fromRow
 * @param {number} toCol
 * @param {number} toRow
 * @returns {HexCoord[] | null}
 */
function findPath(fromCol, fromRow, toCol, toRow) {
    const startKey = getHexKey(fromCol, fromRow);
    const endKey = getHexKey(toCol, toRow);

    const queue = [{ col: fromCol, row: fromRow }];
    const cameFrom = new Map();
    cameFrom.set(startKey, null);

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        const currentKey = getHexKey(current.col, current.row);

        if (currentKey === endKey) {
            // Reconstruct path
            const path = [];
            let key = endKey;
            while (key !== null) {
                const [c, r] = key.split(',').map(Number);
                path.push({ col: c, row: r });
                key = cameFrom.get(key);
            }
            return path.reverse();
        }

        for (const neighbor of getNeighbors(current.col, current.row)) {
            const neighborKey = getHexKey(neighbor.col, neighbor.row);
            const neighborType = grid.get(neighborKey);

            if (cameFrom.has(neighborKey)) continue;
            if (neighborType === 'wall') continue;

            cameFrom.set(neighborKey, currentKey);
            queue.push(neighbor);
        }
    }

    return null; // No path found
}

// Carve a path through walls if needed
function ensurePathExists() {
    const startHex = getStartHex();
    const endHex = getEndHex();
    if (!startHex || !endHex) return;

    const path = findPath(startHex.col, startHex.row, endHex.col, endHex.row);
    if (path) return; // Path already exists

    // No path - carve one using A* through walls
    const startKey = getHexKey(startHex.col, startHex.row);
    const endKey = getHexKey(endHex.col, endHex.row);

    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();

    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startHex.col, startHex.row, endHex.col, endHex.row));
    cameFrom.set(startKey, null);

    const openSet = [{ col: startHex.col, row: startHex.row }];

    while (openSet.length > 0) {
        openSet.sort((a, b) => {
            const fA = fScore.get(getHexKey(a.col, a.row)) || Infinity;
            const fB = fScore.get(getHexKey(b.col, b.row)) || Infinity;
            return fA - fB;
        });

        const current = openSet.shift();
        if (!current) continue;
        const currentKey = getHexKey(current.col, current.row);

        if (currentKey === endKey) {
            // Carve the path
            let key = endKey;
            while (key !== null) {
                const type = grid.get(key);
                if (type === 'wall') {
                    grid.delete(key);
                }
                key = cameFrom.get(key);
            }
            return;
        }

        const currentG = gScore.get(currentKey);

        for (const neighbor of getNeighbors(current.col, current.row)) {
            const neighborKey = getHexKey(neighbor.col, neighbor.row);
            const neighborType = grid.get(neighborKey);

            // Cost is higher to go through walls (encourages using open space)
            const moveCost = neighborType === 'wall' ? 5 : 1;
            const tentativeG = currentG + moveCost;

            if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeG);
                fScore.set(neighborKey, tentativeG + heuristic(neighbor.col, neighbor.row, endHex.col, endHex.row));
                if (!openSet.some(n => n.col === neighbor.col && n.row === neighbor.row)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
}

export function generateMaze() {
    clearGrid();

    // Fill everything with walls first
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            grid.set(getHexKey(col, row), 'wall');
        }
    }

    // Use recursive backtracker with actual hex neighbors
    // Work on a sparser grid (every other cell) to create corridors
    const mazeRows = Math.floor(GRID_HEIGHT / 2);
    const mazeCols = Math.floor(GRID_WIDTH / 2);

    // Map maze coords to grid coords
    /** @param {number} mc @param {number} mr */
    const toGrid = (mc, mr) => ({ col: mc * 2 + 1, row: mr * 2 + 1 });

    const visited = new Set();
    const cellDistances = new Map();
    const stack = [{ mc: 0, mr: 0, dist: 0 }];

    const startGrid = toGrid(0, 0);
    visited.add(`${0},${0}`);
    grid.delete(getHexKey(startGrid.col, startGrid.row));
    cellDistances.set(`${0},${0}`, 0);

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const currentGrid = toGrid(current.mc, current.mr);

        // Get unvisited maze neighbors
        const neighbors = [];
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

        for (const [dmc, dmr] of dirs) {
            const nmc = current.mc + dmc;
            const nmr = current.mr + dmr;
            if (nmc >= 0 && nmc < mazeCols && nmr >= 0 && nmr < mazeRows) {
                if (!visited.has(`${nmc},${nmr}`)) {
                    neighbors.push({ mc: nmc, mr: nmr, dmc, dmr });
                }
            }
        }

        if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            visited.add(`${next.mc},${next.mr}`);

            const nextGrid = toGrid(next.mc, next.mr);

            // Carve the cell
            grid.delete(getHexKey(nextGrid.col, nextGrid.row));

            // Carve passage between current and next
            const wallCol = currentGrid.col + next.dmc;
            const wallRow = currentGrid.row + next.dmr;
            grid.delete(getHexKey(wallCol, wallRow));

            const newDist = current.dist + 1;
            cellDistances.set(`${next.mc},${next.mr}`, newDist);

            stack.push({ mc: next.mc, mr: next.mr, dist: newDist });
        } else {
            stack.pop();
        }
    }

    // Place start at beginning
    const startPos = toGrid(0, 0);
    const startHex = { col: startPos.col, row: startPos.row };
    setStartHex(startHex);
    grid.set(getHexKey(startHex.col, startHex.row), 'start');

    // Place end at the cell furthest from start (in maze distance)
    let maxDist = 0;
    let endMc = 0, endMr = 0;
    for (const [key, dist] of cellDistances) {
        if (dist > maxDist) {
            maxDist = dist;
            const [mc, mr] = key.split(',').map(Number);
            endMc = mc;
            endMr = mr;
        }
    }
    const endPos = toGrid(endMc, endMr);
    const endHex = { col: endPos.col, row: endPos.row };
    setEndHex(endHex);
    grid.set(getHexKey(endHex.col, endHex.row), 'end');
}

export function generateScattered() {
    clearGrid();

    const density = 0.3;
    const clusterChance = 0.6;

    // Place start and end first
    const startHex = { col: 5, row: 5 };
    const endHex = { col: GRID_WIDTH - 6, row: GRID_HEIGHT - 6 };
    setStartHex(startHex);
    setEndHex(endHex);

    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (Math.random() < density) {
                grid.set(getHexKey(col, row), 'wall');

                // Sometimes create small clusters
                if (Math.random() < clusterChance) {
                    for (const neighbor of getNeighbors(col, row)) {
                        if (Math.random() < 0.4) {
                            grid.set(getHexKey(neighbor.col, neighbor.row), 'wall');
                        }
                    }
                }
            }
        }
    }

    // Clear area around start and end
    clearAreaAround(startHex.col, startHex.row, 3);
    clearAreaAround(endHex.col, endHex.row, 3);

    grid.set(getHexKey(startHex.col, startHex.row), 'start');
    grid.set(getHexKey(endHex.col, endHex.row), 'end');

    // Ensure a path exists
    ensurePathExists();
}

export function generateRooms() {
    clearGrid();

    // Fill with walls
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            grid.set(getHexKey(col, row), 'wall');
        }
    }

    // Generate random rooms
    const rooms = [];
    const numRooms = 12;

    for (let i = 0; i < numRooms; i++) {
        const roomW = 6 + Math.floor(Math.random() * 10);
        const roomH = 6 + Math.floor(Math.random() * 10);
        const roomX = 2 + Math.floor(Math.random() * (GRID_WIDTH - roomW - 4));
        const roomY = 2 + Math.floor(Math.random() * (GRID_HEIGHT - roomH - 4));

        rooms.push({ x: roomX, y: roomY, w: roomW, h: roomH });

        // Carve room
        for (let row = roomY; row < roomY + roomH; row++) {
            for (let col = roomX; col < roomX + roomW; col++) {
                grid.delete(getHexKey(col, row));
            }
        }
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
        const r1 = rooms[i - 1];
        const r2 = rooms[i];
        const x1 = Math.floor(r1.x + r1.w / 2);
        const y1 = Math.floor(r1.y + r1.h / 2);
        const x2 = Math.floor(r2.x + r2.w / 2);
        const y2 = Math.floor(r2.y + r2.h / 2);

        // L-shaped corridor
        let cx = x1;
        while (cx !== x2) {
            grid.delete(getHexKey(cx, y1));
            grid.delete(getHexKey(cx, y1 + 1));
            cx += cx < x2 ? 1 : -1;
        }
        let cy = y1;
        while (cy !== y2) {
            grid.delete(getHexKey(x2, cy));
            grid.delete(getHexKey(x2 + 1, cy));
            cy += cy < y2 ? 1 : -1;
        }
    }

    // Place start and end in first and last rooms
    const firstRoom = rooms[0];
    const lastRoom = rooms[rooms.length - 1];
    const startHex = { col: Math.floor(firstRoom.x + firstRoom.w / 2), row: Math.floor(firstRoom.y + firstRoom.h / 2) };
    const endHex = { col: Math.floor(lastRoom.x + lastRoom.w / 2), row: Math.floor(lastRoom.y + lastRoom.h / 2) };
    setStartHex(startHex);
    setEndHex(endHex);

    grid.set(getHexKey(startHex.col, startHex.row), 'start');
    grid.set(getHexKey(endHex.col, endHex.row), 'end');

    ensurePathExists();
}

/**
 * @param {number} col
 * @param {number} row
 * @param {number} radius
 */
function clearAreaAround(col, row, radius) {
    for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
            const nc = col + dc;
            const nr = row + dr;
            if (nc >= 0 && nc < GRID_WIDTH && nr >= 0 && nr < GRID_HEIGHT) {
                grid.delete(getHexKey(nc, nr));
            }
        }
    }
}
