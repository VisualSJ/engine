'use stirct';

function createCamera(color) {
    const node = new cc.Node('Editor Camera');
    const camera = node.addComponent(cc.CameraComponent);
    camera.color = color;
    camera.onLoad();
    camera.onEnable();
    return camera;
}

function grid(width, length, segw, segl) {
    let positions = [];
    let normals = [];
    let uvs = [];
    let indices = [];

    let hw = width * 0.5;
    let hl = length * 0.5;
    let dw = width / segw;
    let dl = length / segl;
    let i = 0;
    let minPos = cc.vmath.vec3.create(-hw, 0, -hl);
    let maxPos = cc.vmath.vec3.create(hw, 0,  hl);
    let boundingRadius = Math.max(hw, hl);

    for (let x = -hw; x <= hw; x += dw, i += 2) {
        positions.push(x, 0, -hl);
        uvs.push((x + hw) / width, 0);
        normals.push(0, 1, 0);

        positions.push(x, 0,  hl);
        uvs.push((x + hw) / width, 1);
        normals.push(0, 1, 0);

        indices.push(i, i + 1);
    }
    for (let z = -hl; z <= hl; z += dl, i += 2) {
        positions.push(-hw, 0, z);
        uvs.push(0, (z + hl) / length);
        normals.push(0, 1, 0);

        positions.push(hw, 0, z);
        uvs.push(1, (z + hl) / length);
        normals.push(0, 1, 0);

        indices.push(i, i + 1);
    }

    return {
        positions,
        uvs,
        normals,
        indices,
        minPos,
        maxPos,
        boundingRadius,
        primitiveType: cc.gfx.PT_LINES
    };
}

function createGrid(w, l) {
    let node = new cc.Node('Editor Grid');
    let model = node.addComponent(cc.ModelComponent);
    model.mesh = cc.utils.createMesh(cc.game._renderContext, grid(w, l, w, l));
    let mtl = new cc.Material();
    mtl.effectAsset = cc.game._builtins['builtin-effect-unlit'];
    // mtl.define('USE_TEXTURE', true);
    mtl.define('USE_COLOR', true);
    mtl.setProperty('color', cc.color('#555555'));
    model.material = mtl;
    // node.parent = _Scene.view.backgroundNode;
    node._layer = cc.Layers.Gizmos | cc.Layers.IgnoreRaycast;
    return node;
}

module.exports = {
    createCamera,
    createGrid,
};
