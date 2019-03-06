'use strict';

const { vec3, quat } = cc.vmath;

const animations = [];

let frame = 1000 / 60;
let time = 0;

function step(dt) {
    if (time === 0 || animations.length === 0) {
        stopAnim();
        return;
    }
    requestAnimationFrame(() => {
        const _time = time;
        time = Date.now();

        // 轮询所有的动画
        for (let i = 0; i < animations.length;) {
            const anim = animations[i];
            const remove = anim._step(dt);
            if (remove === false) {
                animations.splice(i, 1);
            } else {
                i++;
            }
        }

        step(time - _time);
    });
}

function startAnim() {
    if (time !== 0) {
        return;
    }
    time = Date.now();
    step(frame);
}

function stopAnim() {
    time = 0;
}

class PositionAnimation {
    constructor(start, end, time) {
        this.target = cc.v3();
        this.func = null;

        this.start = start;
        this.end = end;

        this.travel = 0;
        this.time = time;
    }

    _step(time) {
        this.travel += time;
        const t = Math.min(this.travel / this.time, 1);
        vec3.lerp(this.target, this.start, this.end, t);
        this.func && this.func(this.target);
        return t < 1;
    }

    step(func) {
        this.func = func;
    }
}

class RotationAnimation {
    constructor(start, end, time) {
        this.target = cc.quat();
        this.func = null;

        this.start = start;
        this.end = end;

        this.travel = 0;
        this.time = time;
    }

    _step(time) {
        this.travel += time;
        const t = Math.min(this.travel / this.time, 1);
        quat.slerp(this.target, this.start, this.end, t);
        this.func && this.func(this.target);
        return t < 1;
    }

    step(func) {
        this.func = func;
    }
}

/**
 * 将 target 属性，从 start 渐变到 end
 * @param {*} start
 * @param {*} end
 * @param {*} time
 */
function tweenPosition(start, end, time = 300) {
    const anim = new PositionAnimation(start, end, time);
    animations.push(anim);
    startAnim();
    return anim;
}

/**
 * 将 target 属性，从 start 渐变到 end
 * @param {*} start
 * @param {*} end
 * @param {*} time
 */
function tweenRotation(start, end, time) {
    const anim = new RotationAnimation(start, end, time);
    animations.push(anim);
    startAnim();
    return anim;
}

exports.position = tweenPosition;
exports.rotation = tweenRotation;
