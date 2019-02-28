'use strict';

const selection = require('../../public/selection');
const operationManager = require('./operation');
const cameraManager = require('./camera');
const ray = cc.geometry.ray.create();
selection.init = function() {
    operationManager.on('mouseup', (data) => {
        if (!data.leftButton) {
            return;
        }
        const {resultNode} = this.getResultNode(data.x, data.y);
        if (resultNode && resultNode.uuid) {
            selection.clear();
            selection.select(resultNode.uuid);
        } else {
            // 等事件处理顺序完善后再开启这个功能
            if (data.leftButton) {  //左键没选中东西则取消当前所选
                selection.clear();
            }
        }
    });
};

/**
 * 获取点击到的节点
 * @param {*} x
 * @param {*} y
 */
selection.getResultNode = function(x, y) {
    const bcr = document.body.getBoundingClientRect();
    cameraManager._camera._camera.screenPointToRay(ray, x, bcr.height - y);
    let res = cc.director._scene._renderScene.raycast(ray);
    let minDist = Number.MAX_VALUE;
    let resultNode = null;

    for (let i = 0; i < res.length; i++) {
        let node = res[i].node;
        let dist = res[i].distance;

        // 寻找最近的相交, 并忽略锁定节点或 cc.PrivateNode (如 RichText 的子节点)
        if (
            dist > minDist ||
            (node._objFlags & cc.Object.Flags.LockedInEditor) ||
            node instanceof cc.PrivateNode
        ) {
            continue;
        }

        minDist = dist;
        resultNode = node;
    }
    return {resultNode, ray};
};
module.exports = selection;
