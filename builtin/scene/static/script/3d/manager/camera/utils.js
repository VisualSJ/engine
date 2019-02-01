'use stirct';

const nodeManager = require('../node');

// wasd 按键提示
const $info = document.createElement('div');
$info.hidden = true;
$info.id = 'camera_info';
$info.innerHTML = `
<style>
    #camera_info { position: absolute; top: 10px; left: 10px; font-size: 12px; text-align: center; color: #fff; }
    #camera_info div { padding: 2px 0; }
    #camera_info span { border: 1px solid #fff; border-radius: 2px; padding: 0 4px; }
</style>
<div>
    <span>w</span>
</div>
<div>
    <span>a</span>
    <span>s</span>
    <span>d</span>
</div>
`;
document.body.appendChild($info);

/**
 * 绘制线条
 * @param {*} width
 * @param {*} length
 * @param {*} segw
 * @param {*} segl
 */
function grid(width, length, segw, segl) {
    let positions = [];
    let uvs = [];
    let indices = [];

    let hw = width * 0.5;
    let hl = length * 0.5;
    let dw = width / segw;
    let dl = length / segl;

    let minPos = cc.v3(-hw, -0.1, -hl);
    let maxPos = cc.v3( hw,  0.1,  hl);

    // here we store directional info of the grid layout inside uvs, not actual uvs
    function addLine(x1, z1, x2, z2) {
        let idx = positions.length / 3;
        if (x1 === x2) {
            positions.push(x1 + 0.01, 0, z1); uvs.push(1, 0);
            positions.push(x1 - 0.01, 0, z1); uvs.push(0, 0);
            positions.push(x1 + 0.01, 0, z2); uvs.push(1, 0);
            positions.push(x1 - 0.01, 0, z2); uvs.push(0, 0);
        } else {
            positions.push(x1, 0, z1 - 0.01); uvs.push(0, 1);
            positions.push(x1, 0, z1 + 0.01); uvs.push(1, 1);
            positions.push(x2, 0, z1 - 0.01); uvs.push(0, 1);
            positions.push(x2, 0, z1 + 0.01); uvs.push(1, 1);
        }
        indices.push(idx, idx + 1, idx + 2, idx + 2, idx + 1, idx + 3);
    }

    for (let x = -hw; x <= hw; x += dw) {
        addLine(x, -hl, x, hl);
    }
    for (let z = -hl; z <= hl; z += dl) {
        addLine(-hw, z, hw, z);
    }

    return {
        positions,
        uvs,
        indices,
        minPos,
        maxPos
    };
}

/**
 * 创建网格
 * @param {*} w
 * @param {*} l
 */
function createGrid(w, l) {
    let node = new cc.Node('Editor Grid');
    node.layer = cc.Layers.Editor | cc.Layers.IgnoreRaycast;
    node.parent = Manager.backgroundNode;
    let model = node.addComponent(cc.ModelComponent);
    model.mesh = cc.utils.createMesh(grid(w, l, w, l));
    let mtl = new cc.Material();
    mtl.initialize({ effectName: '__editor-grid' });
    model.material = mtl;
    return node;
}

/**
 * 创建相机
 * @param {*} color
 */
function createCamera(color) {
    let node = new cc.Node('Editor Camera');
    node.layer = cc.Layers.Editor | cc.Layers.IgnoreRaycast;
    node.parent = Manager.backgroundNode;
    let camera = node.addComponent(cc.CameraComponent);
    camera.far = 10000; camera.color = color;
    camera.targetDisplay = -1;
    let light = node.addComponent(cc.LightComponent);
    return [ camera, light ];
}

/**
 * 查询带有 light 的节点列表
 * @param {*} excludes 排除的节点数组
 */
function queryLightNodes(excludes) {
    const nodes = [];
    nodeManager.queryUuids().forEach((uuid) => {
        const node = nodeManager.query(uuid);
        if (!node || excludes.includes(node)) {
            return;
        }
        const comp = node.getComponent(cc.LightComponent);
        if (!comp) {
            return;
        }
        nodes.push(node);
    });

    return nodes;
}

/**
 * 检查场景内是否有可以使用的光源
 * @param {*} nodes
 */
function isSceneHasActiveLight(nodes) {
    let hasActive = false;
    let noLightNode = [];
    nodes.forEach((node) => {
            if (node.active) {
                let lightComp = node.getComponent(cc.LightComponent);
                if (lightComp) {
                    if (lightComp.enabled === true) {
                        hasActive = true;
                    }
                } else {
                    // need to remove node from list
                    noLightNode.push(node);
                }
            }
        });

    noLightNode.forEach((node) => {
        let index = nodes.indexOf(node);
        nodes.splice(index, 1);
    });

    return hasActive;
}

module.exports = {
    $info,
    createCamera,
    createGrid,
    queryLightNodes,
    isSceneHasActiveLight,
};
