'use strict';

const selection = require('../../public/selection');
const operationManager = require('./operation');
const { EditorCamera } = require('./camera');

selection.init = function() {
    operationManager.on('mouseup', (data) => {
        if (!data.leftButton) {
            return;
        }
        const bcr = document.body.getBoundingClientRect();
        EditorCamera.instance.screenPointToRay(data.x, bcr.height - data.y, bcr.width, bcr.height, selection.ray);
        let res = cc.director._renderSystem._scene.raycast(selection.ray);
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

module.exports = selection;
