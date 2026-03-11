import { BLOCK_TYPES } from '../world/blocks.js';

export const RECIPES = [
    {
        input: [{ type: BLOCK_TYPES.WOOD, count: 1 }],
        output: { type: BLOCK_TYPES.PLANKS, count: 4 }
    },
    {
        input: [{ type: BLOCK_TYPES.STONE, count: 1 }],
        output: { type: BLOCK_TYPES.COBBLESTONE, count: 1 }
    }
];

export class CraftingSystem {
    constructor(inventory) {
        this.inventory = inventory;
    }

    craft(recipeIndex) {
        const recipe = RECIPES[recipeIndex];
        // Simple crafting logic
    }
}
