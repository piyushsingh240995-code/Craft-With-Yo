import * as THREE from 'three';

export class Lighting {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(100, 200, 100);
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        this.scene.background = new THREE.Color(0x87ceeb);
        if (!this.scene.fog) {
            this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);
        }
    }

    update(time = 0) {
        const dayDuration = 600000; // 10 minutes for a full cycle
        // Start at 1/4 of the cycle (peak day)
        const startTime = dayDuration / 4;
        const angle = (((time || 0) + startTime) % dayDuration) / dayDuration * Math.PI * 2;
        this.sunLight.position.x = Math.cos(angle) * 200;
        this.sunLight.position.y = Math.sin(angle) * 200;
        
        const intensity = Math.max(0.1, Math.sin(angle));
        this.sunLight.intensity = intensity;
        this.ambientLight.intensity = 0.3 + intensity * 0.3;
        
        // Only update background color if not underwater (handled in main.js)
        const skyColor = new THREE.Color(0x87ceeb);
        // Mute sky color slightly based on intensity for day/night
        skyColor.lerp(new THREE.Color(0x050510), 1 - intensity);
        this.scene.background.copy(skyColor);
    }
}
