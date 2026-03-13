import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Lighting } from './engine/lighting.js';
import { World } from './world/world.js';
import { Player } from './player/player.js';
import { MobileControls } from './ui/mobileControls.js';
import { Inventory } from './systems/inventory.js';
import { BLOCKS, BLOCK_TYPES } from './world/blocks.js';
import { Mob } from './mobs/mob.js';
import { Boss } from './mobs/boss.js';
import { Pathfinding } from './utils/pathfinding.js';

import { textureManager } from './utils/textures.js';

// --- Consolidated Classes ---

class Physics {
    constructor(world) {
        this.world = world;
        this.gravity = -0.015;
    }

    applyPhysics(player, delta) {
        const dt = delta * 60;
        const headBlock = this.world.getBlock(Math.floor(player.position.x), Math.floor(player.position.y - 0.2), Math.floor(player.position.z));
        const footBlock = this.world.getBlock(Math.floor(player.position.x), Math.floor(player.position.y - player.height + 0.2), Math.floor(player.position.z));
        player.inWater = (headBlock === BLOCK_TYPES.WATER || footBlock === BLOCK_TYPES.WATER);

        let gravityStep = this.gravity * dt;
        if (player.inWater) {
            gravityStep *= 0.2;
            player.velocity.y *= 0.8;
        }
        player.velocity.y += gravityStep;
        
        player.position.y += player.velocity.y * dt;
        if (this.isColliding(player.position, player.width, player.height)) {
            if (player.velocity.y < 0) {
                player.position.y = Math.floor(player.position.y) + 1.0;
                player.onGround = true;
            } else {
                player.position.y = Math.floor(player.position.y);
            }
            player.velocity.y = 0;
        } else {
            player.onGround = false;
        }

        this.pushOutOfBlocks(player.position, player.width, player.height);

        const oldX = player.position.x;
        player.position.x += player.velocity.x * dt;
        if (this.isColliding(player.position, player.width, player.height)) {
            player.position.x = oldX;
            player.velocity.x = 0;
        }

        const oldZ = player.position.z;
        player.position.z += player.velocity.z * dt;
        if (this.isColliding(player.position, player.width, player.height)) {
            player.position.z = oldZ;
            player.velocity.z = 0;
        }
        
        const friction = player.inWater ? Math.pow(0.6, dt) : Math.pow(0.8, dt);
        player.velocity.x *= friction;
        player.velocity.z *= friction;
    }

    applyMobPhysics(mob, delta) {
        const dt = delta * 60;
        const headBlock = this.world.getBlock(Math.floor(mob.position.x), Math.floor(mob.position.y - 0.2), Math.floor(mob.position.z));
        const footBlock = this.world.getBlock(Math.floor(mob.position.x), Math.floor(mob.position.y - 1.6), Math.floor(mob.position.z));
        mob.inWater = (headBlock === BLOCK_TYPES.WATER || footBlock === BLOCK_TYPES.WATER);

        let gravityStep = this.gravity * dt;
        if (mob.inWater) {
            gravityStep *= 0.3;
            mob.velocity.y *= 0.7;
            if (mob.type === 'hostile' && Math.random() < 0.05) mob.velocity.y = 0.05;
        }
        mob.velocity.y += gravityStep;
        mob.position.y += mob.velocity.y * dt;
        
        if (this.isColliding(mob.position, 0.6, 1.8)) {
            if (mob.velocity.y < 0) {
                mob.position.y = Math.floor(mob.position.y) + 1.0;
                mob.onGround = true;
            } else {
                mob.position.y = Math.floor(mob.position.y);
            }
            mob.velocity.y = 0;
        } else {
            mob.onGround = false;
        }

        const oldX = mob.position.x;
        mob.position.x += mob.velocity.x * dt;
        if (this.isColliding(mob.position, 0.6, 1.8)) {
            mob.position.x = oldX;
            mob.velocity.x = 0;
            if (mob.onGround) mob.velocity.y = 0.15;
        }

        const oldZ = mob.position.z;
        mob.position.z += mob.velocity.z * dt;
        if (this.isColliding(mob.position, 0.6, 1.8)) {
            mob.position.z = oldZ;
            mob.velocity.z = 0;
            if (mob.onGround) mob.velocity.y = 0.15;
        }

        this.pushOutOfBlocks(mob.position, 0.6, 1.8);

        const friction = mob.inWater ? Math.pow(0.5, dt) : Math.pow(0.8, dt);
        mob.velocity.x *= friction;
        mob.velocity.z *= friction;
    }

