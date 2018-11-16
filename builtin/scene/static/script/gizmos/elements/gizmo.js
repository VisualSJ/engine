'use strict';

const NodeUtils = Editor.require('scene://utils/node');
const AnimUtils = Editor.require('scene://utils/animation');

let snapPixelWihVec2 = Editor.GizmosUtils.snapPixelWihVec2;
let EPSILON = 1e-6;

function close (a, b) {
    return Math.abs(a - b) < EPSILON;
}

let _tempMatrix = cc.vmath.mat4.create();

class Gizmo {
    constructor (view, target) {
        this.hovering = false;
        this.selecting = false;
        this.editing = false;

        this._view = view;
        this._root = null;
        this._hidden = true;
        this._controller = null;

        this._adjustMap = [];
        this.registerAdjustValue(cc.Vec2, ['x', 'y']);
        this.registerAdjustValue(cc.Vec3, ['x', 'y', 'z']);
        this.registerAdjustValue(cc.Size, ['width', 'height']);

        this._dirty = true;

        this._lastMats = {};

        this.createController();

        this.target = target;

        if (this.init) {
            this.init();
        }
    }

    get target()
    {
        return this._target;
    }

    set target(value)
    {
        this._target = value;

        if (this.target == null || this.target.length <= 0)
            return;

        if (this.onTargetsUpdate)
            this.onTargetsUpdate();
    }

    onTargetsUpdate()
    {
        if (this.updateControllerTransform)
        {
            this.updateControllerTransform();
        }
    }

    // foreground, scene, background
    layer () {
        return 'scene';
    }

    createRoot () {
        let layer = this._view[this.layer()];
        if (!layer) {
            Editor.warn(`Plase make gizmo layer exists [${this.layer()}] in Gizmo View`);
            return;
        }

        this._root = layer.group();

        this._registerEvent();

        if (this.onCreateRoot) {
            this.onCreateRoot();
        }
    }

    ensureController()
    {
        if (this._controller)
            return;

        this.createController();
    }

    createController()
    {
        if (this.onCreateController)
        {
            this.onCreateController();
        }
    }

    registerMoveSvg (svg, args, opts) {
        if (opts) {
            Editor.GizmosUtils.addMoveHandles(svg, opts, this.createMoveCallbacks(args));
        }
        else {
            Editor.GizmosUtils.addMoveHandles(svg, this.createMoveCallbacks(args));
        }
    }

    createMoveCallbacks (args) {
        if (!this._moveCallbacks) {
            this._moveCallbacks = this.onCreateMoveCallbacks();
        }

        let callbacks = this._moveCallbacks;
        let updated = false;

        return {
            start: function (x, y, event) {
                updated = false;

                let canvasSize = cc.view.getCanvasSize();
                y = canvasSize.height - y;

                let newArgs = Array.prototype.slice.call(arguments, 2, arguments.length);
                newArgs = [x, y].concat(newArgs);
                newArgs = args !== undefined ? newArgs.concat(args) : newArgs;

                if (callbacks.start) {
                    callbacks.start.apply(this, newArgs);
                }
            }.bind(this),
            update: function (dx, dy, event) {
                if (dx === 0 && dy === 0) {
                    return;
                }

                updated = true;

                dy = -dy;

                this.recordChanges();

                let newArgs = Array.prototype.slice.call(arguments, 2, arguments.length);
                newArgs = [dx, dy].concat(newArgs);
                newArgs = args !== undefined ? newArgs.concat(args) : newArgs;

                if (callbacks.update) {
                    callbacks.update.apply(this, newArgs);
                }

                this._view.repaintHost();
            }.bind(this),
            end: function (event) {
                let newArgs = Array.prototype.slice.call(arguments, 0, arguments.length);
                newArgs = args !== undefined ? newArgs.concat(args) : newArgs;

                if (callbacks.end) {
                    callbacks.end.apply(this, newArgs);
                }

                if (updated) {
                    this.commitChanges();
                }

                updated = false;
            }.bind(this)
        };
    }

    onCreateMoveCallbacks () {
        return {
            start (x, y, event) {},
            update (dx, dy, event) {},
            end (event) {}
        };
    }

    recordChanges () {
        this.nodes.forEach( node => {
            _Scene.Undo.recordNode( node.uuid );
        });

        this._dirty = true;
    }

    commitChanges () {
        AnimUtils.recordNodeChanged(this.nodes);
        _Scene.Undo.commit();

        this._dirty = true;
    }

    worldToPixel (p) {
        return snapPixelWihVec2( this._view.worldToPixel(p) );
    }

    pixelToWorld (p) {
        return this._view.pixelToWorld(p);
    }

    sceneToPixel (p) {
        return snapPixelWihVec2( this._view.sceneToPixel(p) );
    }

    pixelToScene (p) {
        return this._view.pixelToScene(p);
    }

    defaultMinDifference() {
        return Editor.Math.numOfDecimalsF(1.0/this._view.scale);
    }

    registerAdjustValue (ctor, keys) {
        this._adjustMap.push({
            ctor: ctor,
            keys: keys
        });
    }

    //判断当前选中节点是否被锁定
    _checkLockStatus (){
        return this.node._objFlags & cc.Object.Flags.LockedInEditor;
    }

