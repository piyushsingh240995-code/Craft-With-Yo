import { Mob } from './mob.js';
import { AI } from './ai.js';

export class Boss extends Mob {
    constructor(scene, position, modelUrl = null) {
        super(scene, 'boss', position, modelUrl);
        if (!modelUrl) this.mesh.scale.set(2, 2, 2);
    }

    update(delta, playerPos, world) {
        AI.follow(this, playerPos, delta);
        super.update(delta, playerPos, world);
    }
}
