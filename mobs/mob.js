import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export class Mob {
    constructor(scene, type, position, modelUrl = null) {
        this.scene = scene;
        this.type = type;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = type === 'boss' ? 100 : 10;
        
        this.mesh = new THREE.Group();
        this.path = [];
        this.pathUpdateTimer = 0;
        
        const createFallbackGeometry = () => {
            let color = 0x00ff00; // Passive
            if (type === 'hostile') color = 0xff0000;
            if (type === 'boss') color = 0x4a148c; // Purple boss
            
            const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
            
            // More complex voxel-style body
            // Body
            const bodyGeo = new THREE.BoxGeometry(0.6, 0.9, 0.4);
            const body = new THREE.Mesh(bodyGeo, material);
            body.position.y = 0.45;
            this.mesh.add(body);
            
            // Head
            const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const head = new THREE.Mesh(headGeo, material);
            head.position.y = 1.15;
            this.mesh.add(head);

            // Eyes
            const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const eyeMat = new THREE.MeshBasicMaterial({ color: type === 'hostile' ? 0xffffff : 0x000000 });
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            eyeL.position.set(-0.15, 1.2, 0.25);
            this.mesh.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(0.15, 1.2, 0.25);
            this.mesh.add(eyeR);
            
            // Arms (if hostile)
            if (type === 'hostile' || type === 'boss') {
                const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
                const armL = new THREE.Mesh(armGeo, material);
                armL.position.set(-0.4, 0.6, 0);
                this.mesh.add(armL);
                const armR = new THREE.Mesh(armGeo, material);
                armR.position.set(0.4, 0.6, 0);
                this.mesh.add(armR);
            }
            
            // Legs
            const legGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25);
            this.legs = [];
            for (let i = 0; i < 2; i++) {
                const leg = new THREE.Mesh(legGeo, material);
                leg.position.y = 0;
                leg.position.x = (i === 0 ? -0.15 : 0.15);
                this.mesh.add(leg);
                this.legs.push(leg);
            }

            if (type === 'boss') {
                this.mesh.scale.set(3, 3, 3);
            }
        };

        if (modelUrl) {
            loader.load(
                modelUrl, 
                (gltf) => {
                    const model = gltf.scene;
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const scale = 1.0 / Math.max(size.x, size.y, size.z);
                    model.scale.set(scale, scale, scale);
                    
                    if (type === 'boss') model.scale.multiplyScalar(3);
                    
                    this.mesh.add(model);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load model: ${modelUrl}, falling back to basic geometry.`, error);
                    createFallbackGeometry();
                }
            );
        } else {
            createFallbackGeometry();
        }
        
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        this.isDead = false;
        this.deathTimer = 0;
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.health -= amount;
        
        // Flash red
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                const oldColor = child.material.color.clone();
                child.material.color.set(0xff0000);
                setTimeout(() => {
                    if (child.material) child.material.color.copy(oldColor);
                }, 100);
            }
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.deathTimer = 1.0; // 1 second death animation
        this.velocity.set(0, 0.1, 0); // Pop up slightly
    }

    update(delta, playerPos, world, physics, pathfinding) {
        if (this.isDead) {
            this.deathTimer -= delta;
            this.mesh.rotation.x += delta * 5;
            this.mesh.scale.multiplyScalar(0.95);
            this.position.y += this.velocity.y;
            this.velocity.y -= 0.01;
            this.mesh.position.copy(this.position);
            
            if (this.deathTimer <= 0) {
                this.scene.remove(this.mesh);
                return true; // Signal for removal
            }
            return false;
        }

        const distToPlayer = this.position.distanceTo(playerPos);
        
        // Only update logic if within 40 blocks
        if (distToPlayer > 40) {
            this.mesh.visible = false;
            return false;
        }
        this.mesh.visible = true;

        let isMoving = false;
        if (this.type === 'hostile' || this.type === 'boss') {
            if (distToPlayer < 20) {
                // Update path every 1.5 seconds (less frequent to reduce lag)
                this.pathUpdateTimer -= delta;
                if (this.pathUpdateTimer <= 0 || this.path.length === 0) {
                    this.path = pathfinding.findPath(this.position, playerPos) || [];
                    this.pathUpdateTimer = 1.5;
                }

                if (this.path.length > 0) {
                    const nextPoint = this.path[0];
                    const dir = nextPoint.clone().sub(this.position);
                    dir.y = 0;
                    
                    if (dir.length() < 0.2) {
                        this.path.shift();
                    } else {
                        dir.normalize();
                        const speed = this.type === 'boss' ? 0.06 : 0.04;
                        this.velocity.x += dir.x * speed;
                        this.velocity.z += dir.z * speed;
                        
                        // Look at next point
                        this.mesh.lookAt(nextPoint.x, this.position.y, nextPoint.z);
                        isMoving = true;
                    }
                } else {
                    // Fallback to direct chase if pathfinding fails
                    const dir = playerPos.clone().sub(this.position).normalize();
                    dir.y = 0;
                    this.velocity.x += dir.x * 0.02;
                    this.velocity.z += dir.z * 0.02;
                    this.mesh.lookAt(playerPos.x, this.position.y, playerPos.z);
                    isMoving = true;
                }
            }
        } else if (this.type === 'passive') {
            const oldVel = this.velocity.clone();
            // Use AI wander
            if (Math.random() < 0.01) {
                this.targetVelocity = {
                    x: (Math.random() - 0.5) * 0.04,
                    z: (Math.random() - 0.5) * 0.04
                };
            }
            if (this.targetVelocity) {
                this.velocity.x += (this.targetVelocity.x - this.velocity.x) * 0.05;
                this.velocity.z += (this.targetVelocity.z - this.velocity.z) * 0.05;
            }

            if (Math.abs(this.velocity.x) > 0.001 || Math.abs(this.velocity.z) > 0.001) {
                this.mesh.lookAt(this.position.x + this.velocity.x, this.position.y, this.position.z + this.velocity.z);
                isMoving = true;
            }
        }

        // Apply physics (collision, gravity, etc.)
        physics.applyMobPhysics(this, delta);

        // Leg animation
        const t = Date.now() * 0.005;
        if (isMoving && this.legs) {
            this.legs[0].rotation.x = Math.sin(t * 2) * 0.5;
            this.legs[1].rotation.x = Math.cos(t * 2) * 0.5;
            // Bobbing while walking
            this.mesh.position.y = this.position.y + Math.abs(Math.sin(t * 4)) * 0.1;
        } else if (this.legs) {
            this.legs[0].rotation.x = 0;
            this.legs[1].rotation.x = 0;
            // Idle bobbing
            this.mesh.position.y = this.position.y + Math.sin(t) * 0.05;
        } else {
            this.mesh.position.copy(this.position);
        }

        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
        return false;
    }
}
