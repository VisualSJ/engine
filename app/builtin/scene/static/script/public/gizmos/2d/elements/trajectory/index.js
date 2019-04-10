'use strict';

const NodeUtils = Editor.require('scene://utils/node');

const {
    SegmentTool,
    CurveTool,
} = require('./trajectory-tool');

let Utils = require('./utils');
let Segment = Utils.Segment;

let sampleMotionPaths;
try {
    sampleMotionPaths = Editor.require('unpack://engine-dev/cocos/animation/motion-path-helper').sampleMotionPaths;
} catch (e) {
    sampleMotionPaths = Editor.require('unpack://engine-dev/cocos2d/animation/motion-path-helper').sampleMotionPaths;
}
let v2 = cc.v2;



let EPSILON = 1e-6;

function close (a, b) {
    return Math.abs(a - b) < EPSILON;
}

class TrajectoryGizmo extends Editor.Gizmo {
    init () {
        // selected tool
        this._selectedSegTool = null;
        this._selectedCurveTool = null;

        // help members
        this._animationState = null;
        this._sampledCurve = null;
        this._clip = null;
        this._childPath = '';

        this._lastMapping = null;

        this._curParentMatrix = cc.vmath.mat4.create();
        this._lastParentMatrix = cc.vmath.mat4.create();

        this._segments = [];

        this._processing = false;

        this._clipChanging = false;
    }
}

// public functions

TrajectoryGizmo.prototype.show = function (root, clip, childPath) {
    if (!root) {
        return;
    }

    let animation = root.getComponent(cc.Animation);
    if (!animation) {
        return;
    }

    let animState = animation.getAnimationState(clip.name);
    if (!animState) {
        console.error(`Cant\'t find animation state with clip name [${clip.name}]`);
        return;
    }

    Editor.Gizmo.prototype.show.call(this);

    this._animationState = animState;
    this._clip = clip;
    this._childPath = childPath;

    this._initSampledCurve();
    this._initSegments();
};


TrajectoryGizmo.prototype.onCreateRoot = function () {
    let root = this._root;
    this._sampledCurveGroup = root.group();
    this._curveGroup = root.group();
    this._segmentGroup = root.group();
};

TrajectoryGizmo.prototype._viewDirty = function () {
    let scene = cc.director.getScene();
    let worldPosition = NodeUtils.getWorldPosition(scene);
    let mapping = this._view.worldToPixel(worldPosition);
    let dirty = false;

    if (!this._lastMapping ||
        !close(this._lastMapping.x, mapping.x) ||
        !close(this._lastMapping.y, mapping.y)) {
        dirty = true;
    }

    this._lastMapping = mapping;
    return dirty;
};

TrajectoryGizmo.prototype._parentDirty = function () {
    let mat = this.target.parent.getWorldMatrix(this._curParentMatrix);
    let lastMatrix = this._lastParentMatrix;
    let dirty = false;

    if (!lastMatrix ||
        !close(lastMatrix.m00, mat.m00) ||
        !close(lastMatrix.m01, mat.m01) ||
        !close(lastMatrix.m04, mat.m04) ||
        !close(lastMatrix.m05, mat.m05) ||
        !close(lastMatrix.m12, mat.m12) ||
        !close(lastMatrix.m13, mat.m13)) {
        dirty = true;
    }

    cc.vmath.mat4.copy(lastMatrix, mat);
    return dirty;
};

TrajectoryGizmo.prototype.visible = function () {
    return !this._hidden && (this._viewDirty() || this._parentDirty());
};

TrajectoryGizmo.prototype.update = function () {
    if (!this.targetValid() || !this.visible()) {
        return;
    }

    this._updateSegments();
};

// helper

TrajectoryGizmo.prototype._pixelVecToArray = function (v) {
    let gizmosView = this._view;
    let parent = this.target.parent;

    let pos = parent.convertToNodeSpaceAR( gizmosView.pixelToWorld(v) );
    return [pos.x, pos.y];
};

TrajectoryGizmo.prototype._segToArray = function (seg) {
    let pos = this._pixelVecToArray(seg.pos);
    let inControl = this._pixelVecToArray(seg.inControl);
    let outControl = this._pixelVecToArray(seg.outControl);

    return pos.concat(inControl).concat(outControl);
};

// segments handler

TrajectoryGizmo.prototype._initSegments = function () {
    let clip = this._clip;
    let keyframes = clip.getProperty('position', '', this._childPath) || [];
    let segments = [];

    // for each keyframes
    for (let i = 0, l = keyframes.length; i < l; i++) {

        let keyframe = keyframes[i];

        let segment = new Segment();
        segment.originValue = keyframe.value;
        segment.keyframe = keyframe;
        segments.push( segment );

        let motionPath = keyframe.motionPath || [];

        for (let j = 0; j < motionPath.length; j++) {
            let value = motionPath[j];
            let subSeg = new Segment();
            subSeg.originValue = value;

            segments.push( subSeg );
        }
    }

    this._segments = segments;

    this.initCurveTools();
    this._updateSegments();
};

