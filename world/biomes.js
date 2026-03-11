import { BLOCK_TYPES } from './blocks.js';

export const BIOMES = {
    PLAINS: {
        name: 'Plains',
        heightScale: 15,
        heightOffset: 20,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.01
    },
    FOREST: {
        name: 'Forest',
        heightScale: 20,
        heightOffset: 22,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.08
    },
    DESERT: {
        name: 'Desert',
        heightScale: 10,
        heightOffset: 18,
        surfaceBlock: BLOCK_TYPES.SAND,
        subSurfaceBlock: BLOCK_TYPES.SAND,
        treeFrequency: 0
    },
    SNOW: {
        name: 'Snow',
        heightScale: 25,
        heightOffset: 30,
        surfaceBlock: BLOCK_TYPES.SNOW,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.02
    }
};
