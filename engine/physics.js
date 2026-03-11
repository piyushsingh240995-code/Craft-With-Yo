import * as THREE from 'three';
import { BLOCKS, BLOCK_TYPES } from '../world/blocks.js';

export class Physics {
    constructor(world) {
        this.world = world;
        this.gravity = -0.015;
    }

    applyPhysics(player, delta) {
        // Check if player is in water
        const headBlock = this.world.getBlock(Math.floor(player.position.x), Math.floor(player.position.y - 0.2), Math.floor(player.position.z));
        const footBlock = this.world.getBlock(Math.floor(player.position.x), Math.floor(player.position.y - player.height + 0.2), Math.floor(player.position.z));
        player.inWater = (headBlock === BLOCK_TYPES.WATER || footBlock === BLOCK_TYPES.WATER);

        // Vertical movement and collision
        let gravityStep = this.gravity;
        if (player.inWater) {
            gravityStep *= 0.2; // Buoyancy
            player.velocity.y *= 0.8; // Water drag
        }
        player.velocity.y += gravityStep;
        
        player.position.y += player.velocity.y;
        if (this.isColliding(player.position, player.width, player.height)) {
            if (player.velocity.y < 0) {
                // Falling down - snap to the top of the block below
                player.position.y = Math.floor(player.position.y) + 1.0;
                player.onGround = true;
            } else {
                // Jumping up - snap to the bottom of the block above
                player.position.y = Math.floor(player.position.y);
            }
            player.velocity.y = 0;
        } else {
            player.onGround = false;
        }

        // Horizontal movement and collision with sub-stepping for smoothness
        const oldX = player.position.x;
        player.position.x += player.velocity.x;
        if (this.isColliding(player.position, player.width, player.height)) {
            // Push out of wall
            player.position.x = oldX;
            player.velocity.x = 0;
        }

        const oldZ = player.position.z;
        player.position.z += player.velocity.z;
        if (this.isColliding(player.position, player.width, player.height)) {
            // Push out of wall
            player.position.z = oldZ;
            player.velocity.z = 0;
        }
        
        // Friction
        const friction = player.inWater ? 0.6 : 0.8;
        player.velocity.x *= friction;
        player.velocity.z *= friction;
    }

    isColliding(pos, width, height) {
        const eps = 0.01;
        const minX = Math.floor(pos.x - width / 2 + eps);
        const maxX = Math.floor(pos.x + width / 2 - eps);
        const minY = Math.floor(pos.y - height + eps);
        const maxY = Math.floor(pos.y - eps);
        const minZ = Math.floor(pos.z - width / 2 + eps);
        const maxZ = Math.floor(pos.z + width / 2 - eps);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.world.getBlock(x, y, z);
                    if (BLOCKS[block]?.collidable !== false && block !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
