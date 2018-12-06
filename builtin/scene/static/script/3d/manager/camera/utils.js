'use stirct';

function grid (width, length, segw, segl) {
    let positions = [];
    let uvs = [];
    let indices = [];

    let hw = width * 0.5;
    let hl = length * 0.5;
    let dw = width / segw;
    let dl = length / segl;

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

    for (let x = -hw; x <= hw; x += dw)
        addLine(x, -hl, x, hl);
    for (let z = -hl; z <= hl; z += dl)
        addLine(-hw, z, hw, z);

    return {
        positions,
        uvs,
        indices
    };
}

function createGrid(w, l) {
    let node = new cc.Node('Editor Grid');
    node._layer = cc.Layers.Gizmos | cc.Layers.IgnoreRaycast;
    node.parent = Manager.backgroundNode;
    let model = node.addComponent(cc.ModelComponent);
    model.mesh = cc.utils.createMesh(cc.game._renderContext, grid(w, l, w, l));
    let mtl = new cc.Material();
    mtl.effectName = '__editor-grid';
    model.material = mtl;
    return node;
}

function createCamera(color) {
    let node = new cc.Node('Editor Camera');
    node.parent = Manager.backgroundNode;
    let camera = node.addComponent(cc.CameraComponent);
    camera.far = 10000; camera.color = color;
    camera.onLoad(); camera.onEnable();
    let light = node.addComponent(cc.LightComponent);
    light.onLoad(); light.onEnable();
    return camera;
}

module.exports = {
    createCamera,
    createGrid,
};
