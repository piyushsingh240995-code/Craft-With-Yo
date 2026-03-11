import { BLOCKS } from '../world/blocks.js';
import { textureManager } from '../utils/textures.js';

export class HUD {
    constructor(inventory) {
        this.inventory = inventory;
        this.container = document.getElementById('ui-container');
        this.createCrosshair();
        this.createHotbar();
        this.createHealthBar();
        this.createFullscreenButton();
    }

    createFullscreenButton() {
        const btn = document.createElement('div');
        btn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            cursor: pointer;
        `;
        btn.innerHTML = '⛶';
        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
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
        hotbar.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 5px;
            background: rgba(0,0,0,0.5);
            padding: 5px;
            border-radius: 5px;
        `;
        
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 40px;
                height: 40px;
                background: rgba(255,255,255,0.2);
                border: 2px solid transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
            `;
            slot.id = `hotbar-slot-${i}`;
            if (i === 0) slot.style.borderColor = 'white';
            
            slot.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.inventory.selectedSlot = i;
            });
            slot.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.inventory.selectedSlot = i;
            });

            hotbar.appendChild(slot);
        }
        this.container.appendChild(hotbar);
    }

    createHealthBar() {
        const healthContainer = document.createElement('div');
        healthContainer.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 10px;
            background: rgba(0,0,0,0.5);
            border-radius: 5px;
        `;
        
        const healthFill = document.createElement('div');
        healthFill.id = 'health-fill';
        healthFill.style.cssText = `
            width: 100%;
            height: 100%;
            background: #ff4444;
            border-radius: 5px;
            transition: width 0.3s;
        `;
        healthContainer.appendChild(healthFill);
        this.container.appendChild(healthContainer);
    }

    refreshAtlas() {
        this.atlasDataURL = textureManager.canvas.toDataURL();
        // Clear slots to force redraw
        for (let i = 0; i < 9; i++) {
            const slot = document.getElementById(`hotbar-slot-${i}`);
            if (slot) slot.innerHTML = '';
        }
    }

    update(player, inventory) {
        const healthFill = document.getElementById('health-fill');
        if (healthFill) {
            healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
        }

        if (!this.atlasDataURL) {
            this.atlasDataURL = textureManager.canvas.toDataURL();
        }

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
                        
                        icon.style.cssText = `
                            width: 32px;
                            height: 32px;
                            background-image: url(${this.atlasDataURL});
                            background-position: -${x}px -${y}px;
                            background-size: ${atlasSize * texSize}px ${atlasSize * texSize}px;
                            image-rendering: pixelated;
                            border: 1px solid rgba(0,0,0,0.3);
                        `;
                        slot.appendChild(icon);
                    }
                } else {
                    slot.innerHTML = '';
                }
            }
        }
    }
}
