export const DIMENSIONS = {
    OVERWORLD: 'overworld',
    NETHER: 'nether'
};

export class DimensionManager {
    constructor(world) {
        this.world = world;
        this.currentDimension = DIMENSIONS.OVERWORLD;
    }

    switchDimension(dim) {
        this.currentDimension = dim;
        // Reload world with different generator
    }
}
