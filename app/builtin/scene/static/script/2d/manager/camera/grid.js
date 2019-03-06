'use strict';

const LinearTicks = require('./linear-ticks');

/**
 * 网格绘制
 */

class Grid {

    constructor(ctx) {
        this.ctx = ctx;

        this.hticks = new LinearTicks()
            .initTicks([5, 2], 0.01, 1000)
            .spacing(10, 80);

        this.vticks = new LinearTicks()
            .initTicks([5, 2], 0.01, 1000)
            .spacing(10, 80);
    }

    /**
     * 更新绘制的网格
     */
    update(start, end, scale) {
        const bcr = document.body.getBoundingClientRect();
        const ctx = this.ctx;
        if (!ctx) {
            return;
        }

        let ticks;
        let ratio;
        let screen_x;
        let screen_y;

        ctx.clear();
        ctx.strokeColor = cc.color().fromHEX('0x555555');
        ctx.lineWidth = 1 / scale;

        // draw h ticks
        if (this.hticks) {
            let left = start.x;
            let right = end.x;
            this.hticks.range(left, right, bcr.width);

            for (let i = this.hticks.minTickLevel; i <= this.hticks.maxTickLevel; ++i) {
                ratio = this.hticks.tickRatios[i];
                if (ratio > 0) {
                    ctx.strokeColor.a = ratio * 0.5 * 255;
                    ticks = this.hticks.ticksAtLevel(i, true);
                    for (let j = 0; j < ticks.length; ++j) {
                        ctx.moveTo(ticks[j], start.y);
                        ctx.lineTo(ticks[j], end.y);
                    }
                    ctx.stroke();
                }
            }
        }

        // draw v ticks
        if (this.vticks) {
            let top = end.y;
            let bottom = start.y;
            this.vticks.range(top, bottom, bcr.height);

            for (let i = this.vticks.minTickLevel; i <= this.vticks.maxTickLevel; ++i) {
                ratio = this.vticks.tickRatios[i];
                if (ratio > 0) {
                    ctx.strokeColor.a = ratio * 0.5 * 255;
                    ticks = this.vticks.ticksAtLevel(i, true);
                    for (let j = 0; j < ticks.length; ++j) {
                        ctx.moveTo(start.x, ticks[j]);
                        ctx.lineTo(end.x, ticks[j]);
                    }
                    ctx.stroke();
                }
            }
        }
    }
}

module.exports = Grid;
