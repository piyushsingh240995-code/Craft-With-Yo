import * as THREE from 'three';

export class Pathfinding {
    constructor(world) {
        this.world = world;
        this.maxNodes = 100; // Reduced from 200 to improve performance
    }

    findPath(start, end) {
        const startNode = {
            x: Math.floor(start.x),
            y: Math.floor(start.y),
            z: Math.floor(start.z),
            g: 0,
            h: this.heuristic(start, end),
            parent: null
        };

        const openSet = [startNode];
        const closedSet = new Set();
        const nodesSearched = 0;

        while (openSet.length > 0 && nodesSearched < this.maxNodes) {
            // Get node with lowest f score
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].g + openSet[i].h < openSet[currentIndex].g + openSet[currentIndex].h) {
                    currentIndex = i;
                }
            }

            const current = openSet[currentIndex];

            // Check if reached target (within 1.5 blocks)
            const distSq = Math.pow(current.x - end.x, 2) + Math.pow(current.y - end.y, 2) + Math.pow(current.z - end.z, 2);
            if (distSq < 2.25) {
                return this.reconstructPath(current);
            }

            openSet.splice(currentIndex, 1);
            closedSet.add(`${current.x},${current.y},${current.z}`);

            // Check neighbors (6 directions + diagonals for jumping)
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (closedSet.has(`${neighbor.x},${neighbor.y},${neighbor.z}`)) continue;

                const gScore = current.g + 1;
                let neighborInOpen = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y && n.z === neighbor.z);

                if (!neighborInOpen) {
                    neighbor.g = gScore;
                    neighbor.h = this.heuristic(neighbor, end);
                    neighbor.parent = current;
                    openSet.push(neighbor);
                } else if (gScore < neighborInOpen.g) {
                    neighborInOpen.g = gScore;
                    neighborInOpen.parent = current;
                }
            }
        }

        return null;
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    }

    getNeighbors(node) {
        const neighbors = [];
        const dirs = [
            {x: 1, z: 0}, {x: -1, z: 0}, {x: 0, z: 1}, {x: 0, z: -1}
        ];

        for (const dir of dirs) {
            const nx = node.x + dir.x;
            const nz = node.z + dir.z;
            
            // Check if can walk (block at feet is air, block below is solid)
            // We also allow jumping 1 block up or dropping down
            for (let dy = 1; dy >= -2; dy--) {
                const ny = node.y + dy;
                if (this.isWalkable(nx, ny, nz)) {
                    neighbors.push({x: nx, y: ny, z: nz});
                    break; // Only one height level per horizontal step
                }
            }
        }

        return neighbors;
    }

    isWalkable(x, y, z) {
        const block = this.world.getBlock(x, y, z);
        const blockAbove = this.world.getBlock(x, y + 1, z);
        const blockBelow = this.world.getBlock(x, y - 1, z);

        // Can stand here if:
        // 1. Current block is air/water
        // 2. Block above is air/water
        // 3. Block below is solid
        return (block === 0 || block === 7) && 
               (blockAbove === 0 || blockAbove === 7) && 
               (blockBelow !== 0 && blockBelow !== 7);
    }

    reconstructPath(node) {
        const path = [];
        let curr = node;
        while (curr) {
            path.push(new THREE.Vector3(curr.x + 0.5, curr.y, curr.z + 0.5));
            curr = curr.parent;
        }
        return path.reverse();
    }
}
