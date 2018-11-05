'use strict';

const Polygon = require('./polygon');

const intersection = require('./intersection');
const nodeUtils = require('../../utils/node');

/**
 * 递归传入节点以及其子节点
 * @param {*} root
 * @param {*} includeRoot
 * @param {*} cb
 */
function deepQueryChildren(root, includeRoot, cb) {
    function traversal(node, cb) {
        var children = node.children;

        for (var i = children.length - 1; i >= 0; i--) {
            var child = children[i];

            traversal(child, cb);

            cb(child);
        }
    }

    if (cb) {
        traversal(root, cb);
    }

    if (includeRoot) {
        if (cb) {
            cb(root);
        }
    }
}

/**
 * 传入一个节点与矩形，判断是否相交
 * @param {*} node
 * @param {*} rect
 */
function testNodeWithSize(node, rect, testRectContains) {
    const size = node.getContentSize();
    if (size.width === 0 || size.height === 0) {
        return null;
    }

    var aabb = nodeUtils.getWorldBounds(node, size);

    if (testRectContains) {
        return rect.containsRect(aabb) ? {aabb: aabb} : null;
    }

    if (rect.intersects(aabb)) {
        var bounds = nodeUtils.getWorldOrientedBounds(node, size);
        var polygon = new Polygon(bounds);

        if (intersection.rectPolygon(rect, polygon)) {
            return {
                aabb: aabb,
                obb: polygon
            };
        }
    }

    return null;
}

/**
 * 传入一个 component
 * @param {*} component
 */
function testComponent(component, testRectContains) {
    const node = component.node;

    if (component._getLocalBounds) {
        var localRect = tmpRect1;
        component._getLocalBounds(localRect);
        if (localRect.width <= 0 || localRect.height <= 0) {
            return null;
        }

        node.getWorldMatrix(tmpMat);
        cc.engine.obbApplyMatrix(localRect, tmpMat, obb_v1, obb_v2, obb_v3, obb_v4);

        var aabb = tmpRect2;
        Editor.Math.calculateMaxRect(aabb, obb_v1, obb_v2, obb_v3, obb_v4);

        if (testRectContains) {
            return rect.containsRect(aabb) ? {aabb: aabb} : null;
        }

        if (rect.intersects(aabb)) {
            if (intersection.rectPolygon(rect, obb_polygon)) {
                return {
                    aabb: aabb,
                    obb: obb_polygon
                };
            }
        }
    }

    if (component.gizmo && component.gizmo.rectHitTest(rect, testRectContains)) {
        return {};
    }

    return null;
}

/**
 * 传入一个矩形，返回矩形包含的节点
 * @param {*} rect
 */
function getIntersectionList(rect, testRectContains) {
    const list = [];
    const scene = cc.director.getScene();

    // cache temp variables
    var obb_v1 = new cc.Vec2();
    var obb_v2 = new cc.Vec2();
    var obb_v3 = new cc.Vec2();
    var obb_v4 = new cc.Vec2();
    var obb_polygon = new Polygon([obb_v1, obb_v2, obb_v3, obb_v4]);
    var tmpRect1 = new cc.Rect();
    var tmpRect2 = new cc.Rect();
    var tmpMat = cc.vmath.mat4.create();

    deepQueryChildren(scene, false, (child) => {
        // todo 这是什么标记
        if (!child.activeInHierarchy) {
            return;
        }

        // 包含 canvas 组件的 node 不参与点击测试
        if (child.getComponent(cc.Canvas)) {
            return;
        }

        const result = testNodeWithSize(child, rect, testRectContains);
        if (result) {
            result.node = child;
            list.push(result);
            return;
        }

        // const components = child._components;

        // for (let i = 0, l = components.length; i < l; i++) {
        //     const component = components[i];
        //     if (!component.enabled) {
        //         continue;
        //     }

        //     result = testComponent(component);
        //     if (result) {
        //         result.node = child;
        //         list.push(result);
        //         break;
        //     }
        // }
    });

    return list;
}

/**
 * 传入一个世界坐标，判断点击到哪个节点
 * @param {*} x
 * @param {*} y
 */
function hitTest(x, y) {
    const worldHitPoint = cc.v2(x, y);

    let minDist = Number.MAX_VALUE;
    let resultNode;

    let EPSILON = 1e-6;

    let list = getIntersectionList(new cc.Rect(worldHitPoint.x, worldHitPoint.y, 1, 1));
    list.forEach((result) => {
        let node = result.node;
        if (!node) { return; }

        let aabb = result.aabb || nodeUtils.getWorldBounds(node);

        // TODO: calculate the OBB center instead
        let dist = worldHitPoint.sub(aabb.center).magSqr();

        // 不选中锁定或隐藏节点
        if (dist - minDist < -EPSILON &&
            !(node._objFlags & (cc.Object.Flags.LockedInEditor | cc.Object.Flags.HideInHierarchy))) {
            minDist = dist;
            resultNode = node;
        }
    });

    return resultNode;
}

function rectTest(x, y, w = 1, h = 1) {
    const rect = cc.rect(x, y, w, h);
    const results = [];
    const list = getIntersectionList(rect, true);
    list.forEach((result) => {
        let node = result.node;
        //需要检查是否是锁定节点，锁定节点不选中
        if (!node || node._objFlags & cc.Object.Flags.LockedInEditor) { return; }

        results.push(node);
    });

    return results;
}

window.abc = module.exports = {
    hitTest,
    rectTest,
};
