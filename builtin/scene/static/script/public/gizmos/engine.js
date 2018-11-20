'use strict';

// engine specific functionalities

let Engine = { isCreator2x: cc.renderer.renderEngine };
module.exports = Engine;

if (Engine.isCreator2x) { /////////////////////////////////////////////////////

  Engine.gfx = cc.renderer.renderEngine.gfx; let gfx = Engine.gfx;
  Engine.create3DNode = function (name) {
    let node3d = new cc.Node(name);
    node3d.is3DNode = true;
    return node3d;
  };
  Engine.createMesh = function (primitive) {
    let mesh = new cc.Mesh();
    let vfmtPosColor = new gfx.VertexFormat([
      { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
    ]);
    mesh.init(vfmtPosColor, primitive.positions.length, true);
    mesh.setVertices(gfx.ATTR_POSITION, primitive.positions);
    mesh.setIndices(primitive.indices);
    if (primitive.minPos) mesh._minPos = primitive.minPos;
    if (primitive.maxPos) mesh._maxPos = primitive.maxPos;
    if (primitive.primitiveType !== undefined)
      mesh.setPrimitiveType(primitive.primitiveType);
    return mesh;
  };
  Engine.addMeshToNode = function (node, mesh, opts = {}) {
    let renderer = node.addComponent(cc.MeshRenderer);
    renderer.mesh = mesh;
    let mat = renderer._material; // set depth
    let pass = mat._mainTech._passes[0];
    pass.setDepth(false, false);
    if (opts.cullMode) pass.setCullMode(opts.cullMode);
    return;
  };
  Engine.setMeshColor = function (node, c) {
    node.color = c;
  };
  Engine.setNodeOpacity = function (node, opacity) {
    node.opacity = opacity;
  };
  const CameraTool = require('../2d/manager/camera');
  const ControllerShapeCollider = require('./elements/utils/controller-shape-collider');
  Engine.getRaycastResults = function (rootNode, x, y) {
    let ray = CameraTool._camera.getRay(cc.v3(x, y, 1));
    let results = cc.geomUtils.intersect.raycast(rootNode, ray, (modelRay, node, distance) => {
      let csc = node.getComponent(ControllerShapeCollider);
      if (csc && csc.isDetectMesh) {
        let meshRenderer = node.getComponent(cc.MeshRenderer);
        let subMeshes = meshRenderer.mesh._subMeshes;
        if (meshRenderer && meshRenderer.mesh &&
          subMeshes && subMeshes[0]._primitiveType == gfx.PT_TRIANGLES) {
          return cc.geomUtils.intersect.rayMesh(modelRay, meshRenderer.mesh);
        }
      }
      return distance;
    }, function (node) {
      let hasMesh = node.getComponent(cc.MeshRenderer);
      if (hasMesh == null || node.active == false) {
        return false;
      }
      return true;
    });
    results.ray = ray;
    return results;
  };
  Engine.getModel = function (node) {
    return node.getComponent(cc.MeshRenderer);
  };
  Engine.updateVBAttr = function (mesh, attr, data) {
    mesh.setVertices(attr, data);
  };

} else { //////////////////////////////////////////////////////////////////////

  Engine.gfx = cc.gfx;
  Engine.panPlaneLayer = cc.Layers.PanPlanes;
  Engine.create3DNode = function (name) {
    let node = new cc.Node(name);
    node._layer = cc.Layers.Gizmos;
    node.modelColor = cc.color();
    return node;
  };
  let flat = function (arr, fn) {
    return arr.map(fn).reduce((acc, val) => acc.concat(val), []);
  };
  Engine.createMesh = function (primitive) {
    primitive.positions = flat(primitive.positions, v => [v.x, v.y, v.z]);
    if (primitive.normals) primitive.normals = flat(primitive.normals, v => [v.x, v.y, v.z]);
    if (primitive.uvs) primitive.uvs = flat(primitive.uvs, v => [v.x, v.y]);
    let mesh = cc.utils.createMesh(cc.game._renderContext, primitive);
    mesh.getSubMesh(0).doubleSided = primitive.doubleSided;
    return mesh;
  };
  Engine.addMeshToNode = function (node, mesh, opts = {}) {
    let model = node.addComponent(cc.ModelComponent);
    model.mesh = mesh;
    let mtl = new cc.Material();
    mtl.effectName = 'builtin-effect-gizmo';
    mtl.setProperty('color', node.modelColor);
    let pass = mtl._effect.getTechnique('transparent').passes[0];
    if (opts.cullMode) pass.setCullMode(opts.cullMode);
    model.material = mtl;
  };
  Engine.setMeshColor = function (node, c) {
    node.modelColor.r = c.r;
    node.modelColor.g = c.g;
    node.modelColor.b = c.b;
  };
  Engine.setNodeOpacity = function (node, opacity) {
    node.modelColor.a = opacity;
  };
  const CameraTool = require('../../3d/manager/camera');
  const cmp = (a, b) => { return a.distance - b.distance; };
  const ray = cc.geometry.ray.create();
  Engine.getRaycastResults = function (rootNode, x, y) {
    let scene = cc.director._renderSystem._scene;
    let camera = CameraTool._camera._camera;
    camera.screenPointToRay(x, y, cc.winSize.width, cc.winSize.height, ray);
    let results = scene.raycast(ray, rootNode._layer).sort(cmp);
    results.ray = ray; return results;
  };
  Engine.getModel = function (node) {
    return node.getComponent(cc.ModelComponent);
  };
  Engine.updateVBAttr = function (mesh, attr, data) {
    let vb = mesh.getSubMesh(0)._vertexBuffer, cache = vb[attr];
    data.forEach((v, i) => {
      cache[i * 3] = v.x; cache[i * 3 + 1] = v.y; cache[i * 3 + 2] = v.z;
    });
    vb.updateAttr(attr);
  };

}