    pushOutOfBlocks(pos, width, height) {
        if (!this.isColliding(pos, width, height)) return;
        const dirs = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
        for (const dir of dirs) {
            const testPos = pos.clone().add(new THREE.Vector3(dir.x * 0.4, 0, dir.z * 0.4));
            if (!this.isColliding(testPos, width, height)) {
                pos.add(new THREE.Vector3(dir.x * 0.2, 0, dir.z * 0.2));
                return;
            }
        }
        pos.y += 0.2;
    }

    isColliding(pos, width, height) {
        const eps = 0.01;
        const minX = Math.floor(pos.x - width / 2 + eps);
        const maxX = Math.floor(pos.x + width / 2 - eps);
        const minY = Math.floor(pos.y - height + eps);
        const maxY = Math.floor(pos.y - eps);
        const minZ = Math.floor(pos.z - width / 2 + eps);
        const maxZ = Math.floor(pos.z + width / 2 - eps);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.world.getBlock(x, y, z);
                    if (BLOCKS[block]?.collidable !== false && block !== 0) return true;
                }
            }
        }
        return false;
    }
}

class Camera {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    update(playerPosition, rotation, delta) {
        const targetPos = playerPosition.clone();
        targetPos.y += 1.6;
        const lerpFactor = 1 - Math.pow(0.001, delta);
        this.camera.position.lerp(targetPos, Math.min(lerpFactor, 0.5));
        this.camera.rotation.set(rotation.x, rotation.y, 0, 'YXZ');
    }
}

class Controls {
    constructor() {
        this.keys = {};
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.mouseSensitivity = 0.002;
        this.touchSensitivity = 0.005;

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.rotation.y -= e.movementX * this.mouseSensitivity;
                this.rotation.x -= e.movementY * this.mouseSensitivity;
                this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
            }
        });

        this.joystickPos = { x: 0, y: 0 };
        this.isJumping = false;
        this.jumpBuffer = 0;
    }

    update(player, delta) {
        const moveSpeed = 1.0 * delta;
        const jumpForce = 0.25;

        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.rotation.y, 0));

        if (this.keys['KeyW']) player.velocity.add(forward.multiplyScalar(moveSpeed));
        if (this.keys['KeyS']) player.velocity.add(forward.multiplyScalar(-moveSpeed));
        if (this.keys['KeyA']) player.velocity.add(right.multiplyScalar(-moveSpeed));
        if (this.keys['KeyD']) player.velocity.add(right.multiplyScalar(moveSpeed));
        
        if (this.keys['Space'] || this.isJumping) this.jumpBuffer = 0.2;

        if (this.jumpBuffer > 0) {
            if (player.onGround) {
                player.velocity.y = jumpForce;
                this.jumpBuffer = 0;
            } else if (player.inWater) {
                player.velocity.y = jumpForce * 0.5;
                this.jumpBuffer = 0;
            }
            this.jumpBuffer -= delta;
        }

        if (this.joystickPos.x !== 0 || this.joystickPos.y !== 0) {
            const joyForward = forward.clone().multiplyScalar(-this.joystickPos.y * moveSpeed);
            const joyRight = right.clone().multiplyScalar(this.joystickPos.x * moveSpeed);
            player.velocity.add(joyForward).add(joyRight);
        }
    }
}

class HUD {
    constructor(inventory) {
        this.inventory = inventory;
        this.container = document.getElementById('ui-container');
        this.createCrosshair();
        this.createHotbar();
        this.createHealthBar();
        this.createFullscreenButton();
        this.createInventoryButton();
        this.createRefreshButton();
        this.createInventoryScreen();
    }

    createRefreshButton() {
        const btn = document.createElement('div');
        btn.style.cssText = `position: absolute; top: 20px; left: 70px; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer;`;
        btn.innerHTML = '🔄';
        btn.title = 'Refresh Textures';
        btn.addEventListener('click', () => {
            textureManager.generateAtlas();
            // Update all existing meshes
            window.location.reload();
        });
        this.container.appendChild(btn);
    }

