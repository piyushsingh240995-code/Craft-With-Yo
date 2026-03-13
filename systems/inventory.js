import { BLOCK_TYPES, BLOCKS } from '../world/blocks.js';

export class Inventory {
    constructor() {
        this.hotbar = Array(9).fill(null);
        this.selectedSlot = 0;
        
        // Initial items
        this.hotbar[0] = { type: BLOCK_TYPES.GRASS, name: 'Grass', count: 64 };
        this.hotbar[1] = { type: BLOCK_TYPES.DIRT, name: 'Dirt', count: 64 };
        this.hotbar[2] = { type: BLOCK_TYPES.STONE, name: 'Stone', count: 64 };
        this.hotbar[3] = { type: BLOCK_TYPES.WOOD, name: 'Wood', count: 64 };
        this.hotbar[4] = { type: BLOCK_TYPES.LEAVES, name: 'Leaves', count: 64 };
        this.hotbar[5] = { type: BLOCK_TYPES.PLANKS, name: 'Planks', count: 64 };
        this.hotbar[6] = { type: BLOCK_TYPES.COBBLESTONE, name: 'Cobblestone', count: 64 };
        this.hotbar[7] = { type: BLOCK_TYPES.SAND, name: 'Sand', count: 64 };
        this.hotbar[8] = { type: BLOCK_TYPES.SNOW, name: 'Snow', count: 64 };
        
        // Add more slots for the rest
        this.fullInventory = [...this.hotbar];
        this.fullInventory.push({ type: BLOCK_TYPES.GLASS, name: 'Glass', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.GRAVEL, name: 'Gravel', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.MUD, name: 'Mud', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.CACTUS, name: 'Cactus', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.COAL_ORE, name: 'Coal Ore', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.IRON_ORE, name: 'Iron Ore', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.GOLD_ORE, name: 'Gold Ore', count: 64 });
        this.fullInventory.push({ type: BLOCK_TYPES.DIAMOND_ORE, name: 'Diamond Ore', count: 64 });

        window.addEventListener('wheel', (e) => {
            this.selectedSlot = (this.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
        });

        window.addEventListener('keydown', (e) => {
            if (e.code.startsWith('Digit')) {
                const num = parseInt(e.code.replace('Digit', '')) - 1;
                if (num >= 0 && num < 9) this.selectedSlot = num;
            }
        });
    }

    getSelectedItem() {
        return this.hotbar[this.selectedSlot];
    }
}
