'use strict';
const LinearTicks = require('./linear-ticks');
const EditorMath = require('../../../../utils/math');

function _snapPixel(p) {
    return Math.floor(p);
}

function _uninterpolate(a, b) {
    b = (b -= a) || 1 / b;
    return function(x) { return (x - a) / b; };
}

function _interpolate(a, b) {
    return function(t) { return a * (1 - t) + b * t; };
}

class Grid {
    constructor(canvasWidth, canvasHeight) {
        this._canvasWidth = canvasWidth;
        this._canvasHeight = canvasHeight;

        this.hTicks = null;
        this.xAxisScale = 1.0;
        this.xAxisOffset = 1.0;
        this.xAnchor = 0.5;

        this.vTicks = null;
        this.yAxisScale = 1.0;
        this.yAxisOffset = 1.0;
        this.yAnchor = 0.5;

        this._xAnchorOffset = 0;
        this._yAnchorOffset = 0;
    }

    setAnchor(x, y) {
        this.xAnchor = EditorMath.clamp(x, -1, 1);
        this.yAnchor = EditorMath.clamp(y, -1, 1);
    }

    setScaleH(lods, minScale, maxScale) {
        this.hTicks = new LinearTicks()
            .initTicks(lods, minScale, maxScale)
            .spacing(10, 80);

        this.xAxisScale = EditorMath.clamp(
            this.xAxisScale,
            this.hTicks.minValueScale,
            this.hTicks.maxValueScale
        );

        this.pixelToValueH = (x) => {
            return (x - this.xAxisOffset) / this.xAxisScale;
        };

        this.valueToPixelH = (x) => {
            return x * this.xAxisScale + this.xAxisOffset;
        };
    }

    setMappingH(minValue, maxValue, pixelRange) {
        this._xAnchorOffset = minValue / (maxValue - minValue);
        this.xDirection = (maxValue - minValue) > 0 ? 1 : -1;

        this.pixelToValueH = (x) => {
            let pixelOffset = this.xAxisOffset;

            let ratio = this._canvasWidth / pixelRange;
            let u = _uninterpolate(0.0, this._canvasWidth);
            let i = _interpolate(minValue * ratio, maxValue * ratio);
            return i(u(x - pixelOffset)) / this.xAxisScale;
        };

        this.valueToPixelH = (x) => {
            let pixelOffset = this.xAxisOffset;

            let ratio = this._canvasWidth / pixelRange;
            let u = _uninterpolate(minValue * ratio, maxValue * ratio);
            let i = _interpolate(0.0, this._canvasWidth);
            return i(u(x * this.xAxisScale)) + pixelOffset;
        };
    }

    setScaleV(lods, minScale, maxScale) {
        this.vTicks = new LinearTicks()
            .initTicks(lods, minScale, maxScale)
            .spacing(10, 80)
            ;
        this.yAxisScale = EditorMath.clamp(
            this.yAxisScale,
            this.vTicks.minValueScale,
            this.vTicks.maxValueScale
        );

        this.pixelToValueV = (y) => {
            return (this._canvasHeight - y + this.yAxisOffset) / this.yAxisScale;
        };

        this.valueToPixelV = (y) => {
            return -y * this.yAxisScale + this._canvasHeight + this.yAxisOffset;
        };
    }

    setMappingV(minValue, maxValue, pixelRange) {
        this._yAnchorOffset = minValue / (maxValue - minValue);
        this.yDirection = (maxValue - minValue) > 0 ? 1 : -1;

        this.pixelToValueV = (y) => {
            let pixelOffset = this.yAxisOffset;

            let ratio = this._canvasHeight / pixelRange;
            let u = _uninterpolate(0.0, this._canvasHeight);
            let i = _interpolate(minValue * ratio, maxValue * ratio);
            return i(u(y - pixelOffset)) / this.yAxisScale;
        };

        this.valueToPixelV = (y) => {
            let pixelOffset = this.yAxisOffset;

            let ratio = this._canvasHeight / pixelRange;
            let u = _uninterpolate(minValue * ratio, maxValue * ratio);
            let i = _interpolate(0.0, this._canvasHeight);
            return i(u(y * this.yAxisScale)) + pixelOffset;
        };
    }