TrajectoryGizmo.prototype._updateSegments = function () {
    let parent = this.target.parent;
    let gizmosView = this._view;

    function valueToV2 (v1, v2) {
        let v = cc.v2(v1, v2);
        v = parent.convertToWorldSpaceAR(v);
        return gizmosView.worldToPixel(v);
    }

    let segments = this._segments;

    for (let i = 0, l = segments.length; i < l; i++) {
        let seg = segments[i];
        let value = seg.originValue;

        if (value.length === 2) {
            seg.pos = valueToV2(value[0], value[1]);
            seg.inControl = seg.pos.clone();
            seg.outControl = seg.pos.clone();
        }
        else if (value.length === 6) {
            seg.pos = valueToV2(value[0], value[1]);
            seg.inControl = valueToV2(value[2], value[3]);
            seg.outControl = valueToV2(value[4], value[5]);
        }

        seg.tool.plot();
        if (seg.keyframe) {
            seg.tool.curveTools[0].plot();
        }
    }
};

TrajectoryGizmo.prototype._createSegmentTool = function (seg) {
    let segmentGroup = this._segmentGroup;
    let self = this;

    let updated = false;

    let segmentToolCallbacks = {
        beforeSelected: function (segTool) {
            if (segTool.curveTools.indexOf(self._selectedCurveTool) === -1) {
                segTool.curveTools[0].select();
            }

            if (self._selectedSegTool) {
                self._selectedSegTool.unselect();
            }

            self._selectedSegTool = segTool;
        },

        onDelete: function (segTool) {
            self._removeSegment(segTool);
        },

        start: function () {
            self._processing = true;
            self._initSampledCurve();

            updated = false;
        },

        update: function (segTool) {
            updated = true;

            segTool.curveTools.forEach(function (curveTool) {
                curveTool.plot();
            });

            self._updateSampledCurves();
            self._animationState.sample();
            cc.engine.repaintInEditMode();

        },

        end: function () {
            self._processing = false;

            if (updated) {
                self._clipChanged();
            }
        }
    };

    let tool = new SegmentTool(segmentGroup, seg, segmentToolCallbacks);
    seg.tool = tool;
    return tool;
};

TrajectoryGizmo.prototype.initCurveTools = function () {
    let segments = this._segments;
    let curveGroup = this._curveGroup;
    let segmentGroup = this._segmentGroup;

    curveGroup.clear();
    segmentGroup.clear();

    let self = this;
    let curveCallbacks = {
        beforeSelected: function (curveTool) {
            if (self._selectedCurveTool) {
                self._selectedCurveTool.unselect();
            }

            self._selectedCurveTool = curveTool;
        },

        addSegment: function (x, y) {
            let pos = v2(x, y);
            self._addSegment(pos);
        }
    };

    let curveTool = CurveTool(curveGroup, '', curveCallbacks);

    for (let i = 0, l = segments.length; i < l; i++) {
        let seg = segments[i];
        let segTool = this._createSegmentTool(seg);

        segTool.curveTools.push(curveTool);
        curveTool.segmentTools.push(segTool);

        if (i > 0 && seg.keyframe) {
            curveTool.plot();

            if (i < l - 1) {
                curveTool = CurveTool(curveGroup, '', curveCallbacks);
                curveTool.segmentTools.push(segTool);
                segTool.curveTools.push(curveTool);
            }
        }
    }
};

TrajectoryGizmo.prototype._addSegment = function (pos) {
    let curveTool = this._selectedCurveTool;

    if (!curveTool) return;

    let segmentTools = curveTool.segmentTools;
    let minResult;
    let segTool;

    for (let i = 0, l = segmentTools.length - 1; i < l; i++) {
        segTool = segmentTools[i];
        let nextSegTool = segmentTools[i + 1];

        let result = Utils.getNearestParameter(segTool.segment, nextSegTool.segment, pos);

        if (!minResult || result.dist < minResult.dist) {
            minResult = result;
            minResult.seg1 = segTool;
            minResult.seg2 = nextSegTool;
        }
    }

    let seg = Utils.createSegmentWithNearset(minResult);
    seg.originValue = this._segToArray(seg);

    // add segment
    let segments = this._segments;
    let segIndex = segments.indexOf(minResult.seg2.segment);
    segments.splice(segIndex, 0, seg);

    // add segment tool
    segTool = this._createSegmentTool(seg);
    let segToolIndex = curveTool.segmentTools.indexOf(minResult.seg2);
    curveTool.segmentTools.splice(segToolIndex, 0, segTool);
    segTool.curveTools.push(curveTool);

    segTool.show();
    segTool.select();
    curveTool.plot();

    // update sampled curve
    this._updateSampledCurves();

    this._clipChanged();
};

