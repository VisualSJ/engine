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

const _maxTicks = 100;

let flat = function(arr, fn) {
    return arr.map(fn).reduce((acc, val) => acc.concat(val), []);
};

let updateVBAttr = function(comp, attr, data) {
    const model = comp.model.getSubModel(0);
    if (!model) { return; }
    const ia = model.inputAssembler;
    if (ia && model.subMeshData) {
        const mesh = model.subMeshData;
        // update vb
        ia.updateVertexAttr(mesh.vbuffer, attr, data);
    }
};

let updateIB = function(comp, data) {
    const model = comp.model.getSubModel(0);
    if (!model) { return; }
    const ia = model.inputAssembler;
    if (ia && model.subMeshData) {
        const mesh = model.subMeshData;
        // update ib
        ia.updateIndexBuffer(mesh.ibuffer, data);
        model.updateCommandBuffer();
    }
};

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
    let maxPos = cc.v3(hw,  0.1,  hl);

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
        maxPos,
    };
}

/**
 * 创建网格
 * @param {*} w
 * @param {*} l
 */
function createStrokeGrid(w, l) {
    let node = new cc.Node('Editor Grid');
    node.layer = cc.Layers.Editor | cc.Layers.IgnoreRaycast;
    node.parent = Manager.backgroundNode;
    let model = node.addComponent(cc.ModelComponent);
    model.mesh = cc.utils.createMesh(grid(w, l, w, l));
    const cb = model.onEnable.bind(model);
    model.onEnable = () => { cb(); model.model.viewID = -1; }; // don't show on preview cameras
    let mtl = new cc.Material();
    mtl.initialize({ effectName: 'editor/grid-stroke' });
    model.material = mtl;
    return model;
}

function createGrid(effectName) {
    let node = new cc.Node('Editor Grid');

    node.layer = cc.Layers.Editor | cc.Layers.IgnoreRaycast;
    node.parent = Manager.backgroundNode;
    node.setWorldPosition(cc.v3(0, 0, 0));
    let model = node.addComponent(cc.ModelComponent);
    const cb = model.onEnable.bind(model);
    model.onEnable = () => { cb(); model.model.viewID = -1; }; // don't show on preview cameras

    let positions = [];
    let colors = [];
    let indices = [];

    // 直接创建一大块Mesh用的内存，方便后面动态加线
    for (let i = 0; i < _maxTicks * _maxTicks; i++) {
        positions.push(0, 0);
        colors.push(1, 1, 1, 1);
    }

    for (let i = 0; i < positions.length; i += 2) {
        indices.push(i / 2);
    }

    let primitiveMode = cc.GFXPrimitiveMode.LINE_LIST;
    // 使用二维顶点来节省顶点数据
    let attributes = [{
        name: cc.GFXAttributeName.ATTR_POSITION,
        format: cc.GFXFormat.RG32F,
    }];
    let mesh = cc.utils.createMesh({positions, indices, colors, primitiveMode, attributes});

    const submesh = mesh.renderingMesh.getSubmesh(0);
    const vbInfo = mesh.struct.vertexBundles[0].view;
    submesh.vbuffer = mesh.data.buffer.slice(vbInfo.offset, vbInfo.offset + vbInfo.length);
    const ibInfo = mesh.struct.primitives[0].indexView;
    submesh.ibuffer = mesh.data.buffer.slice(ibInfo.offset, ibInfo.offset + ibInfo.length);
    model.mesh = mesh;

    // for material
    const mtl = new cc.Material();
    mtl.initialize({ effectName: effectName});
    let overrides = {};
    overrides.primitive = primitiveMode;
    mtl.overridePipelineStates(overrides);
    model.material = mtl;

    return model;
}

/**
 * 创建相机
 * @param {*} color
 */
function createCamera(color) {
    let node = new cc.Node('Editor Camera');
    node.layer = cc.Layers.Editor | cc.Layers.IgnoreRaycast;
    node.parent = Manager.backgroundNode;
    let camera = node.addComponent('cc.EditorCameraComponent');
    camera.far = 10000; camera.color = color;
    camera.targetDisplay = -2; // mainWindow
    return camera;
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

/**
 * 查询指定component列表
 * @param {*} compName
 */
function queryComponent(compName) {
    const comps = [];
    nodeManager.queryUuids().forEach((uuid) => {
        const node = nodeManager.query(uuid);
        const comp = node.getComponent(compName);
        if (!comp) {
            return;
        }
        comps.push(comp);
    });

    return comps;
}

let CameraMoveMode = cc.Enum({
    NONE: 0,
    ORBIT: 1,
    PAN: 2,
    ZOOM: 3,
    WANDER: 4, //漫游
});

module.exports = {
    $info,
    createCamera,
    createStrokeGrid,
    createGrid,
    queryLightNodes,
    isSceneHasActiveLight,
    queryComponent,
    CameraMoveMode,
    flat,
    updateVBAttr,
    updateIB,
};