    pan(deltaPixelX, deltaPixelY) {
        this.panX(deltaPixelX);
        this.panY(deltaPixelY);
    }

    panX(deltaPixelX) {
        if (!this.valueToPixelH) {
            return;
        }

        let newOffset = this.xAxisOffset + deltaPixelX;
        this.xAxisOffset = 0.0; // calc range without offset

        let min;
        let max;
        if (this.xMinRange !== undefined && this.xMinRange !== null) {
            min = this.valueToPixelH(this.xMinRange);
        }
        if (this.xMaxRange !== undefined && this.xMaxRange !== null) {
            max = this.valueToPixelH(this.xMaxRange);
            max = Math.max(0, max - this.canvas.width);
        }

        this.xAxisOffset = newOffset;

        if (min !== undefined && max !== undefined) {
            this.xAxisOffset = EditorMath.clamp(this.xAxisOffset, -max, -min);
            return;
        }

        if (min !== undefined) {
            this.xAxisOffset = Math.min(this.xAxisOffset, -min);
            return;
        }

        if (max !== undefined) {
            this.xAxisOffset = Math.max(this.xAxisOffset, -max);
            return;
        }
    }

    panY(deltaPixelY) {
        if (!this.valueToPixelV) {
            return;
        }

        let newOffset = this.yAxisOffset + deltaPixelY;
        this.yAxisOffset = 0.0; // calc range without offset

        let min;
        let max;
        if (this.yMinRange !== undefined && this.yMinRange !== null) {
            min = this.valueToPixelV(this.yMinRange);
        }
        if (this.yMaxRange !== undefined && this.yMaxRange !== null) {
            max = this.valueToPixelV(this.yMaxRange);
            max = Math.max(0, max - this.canvas.height);
        }

        this.yAxisOffset = newOffset;

        if (min !== undefined && max !== undefined) {
            this.yAxisOffset = EditorMath.clamp(this.yAxisOffset, -max, -min);
            return;
        }

        if (min !== undefined) {
            this.yAxisOffset = Math.min(this.yAxisOffset, -min);
            return;
        }

        if (max !== undefined) {
            this.yAxisOffset = Math.max(this.yAxisOffset, -max);
            return;
        }
    }

    xAxisScaleAt(pixelX, scale) {
        let oldValueX = this.pixelToValueH(pixelX);
        this.xAxisScale = EditorMath.clamp(scale, this.hTicks.minValueScale, this.hTicks.maxValueScale);
        let newScreenX = this.valueToPixelH(oldValueX);
        this.pan(pixelX - newScreenX, 0);
    }

    yAxisScaleAt(pixelY, scale) {
        let oldValueY = this.pixelToValueV(pixelY);
        this.yAxisScale = EditorMath.clamp(scale, this.vTicks.minValueScale, this.vTicks.maxValueScale);
        let newScreenY = this.valueToPixelV(oldValueY);
        this.pan(0, pixelY - newScreenY);
    }

    xAxisSync(x, scaleX) {
        this.xAxisOffset = x;
        this.xAxisScale = scaleX;
    }

    yAxisSync(y, scaleY) {
        this.yAxisOffset = y;
        this.yAxisScale = scaleY;
    }

    resize(w, h) {
        if (!w || !h) {
            return;
        }

        if (this._canvasWidth !== 0) {
            this.panX((w - this._canvasWidth) * (this.xAnchor + this._xAnchorOffset));
        }

        if (this._canvasHeight !== 0) {
            this.panY((h - this._canvasHeight) * (this.yAnchor + this._yAnchorOffset));
        }

        this._canvasWidth = w;
        this._canvasHeight = h;
    }

    updateRange() {
        if (this.hTicks) {
            let left = this.pixelToValueH(0);
            let right = this.pixelToValueH(this._canvasWidth);
            this.hTicks.range(left, right, this._canvasWidth);
        }

        if (this.vTicks) {
            let top = this.pixelToValueV(0);
            let bottom = this.pixelToValueV(this._canvasHeight);
            this.vTicks.range(top, bottom, this._canvasHeight);
        }
    }
}

module.exports = Grid;
