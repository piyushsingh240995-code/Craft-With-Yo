import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { TerrainGenerator } from './terrain.js';
import { BLOCK_TYPES } from './blocks.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.generator = new TerrainGenerator(Math.random());
        this.renderDistance = 2;
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

    setBlock(x, y, z, type, refreshMesh = true) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        let chunk = this.getChunk(chunkX, chunkZ);
        
        if (!chunk) {
            chunk = this.createChunk(chunkX, chunkZ);
        }

        const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        chunk.setBlock(localX, y, localZ, type);
        
        if (refreshMesh) {
            this.refreshChunkMesh(chunkX, chunkZ);
        }
    }

    refreshChunkMesh(x, z) {
        const chunk = this.getChunk(x, z);
        if (!chunk) return;

        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            // Material is shared, don't dispose
        }
        this.scene.add(chunk.generateMesh());
    }

    createChunk(x, z) {
        const chunk = new Chunk(x, z, this);
        this.chunks.set(this.getChunkKey(x, z), chunk);

        // Generate terrain in a single pass
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const wx = x * CHUNK_SIZE + lx;
                const wz = z * CHUNK_SIZE + lz;
                const height = this.generator.getHeightAt(wx, wz);
                const biome = this.generator.getBiomeAt(wx, wz);

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    const blockType = this.generator.getBlockAt(wx, y, wz, height);
                    if (blockType !== BLOCK_TYPES.AIR) {
                        chunk.setBlock(lx, y, lz, blockType);
                    }
                }

                // Flora generation
                const waterLevel = this.generator.settings.seaLevel;
                if (height > waterLevel + 2) {
                    const rand = Math.random();
                    if (rand < biome.treeFrequency) {
                        this.generateTree(chunk, lx, height + 1, lz, biome.name);
                    } else if (biome.cactusFrequency && rand < biome.treeFrequency + biome.cactusFrequency) {
                        this.generateCactus(chunk, lx, height + 1, lz);
                    }
                }
            }
        }

        return chunk;
    }

    resetWorld() {
        // Clear all chunks from scene and memory
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh) {
                this.scene.remove(chunk.mesh);
                chunk.mesh.geometry.dispose();
                // Material is shared, so don't dispose it here
            }
        }
        this.chunks.clear();
        this.lastPX = null;
        this.lastPZ = null;
        this.chunksToLoad = [];
    }

    generateTree(chunk, x, y, z, biomeName) {
        let trunkHeight = 4 + Math.floor(Math.random() * 3);
        let leafRadius = 2.5;

        if (biomeName === 'Jungle') {
            trunkHeight = 8 + Math.floor(Math.random() * 6);
            leafRadius = 3.5;
        }

        // Trunk
        for (let i = 0; i < trunkHeight; i++) {
            chunk.setBlock(x, y + i, z, BLOCK_TYPES.WOOD);
        }
        // Leaves
        for (let lx = -Math.floor(leafRadius); lx <= Math.floor(leafRadius); lx++) {
            for (let ly = -Math.floor(leafRadius); ly <= Math.floor(leafRadius); ly++) {
                for (let lz = -Math.floor(leafRadius); lz <= Math.floor(leafRadius); lz++) {
                    const dist = Math.sqrt(lx * lx + ly * ly + lz * lz);
                    if (dist < leafRadius && chunk.getBlock(x + lx, y + trunkHeight + ly, z + lz) === BLOCK_TYPES.AIR) {
                        chunk.setBlock(x + lx, y + trunkHeight + ly, z + lz, BLOCK_TYPES.LEAVES);
                    }
                }
            }
        }
    }

    generateCactus(chunk, x, y, z) {
        const height = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < height; i++) {
            chunk.setBlock(x, y + i, z, BLOCK_TYPES.CACTUS);
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
            // Load more chunks per frame if we have many to load (e.g. after reset)
            const loadCount = this.chunksToLoad.length > 10 ? 3 : 1;
            
            for (let i = 0; i < loadCount && this.chunksToLoad.length > 0; i++) {
                const c = this.chunksToLoad.shift();
                const key = this.getChunkKey(c.x, c.z);
                if (!this.chunks.has(key)) {
                    const chunk = this.createChunk(c.x, c.z);
                    this.scene.add(chunk.generateMesh());
                }
            }
        }
    }
}
