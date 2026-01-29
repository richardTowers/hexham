import { getHexKey, getHexType, visitedHexes, pathHexes, clearPathfinding, getStartHex, getEndHex, setIsSearching, setMaxVisitOrder } from './grid.js';
import { getNeighbors, heuristic } from './hex-utils.js';

/** @param {number} ms */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run pathfinding algorithm with visualization
 * @param {string} algorithm - 'bfs', 'dfs', 'astar', or 'greedy'
 * @param {() => void} draw - Draw callback
 * @param {() => void} updateGoButton - UI update callback
 */
export async function runPathfinding(algorithm, draw, updateGoButton) {
    const startHex = getStartHex();
    const endHex = getEndHex();

    if (!startHex || !endHex) return;

    // Clear previous results
    clearPathfinding();
    setIsSearching(true);
    updateGoButton();
    draw();

    const startKey = getHexKey(startHex.col, startHex.row);
    const endKey = getHexKey(endHex.col, endHex.row);

    const cameFrom = new Map();
    cameFrom.set(startKey, null);

    let found = false;
    let stepCount = 0;

    if (algorithm === 'bfs') {
        // Breadth-First Search
        const queue = [{ col: startHex.col, row: startHex.row }];

        while (queue.length > 0 && !found) {
            const current = queue.shift();
            if (!current) continue;
            const currentKey = getHexKey(current.col, current.row);

            visitedHexes.set(currentKey, stepCount);
            setMaxVisitOrder(stepCount);
            stepCount++;
            if (stepCount % 10 === 0) {
                draw();
                await sleep(5);
            }

            if (currentKey === endKey) {
                found = true;
                break;
            }

            for (const neighbor of getNeighbors(current.col, current.row)) {
                const neighborKey = getHexKey(neighbor.col, neighbor.row);
                const neighborType = getHexType(neighbor.col, neighbor.row);

                if (cameFrom.has(neighborKey)) continue;
                if (neighborType === 'wall') continue;

                cameFrom.set(neighborKey, currentKey);
                queue.push(neighbor);
            }
        }

    } else if (algorithm === 'dfs') {
        // Depth-First Search
        const stack = [{ col: startHex.col, row: startHex.row }];

        while (stack.length > 0 && !found) {
            const current = stack.pop();
            if (!current) continue;
            const currentKey = getHexKey(current.col, current.row);

            if (visitedHexes.has(currentKey)) continue;
            visitedHexes.set(currentKey, stepCount);
            setMaxVisitOrder(stepCount);

            stepCount++;
            if (stepCount % 10 === 0) {
                draw();
                await sleep(5);
            }

            if (currentKey === endKey) {
                found = true;
                break;
            }

            for (const neighbor of getNeighbors(current.col, current.row)) {
                const neighborKey = getHexKey(neighbor.col, neighbor.row);
                const neighborType = getHexType(neighbor.col, neighbor.row);

                if (visitedHexes.has(neighborKey)) continue;
                if (neighborType === 'wall') continue;

                if (!cameFrom.has(neighborKey)) {
                    cameFrom.set(neighborKey, currentKey);
                }
                stack.push(neighbor);
            }
        }

    } else if (algorithm === 'astar') {
        // A* Search
        const gScore = new Map();
        const fScore = new Map();
        gScore.set(startKey, 0);
        fScore.set(startKey, heuristic(startHex.col, startHex.row, endHex.col, endHex.row));

        const openSet = [{ col: startHex.col, row: startHex.row }];

        while (openSet.length > 0 && !found) {
            openSet.sort((a, b) => {
                const fA = fScore.get(getHexKey(a.col, a.row)) || Infinity;
                const fB = fScore.get(getHexKey(b.col, b.row)) || Infinity;
                return fA - fB;
            });

            const current = openSet.shift();
            if (!current) continue;
            const currentKey = getHexKey(current.col, current.row);

            if (visitedHexes.has(currentKey)) continue;
            visitedHexes.set(currentKey, stepCount);
            setMaxVisitOrder(stepCount);

            stepCount++;
            if (stepCount % 10 === 0) {
                draw();
                await sleep(5);
            }

            if (currentKey === endKey) {
                found = true;
                break;
            }

            const currentG = gScore.get(currentKey);

            for (const neighbor of getNeighbors(current.col, current.row)) {
                const neighborKey = getHexKey(neighbor.col, neighbor.row);
                const neighborType = getHexType(neighbor.col, neighbor.row);

                if (visitedHexes.has(neighborKey)) continue;
                if (neighborType === 'wall') continue;

                const tentativeG = currentG + 1;

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, currentKey);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + heuristic(neighbor.col, neighbor.row, endHex.col, endHex.row));
                    openSet.push(neighbor);
                }
            }
        }

    } else if (algorithm === 'greedy') {
        // Greedy Best-First Search
        const endCol = endHex.col;
        const endRow = endHex.row;
        const openSet = [{ col: startHex.col, row: startHex.row }];

        while (openSet.length > 0 && !found) {
            openSet.sort((a, b) => {
                const hA = heuristic(a.col, a.row, endCol, endRow);
                const hB = heuristic(b.col, b.row, endCol, endRow);
                return hA - hB;
            });

            const current = openSet.shift();
            if (!current) continue;
            const currentKey = getHexKey(current.col, current.row);

            if (visitedHexes.has(currentKey)) continue;
            visitedHexes.set(currentKey, stepCount);
            setMaxVisitOrder(stepCount);

            stepCount++;
            if (stepCount % 10 === 0) {
                draw();
                await sleep(5);
            }

            if (currentKey === endKey) {
                found = true;
                break;
            }

            for (const neighbor of getNeighbors(current.col, current.row)) {
                const neighborKey = getHexKey(neighbor.col, neighbor.row);
                const neighborType = getHexType(neighbor.col, neighbor.row);

                if (visitedHexes.has(neighborKey)) continue;
                if (neighborType === 'wall') continue;

                if (!cameFrom.has(neighborKey)) {
                    cameFrom.set(neighborKey, currentKey);
                    openSet.push(neighbor);
                }
            }
        }
    }

    // Reconstruct path if found
    if (found) {
        let currentKey = endKey;
        while (currentKey !== null) {
            pathHexes.add(currentKey);
            currentKey = cameFrom.get(currentKey);
        }
    }

    setIsSearching(false);
    updateGoButton();
    draw();
}
