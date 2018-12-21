'use strict';

class RenderScene extends cc.renderer.Scene {
    _add(pool, item) {
        pool.push(item);
    }

    _remove(pool, item) {
        pool.fastRemove(pool.indexOf(item));
    }
}

module.exports = {
    RenderScene,
};
