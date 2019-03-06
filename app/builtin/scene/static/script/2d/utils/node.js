'use strict';

let tempMatrix = null;

// return [bl, tr, tr, br]
function getObbFromRect(mat, rect, out_bl, out_tl, out_tr, out_br) {
    let x = rect.x;
    let y = rect.y;
    let width = rect.width;
    let height = rect.height;

    let tx = mat.m00 * x + mat.m04 * y + mat.m12;
    let ty = mat.m01 * x + mat.m05 * y + mat.m13;
    let xa = mat.m00 * width;
    let xb = mat.m01 * width;
    let yc = mat.m04 * height;
    let yd = mat.m05 * height;

    out_bl = out_bl || cc.v2();
    out_tl = out_tl || cc.v2();
    out_tr = out_tr || cc.v2();
    out_br = out_br || cc.v2();

    out_tl.x = tx;
    out_tl.y = ty;
    out_tr.x = xa + tx;
    out_tr.y = xb + ty;
    out_bl.x = yc + tx;
    out_bl.y = yd + ty;
    out_br.x = xa + yc + tx;
    out_br.y = xb + yd + ty;

    return [out_bl, out_tl, out_tr, out_br];
}

function getWorldBounds(node, size, out) {
    tempMatrix = tempMatrix || cc.vmath.mat4.create();
    size = size || node.getContentSize();
    let anchor = node.getAnchorPoint();
    let width  = size.width;
    let height = size.height;

    let rect = new cc.Rect(-anchor.x * width, -anchor.y * height, width, height);
    node.getWorldMatrix(tempMatrix);
    rect.transformMat4(rect, tempMatrix);

    if (out) {
        out.x = rect.x;
        out.y = rect.y;
        out.width  = rect.width;
        out.height = rect.height;
        return out;
    } else {
        return rect;
    }
}

function getWorldOrientedBounds(node, size, out_bl, out_tl, out_tr, out_br) {
    tempMatrix = tempMatrix || cc.vmath.mat4.create();
    size = size || node.getContentSize();
    let anchor = node.getAnchorPoint();
    let width  = size.width;
    let height = size.height;
    let rect = new cc.Rect(-anchor.x * width, -anchor.y * height, width, height);

    node.getWorldMatrix(tempMatrix);
    return getObbFromRect(tempMatrix, rect, out_bl, out_tl, out_tr, out_br);
}

function getScenePosition(node) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access scenePosition if no running scene');
        return cc.Vec2.ZERO;
    }

    return scene.convertToNodeSpaceAR(getWorldPosition(node));
}

function setScenePosition(node, value) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access scenePosition if no running scene');
        return;
    }

    setWorldPosition(node, cc.v2(scene.convertToWorldSpaceAR(value)));
}

function getSceneRotation(node) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access sceneRotation if no running scene');
        return 0;
    }

    return getWorldRotation(node) - scene.angle;
}

function setSceneRotation(node, value) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access sceneRotation if no running scene');
        return;
    }

    setWorldRotation(scene.angle + value);
}

function getWorldPosition(node) {
    let pos = node.convertToWorldSpaceAR(cc.v2(0, 0));
    return cc.v2(pos.x, pos.y);
}

function setWorldPosition(node, value) {
    if (value instanceof cc.Vec2) {
        if (node.parent) {
            let p = node.parent.convertToNodeSpaceAR(value);
            node.x = p.x;
            node.y = p.y;
        } else {
            node.x = value.x;
            node.y = value.y;
        }
    } else {
        cc.error('The new worldPosition must be cc.Vec2');
    }
}

function getWorldRotation(node) {
    let parent = node.parent;
    if (parent) {
        if (parent instanceof cc.Scene) {
            return node.angle + parent.angle;
        } else {
            return node.angle + getWorldRotation(parent);
        }
    } else {
        return node.angle;
    }
}

function setWorldRotation(node, value) {
    if (!isNaN(value)) {
        let parent = node.parent;
        if (parent) {
            if (parent instanceof cc.Scene) {
                node.angle = value - parent.angle;
            } else {
                node.angle = value - getWorldRotation(parent);
            }
        } else {
            node.angle = value;
        }
    } else {
        cc.error('The new worldRotation must not be NaN');
    }
}

function getWorldScale(node) {
    tempMatrix = tempMatrix || cc.vmath.mat4.create();
    node.getWorldMatrix(tempMatrix);
    let a = tempMatrix.m00;
    let b = tempMatrix.m01;
    let c = tempMatrix.m04;
    let d = tempMatrix.m05;

    let ret = new cc.Vec2();
    ret.x = Math.sqrt(a * a + b * b);
    ret.y = Math.sqrt(c * c + d * d);

    let mirrored = a !== 0 && a === -d && b === 0 && c === 0;
    if (mirrored) {
        if (a < 0) {
            ret.x = -ret.x;
        } else {
            ret.y = -ret.y;
        }
    }

    return ret;
}

/**
 * 查找所有 Component, 看是否有任一符合标记的
 * @method _hasFlagInComponents
 * @param {Number} flag - 只能包含一个标记, 不能是复合的 mask
 * @returns {boolean}
 */
function _hasFlagInComponents(node, flag) {
    let comps = node._components;
    for (let c = 0, len = comps.length; c < len; ++c) {
        let comp = comps[c];
        if (comp._objFlags & flag) {
            return true;
        }
    }
    return false;
}

function getNodePath(node) {
    let path = '';
    while (node && !(node instanceof cc.Scene)) {
        if (path) {
            path = node.name + '/' + path;
        } else {
            path = node.name;
        }
        node = node._parent;
    }
    return path;
}

var stack = new Array(32);
function getChildUuids(root, insertRoot) {
    var res = [];
    if (insertRoot) {
        res.push(root.uuid);
    }
    // push root to parsing stack
    var topIndex = 0;
    stack[0] = root;
    //
    while (topIndex >= 0) {
        // pop
        var curr = stack[topIndex];
        stack[topIndex] = null;
        --topIndex;
        //
        if (!curr) { continue; }
        var children = curr._children;
        if (!children) { continue; }
        for (var i = 0, len = children.length; i < len; ++i) {
            var child = children[i];
            // push
            ++topIndex;
            stack[topIndex] = child;
            // iterate
            res.push(child.uuid);
        }
    }
    return res;
}

module.exports = {
    _hasFlagInComponents,

    getNodePath,
    getObbFromRect,
    getWorldBounds,
    getWorldOrientedBounds,
    getScenePosition,
    setScenePosition,
    getSceneRotation,
    setSceneRotation,
    getWorldPosition,
    setWorldPosition,
    getWorldRotation,
    setWorldRotation,
    getWorldScale,
    getChildUuids,
};
