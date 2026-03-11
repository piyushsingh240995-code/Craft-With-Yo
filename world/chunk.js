import * as THREE from 'three';
import { BLOCK_TYPES, BLOCKS } from './blocks.js';
import { textureManager } from '../utils/textures.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
    constructor(x, z, world) {
        this.x = x;
        this.z = z;
        this.world = world;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
        this.isDirty = true;
    }

    getBlockIndex(x, y, z) {
        return (x * CHUNK_HEIGHT * CHUNK_SIZE) + (y * CHUNK_SIZE) + z;
    }

    setBlock(x, y, z, type) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
        this.blocks[this.getBlockIndex(x, y, z)] = type;
        this.isDirty = true;
    }

    getBlock(x, y, z) {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
            return this.blocks[(x * CHUNK_HEIGHT * CHUNK_SIZE) + (y * CHUNK_SIZE) + z];
        }
        return this.world.getBlock(this.x * CHUNK_SIZE + x, y, this.z * CHUNK_SIZE + z);
    }

    generateMesh() {
        const positions = [];
        const normals = [];
        const uvs = [];
        const colors = [];
        const indices = [];
        let vertexCount = 0;

        const getAO = (x, y, z, n1, n2, n3) => {
            const b1 = this.world.getBlock(x + n1[0], y + n1[1], z + n1[2]) !== 0 ? 1 : 0;
            const b2 = this.world.getBlock(x + n2[0], y + n2[1], z + n2[2]) !== 0 ? 1 : 0;
            const b3 = this.world.getBlock(x + n3[0], y + n3[1], z + n3[2]) !== 0 ? 1 : 0;
            
            if (b1 && b3) return 0.5; // Corner
            return 1.0 - (b1 + b2 + b3) * 0.15;
        };

        const addFace = (x, y, z, faceNormal, faceVertices, blockType, faceName) => {
            const blockUVs = textureManager.getUVs(blockType, faceName);
            
            // World coordinates for AO
            const wx = this.x * CHUNK_SIZE + x;
            const wy = y;
            const wz = this.z * CHUNK_SIZE + z;

            const isWater = blockType === BLOCK_TYPES.WATER;
            const waterHeight = 0.9;

            for (let i = 0; i < 4; i++) {
                const v = [...faceVertices[i]];
                // Lower top face of water
                if (isWater && v[1] === 1 && faceNormal[1] === 1) {
                    v[1] = waterHeight;
                }
                // Lower side faces of water at the top
                if (isWater && v[1] === 1 && faceNormal[1] === 0) {
                    v[1] = waterHeight;
                }

                positions.push(x + v[0], y + v[1], z + v[2]);
                normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
                uvs.push(blockUVs[i][0], blockUVs[i][1]);
                
                // AO Neighbors
                const nx = faceNormal[0] !== 0 ? 0 : (v[0] > 0.5 ? 1 : -1);
                const ny = faceNormal[1] !== 0 ? 0 : (v[1] > 0.5 ? 1 : -1);
                const nz = faceNormal[2] !== 0 ? 0 : (v[2] > 0.5 ? 1 : -1);
                
                const ao = getAO(wx + faceNormal[0], wy + faceNormal[1], wz + faceNormal[2], [nx, 0, 0], [0, ny, 0], [0, 0, nz]);
                colors.push(ao, ao, ao);
            }
            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount, vertexCount + 2, vertexCount + 3
            );
            vertexCount += 4;
        };

        const faces = [
            { dir: [0, 0, 1], verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], norm: [0, 0, 1], name: 'side' }, // front
            { dir: [0, 0, -1], verts: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], norm: [0, 0, -1], name: 'side' }, // back
            { dir: [-1, 0, 0], verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], norm: [-1, 0, 0], name: 'side' }, // left
            { dir: [1, 0, 0], verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], norm: [1, 0, 0], name: 'side' }, // right
            { dir: [0, 1, 0], verts: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], norm: [0, 1, 0], name: 'top' }, // top
            { dir: [0, -1, 0], verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], norm: [0, -1, 0], name: 'bottom' }, // bottom
        ];

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const blockType = this.blocks[(x * CHUNK_HEIGHT * CHUNK_SIZE) + (y * CHUNK_SIZE) + z];
                    if (blockType === BLOCK_TYPES.AIR) continue;

                    for (const face of faces) {
                        const nx = x + face.dir[0];
                        const ny = y + face.dir[1];
                        const nz = z + face.dir[2];
                        
                        let neighbor;
                        if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
                            neighbor = this.blocks[(nx * CHUNK_HEIGHT * CHUNK_SIZE) + (ny * CHUNK_SIZE) + nz];
                        } else {
                            neighbor = this.world.getBlock(this.x * CHUNK_SIZE + nx, ny, this.z * CHUNK_SIZE + nz);
                        }

                        if (neighbor === BLOCK_TYPES.AIR || (BLOCKS[neighbor]?.transparent && neighbor !== blockType)) {
                            addFace(x, y, z, face.norm, face.verts, blockType, face.name);
                        }
                    }
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({ 
            map: textureManager.texture,
            vertexColors: true,
            transparent: true,
            alphaTest: 0.1,
            roughness: 0.8,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.x * CHUNK_SIZE, 0, this.z * CHUNK_SIZE);
        
        this.isDirty = false;
        return this.mesh;
    }
}
