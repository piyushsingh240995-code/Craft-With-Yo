import { Mob } from './mob.js';
import { AI } from './ai.js';

export class Boss extends Mob {
    constructor(scene, position, modelUrl = null) {
        super(scene, 'boss', position, modelUrl);
        if (!modelUrl) this.mesh.scale.set(2, 2, 2);
    }

    update(delta, playerPos, world, physics, pathfinding) {
        if (this.isDead) {
            return super.update(delta, playerPos, world, physics, pathfinding);
        }
        // AI.follow is now handled by pathfinding in super.update
        super.update(delta, playerPos, world, physics, pathfinding);
    }
}
