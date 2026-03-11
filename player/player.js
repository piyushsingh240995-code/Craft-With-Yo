import * as THREE from 'three';

export class Player {
    constructor() {
        this.position = new THREE.Vector3(8, 45, 8);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.width = 0.6;
        this.height = 1.8;
        this.onGround = false;
        this.health = 20;
        this.maxHealth = 20;
    }

    update(delta) {
        // Position is updated by physics engine
    }
}
