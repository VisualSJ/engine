'use strict';

const selection = require('../../public/selection');
const operationManager = require('./operation');
const cameraManager = require('./camera');

operationManager.on('hit', (data) => {
    const bcr = document.body.getBoundingClientRect();
    cameraManager.instance.screenPointToRay(data.x, bcr.height - data.y, bcr.width, bcr.height, selection.ray);
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
    }
});

module.exports = selection;
