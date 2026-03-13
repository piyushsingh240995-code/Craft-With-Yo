export class AI {
    static wander(mob, delta) {
        if (Math.random() < 0.01) {
            mob.targetVelocity = {
                x: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            };
        }
        if (mob.targetVelocity) {
            mob.velocity.x += (mob.targetVelocity.x - mob.velocity.x) * 0.1;
            mob.velocity.z += (mob.targetVelocity.z - mob.velocity.z) * 0.1;
        }
    }

    static follow(mob, targetPos, delta) {
        const dist = mob.position.distanceTo(targetPos);
        if (dist < 30 && dist > 2) {
            const dir = targetPos.clone().sub(mob.position).normalize();
            dir.y = 0;
            // Add to velocity instead of position
            mob.velocity.x += dir.x * 0.01;
            mob.velocity.z += dir.z * 0.01;
            
            // Cap speed
            const speed = Math.sqrt(mob.velocity.x * mob.velocity.x + mob.velocity.z * mob.velocity.z);
            if (speed > 0.1) {
                mob.velocity.x = (mob.velocity.x / speed) * 0.1;
                mob.velocity.z = (mob.velocity.z / speed) * 0.1;
            }
        }
    }
}
