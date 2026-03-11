import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Lighting } from './engine/lighting.js';
import { Physics } from './engine/physics.js';
import { World } from './world/world.js';
import { Player } from './player/player.js';
import { Camera } from './player/camera.js';
import { Controls } from './player/controls.js';
import { HUD } from './ui/hud.js';
import { MobileControls } from './ui/mobileControls.js';
import { Inventory } from './systems/inventory.js';
import { BLOCK_TYPES } from './world/blocks.js';
import { Mob } from './mobs/mob.js';
import { Boss } from './mobs/boss.js';

import { generateAITextures } from './utils/aiTextures.js';
import { textureManager } from './utils/textures.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        const container = document.getElementById('game-container');
        if (!container) {
            console.error("Fatal: game-container not found!");
            return;
        }
        this.renderer = new Renderer();
        this.lighting = new Lighting(this.scene);
        this.world = new World(this.scene);
        this.world.renderDistance = 4;
        this.physics = new Physics(this.world);
        this.player = new Player();
        this.camera = new Camera();
        this.controls = new Controls();
        this.inventory = new Inventory();
        this.hud = new HUD(this.inventory);
        
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);
        this.renderer.renderer.setClearColor(0x87ceeb);
        
        // Try to load AI textures
        this.loadAITextures();
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (this.isMobile) {
            this.mobileControls = new MobileControls(this.controls);
        } else {
            document.addEventListener('click', () => {
                document.body.requestPointerLock();
            });
        }

        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 8;

        this.setupEventListeners();
        
        // Force generate initial chunks around spawn
        console.log("Generating initial chunks...");
        for (let i = 0; i < 40; i++) {
            this.world.update(this.player.position);
        }
        
        // Find a land spot for spawn
        let spawnX = 8;
        let spawnZ = 8;
        let spawnHeight = this.world.generator.getHeightAt(spawnX, spawnZ);
        
        // Search in a small area for land if spawn is underwater
        if (spawnHeight < 22) {
            for (let ox = -16; ox <= 16; ox += 4) {
                for (let oz = -16; oz <= 16; oz += 4) {
                    const h = this.world.generator.getHeightAt(spawnX + ox, spawnZ + oz);
                    if (h >= 22) {
                        spawnX += ox;
                        spawnZ += oz;
                        spawnHeight = h;
                        break;
                    }
                }
                if (spawnHeight >= 22) break;
            }
        }
        
        this.player.position.set(spawnX, Math.max(spawnHeight, 22) + 2, spawnZ);
        
        // Initialize camera position to player position
        this.camera.camera.position.copy(this.player.position);
        this.camera.camera.position.y += 1.6;

        this.spawnInitialMobs();

        window.addEventListener('resize', () => {
            this.camera.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.camera.updateProjectionMatrix();
            this.renderer.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        requestAnimationFrame((t) => this.animate(t));
    }

    async loadAITextures() {
        try {
            const aiTextures = await generateAITextures();
            if (aiTextures) {
                console.log("AI Textures loaded!");
                textureManager.useAITextures(aiTextures);
                if (this.hud) this.hud.refreshAtlas();
                // Refresh world chunks to apply new textures
                this.world.chunks.forEach(chunk => {
                    if (chunk.mesh) {
                        this.scene.remove(chunk.mesh);
                        this.scene.add(chunk.generateMesh());
                    }
                });
            } else {
                this.showApiKeyPrompt();
            }
        } catch (error) {
            console.error("Error loading AI textures:", error);
            if (error.message?.includes("403") || error.message?.includes("permission")) {
                this.showApiKeyPrompt();
            }
        }
    }

    async showApiKeyPrompt() {
        if (this.apiKeyPromptShown) return;
        this.apiKeyPromptShown = true;

        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            const btn = document.createElement('button');
            btn.innerHTML = '✨ Enable AI Textures (Select Key)';
            btn.style.cssText = `
                position: absolute;
                top: 70px;
                right: 20px;
                padding: 10px 20px;
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                z-index: 1000;
                font-family: sans-serif;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            `;
            btn.onclick = async () => {
                await window.aistudio.openSelectKey();
                btn.remove();
                // Reload textures after key selection
                this.loadAITextures();
            };
            document.body.appendChild(btn);
        }
    }

    spawnInitialMobs() {
        this.mobs = [];
        const hostileModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RobotExpressive/glTF-Binary/RobotExpressive.glb';
        const passiveModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
        const bossModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb';

        // Spawn a few mobs near the player
        for (let i = 0; i < 5; i++) {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                40,
                (Math.random() - 0.5) * 40
            );
            // Ensure they are above ground
            const height = this.world.generator.getHeightAt(pos.x, pos.z);
            pos.y = height + 2;
            const type = Math.random() > 0.5 ? 'hostile' : 'passive';
            const model = type === 'hostile' ? hostileModel : passiveModel;
            this.mobs.push(new Mob(this.scene, type, pos, model));
        }
        
        // Spawn one boss
        const bossPos = new THREE.Vector3(20, 0, 20);
        bossPos.y = this.world.generator.getHeightAt(bossPos.x, bossPos.z) + 5;
        this.mobs.push(new Boss(this.scene, bossPos, bossModel));
    }

    setupEventListeners() {
        const handleBreak = () => {
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera.camera);
            
            // Check for mobs first
            const mobMeshes = this.mobs.map(m => m.mesh);
            const mobIntersects = this.raycaster.intersectObjects(mobMeshes, true);
            if (mobIntersects.length > 0) {
                let hitObject = mobIntersects[0].object;
                // Find the parent group which is the mob mesh
                while (hitObject.parent && !this.mobs.find(m => m.mesh === hitObject)) {
                    hitObject = hitObject.parent;
                }
                const mob = this.mobs.find(m => m.mesh === hitObject);
                if (mob) {
                    mob.health -= 5;
                    // Visual feedback for hit
                    hitObject.traverse((child) => {
                        if (child.isMesh) {
                            if (!child.material.emissive) {
                                child.material = child.material.clone();
                                child.material.emissive = new THREE.Color(0x000000);
                            }
                            const oldColor = child.material.emissive.getHex();
                            child.material.emissive.setHex(0xff0000);
                            setTimeout(() => {
                                if (child.material) child.material.emissive.setHex(oldColor);
                            }, 150);
                        }
                    });
                    if (mob.health <= 0) {
                        this.scene.remove(mob.mesh);
                        this.mobs = this.mobs.filter(m => m !== mob);
                    }
                    return;
                }
            }

            const chunks = Array.from(this.world.chunks.values()).map(c => c.mesh).filter(m => m !== null);
            const intersects = this.raycaster.intersectObjects(chunks);
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const point = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(-0.1));
                this.world.setBlock(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z), BLOCK_TYPES.AIR);
            }
        };

        const handlePlace = () => {
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera.camera);
            const chunks = Array.from(this.world.chunks.values()).map(c => c.mesh).filter(m => m !== null);
            const intersects = this.raycaster.intersectObjects(chunks);
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const point = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(0.1));
                const item = this.inventory.getSelectedItem();
                if (item) {
                    const blockX = Math.floor(point.x);
                    const blockY = Math.floor(point.y);
                    const blockZ = Math.floor(point.z);
                    
                    // Simple player collision check for placement
                    const dist = this.player.position.distanceTo(new THREE.Vector3(blockX + 0.5, blockY + 0.5, blockZ + 0.5));
                    if (dist < 1.0) return;

                    this.world.setBlock(blockX, blockY, blockZ, item.type);
                }
            }
        };

        window.addEventListener('mousedown', (e) => {
            if (e.target !== this.renderer.renderer.domElement) return;
            if (e.button === 0) handleBreak();
            if (e.button === 2) handlePlace();
        });

        window.addEventListener('game-break', handleBreak);
        window.addEventListener('game-place', handlePlace);
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));

        if (time === undefined) return; // Wait for first frame with time

        if (!this.lastTime) {
            this.lastTime = time;
            return;
        }
        const delta = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        
        this.controls.update(this.player, delta);
        this.physics.applyPhysics(this.player, delta);
        this.world.update(this.player.position);
        this.lighting.update(time);
        
        // Underwater effects
        if (this.player.inWater) {
            this.scene.fog.density = 0.15;
            this.scene.fog.color.setHex(0x03a9f4);
            this.renderer.renderer.setClearColor(0x03a9f4);
            // Add a blue tint to the screen
            if (!this.waterOverlay) {
                this.waterOverlay = document.getElementById('water-overlay');
                if (!this.waterOverlay) {
                    this.waterOverlay = document.createElement('div');
                    this.waterOverlay.id = 'water-overlay';
                    this.waterOverlay.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(3, 169, 244, 0.3);
                        pointer-events: none;
                        z-index: 100;
                        display: none;
                    `;
                    document.body.appendChild(this.waterOverlay);
                }
            }
            this.waterOverlay.style.display = 'block';
        } else {
            this.scene.fog.density = 0.005;
            this.scene.fog.color.setHex(0x87ceeb);
            this.renderer.renderer.setClearColor(0x87ceeb);
            if (this.waterOverlay) {
                this.waterOverlay.style.display = 'none';
            }
        }
        
        // Smooth camera follow
        this.camera.update(this.player.position, this.controls.rotation, delta);
        
        // Update mobs
        if (this.mobs) {
            this.mobs.forEach(mob => mob.update(delta, this.player.position, this.world));
            
            // Spawn more mobs if needed
            if (this.mobs.length < 10 && Math.random() < 0.002) {
                const spawnPos = this.player.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 60,
                    0,
                    (Math.random() - 0.5) * 60
                ));
                spawnPos.y = this.world.generator.getHeightAt(spawnPos.x, spawnPos.z) + 2;
                const type = Math.random() > 0.5 ? 'hostile' : 'passive';
                const model = type === 'hostile' ? 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RobotExpressive/glTF-Binary/RobotExpressive.glb' : 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
                this.mobs.push(new Mob(this.scene, type, spawnPos, model));
            }
        }

        this.hud.update(this.player, this.inventory);
        
        this.renderer.render(this.scene, this.camera.camera);
    }
}

new Game();
