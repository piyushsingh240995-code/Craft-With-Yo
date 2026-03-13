import { BLOCK_TYPES } from './blocks.js';

export const BIOMES = {
    OCEAN: {
        name: 'Ocean',
        heightScale: 5,
        heightOffset: 10,
        surfaceBlock: BLOCK_TYPES.SAND,
        subSurfaceBlock: BLOCK_TYPES.SAND,
        treeFrequency: 0
    },
    PLAINS: {
        name: 'Plains',
        heightScale: 10,
        heightOffset: 22,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.005,
        flowerFrequency: 0.05
    },
    FOREST: {
        name: 'Forest',
        heightScale: 20,
        heightOffset: 22,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.1,
        flowerFrequency: 0.02
    },
    DESERT: {
        name: 'Desert',
        heightScale: 10,
        heightOffset: 18,
        surfaceBlock: BLOCK_TYPES.SAND,
        subSurfaceBlock: BLOCK_TYPES.SAND,
        treeFrequency: 0,
        cactusFrequency: 0.02
    },
    SNOW: {
        name: 'Snow',
        heightScale: 25,
        heightOffset: 30,
        surfaceBlock: BLOCK_TYPES.SNOW,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.02
    },
    MOUNTAINS: {
        name: 'Mountains',
        heightScale: 60,
        heightOffset: 40,
        surfaceBlock: BLOCK_TYPES.SNOW,
        subSurfaceBlock: BLOCK_TYPES.STONE,
        treeFrequency: 0.01,
        ridgeNoise: true
    },
    SWAMP: {
        name: 'Swamp',
        heightScale: 5,
        heightOffset: 18,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.MUD,
        treeFrequency: 0.15,
        waterLilyFrequency: 0.1
    },
    CANYON: {
        name: 'Canyon',
        heightScale: 40,
        heightOffset: 15,
        surfaceBlock: BLOCK_TYPES.SAND,
        subSurfaceBlock: BLOCK_TYPES.STONE,
        treeFrequency: 0,
        ridgeNoise: true
    },
    JUNGLE: {
        name: 'Jungle',
        heightScale: 25,
        heightOffset: 25,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.25,
        vineFrequency: 0.1
    },
    TUNDRA: {
        name: 'Tundra',
        heightScale: 8,
        heightOffset: 25,
        surfaceBlock: BLOCK_TYPES.SNOW,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.001
    },
    BADLANDS: {
        name: 'Badlands',
        heightScale: 30,
        heightOffset: 20,
        surfaceBlock: BLOCK_TYPES.SAND,
        subSurfaceBlock: BLOCK_TYPES.STONE,
        treeFrequency: 0,
        cactusFrequency: 0.01
    },
    DEEP_FOREST: {
        name: 'Deep Forest',
        heightScale: 15,
        heightOffset: 22,
        surfaceBlock: BLOCK_TYPES.GRASS,
        subSurfaceBlock: BLOCK_TYPES.DIRT,
        treeFrequency: 0.3,
        flowerFrequency: 0.05
    }
};
