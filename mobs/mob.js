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
        
        const createFallbackGeometry = () => {
            let color = 0x00ff00; // Passive
            if (type === 'hostile') color = 0xff0000;
            if (type === 'boss') color = 0x4a148c; // Purple boss
            
            const material = new THREE.MeshStandardMaterial({ color: color });
            
            // Body
            const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
            const body = new THREE.Mesh(bodyGeo, material);
            body.position.y = 0.4;
            this.mesh.add(body);
            
            // Head
            const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const head = new THREE.Mesh(headGeo, material);
            head.position.y = 1.0;
            this.mesh.add(head);
            
            // Legs
            const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
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
    }

    update(delta, playerPos, world) {
        const distToPlayer = this.position.distanceTo(playerPos);
        
        // Only update logic if within 40 blocks
        if (distToPlayer > 40) {
            this.mesh.visible = false;
            return;
        }
        this.mesh.visible = true;

        // Simple gravity
        this.velocity.y -= 0.01;
        this.position.y += this.velocity.y;
        
        // Ground collision
        const height = world.generator.getHeightAt(this.position.x, this.position.z);
        if (this.position.y < height) {
            this.position.y = height;
            this.velocity.y = 0;
        }

        let isMoving = false;
        if (this.type === 'hostile') {
            if (distToPlayer < 15) {
                const dir = playerPos.clone().sub(this.position).normalize();
                dir.y = 0;
                this.position.add(dir.multiplyScalar(0.05));
                this.mesh.lookAt(playerPos.x, this.position.y, playerPos.z);
                isMoving = true;
            }
        } else if (this.type === 'passive') {
            if (Math.random() < 0.01) {
                this.velocity.x = (Math.random() - 0.5) * 0.1;
                this.velocity.z = (Math.random() - 0.5) * 0.1;
            }
            this.position.x += this.velocity.x;
            this.position.z += this.velocity.z;
            if (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01) {
                this.mesh.lookAt(this.position.x + this.velocity.x, this.position.y, this.position.z + this.velocity.z);
                isMoving = true;
            }
        }

        // Leg animation
        if (isMoving && this.legs) {
            const t = Date.now() * 0.01;
            this.legs[0].rotation.x = Math.sin(t) * 0.5;
            this.legs[1].rotation.x = Math.cos(t) * 0.5;
        } else if (this.legs) {
            this.legs[0].rotation.x = 0;
            this.legs[1].rotation.x = 0;
        }

        this.mesh.position.copy(this.position);
    }
}
