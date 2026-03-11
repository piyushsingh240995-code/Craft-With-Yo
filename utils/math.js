export const MathUtils = {
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    
    // AABB Collision
    intersectAABB: (box1, box2) => {
        return (
            box1.min.x <= box2.max.x &&
            box1.max.x >= box2.min.x &&
            box1.min.y <= box2.max.y &&
            box1.max.y >= box2.min.y &&
            box1.min.z <= box2.max.z &&
            box1.max.z >= box2.min.z
        );
    }
};
