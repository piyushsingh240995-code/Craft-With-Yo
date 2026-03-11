import * as THREE from 'three';

export class TextureManager {
    constructor() {
        this.atlasSize = 8; // 8x8 grid
        this.textureSize = 32;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.atlasSize * this.textureSize;
        this.canvas.height = this.atlasSize * this.textureSize;
        this.ctx = this.canvas.getContext('2d');
        this.texture = null;
        
        // Face mapping for special blocks
        this.faceMap = {
            1: { // Grass
                top: 1,
                bottom: 2,
                side: 12
            }
        };
    }

    generateAtlas() {
        const ctx = this.ctx;
        const s = this.textureSize;

        const drawTexture = (idx, color1, color2, pattern = 'noise') => {
            const x = (idx % this.atlasSize) * s;
            const y = Math.floor(idx / this.atlasSize) * s;

            // Base color
            ctx.fillStyle = color1;
            ctx.fillRect(x, y, s, s);

            if (pattern === 'noise') {
                for (let px = 0; px < s; px++) {
                    for (let py = 0; py < s; py++) {
                        const rand = Math.random();
                        if (rand > 0.85) {
                            ctx.fillStyle = color2;
                            ctx.fillRect(x + px, y + py, 1, 1);
                        } else if (rand < 0.1) {
                            ctx.fillStyle = 'rgba(0,0,0,0.2)';
                            ctx.fillRect(x + px, y + py, 1, 1);
                        } else if (rand < 0.2) {
                            ctx.fillStyle = 'rgba(255,255,255,0.15)';
                            ctx.fillRect(x + px, y + py, 1, 1);
                        }
                        
                        // Add some micro-noise for grit
                        if (Math.random() > 0.98) {
                            ctx.fillStyle = 'rgba(0,0,0,0.4)';
                            ctx.fillRect(x + px, y + py, 1, 1);
                        }
                    }
                }
                
                // Add some subtle gradients
                const grad = ctx.createLinearGradient(x, y, x + s, y + s);
                grad.addColorStop(0, 'rgba(255,255,255,0.05)');
                grad.addColorStop(1, 'rgba(0,0,0,0.05)');
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, s, s);
            } else if (pattern === 'grass') {
                // Top part is grass, bottom is dirt
                ctx.fillStyle = '#5d4037'; // Darker Dirt
                ctx.fillRect(x, y + s/2, s, s/2);
                ctx.fillStyle = color1; // Grass
                ctx.fillRect(x, y, s, s/2);
                
                // Grass blades and details
                for (let i = 0; i < 60; i++) {
                    ctx.fillStyle = Math.random() > 0.5 ? color2 : '#2e7d32';
                    ctx.fillRect(x + Math.random() * s, y + Math.random() * (s/2), 1, Math.random() * 4 + 1);
                }
                
                // Dirt details
                ctx.fillStyle = '#3e2723';
                for (let i = 0; i < 20; i++) {
                    ctx.fillRect(x + Math.random() * s, y + s/2 + Math.random() * (s/2), 1, 1);
                }
            } else if (pattern === 'grass_side') {
                // Base dirt
                ctx.fillStyle = '#5d4037'; 
                ctx.fillRect(x, y, s, s);
                
                // Noise on dirt
                for (let i = 0; i < 40; i++) {
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(x + Math.random() * s, y + Math.random() * s, 1, 1);
                }
                
                // Grass overlay on top
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s/4);
                
                // Drip effect (more natural)
                for (let i = 0; i < s; i++) {
                    const h = Math.floor(Math.random() * (s/3) + (s/8));
                    ctx.fillStyle = color1;
                    ctx.fillRect(x + i, y, 1, h);
                    
                    // Darker edge for grass drip
                    ctx.fillStyle = color2;
                    ctx.fillRect(x + i, y + h - 1, 1, 1);
                }
                
                // Details
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                for (let i = 0; i < 20; i++) {
                    ctx.fillRect(x + Math.random() * s, y + s/4 + Math.random() * (3*s/4), 1, 1);
                }
            } else if (pattern === 'bricks') {
                ctx.fillStyle = color2;
                const brickH = s / 4;
                for (let i = 0; i < 4; i++) {
                    const rowY = y + i * brickH;
                    ctx.fillRect(x, rowY + brickH - 1, s, 1); // Horizontal line
                    
                    // Vertical lines
                    const offset = (i % 2) * (s / 2);
                    ctx.fillRect(x + offset, rowY, 1, brickH);
                    ctx.fillRect(x + (offset + s / 2) % s, rowY, 1, brickH);
                }
                
                // Add some wear to bricks
                for (let i = 0; i < 30; i++) {
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(x + Math.random() * s, y + Math.random() * s, 1, 1);
                }
            }

