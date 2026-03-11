import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { TerrainGenerator } from './terrain.js';
import { BLOCK_TYPES } from './blocks.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.generator = new TerrainGenerator(Math.random());
        this.renderDistance = 4;
        this.lastPX = null;
        this.lastPZ = null;
        this.chunksToLoad = [];
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    getChunk(x, z) {
        return this.chunks.get(this.getChunkKey(x, z));
    }

    getBlock(x, y, z) {
        if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;
        
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) return BLOCK_TYPES.AIR;

        const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunk.getBlock(localX, y, localZ);
    }

    setBlock(x, y, z, type) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        let chunk = this.getChunk(chunkX, chunkZ);
        
        if (!chunk) {
            chunk = this.createChunk(chunkX, chunkZ);
        }

        const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        chunk.setBlock(localX, y, localZ, type);
        
        // Re-mesh chunk
        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            chunk.mesh.material.dispose();
        }
        this.scene.add(chunk.generateMesh());
    }

    createChunk(x, z) {
        const chunk = new Chunk(x, z, this);
        this.chunks.set(this.getChunkKey(x, z), chunk);

        // Generate terrain
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const wx = x * CHUNK_SIZE + lx;
                const wz = z * CHUNK_SIZE + lz;
                const height = this.generator.getHeightAt(wx, wz);

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    // Simple cave system using 3D noise
                    const caveNoise = this.generator.noise.get3D(wx * 0.05, y * 0.05, wz * 0.05);
                    const isCave = caveNoise > 0.4 && y < height - 2;

                    if (isCave) {
                        chunk.setBlock(lx, y, lz, BLOCK_TYPES.AIR);
                        continue;
                    }

                    const blockType = this.generator.getBlockAt(wx, y, wz, height);
                    if (blockType !== BLOCK_TYPES.AIR) {
                        chunk.setBlock(lx, y, lz, blockType);
                    }
                }
            }
        }

        // Generate trees
        const waterLevel = 32;
        for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
            for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
                const wx = x * CHUNK_SIZE + lx;
                const wz = z * CHUNK_SIZE + lz;
                const height = this.generator.getHeightAt(wx, wz);
                const biome = this.generator.getBiomeAt(wx, wz);

                if (Math.random() < biome.treeFrequency && height > waterLevel + 2) {
                    this.generateTree(chunk, lx, height + 1, lz);
                }
            }
        }

        return chunk;
    }

    generateTree(chunk, x, y, z) {
        const trunkHeight = 4 + Math.floor(Math.random() * 3);
        // Trunk
        for (let i = 0; i < trunkHeight; i++) {
            chunk.setBlock(x, y + i, z, BLOCK_TYPES.WOOD);
        }
        // Leaves
        for (let lx = -2; lx <= 2; lx++) {
            for (let ly = -2; ly <= 2; ly++) {
                for (let lz = -2; lz <= 2; lz++) {
                    const dist = Math.sqrt(lx * lx + ly * ly + lz * lz);
                    if (dist < 2.5 && chunk.getBlock(x + lx, y + trunkHeight + ly, z + lz) === BLOCK_TYPES.AIR) {
                        chunk.setBlock(x + lx, y + trunkHeight + ly, z + lz, BLOCK_TYPES.LEAVES);
                    }
                }
            }
        }
    }

    update(playerPosition) {
        const pX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const pZ = Math.floor(playerPosition.z / CHUNK_SIZE);

        // Only update if player moved to a new chunk or on first call
        if (this.lastPX === pX && this.lastPZ === pZ && this.chunksToLoad.length === 0) {
            return;
        }

        if (this.lastPX !== pX || this.lastPZ !== pZ) {
            this.lastPX = pX;
            this.lastPZ = pZ;
            
            // Re-calculate chunks to load
            this.chunksToLoad = [];
            for (let x = pX - this.renderDistance; x <= pX + this.renderDistance; x++) {
                for (let z = pZ - this.renderDistance; z <= pZ + this.renderDistance; z++) {
                    const key = this.getChunkKey(x, z);
                    if (!this.chunks.has(key)) {
                        const dist = Math.sqrt(Math.pow(x - pX, 2) + Math.pow(z - pZ, 2));
                        this.chunksToLoad.push({ x, z, dist });
                    }
                }
            }
            // Sort by distance (closest first)
            this.chunksToLoad.sort((a, b) => a.dist - b.dist);
        }

        if (this.chunksToLoad.length > 0) {
            const c = this.chunksToLoad.shift();
            // Double check if it was created in the meantime
            if (!this.chunks.has(this.getChunkKey(c.x, c.z))) {
                const chunk = this.createChunk(c.x, c.z);
                this.scene.add(chunk.generateMesh());
            }
        }
    }
}
