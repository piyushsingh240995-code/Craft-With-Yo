import { createNoise2D, createNoise3D } from 'simplex-noise';

export class Noise {
    constructor(seed = Math.random()) {
        this.noise2D = createNoise2D(() => seed);
        this.noise3D = createNoise3D(() => seed);
    }

    get(x, y) {
        return this.noise2D(x, y);
    }

    get3D(x, y, z) {
        return this.noise3D(x, y, z);
    }
}
