import { Noise } from '../utils/noise.js';
import { BIOMES } from './biomes.js';

export class TerrainGenerator {
    constructor(seed) {
        this.noise = new Noise(seed);
        this.biomeNoise = new Noise(seed + 123);
    }

    getBiomeAt(x, z) {
        const v = (this.biomeNoise.get(x * 0.005, z * 0.005) + 1) / 2;
        if (v < 0.25) return BIOMES.DESERT;
        if (v < 0.5) return BIOMES.PLAINS;
        if (v < 0.75) return BIOMES.FOREST;
        return BIOMES.SNOW;
    }

    getHeightAt(x, z) {
        const biome = this.getBiomeAt(x, z);
        
        // Multi-octave noise
        let noiseVal = 0;
        noiseVal += (this.noise.get(x * 0.005, z * 0.005) + 1) / 2 * 1.0;
        noiseVal += (this.noise.get(x * 0.01, z * 0.01) + 1) / 2 * 0.5;
        noiseVal += (this.noise.get(x * 0.02, z * 0.02) + 1) / 2 * 0.25;
        noiseVal += (this.noise.get(x * 0.04, z * 0.04) + 1) / 2 * 0.125;
        noiseVal /= 1.875;

        // Apply biome-specific adjustments
        let height = noiseVal * biome.heightScale + biome.heightOffset;
        
        // Add some local variation
        height += (this.noise.get(x * 0.1, z * 0.1)) * 2;

        return Math.max(1, Math.floor(height));
    }

    getBlockAt(x, y, z, height) {
        const waterLevel = 22;
        
        if (y > height) {
            if (y <= waterLevel) return 7; // Water
            return 0; // Air
        }
        
        if (y === height) {
            if (y < waterLevel + 2) return 4; // Sand near water
            const biome = this.getBiomeAt(x, z);
            if (biome.name === 'Desert') return 4; // Sand
            if (biome.name === 'Snow') return 8; // Snow
            return 1; // Grass
        }
        
        if (y > height - 4) return 2; // Dirt
        if (y === 0) return 9; // Bedrock
        return 3; // Stone
    }
}
