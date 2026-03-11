import * as THREE from 'three';

export class Controls {
    constructor() {
        this.keys = {};
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.mouseSensitivity = 0.002;
        this.touchSensitivity = 0.005;

        // Desktop controls
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.rotation.y -= e.movementX * this.mouseSensitivity;
                this.rotation.x -= e.movementY * this.mouseSensitivity;
                this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
            }
        });

        // Touch controls state
        this.joystickPos = { x: 0, y: 0 };
        this.isJumping = false;
        this.jumpBuffer = 0;
    }

    update(player, delta) {
        const moveSpeed = 1.0 * delta;
        const jumpForce = 0.25;

        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.rotation.y, 0));

        // Keyboard movement
        if (this.keys['KeyW']) player.velocity.add(forward.multiplyScalar(moveSpeed));
        if (this.keys['KeyS']) player.velocity.add(forward.multiplyScalar(-moveSpeed));
        if (this.keys['KeyA']) player.velocity.add(right.multiplyScalar(-moveSpeed));
        if (this.keys['KeyD']) player.velocity.add(right.multiplyScalar(moveSpeed));
        
        // Jump buffer logic
        if (this.keys['Space'] || this.isJumping) {
            this.jumpBuffer = 0.2; // 200ms buffer
        }

        if (this.jumpBuffer > 0) {
            if (player.onGround) {
                player.velocity.y = jumpForce;
                this.jumpBuffer = 0;
            } else if (player.inWater) {
                player.velocity.y = jumpForce * 0.5;
                this.jumpBuffer = 0;
            }
            this.jumpBuffer -= delta;
        }

        // Mobile joystick movement
        if (this.joystickPos.x !== 0 || this.joystickPos.y !== 0) {
            const joyForward = forward.clone().multiplyScalar(-this.joystickPos.y * moveSpeed);
            const joyRight = right.clone().multiplyScalar(this.joystickPos.x * moveSpeed);
            player.velocity.add(joyForward).add(joyRight);
        }
    }
}
