export class AI {
    static wander(mob, delta) {
        if (Math.random() < 0.01) {
            mob.velocity.x = (Math.random() - 0.5) * 0.05;
            mob.velocity.z = (Math.random() - 0.5) * 0.05;
        }
        mob.position.add(mob.velocity);
    }

    static follow(mob, targetPos, delta) {
        const dist = mob.position.distanceTo(targetPos);
        if (dist < 30 && dist > 2) {
            const dir = targetPos.clone().sub(mob.position).normalize();
            dir.y = 0;
            mob.position.add(dir.multiplyScalar(0.08));
        }
    }
}