    adjustValue (targets, keys, minDifference) {
        if (!Array.isArray(targets)) {
            targets = [targets];
        }

        if (keys !== undefined && !Array.isArray(keys)) {
            keys = [keys];
        }

        minDifference = minDifference || this.defaultMinDifference();

        let adjustValue = (target, key) => {
            if (key && typeof target[key] === 'number') {
                target[key] = Editor.Math.toPrecision(target[key], minDifference);
                return;
            }
            else {
                let value = key ? target[key] : target;
                let adjustMap = this._adjustMap;
                for (let o = 0; o < adjustMap.length; o++) {
                    let objs = adjustMap[o];
                    if (value === objs.ctor || value.constructor === objs.ctor) {
                        for (let k = 0; k < objs.keys.length; k++) {
                            adjustValue(value, objs.keys[k]);
                        }

                        return;
                    }
                }
            }

            Editor.warn(`Try to adjust non-number value [${key}}]`);
        };

        for (let i = 0; i < targets.length; i++) {
            let target = targets[i];

            if (keys === undefined) {
                adjustValue(target);
            }
            else {
                for (let j = 0; j < keys.length; j++) {
                    adjustValue(target, keys[j]);
                }    
            }
        }
    }

    targetValid () {
        let target = this.target;
        if ( Array.isArray(target) ) {
            target = target[0];
        }

        return target && target.isValid;
    }

    visible () {
        return this.selecting || this.editing;
    }

    _viewDirty () {
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
    }

    _nodeDirty (node) {
        node = node || this.node;
        node.getWorldMatrix(_tempMatrix);
        let dirty = false;
        
        let lastMat = this._lastMats[node.uuid];
        if (!lastMat) {
            this._lastMats[node.uuid] = lastMat = cc.vmath.mat4.create();
            dirty = true;
        }
        else if (!close(lastMat.a, _tempMatrix.a) ||
            !close(lastMat.b, _tempMatrix.b) ||
            !close(lastMat.c, _tempMatrix.c) ||
            !close(lastMat.d, _tempMatrix.d) ||
            !close(lastMat.tx, _tempMatrix.tx) ||
            !close(lastMat.ty, _tempMatrix.ty)) {
            dirty = true;
        }

        cc.vmath.mat4.copy(lastMat, _tempMatrix);
        return dirty;
    }

    dirty () {
        return this._viewDirty() || this._nodeDirty() || this._dirty;
    }

    update () {
        if (!this.targetValid() || !this.visible() || this._checkLockStatus()) {
            this.hide();
            return;
        }

        this.show();

        if (!this.dirty()) {
            return;
        }

        let hasScene = cc.director && cc.director.getScene();
        if (this.onUpdate && hasScene) {
            this.onUpdate();
        }

        this._dirty = false;
    }

    remove () {
        if (this._root) {
            this._root.remove();
            this._root = null;
        }
    }

    ensureRoot () {
        if (this._root) {
            return;
        }

        this.createRoot();
    }

    hide () {
        if (this._hidden) {
            return;
        }

        if (this._root) {
            this._root.hide();
        }

        if (this._controller)
        {
            this._controller.hide();
        }

        this._hidden = true;
        this._dirty = true;
    }

    show () {
        if (!this._hidden) {
            return;
        }

        this.ensureRoot();

        if (this._root) {
            this._root.show();
        }

        this.ensureController();

        if (this._controller)
        {
            this._controller.show();
        }

        this._hidden = false;
        this._dirty = true;
    }

    rectHitTest (rect, testRectContains) {
        return false;
    }

    _registerEvent () {
        let el = this._root.node;

        // select nodes when click the gizmo, #1155
        el.addEventListener('mousedown', () => {
            let ids = this.nodes.map((node) => {
                return node.uuid;
            });
            Editor.Selection.select( 'node', ids );
        }, true);

        // hover current node when mouse over in capture event level
        el.addEventListener('mouseover', () => {
            Editor.Selection.hover( 'node', this.node.uuid );
        }, true);

        // hover out current node when mouse leave in capture event level
        el.addEventListener('mouseleave', () => {
            Editor.Selection.hover( 'node', null );
        }, true);

        // swallow mousemove event to prevent scene-view mousemove
        el.addEventListener( 'mousemove', ( event ) => {
            // if svg ignoreMouseMove is true, then return.
            if (event.srcElement.instance.ignoreMouseMove) {
                return;
            }

            event.stopPropagation();
        });
    }

    get node () {
        let target = this.target;
        if ( Array.isArray(target) ) {
            target = target[0];
        }

        if ( cc.Node.isNode(target) )
            return target;
        else if ( target instanceof cc.Component )
            return target.node;

        return null;
    }

    get nodes () {
        let nodes = [];
        let target = this.target;
        if ( Array.isArray(target) ) {
            for ( let i = 0; i < target.length; ++i ) {
                let t = target[i];
                if ( cc.Node.isNode(t) )
                    nodes.push(t);
                else if ( t instanceof cc.Component )
                    nodes.push(t.node);
            }
        }
        else {
            if ( cc.Node.isNode(target) )
                nodes.push(target);
            else if ( target instanceof cc.Component )
                nodes.push(target.node);
        }

        return nodes;
    }

    get topNodes () {
        let topNodes = this.target.filter(node => {
            let parent = node.parent;
            while(parent) {
                if (this.target.indexOf(parent) !== -1) {
                    return false;
                }

                parent = parent.parent;
            }

            return true;
        });

        return topNodes;
    }

    get selecting () {
        return this._selecting;
    }

    set selecting (value) {
        this._dirty = value !== this._selecting;
        this._selecting = value;
    }

    get editing () {
        return this._editing;
    }

    set editing (value) {
        this._dirty = value !== this._editing;
        this._editing = value;
    }

    get hovering () {
        return this._hovering;
    }

    set hovering (value) {
        this._dirty = value !== this._hovering;
        this._hovering = value;
    }

    setDimension(is2D)
    {
        this.ensureController();
        
        if (this._controller)
        {
            this._controller.setDimension(is2D);
        }
    }

    set2DScale(scale)
    {  
        if (this._controller)
        {
            this._controller.set2DScale(scale);
        }
    }
}


module.exports = Gizmo;
