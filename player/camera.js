import * as THREE from 'three';

export class Camera {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    update(playerPosition, rotation, delta) {
        // Smoothly interpolate camera position to target
        const targetPos = playerPosition.clone();
        targetPos.y += 1.6; // Eye level
        
        // Use a frame-rate independent lerp
        const lerpFactor = 1 - Math.pow(0.001, delta); // Very smooth
        this.camera.position.lerp(targetPos, Math.min(lerpFactor, 0.5));
        
        this.camera.rotation.set(rotation.x, rotation.y, 0, 'YXZ');
    }
}