    createInventoryButton() {
        const btn = document.createElement('div');
        btn.style.cssText = `position: absolute; top: 20px; left: 20px; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer;`;
        btn.innerHTML = '🎒';
        btn.addEventListener('click', () => this.toggleInventory());
        this.container.appendChild(btn);
    }

    createInventoryScreen() {
        this.inventoryScreen = document.createElement('div');
        this.inventoryScreen.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; height: 400px; background: rgba(0,0,0,0.8); border-radius: 10px; display: none; flex-direction: column; padding: 20px; z-index: 1000;`;
        const title = document.createElement('h2');
        title.textContent = 'Inventory';
        title.style.color = 'white';
        title.style.marginBottom = '10px';
        this.inventoryScreen.appendChild(title);
        const grid = document.createElement('div');
        grid.style.cssText = `display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; overflow-y: auto;`;
        this.inventory.fullInventory.forEach((item, idx) => {
            const slot = document.createElement('div');
            slot.style.cssText = `width: 50px; height: 50px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer;`;
            slot.addEventListener('click', () => {
                this.inventory.hotbar[this.inventory.selectedSlot] = item;
                this.refreshAtlas();
                this.toggleInventory();
            });
            const icon = this.createBlockIcon(item.type, 40);
            slot.appendChild(icon);
            grid.appendChild(slot);
        });
        this.inventoryScreen.appendChild(grid);
        this.container.appendChild(this.inventoryScreen);
    }

    toggleInventory() {
        const isVisible = this.inventoryScreen.style.display === 'flex';
        this.inventoryScreen.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) document.exitPointerLock();
    }

    createBlockIcon(type, size) {
        const icon = document.createElement('div');
        const atlasSize = textureManager.atlasSize;
        const texSize = textureManager.textureSize;
        const x = (type % atlasSize) * texSize;
        const y = Math.floor(type / atlasSize) * texSize;
        icon.style.cssText = `width: ${size}px; height: ${size}px; background-image: url(${this.atlasDataURL || textureManager.canvas.toDataURL()}); background-position: -${x}px -${y}px; background-size: ${atlasSize * texSize}px ${atlasSize * texSize}px; image-rendering: pixelated;`;
        return icon;
    }

    createFullscreenButton() {
        const btn = document.createElement('div');
        btn.style.cssText = `position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 5px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; cursor: pointer;`;
        btn.innerHTML = '⛶';
        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
        this.container.appendChild(btn);
    }

    createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        this.container.appendChild(crosshair);
    }

    createHotbar() {
        const hotbar = document.createElement('div');
        hotbar.style.cssText = `position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 5px;`;
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `width: 40px; height: 40px; background: rgba(255,255,255,0.2); border: 2px solid transparent; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;`;
            slot.id = `hotbar-slot-${i}`;
            if (i === 0) slot.style.borderColor = 'white';
            slot.addEventListener('mousedown', (e) => { e.stopPropagation(); this.inventory.selectedSlot = i; });
            slot.addEventListener('touchstart', (e) => { e.stopPropagation(); this.inventory.selectedSlot = i; });
            hotbar.appendChild(slot);
        }
        this.container.appendChild(hotbar);
    }

    createHealthBar() {
        const healthContainer = document.createElement('div');
        healthContainer.style.cssText = `position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); width: 200px; height: 10px; background: rgba(0,0,0,0.5); border-radius: 5px;`;
        const healthFill = document.createElement('div');
        healthFill.id = 'health-fill';
        healthFill.style.cssText = `width: 100%; height: 100%; background: #ff4444; border-radius: 5px; transition: width 0.3s;`;
        healthContainer.appendChild(healthFill);
        this.container.appendChild(healthContainer);
    }

    refreshAtlas() {
        this.atlasDataURL = textureManager.canvas.toDataURL();
        for (let i = 0; i < 9; i++) {
            const slot = document.getElementById(`hotbar-slot-${i}`);
            if (slot) slot.innerHTML = '';
        }
    }

    update(player, inventory) {
        const healthFill = document.getElementById('health-fill');
        if (healthFill) healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
        if (!this.atlasDataURL) this.atlasDataURL = textureManager.canvas.toDataURL();
        for (let i = 0; i < 9; i++) {
            const slot = document.getElementById(`hotbar-slot-${i}`);
            if (slot) {
                const isSelected = inventory.selectedSlot === i;
                slot.style.borderColor = isSelected ? 'white' : 'transparent';
                slot.style.background = isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
                const item = inventory.hotbar[i];
                if (item) {
                    if (!slot.hasChildNodes()) {
                        const icon = document.createElement('div');
                        const atlasSize = textureManager.atlasSize;
                        const texSize = textureManager.textureSize;
                        const idx = item.type;
                        const x = (idx % atlasSize) * texSize;
                        const y = Math.floor(idx / atlasSize) * texSize;
                        icon.style.cssText = `width: 32px; height: 32px; background-image: url(${this.atlasDataURL}); background-position: -${x}px -${y}px; background-size: ${atlasSize * texSize}px ${atlasSize * texSize}px; image-rendering: pixelated; border: 1px solid rgba(0,0,0,0.3);`;
                        slot.appendChild(icon);
                    }
                } else slot.innerHTML = '';
            }
        }
    }
}

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
        this.world.renderDistance = 3;
        this.physics = new Physics(this.world);
        this.pathfinding = new Pathfinding(this.world);
        this.player = new Player();
        this.camera = new Camera();
        this.controls = new Controls();
        this.inventory = new Inventory();
        this.hud = new HUD(this.inventory);
        this.sculptMode = false;
        this.brushSize = 2;
        this.terrainUI = new TerrainUI(this.world, () => {
            // Full world regeneration
            this.world.resetWorld();
            this.findSafeSpawn();
        }, (sculpt, size) => {
            this.sculptMode = sculpt;
            this.brushSize = size;
        }, () => {
            // Graphics update (just reset chunks, keep player position)
            this.world.resetWorld();
        });
        
        this.mobs = [];
        this.mobUpdateTimer = 0;
        
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.04); // Thicker fog for performance
        this.renderer.renderer.setClearColor(0x87ceeb);
        
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
        
        this.findSafeSpawn();
        
        // Force generate initial chunks around spawn
        console.log("Generating initial chunks...");
        for (let i = 0; i < 20; i++) {
            this.world.update(this.player.position);
        }
        
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

    findSafeSpawn() {
        let spawnX = 0;
        let spawnZ = 0;
        let spawnHeight = 60;
        
        let foundSafe = false;
        for (let radius = 0; radius < 128; radius += 8) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const tx = Math.floor(Math.cos(angle) * radius);
                const tz = Math.floor(Math.sin(angle) * radius);
                const h = this.world.generator.getHeightAt(tx, tz);
                if (h > this.world.generator.settings.seaLevel + 2) {
                    spawnX = tx;
                    spawnZ = tz;
                    spawnHeight = h;
                    foundSafe = true;
                    break;
                }
            }
            if (foundSafe) break;
        }
        
        this.player.position.set(spawnX + 0.5, spawnHeight + 3, spawnZ + 0.5);
        if (this.camera && this.camera.camera) {
            this.camera.camera.position.copy(this.player.position);
            this.camera.camera.position.y += 1.6;
        }
    }

    spawnInitialMobs() {
        this.mobs = [];
        const hostileModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RobotExpressive/glTF-Binary/RobotExpressive.glb';
        const passiveModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
        const bossModel = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb';

        // Spawn a few mobs near the player
        for (let i = 0; i < 3; i++) {
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
                    mob.takeDamage(5);
                    return;
                }
            }

            const chunks = Array.from(this.world.chunks.values()).map(c => c.mesh).filter(m => m !== null);
            const intersects = this.raycaster.intersectObjects(chunks);
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const point = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(-0.1));
                const bx = Math.floor(point.x);
                const by = Math.floor(point.y);
                const bz = Math.floor(point.z);
                
                if (this.sculptMode) {
                    this.sculptTerrain(bx, by, bz, BLOCK_TYPES.AIR);
                } else {
                    // Prevent breaking bedrock
                    if (this.world.getBlock(bx, by, bz) === BLOCK_TYPES.BEDROCK) return;
                    this.world.setBlock(bx, by, bz, BLOCK_TYPES.AIR);
                }
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
                    
                    if (this.sculptMode) {
                        this.sculptTerrain(blockX, blockY, blockZ, item.type);
                    } else {
                        // Simple player collision check for placement
                        const dist = this.player.position.distanceTo(new THREE.Vector3(blockX + 0.5, blockY + 0.5, blockZ + 0.5));
                        if (dist < 1.0) return;
                        this.world.setBlock(blockX, blockY, blockZ, item.type);
                    }
                }
            }
        };

        window.addEventListener('game-break', handleBreak);
        window.addEventListener('game-place', handlePlace);
        window.addEventListener('game-terrain-toggle', () => {
            this.terrainUI.toggle();
        });
        window.addEventListener('game-fog-change', (e) => {
            this.scene.fog.density = e.detail;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.target !== this.renderer.renderer.domElement) return;
            if (e.button === 0) handleBreak();
            if (e.button === 2) handlePlace();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                this.hud.toggleInventory();
            }
            if (e.code === 'KeyT') {
                this.terrainUI.toggle();
            }
        });
    }

    sculptTerrain(x, y, z, type) {
        const radius = this.brushSize;
        const affectedChunks = new Set();

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist <= radius) {
                        const bx = x + dx;
                        const by = y + dy;
                        const bz = z + dz;
                        
                        // Don't modify bedrock
                        if (this.world.getBlock(bx, by, bz) === BLOCK_TYPES.BEDROCK) continue;
                        
                        // Don't place blocks inside player
                        if (type !== BLOCK_TYPES.AIR) {
                            const pDist = this.player.position.distanceTo(new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5));
                            if (pDist < 1.2) continue;
                        }
                        
                        const chunkX = Math.floor(bx / 16); // CHUNK_SIZE is 16
                        const chunkZ = Math.floor(bz / 16);
                        affectedChunks.add(`${chunkX},${chunkZ}`);
                        
                        this.world.setBlock(bx, by, bz, type, false);
                    }
                }
            }
        }

        // Refresh all affected chunks
        affectedChunks.forEach(key => {
            const [cx, cz] = key.split(',').map(Number);
            this.world.refreshChunkMesh(cx, cz);
        });
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
        
        // Throttle world updates
        this.worldUpdateTimer = (this.worldUpdateTimer || 0) + delta;
        if (this.worldUpdateTimer > 0.05) {
            this.world.update(this.player.position);
            this.worldUpdateTimer = 0;
        }
        
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
        
        // Update mobs - throttled for performance
        this.mobUpdateTimer += delta;
        if (this.mobs && this.mobUpdateTimer > 0.05) { 
            this.mobs = this.mobs.filter(mob => {
                const isFinished = mob.update(this.mobUpdateTimer, this.player.position, this.world, this.physics, this.pathfinding);
                return !isFinished;
            });
            
            // Spawn more mobs if needed
            if (this.mobs.length < 15 && Math.random() < 0.005) {
                const spawnPos = this.player.position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 60,
                    0,
                    (Math.random() - 0.5) * 60
                ));
                const wx = Math.floor(spawnPos.x);
                const wz = Math.floor(spawnPos.z);
                const height = this.world.generator.getHeightAt(wx, wz);
                spawnPos.y = height + 3;
                
                const biome = this.world.generator.getBiomeAt(wx, wz);
                const type = Math.random() > 0.4 ? 'hostile' : 'passive';
                
                let model = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RobotExpressive/glTF-Binary/RobotExpressive.glb';
                
                if (type === 'passive') {
                    if (biome.name === 'Snow' || biome.name === 'Tundra' || biome.name === 'Mountains') {
                        model = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
                    } else if (biome.name === 'Desert' || biome.name === 'Canyon') {
                        // Maybe a different model for desert? For now use Fox as a placeholder for "Camel" or similar
                        model = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
                    } else {
                        model = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb';
                    }
                } else {
                    // Hostile mobs could also vary by biome
                    if (biome.name === 'Jungle') {
                        // Jungle robot?
                    }
                }
                
                this.mobs.push(new Mob(this.scene, type, spawnPos, model));
            }
            this.mobUpdateTimer = 0;
        }

        this.hud.update(this.player, this.inventory);
        
        this.renderer.render(this.scene, this.camera.camera);
    }
}