            // High-contrast border for voxel look
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
            
            // Inner shadow for depth
            const grad = ctx.createRadialGradient(x + s/2, y + s/2, 0, x + s/2, y + s/2, s/2);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, 'rgba(0,0,0,0.2)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, s, s);
            
            // Highlight edge
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(x + 1, y + s - 1);
            ctx.lineTo(x + 1, y + 1);
            ctx.lineTo(x + s - 1, y + 1);
            ctx.stroke();
        };

        // Indices match BLOCK_TYPES
        // 0: Air (unused)
        drawTexture(1, '#4caf50', '#388e3c', 'noise'); // Grass Top
        drawTexture(2, '#795548', '#5d4037', 'noise'); // Dirt / Grass Bottom
        drawTexture(3, '#9e9e9e', '#757575', 'noise'); // Stone
        drawTexture(4, '#fff176', '#fbc02d', 'noise'); // Sand
        drawTexture(5, '#3e2723', '#21100b', 'bricks'); // Wood
        drawTexture(6, '#1b5e20', '#0a3d0d', 'noise'); // Leaves
        drawTexture(7, '#03a9f4', '#0288d1', 'noise'); // Water
        drawTexture(8, '#ffffff', '#f5f5f5', 'noise'); // Snow
        drawTexture(9, '#212121', '#000000', 'noise'); // Bedrock
        drawTexture(10, '#8d6e63', '#6d4c41', 'bricks'); // Planks
        drawTexture(11, '#757575', '#616161', 'bricks'); // Cobblestone
        drawTexture(12, '#4caf50', '#795548', 'grass_side'); // Grass Side
        drawTexture(13, 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.4)', 'bricks'); // Glass
        drawTexture(14, '#9e9e9e', '#757575', 'noise'); // Gravel

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;
    }

    useAITextures(aiTextures) {
        if (!aiTextures || !aiTextures.spriteSheet) return;

        const ctx = this.ctx;
        const s = this.textureSize;
        const img = new Image();
        
        img.onload = () => {
            // The AI generates a 1K image, we need to map its 4x4 grid to our atlas
            // We'll assume the AI followed the prompt's grid order
            const spriteSize = img.width / 4;
            
            const mapSprite = (atlasIdx, spriteX, spriteY) => {
                const ax = (atlasIdx % this.atlasSize) * s;
                const ay = Math.floor(atlasIdx / this.atlasSize) * s;
                ctx.drawImage(img, spriteX * spriteSize, spriteY * spriteSize, spriteSize, spriteSize, ax, ay, s, s);
            };

            // Map AI sprite sheet to our atlas indices
            mapSprite(1, 0, 0); // Grass Top
            mapSprite(2, 1, 0); // Dirt
            mapSprite(3, 2, 0); // Stone
            mapSprite(4, 3, 0); // Sand
            mapSprite(5, 0, 1); // Wood
            mapSprite(6, 1, 1); // Leaves
            mapSprite(7, 2, 1); // Water
            mapSprite(8, 3, 1); // Snow
            mapSprite(9, 0, 2); // Bedrock
            mapSprite(10, 1, 2); // Planks
            mapSprite(11, 2, 2); // Cobblestone
            mapSprite(12, 3, 2); // Grass Side
            mapSprite(13, 0, 3); // Glass
            mapSprite(14, 1, 3); // Gravel

            this.texture.needsUpdate = true;
        };
        img.src = `data:image/png;base64,${aiTextures.spriteSheet}`;
    }

    getUVs(blockType, face = 'side') {
        let idx = blockType;
        if (this.faceMap[blockType]) {
            idx = this.faceMap[blockType][face] || idx;
        }

        const s = 1 / this.atlasSize;
        const x = (idx % this.atlasSize) * s;
        const y = 1 - (Math.floor(idx / this.atlasSize) + 1) * s;
        
        return [
            [x, y],
            [x + s, y],
            [x + s, y + s],
            [x, y + s]
        ];
    }
}

export const textureManager = new TextureManager();
textureManager.generateAtlas();
