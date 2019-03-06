'use strict';

let Bezier;
try {
    Bezier = Editor.require('unpack://engine-dev/cocos/animation/motion-path-helper').Bezier;
} catch (e) {
    Bezier = Editor.require('unpack://engine-dev/cocos2d/animation/motion-path-helper').Bezier;
}
let v2 = cc.v2;

function Segment (pos, inControl, outControl) {
    this.pos = pos ? pos.clone() : v2();
    this.inControl = inControl || this.pos.clone();
    this.outControl = outControl || this.pos.clone();
    this.keyframe = null;
}

Segment.prototype.clone = function () {
    return new Segment(this.pos, this.inControl, this.outControl);
};

Segment.prototype.getValue = function () {
    return [this.pos.x, this.pos.y, this.inControl.x, this.inControl.y, this.outControl.x, this.outControl.y];
};

function getNearestParameter (seg1, seg2, point) {
    let EPSILON = 4e-7;

    let bezier = new Bezier();
    bezier.start = seg1.pos;
    bezier.end = seg2.pos;
    bezier.startCtrlPoint = seg1.outControl;
    bezier.endCtrlPoint = seg2.inControl;

    let count = 100,
        posAtMin = null,
        minDist = Infinity,
        minT = 0;

    function distance(p1, p2) {
        let x = p1.x - p2.x;
        let y = p1.y - p2.y;
        return Math.sqrt(x * x + y * y);
    }

    function refine(t) {
        if (t >= 0 && t <= 1) {
            let pos = bezier.getPoint(t);
            let dist = distance(point, pos);
            if (dist < minDist) {
                minDist = dist;
                minT = t;
                posAtMin = pos;
                return true;
            }
        }
    }

    for (let i = 0; i <= count; i++)
        refine(i / count);

    // Now iteratively refine solution until we reach desired precision.
    let step = 1 / (count * 2);
    while (step > EPSILON) {
        if (!refine(minT - step) && !refine(minT + step))
            step /= 2;
    }

    return {
        t: minT,
        dist: minDist,
        pos: posAtMin
    };
}

function createSegmentWithNearset (nearest) {
    let t = nearest.t;
    let seg1 = nearest.seg1.segment;
    let seg2 = nearest.seg2.segment;

    let p1x = seg1.pos.x, p1y = seg1.pos.y,
        c1x = seg1.outControl.x, c1y = seg1.outControl.y,
        c2x = seg2.inControl.x, c2y = seg2.inControl.y,
        p2x = seg2.pos.x, p2y = seg2.pos.y;

    let u = 1 - t,
        p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
        p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
        p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
        p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
        p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
        p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;

    seg1.outControl = v2(p3x, p3y);
    seg2.inControl = v2(p5x, p5y);

    let seg = new Segment();
    seg.pos = v2(p8x, p8y);
    seg.inControl = v2(p6x, p6y);
    seg.outControl = v2(p7x, p7y);

    return seg;
}

module.exports = {
    Segment: Segment,
    getNearestParameter: getNearestParameter,
    createSegmentWithNearset: createSegmentWithNearset
};