// --- Terrain UI ---
class TerrainUI {
    constructor(world, onUpdate, onSculptChange, onGraphicsUpdate) {
        this.world = world;
        this.onUpdate = onUpdate;
        this.onSculptChange = onSculptChange;
        this.onGraphicsUpdate = onGraphicsUpdate;
        this.visible = false;
        this.sculptMode = false;
        this.brushSize = 2;
        this.createUI();
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'terrain-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 25px;
            border-radius: 15px;
            font-family: 'Inter', sans-serif;
            display: none;
            z-index: 2000;
            width: 380px;
            max-width: 90vw;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            border: 1px solid rgba(255,255,255,0.1);
            max-height: 80vh;
            overflow-y: auto;
        `;

        const title = document.createElement('h2');
        title.innerText = 'World Editor';
        title.style.margin = '0 0 20px 0';
        title.style.textAlign = 'center';
        title.style.fontSize = '1.5rem';
        title.style.color = '#4caf50';
        this.container.appendChild(title);

        // Tabs
        const tabContainer = document.createElement('div');
        tabContainer.style.display = 'flex';
        tabContainer.style.marginBottom = '20px';
        tabContainer.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        const createTab = (text, active = false) => {
            const tab = document.createElement('div');
            tab.innerText = text;
            tab.style.padding = '10px 20px';
            tab.style.cursor = 'pointer';
            tab.style.borderBottom = active ? '2px solid #4caf50' : 'none';
            tab.style.opacity = active ? '1' : '0.5';
            return tab;
        };

        const genTab = createTab('Generator', true);
        const sculptTab = createTab('Sculpting');
        const graphicsTab = createTab('Graphics');
        tabContainer.appendChild(genTab);
        tabContainer.appendChild(sculptTab);
        tabContainer.appendChild(graphicsTab);
        this.container.appendChild(tabContainer);

        const genContent = document.createElement('div');
        const sculptContent = document.createElement('div');
        const graphicsContent = document.createElement('div');
        sculptContent.style.display = 'none';
        graphicsContent.style.display = 'none';
        this.container.appendChild(genContent);
        this.container.appendChild(sculptContent);
        this.container.appendChild(graphicsContent);

        genTab.onclick = () => {
            genTab.style.borderBottom = '2px solid #4caf50';
            genTab.style.opacity = '1';
            sculptTab.style.borderBottom = 'none';
            sculptTab.style.opacity = '0.5';
            graphicsTab.style.borderBottom = 'none';
            graphicsTab.style.opacity = '0.5';
            genContent.style.display = 'block';
            sculptContent.style.display = 'none';
            graphicsContent.style.display = 'none';
        };

        sculptTab.onclick = () => {
            sculptTab.style.borderBottom = '2px solid #4caf50';
            sculptTab.style.opacity = '1';
            genTab.style.borderBottom = 'none';
            genTab.style.opacity = '0.5';
            graphicsTab.style.borderBottom = 'none';
            graphicsTab.style.opacity = '0.5';
            sculptContent.style.display = 'block';
            genContent.style.display = 'none';
            graphicsContent.style.display = 'none';
        };

        graphicsTab.onclick = () => {
            graphicsTab.style.borderBottom = '2px solid #4caf50';
            graphicsTab.style.opacity = '1';
            genTab.style.borderBottom = 'none';
            genTab.style.opacity = '0.5';
            sculptTab.style.borderBottom = 'none';
            sculptTab.style.opacity = '0.5';
            graphicsContent.style.display = 'block';
            genContent.style.display = 'none';
            sculptContent.style.display = 'none';
        };

        // Generator Content
        const createSlider = (parent, label, key, min, max, step) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '15px';
            
            const labelEl = document.createElement('label');
            labelEl.innerText = `${label}: `;
            labelEl.style.display = 'block';
            labelEl.style.marginBottom = '5px';
            labelEl.style.fontSize = '0.9rem';
            
            const valueDisplay = document.createElement('span');
            valueDisplay.innerText = this.world.generator.settings[key];
            labelEl.appendChild(valueDisplay);
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = this.world.generator.settings[key];
            slider.style.width = '100%';
            
            slider.oninput = () => {
                valueDisplay.innerText = slider.value;
                this.world.generator.updateSettings({ [key]: parseFloat(slider.value) });
            };

            wrapper.appendChild(labelEl);
            wrapper.appendChild(slider);
            parent.appendChild(wrapper);
            return slider;
        };

        createSlider(genContent, 'Height Scale', 'heightScale', 0.5, 3.0, 0.1);
        createSlider(genContent, 'Mountain Scale', 'mountainScale', 0.1, 5.0, 0.1);
        createSlider(genContent, 'Biome Scale', 'biomeScale', 0.1, 5.0, 0.1);
        createSlider(genContent, 'Sea Level', 'seaLevel', 10, 40, 1);

        const applyBtn = document.createElement('button');
        applyBtn.innerText = 'Regenerate World';
        applyBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: #4caf50;
            border: none;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
            transition: background 0.2s;
        `;
        applyBtn.onclick = () => {
            this.onUpdate();
            this.toggle();
        };
        genContent.appendChild(applyBtn);

        // Sculpting Content
        const sculptToggle = document.createElement('div');
        sculptToggle.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
        `;
        sculptToggle.innerHTML = `<span>Enable Sculpt Mode</span>`;
        const toggleBtn = document.createElement('input');
        toggleBtn.type = 'checkbox';
        toggleBtn.checked = this.sculptMode;
        toggleBtn.style.width = '20px';
        toggleBtn.style.height = '20px';
        toggleBtn.onchange = () => {
            this.sculptMode = toggleBtn.checked;
            this.onSculptChange(this.sculptMode, this.brushSize);
        };
        sculptToggle.appendChild(toggleBtn);
        sculptContent.appendChild(sculptToggle);

        const brushSliderWrapper = document.createElement('div');
        brushSliderWrapper.style.marginBottom = '15px';
        const brushLabel = document.createElement('label');
        brushLabel.innerHTML = `Brush Size: <span id="brush-val">${this.brushSize}</span>`;
        brushLabel.style.display = 'block';
        brushLabel.style.marginBottom = '5px';
        const brushSlider = document.createElement('input');
        brushSlider.type = 'range';
        brushSlider.min = 1;
        brushSlider.max = 5;
        brushSlider.step = 1;
        brushSlider.value = this.brushSize;
        brushSlider.style.width = '100%';
        brushSlider.oninput = () => {
            this.brushSize = parseInt(brushSlider.value);
            document.getElementById('brush-val').innerText = this.brushSize;
            this.onSculptChange(this.sculptMode, this.brushSize);
        };
        brushSliderWrapper.appendChild(brushLabel);
        brushSliderWrapper.appendChild(brushSlider);
        sculptContent.appendChild(brushSliderWrapper);

        const sculptHint = document.createElement('p');
        sculptHint.innerText = 'In Sculpt Mode, breaking/placing blocks affects a radius. Use BRK to remove and PLC to add terrain.';
        sculptHint.style.cssText = `
            font-size: 0.85rem;
            opacity: 0.7;
            line-height: 1.4;
            font-style: italic;
        `;
        sculptContent.appendChild(sculptHint);

        // Graphics Content
        const createGraphicsSlider = (label, min, max, step, initial, onChange) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '15px';
            const labelEl = document.createElement('label');
            labelEl.innerHTML = `${label}: <span id="${label.toLowerCase().replace(' ', '-')}-val">${initial}</span>`;
            labelEl.style.display = 'block';
            labelEl.style.marginBottom = '5px';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = initial;
            slider.style.width = '100%';
            slider.oninput = () => {
                document.getElementById(`${label.toLowerCase().replace(' ', '-')}-val`).innerText = slider.value;
                onChange(parseFloat(slider.value));
            };
            wrapper.appendChild(labelEl);
            wrapper.appendChild(slider);
            graphicsContent.appendChild(wrapper);
        };

        createGraphicsSlider('Render Distance', 1, 8, 1, this.world.renderDistance, (val) => {
            this.world.renderDistance = val;
            this.onGraphicsUpdate();
        });

        createGraphicsSlider('Fog Density', 0, 0.1, 0.005, 0.04, (val) => {
            window.dispatchEvent(new CustomEvent('game-fog-change', { detail: val }));
        });

        const closeHint = document.createElement('p');
        closeHint.innerText = 'Press T to close';
        closeHint.style.cssText = `
            text-align: center;
            font-size: 0.8rem;
            opacity: 0.6;
            margin-top: 15px;
        `;
        this.container.appendChild(closeHint);

        document.body.appendChild(this.container);
    }

    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
        if (this.visible) {
            document.exitPointerLock();
        } else {
            document.body.requestPointerLock();
        }
    }
}

new Game();
