import { Noise } from '../utils/noise.js';
import { BIOMES } from './biomes.js';

export class TerrainGenerator {
    constructor(seed, settings = {}) {
        this.seed = seed;
        this.settings = {
            heightScale: settings.heightScale || 1.0,
            mountainScale: settings.mountainScale || 1.0,
            biomeScale: settings.biomeScale || 1.0,
            seaLevel: settings.seaLevel || 22,
            ...settings
        };
        this.noise = new Noise(seed);
        this.continentalnessNoise = new Noise(seed + 100);
        this.erosionNoise = new Noise(seed + 200);
        this.peaksValleysNoise = new Noise(seed + 300);
        this.temperatureNoise = new Noise(seed + 400);
        this.humidityNoise = new Noise(seed + 500);
        this.caveNoise = new Noise(seed + 600);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    getBiomeAt(x, z) {
        const bScale = 0.0003 * (1 / this.settings.biomeScale);
        const temp = (this.temperatureNoise.get(x * bScale, z * bScale) + 1) / 2;
        const humidity = (this.humidityNoise.get(x * bScale, z * bScale) + 1) / 2;
        const cont = this.continentalnessNoise.get(x * 0.00015, z * 0.00015);
        const pv = Math.abs(this.peaksValleysNoise.get(x * 0.001, z * 0.001));

        // 1. Ocean check
        if (cont < -0.12) return BIOMES.OCEAN;

        // 2. Mountain check
        if (pv > 0.75) return BIOMES.MOUNTAINS;

        // 3. Climate based biomes
        if (temp > 0.65) {
            if (humidity > 0.7) return BIOMES.JUNGLE;
            if (humidity < 0.3) return BIOMES.DESERT;
            return BIOMES.PLAINS;
        }
        
        if (temp < 0.3) {
            if (humidity > 0.5) return BIOMES.SNOW;
            return BIOMES.TUNDRA;
        }

        if (humidity > 0.75) return BIOMES.DEEP_FOREST;
        if (humidity > 0.5) return BIOMES.FOREST;

        return BIOMES.PLAINS;
    }

    getHeightAt(x, z) {
        const cont = this.continentalnessNoise.get(x * 0.0002, z * 0.0002);
        const erosion = (this.erosionNoise.get(x * 0.0008, z * 0.0008) + 1) / 2;
        const pv = Math.abs(this.peaksValleysNoise.get(x * 0.0015, z * 0.0015));
        
        let baseHeight = 32 * this.settings.heightScale;
        
        if (cont < -0.15) {
            baseHeight = (8 + (cont + 1) * 10) * this.settings.heightScale;
        } else if (cont < 0) {
            baseHeight = (18 + (cont + 0.15) * 60) * this.settings.heightScale;
        } else {
            baseHeight = (28 + cont * 20) * this.settings.heightScale;
            
            if (pv > 0.6) {
                const mountainFactor = (pv - 0.6) / 0.4;
                const ruggedness = 0.5 + erosion * 0.5;
                baseHeight += mountainFactor * mountainFactor * 100 * ruggedness * this.settings.mountainScale;
            }
        }

        let detail = 0;
        detail += (this.noise.get(x * 0.01, z * 0.01)) * 4;
        detail += (this.noise.get(x * 0.02, z * 0.02)) * 2;
        
        let height = baseHeight + detail;

        const ravineNoise = 1.0 - Math.abs(this.noise.get(x * 0.003, z * 0.003));
        if (ravineNoise > 0.98) {
            const depth = (ravineNoise - 0.98) / 0.02 * 25;
            height -= depth;
        }

        return Math.max(1, Math.floor(height));
    }

    getBlockAt(x, y, z, height) {
        const waterLevel = this.settings.seaLevel;
        
        // Bedrock at the very bottom
        if (y === 0) return 9; // Bedrock
        
        if (y < height - 2) {
            const n3d = this.caveNoise.get(x * 0.05, z * 0.05);
            if (n3d > 0.8) return 0;
        }

        if (y > height) {
            if (y <= waterLevel) return 7;
            return 0;
        }
        
        const biome = this.getBiomeAt(x, z);

        if (y === height) {
            if (y < waterLevel + 1) return 4;
            if (biome.name === 'Desert' || biome.name === 'Canyon') return 4;
            if (biome.name === 'Snow' || (y > 75)) return 8;
            if (biome.name === 'Swamp') return 15;
            return 1;
        }
        
        if (y > height - 4) {
            if (y < waterLevel) return 4;
            return biome.subSurfaceBlock || 2;
        }
        
        // Stone layer - add ores
        const oreSeed = (Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1;
        const oreVal = Math.abs(oreSeed);

        if (oreVal < 0.05) { // 5% chance of some ore
            if (y < 12 && oreVal < 0.005) return 22; // Diamond Ore (0.5%)
            if (y < 20 && oreVal < 0.01) return 21;  // Gold Ore (1%)
            if (y < 40 && oreVal < 0.025) return 20; // Iron Ore (2.5%)
            return 19; // Coal Ore
        }
        
        return 3;
    }
}
