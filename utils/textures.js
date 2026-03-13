import * as THREE from 'three';

export class TextureManager {
    constructor() {
        this.atlasSize = 8; // 8x8 grid
        this.textureSize = 128; // Increased to 128 for HD quality
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
            },
            5: { // Wood Log
                top: 17,
                bottom: 17,
                side: 5
            },
            16: { // Cactus
                top: 18,
                bottom: 18,
                side: 16
            }
        };
    }

    generateAtlas() {
        const ctx = this.ctx;
        const s = this.textureSize;

        // Deterministic random for consistent textures
        let seed = 12345;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed / 4294967296;
        };

        const drawTexture = (idx, color1, color2, pattern = 'noise') => {
            const x = (idx % this.atlasSize) * s;
            const y = Math.floor(idx / this.atlasSize) * s;

            // Base color
            ctx.fillStyle = color1;
            ctx.fillRect(x, y, s, s);

            const pixelSize = s / 32; // Increased detail (32x32 pixels)
            
            if (pattern === 'noise') {
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.8) {
                            ctx.fillStyle = color2;
                        } else if (r < 0.1) {
                            ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        } else if (r < 0.2) {
                            ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        } else {
                            ctx.fillStyle = color1;
                        }
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                    }
                }
            } else if (pattern === 'grass_top') {
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.6) {
                            ctx.fillStyle = color2;
                        } else if (r < 0.15) {
                            ctx.fillStyle = '#7ed321'; // Bright grass
                        } else if (r < 0.25) {
                            ctx.fillStyle = '#4a7c16'; // Dark grass
                        } else {
                            ctx.fillStyle = color1;
                        }
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                        
                        // Detailed grass blades
                        if (random() > 0.92) {
                            ctx.fillStyle = 'rgba(0,0,0,0.3)';
                            ctx.fillRect(x + px, y + py, pixelSize, pixelSize * 2);
                        }
                    }
                }
            } else if (pattern === 'dirt') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.8) {
                            ctx.fillStyle = color2;
                        } else if (r < 0.05) {
                            ctx.fillStyle = '#3e2723'; // Deep dirt
                        } else if (r < 0.12) {
                            ctx.fillStyle = '#a1887f'; // Stones
                            ctx.fillRect(x + px, y + py, pixelSize * 2, pixelSize * 2);
                            continue;
                        } else {
                            ctx.fillStyle = color1;
                        }
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                    }
                }
            } else if (pattern === 'grass_side') {
                // Base dirt with noise
                ctx.fillStyle = '#5d4037'; 
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        if (random() > 0.85) {
                            ctx.fillStyle = '#4e342e';
                            ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                        }
                    }
                }

                // Grass overlay with "hanging" blades
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, pixelSize * 8);
                
                for (let px = 0; px < s; px += pixelSize) {
                    const h = Math.floor(random() * 8 + 4) * pixelSize;
                    ctx.fillStyle = color1;
                    ctx.fillRect(x + px, y, pixelSize, h);
                    
                    if (random() > 0.6) {
                        ctx.fillStyle = color2;
                        ctx.fillRect(x + px, y + h - pixelSize, pixelSize, pixelSize);
                    }
                }
            } else if (pattern === 'bricks') {
                ctx.fillStyle = color2; // Mortar
                ctx.fillRect(x, y, s, s);
                
                const brickH = s / 4;
                const brickW = s / 2;
                for (let i = 0; i < 4; i++) {
                    const rowY = y + i * brickH;
                    const offset = (i % 2) * brickW;
                    
                    for (let j = 0; j < 2; j++) {
                        const brickX = x + (j * brickW + offset) % s;
                        ctx.fillStyle = color1;
                        ctx.fillRect(brickX + pixelSize, rowY + pixelSize, brickW - pixelSize * 2, brickH - pixelSize * 2);
                        
                        // Brick texture detail
                        for (let bx = pixelSize; bx < brickW - pixelSize; bx += pixelSize) {
                            for (let by = pixelSize; by < brickH - pixelSize; by += pixelSize) {
                                const r = random();
                                if (r > 0.7) {
                                    ctx.fillStyle = 'rgba(0,0,0,0.15)';
                                    ctx.fillRect(brickX + bx, rowY + by, pixelSize, pixelSize);
                                }
                            }
                        }
                    }
                }
            } else if (pattern === 'cobblestone') {
                ctx.fillStyle = '#444444'; // Mortar
                ctx.fillRect(x, y, s, s);
                
                // Draw many irregular stones
                for (let i = 0; i < 16; i++) {
                    const sx = x + random() * (s - pixelSize * 6);
                    const sy = y + random() * (s - pixelSize * 6);
                    const sw = (random() * 3 + 3) * pixelSize;
                    const sh = (random() * 3 + 3) * pixelSize;
                    
                    ctx.fillStyle = random() > 0.5 ? '#777777' : '#666666';
                    ctx.fillRect(sx, sy, sw, sh);
                    
                    // Highlight on stone
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(sx, sy, sw, pixelSize);
                    ctx.fillRect(sx, sy, pixelSize, sh);
                }
            } else if (pattern === 'stone') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.85) {
                            ctx.fillStyle = color2;
                        } else if (r < 0.1) {
                            ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        } else if (r < 0.2) {
                            ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        } else {
                            ctx.fillStyle = color1;
                        }
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                    }
                }
                // More cracks
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = pixelSize;
                for(let i=0; i<4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x + random()*s, y + random()*s);
                    ctx.lineTo(x + random()*s, y + random()*s);
                    ctx.stroke();
                }
            } else if (pattern === 'sand') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.9) ctx.fillStyle = color2;
                        else if (r < 0.1) ctx.fillStyle = '#d4c58d';
                        else ctx.fillStyle = color1;
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                    }
                }
                // Dune ripples
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                for(let i=0; i<5; i++) {
                    const ry = y + random()*s;
                    ctx.beginPath();
                    ctx.moveTo(x, ry);
                    for(let rx=0; rx<=s; rx+=pixelSize*4) {
                        ctx.lineTo(x + rx, ry + (random()-0.5)*pixelSize*4);
                    }
                    ctx.stroke();
                }
            } else if (pattern === 'water') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.8) ctx.fillStyle = color2;
                        else if (r < 0.1) ctx.fillStyle = 'rgba(255,255,255,0.3)';
                        else ctx.fillStyle = color1;
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                    }
                }
                // Animated-look waves
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                for(let i=0; i<4; i++) {
                    const wy = y + random()*s;
                    ctx.beginPath();
                    ctx.moveTo(x, wy);
                    ctx.bezierCurveTo(x+s/3, wy-pixelSize*4, x+2*s/3, wy+pixelSize*4, x+s, wy);
                    ctx.stroke();
                }
            } else if (pattern === 'glass') {
                ctx.fillStyle = 'rgba(200,240,255,0.2)';
                ctx.fillRect(x, y, s, s);
                // Thick frame
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = pixelSize * 2;
                ctx.strokeRect(x + pixelSize, y + pixelSize, s - pixelSize * 2, s - pixelSize * 2);
                // Multiple shines
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = pixelSize;
                for(let i=0; i<3; i++) {
                    const offset = i * pixelSize * 4;
                    ctx.beginPath();
                    ctx.moveTo(x + s*0.2 + offset, y + s*0.8);
                    ctx.lineTo(x + s*0.8, y + s*0.2 - offset);
                    ctx.stroke();
                }
            } else if (pattern === 'cactus') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                // Vertical ridges
                for(let i=1; i<4; i++) {
                    ctx.fillStyle = color2;
                    ctx.fillRect(x + i*(s/4) - pixelSize, y, pixelSize * 2, s);
                }
                // Many spikes
                ctx.fillStyle = '#000000';
                for(let i=0; i<24; i++) {
                    ctx.fillRect(x + random()*s, y + random()*s, pixelSize, pixelSize);
                }
            } else if (pattern === 'bedrock') {
                ctx.fillStyle = '#000000';
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.6) ctx.fillStyle = '#222222';
                        else if (r < 0.2) ctx.fillStyle = '#111111';
                        else ctx.fillStyle = '#000000';
                        ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                    }
                }
                // High contrast spots
                for(let i=0; i<10; i++) {
                    ctx.fillStyle = '#333333';
                    ctx.fillRect(x + random()*s, y + random()*s, pixelSize*2, pixelSize*2);
                }
            } else if (pattern === 'log_side') {
                ctx.fillStyle = '#3e2723'; // Dark bark
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    const r = random();
                    if (r > 0.4) {
                        ctx.fillStyle = '#4e342e'; // Medium bark
                        ctx.fillRect(x + px, y, pixelSize, s);
                    }
                    if (r > 0.8) {
                        ctx.fillStyle = '#5d4037'; // Light bark
                        ctx.fillRect(x + px, y, pixelSize, s);
                    }
                }
                // Deep vertical grooves
                for(let i=0; i<6; i++) {
                    ctx.fillStyle = '#1a0f0d';
                    ctx.fillRect(x + random()*s, y, pixelSize * 2, s);
                }
            } else if (pattern === 'log_top') {
                ctx.fillStyle = '#d7ccc8'; // Inner wood
                ctx.fillRect(x, y, s, s);
                ctx.strokeStyle = '#a1887f';
                ctx.lineWidth = pixelSize;
                // Many growth rings
                for (let r = 1; r < 8; r++) {
                    ctx.beginPath();
                    ctx.arc(x + s/2, y + s/2, (s/2) * (r/8), 0, Math.PI * 2);
                    ctx.stroke();
                }
                // Bark border
                ctx.strokeStyle = '#3e2723';
                ctx.lineWidth = pixelSize * 3;
                ctx.strokeRect(x + pixelSize, y + pixelSize, s - pixelSize * 2, s - pixelSize * 2);
            } else if (pattern === 'leaves') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.6) {
                            ctx.fillStyle = color2;
                            ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                        } else if (r < 0.25) {
                            ctx.clearRect(x + px, y + py, pixelSize, pixelSize); // Transparency
                        }
                    }
                }
            } else if (pattern === 'planks') {
                ctx.fillStyle = color1;
                ctx.fillRect(x, y, s, s);
                for (let i = 0; i < 4; i++) {
                    const py = y + i * (s/4);
                    // Plank separation
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
                    ctx.fillRect(x, py + (s/4) - pixelSize, s, pixelSize);
                    
                    // Wood grain detail
                    for (let px = 0; px < s; px += pixelSize) {
                        const r = random();
                        if (r > 0.7) {
                            ctx.fillStyle = color2;
                            ctx.fillRect(x + px, py + random() * (s/4), pixelSize, pixelSize);
                        }
                        // Knots in wood
                        if (r > 0.98) {
                            ctx.fillStyle = '#3e2723';
                            ctx.fillRect(x + px, py + random() * (s/4), pixelSize * 2, pixelSize * 2);
                        }
                    }
                }
            } else if (pattern === 'ore') {
                // Base stone with more detail
                ctx.fillStyle = '#808080';
                ctx.fillRect(x, y, s, s);
                for (let px = 0; px < s; px += pixelSize) {
                    for (let py = 0; py < s; py += pixelSize) {
                        const r = random();
                        if (r > 0.8) {
                            ctx.fillStyle = '#666666';
                            ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
                        }
                    }
                }
                // Clustered ore spots
                for (let i = 0; i < 8; i++) {
                    const ox = Math.floor(random() * 24 + 4) * pixelSize;
                    const oy = Math.floor(random() * 24 + 4) * pixelSize;
                    
                    ctx.fillStyle = color1;
                    ctx.fillRect(x + ox, y + oy, pixelSize * 2, pixelSize * 2);
                    ctx.fillRect(x + ox + pixelSize, y + oy - pixelSize, pixelSize * 2, pixelSize * 3);
                    
                    // Shiny highlight
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.fillRect(x + ox, y + oy, pixelSize, pixelSize);
                }
            }

            // Global block border (makes voxels pop)
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = pixelSize;
            ctx.strokeRect(x + pixelSize/2, y + pixelSize/2, s - pixelSize, s - pixelSize);
            
            // Subtle top highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x, y, s, pixelSize * 2);

            // Vignette effect (darker edges)
            const gradient = ctx.createRadialGradient(x + s/2, y + s/2, s/4, x + s/2, y + s/2, s/2);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, s, s);
        };

        // Indices match BLOCK_TYPES
        drawTexture(1, '#7cfc00', '#458b00', 'grass_top'); // Grass Top (Vibrant)
        drawTexture(2, '#8b4513', '#5d2e0a', 'dirt'); // Dirt (Rich brown)
        drawTexture(3, '#a9a9a9', '#696969', 'stone'); // Stone (Solid gray)
        drawTexture(4, '#f4a460', '#cd853f', 'sand'); // Sand (Golden)
        drawTexture(5, '#5d4037', '#3e2723', 'log_side'); // Wood Log Side
        drawTexture(6, '#228b22', '#006400', 'leaves'); // Leaves (Deep green)
        drawTexture(7, '#1e90ff', '#0000ff', 'water'); // Water (Bright blue)
        drawTexture(8, '#ffffff', '#f0f8ff', 'noise'); // Snow
        drawTexture(9, '#111111', '#000000', 'bedrock'); // Bedrock
        drawTexture(10, '#deb887', '#8b4513', 'planks'); // Planks
        drawTexture(11, '#808080', '#505050', 'cobblestone'); // Cobblestone
        drawTexture(12, '#7cfc00', '#8b4513', 'grass_side'); // Grass Side
        drawTexture(13, 'rgba(240,248,255,0.4)', 'rgba(255,255,255,0.8)', 'glass'); // Glass
        drawTexture(14, '#778899', '#4682b4', 'noise'); // Gravel
        drawTexture(15, '#4b3621', '#2c1e14', 'dirt'); // Mud
        drawTexture(16, '#006400', '#004d00', 'cactus'); // Cactus Side
        drawTexture(17, '#f5deb3', '#d2b48c', 'log_top'); // Wood Log Top
        drawTexture(18, '#006400', '#004d00', 'cactus'); // Cactus Top
        drawTexture(19, '#2f4f4f', '#000000', 'ore'); // Coal Ore
        drawTexture(20, '#ff7f50', '#cd5c5c', 'ore'); // Iron Ore
        drawTexture(21, '#ffd700', '#daa520', 'ore'); // Gold Ore
        drawTexture(22, '#00ffff', '#00ced1', 'ore'); // Diamond Ore

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.generateMipmaps = false;
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;

        this.material = new THREE.MeshStandardMaterial({ 
            map: this.texture,
            vertexColors: true,
            transparent: true,
            alphaTest: 0.1,
            roughness: 0.8,
            metalness: 0.1
        });
    }

    getUVs(blockType, face = 'side') {
        let idx = blockType;
        if (this.faceMap[blockType]) {
            idx = this.faceMap[blockType][face] || idx;
        }

        const s = 1 / this.atlasSize;
        const eps = 0.001; // Reduced padding for sharper textures
        const x = (idx % this.atlasSize) * s + eps;
        const y = 1 - (Math.floor(idx / this.atlasSize) + 1) * s + eps;
        const ss = s - 2 * eps;
        
        return [
            [x, y],
            [x + ss, y],
            [x + ss, y + ss],
            [x, y + ss]
        ];
    }

    refreshMaterial() {
        this.generateAtlas();
        // This is a bit hacky but it works for a quick refresh
        window.location.reload(); 
    }
}

export const textureManager = new TextureManager();
textureManager.generateAtlas();