TrajectoryGizmo.prototype._addKeySegment = function (position, time, keyframes) {
    let i, l;

    if (keyframes.length === 0 ||
        time < keyframes[0].frame) {
        i = 0;
    }
    else {
        for (i = 0, l = keyframes.length; i < l; i++) {
            if (keyframes[i].frame > time) {
                break;
            }
        }
    }

    let keyframe = {
        frame: time,
        value: [position.x, position.y],
        motionPath: []
    };

    keyframes.splice(i, 0, keyframe);

    return i;
};

TrajectoryGizmo.prototype._removeSegment = function (segTool) {
    let segments = this._segments;
    let segment = segTool.segment;
    let curveTool = segTool.curveTools[0];
    let segTools = curveTool.segmentTools;

    segTool.hide();

    segments.splice(segments.indexOf(segment), 1);
    segTools.splice(segTools.indexOf(segTool), 1);

    curveTool.plot();

    // update sampled curve
    this._updateSampledCurves();

    this._clipChanged();

    if (this._selectedSegTool === segTool) {
        this._selectedSegTool = null;
    }
};

TrajectoryGizmo.prototype._clipChanged = function () {
    this._clipChanging = true;
    Editor.Ipc.sendToWins('scene:animation-clip-changed', {
        uuid: this._clip._uuid,
        data: this._clip.serialize(),
        clip: this._clip.name
    });
};

TrajectoryGizmo.prototype._initSampledCurve = function () {
    let aniState = this._animationState;
    let curves = aniState.curves;
    let sampledCurve;

    for (let i = 0, l = curves.length; i < l; i++) {
        let curve = curves[i];
        if (curve.target === this.target && curve.prop === 'position') {
            sampledCurve = curve;
            break;
        }
    }

    this._sampledCurve = sampledCurve;
};

TrajectoryGizmo.prototype._updateSampledCurves = function () {
    let segments = this._segments;
    let keyframes = [];
    let keyframe;

    let clip = this._clip;
    let sampledCurve = this._sampledCurve;

    if (!sampledCurve) return;
    let i, l;

    let minDifference = Editor.Math.numOfDecimalsF(1.0/this._view.scale);

    function adjustValue (array) {
        for (let i = 0, l = array.length; i < l; i++) {
            array[i] = Editor.Math.toPrecision(array[i], minDifference);
        }
        return array;
    }

    for (i = 0, l = segments.length; i < l; i++) {
        let seg = segments[i];

        if (seg.keyframe) {
            keyframe = seg.keyframe;
            seg.originValue = keyframe.value = adjustValue( this._pixelVecToArray(seg.pos) );
            keyframe.motionPath = [];
            keyframes.push(keyframe);
            continue;
        }

        let value = seg.originValue = adjustValue( this._segToArray(seg) );

        keyframe.motionPath.push(value);
    }

    let motionPaths = [];

    sampledCurve.ratios = [];
    sampledCurve.types = [];
    sampledCurve.values = [];

    for (i = 0, l = keyframes.length; i < l; i++) {
        keyframe = keyframes[i];

        let ratio = keyframe.frame / clip.duration;
        sampledCurve.ratios.push(ratio);

        sampledCurve.values.push(keyframe.value);
        sampledCurve.types.push(keyframe.curve);

        if (keyframe.motionPath && keyframe.motionPath.length > 0)
            motionPaths.push(keyframe.motionPath);
        else
            motionPaths.push(null);
    }

    sampleMotionPaths(motionPaths, sampledCurve, clip.duration, clip.sample);
};

TrajectoryGizmo.prototype.assetChanged = function (uuid) {
    let clip = this._clip;
    if (!clip || clip._uuid !== uuid || this._hidden) {
        return;
    }

    cc.AssetLibrary.loadAsset(uuid, function (err, asset) {
        this.updateClip(asset);
    }.bind(this));
};

TrajectoryGizmo.prototype.updateClip = function (clip) {
    if (this._clipChanging) {
        this._clipChanging = false;
        return;
    }

    if (this._clip._uuid !== clip._uuid ||
        this._hidden) {
        return;
    }

    this._clip = clip;
    this._initSampledCurve();
    this._initSegments();
};

TrajectoryGizmo.animationChanged = false;
TrajectoryGizmo.state = 'segment'; // 'segment', 'trajectory'

module.exports = TrajectoryGizmo;
