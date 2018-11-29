const EditorMath = require('./math');

let tempMatrix = cc.mat4();
let tempQuat = cc.quat();
let tempVec3 = cc.v3();

let Utils = {};

// return [bl, tr, tr, br]
Utils.getObbFromRect = function(mat, rect, out_bl, out_tl, out_tr, out_br) {
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
};

Utils.getWorldBounds = function(node, size, out) {
    size = size || cc.size(0, 0);
    let width = size.width;
    let height = size.height;
    let rect = new cc.Rect(0, 0, width, height);
    node.getWorldMatrix(tempMatrix);
    rect.transformMat4(rect, tempMatrix);

    if (out) {
        out.x = rect.x;
        out.y = rect.y;
        out.width = rect.width;
        out.height = rect.height;
        return out;
    } else {
        return rect;
    }
};

Utils.getWorldOrientedBounds = function(node, size, out_bl, out_tl, out_tr, out_br) {
    size = size || cc.size(0, 0);
    let width = size.width;
    let height = size.height;
    let rect = new cc.Rect(0, 0, width, height);

    node.getWorldMatrix(tempMatrix);
    return Utils.getObbFromRect(tempMatrix, rect, out_bl, out_tl, out_tr, out_br);
};

Utils.getScenePosition = function(node) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access scenePosition if no running scene');
        return cc.Vec3.ZERO;
    }

    return node.getWorldPosition(tempVec3);
};

Utils.setScenePosition = function(node, value) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access scenePosition if no running scene');
        return;
    }

    node.setWorldPosition(value);
};

Utils.getSceneRotation = function(node) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access sceneRotation if no running scene');
        return 0;
    }

    return Utils.getWorldRotation(node);
};

Utils.setSceneRotation = function(node, value) {
    let scene = cc.director.getScene();
    if (!scene) {
        cc.error('Can not access sceneRotation if no running scene');
        return;
    }

    Utils.setWorldRotation(value);
};

Utils.getWorldPosition = function(node) {
    return node.getWorldPosition();
};

Utils.setWorldPosition = function(node, value) {
    if (value instanceof cc.Vec3) {
        node.setWorldPosition(value);
    } else {
        cc.error('The new worldPosition must be cc.Vec3');
    }
};

Utils.getWorldRotation = function(node) {
    return node.getWorldRotation(tempQuat);
};

Utils.setWorldRotation = function(node, value) {
    if (value instanceof cc.Quat) {
        node.setWorldPosition(value);
    } else {
        cc.error('The new worldPosition must be cc.Vec3');
    }
};

Utils.getWorldScale = function(node) {
    // TODO adaptation to use vec3
    return node.getWorldScale(tempVec3);
};

/**
 * 查找所有 Component, 看是否有任一符合标记的
 * @method _hasFlagInComponents
 * @param {Number} flag - 只能包含一个标记, 不能是复合的 mask
 * @returns {boolean}
 */
Utils._hasFlagInComponents = function(node, flag) {
    let comps = node._components;
    for (let c = 0, len = comps.length; c < len; ++c) {
        let comp = comps[c];
        if (comp._objFlags & flag) {
            return true;
        }
    }
    return false;
};

function invokeOnDestroyRecursively(node) {
    let originCount = node._components.length;
    for (let c = 0; c < originCount; ++c) {
        let component = node._components[c];
        if (cc.engine._isPlaying || component.constructor._executeInEditMode) {
            if (component.onDestroy) {
                try {
                    component.onDestroy();
                } catch (e) {
                    cc._throw(e);
                }
            }
        }
    }
    // deactivate children recursively
    for (let i = 0, len = node.childrenCount; i < len; ++i) {
        let entity = node._children[i];
        if (entity._active) {
            entity._disableChildComps();
        }
    }
}

Utils._destroyForUndo = function(nodeOrComp, recordFunc) {
    if (cc.Node.isNode(nodeOrComp)) {
        // invoke all callbacks of components
        if (nodeOrComp._activeInHierarchy) {
            nodeOrComp._disableChildComps();
        }
        invokeOnDestroyRecursively(nodeOrComp);
    }

    recordFunc();

    // destroy after record
    nodeOrComp.destroy();

    Editor.Ipc.sendToAll('scene:delete-nodes-in-scene');
};

Utils.getNodePath = function(node) {
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
};

var stack = new Array(32);
Utils.getChildUuids = function(root, insertRoot) {
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
};

/**
 * 从一个 asset 内创建新的节点
 * @param {*} uuid
 * @param {*} callback
 */
Utils.createNodeFromAsset = function(uuid, callback) {
    const Sandbox = require('../lib/sandbox');
    cc.AssetLibrary.queryAssetInfo(uuid, (error, url, isRaw, assetType) => {
        if (error) {
            return callback(error);
        }

        if (isRaw) {
            callback(new Error('Can not create node from raw asset: ' + cc.js.getClassName(assetType)));
            return;
        }

        if (cc.js.isChildClassOf(assetType, cc._Script)) {
            let cid = Editor.Utils.UuidUtils.compressUuid(uuid);
            let Class = cc.js._getClassById(cid);
            let node;
            if (cc.js.isChildClassOf(Class, cc.Component)) {
                node = new cc.Node(cc.js.getClassName(Class));
                node.addComponent(Class);
                callback(null, node);
            } else {
                let Url = !CC_TEST && require('fire-url');
                let script = Url.basename(url);

                if (Editor.remote.Compiler.state === 'compiling' || Sandbox.reloading) {
                    callback(new Error(`Can not load "${script}", please wait for the scene to reload.`));
                } else {
                    callback(new Error(`Can not find a component in the script "${script}".`));
                }
            }
            return;
        }

        cc.AssetLibrary.loadAsset(uuid, (err, asset) => {
            if (err) {
                return callback(err);
            }

            if (asset.createNode) {
                if (asset instanceof cc.Prefab) {
                    let autoSync = Editor.globalProfile.data['auto-sync-prefab'];
                    if (autoSync) {
                        let PrefabUtils = require('./prefab');
                        PrefabUtils._setPrefabSync(asset.data, true);
                    }
                }
                asset.createNode(callback);
            } else {
                callback(new Error('Can not create node from ' + cc.js.getClassName(assetType)));
            }
        });
    });
};

/**
 * 根据 class 创建一个新的节点
 * @param {*} classID
 * @param {*} callback
 */
Utils.createNodeFromClass = function(classID, callback) {
    let node = new cc.Node();
    let error = null;

    if (classID) {
        // add component
        let CompCtor = cc.js._getClassById(classID);
        if (CompCtor) {
            var comp = node.addComponent(CompCtor);
            if (comp) {
                cc.director._nodeActivator.resetComp(comp);
            }
        } else {
            error = new Error(`Unknown node to create: ${classID}`);
        }
    }

    callback && callback(error, node);
};

Utils.makeVec3InPrecision = function(inVec3, precision) {
    inVec3.x = EditorMath.toPrecision(inVec3.x, precision);
    inVec3.y = EditorMath.toPrecision(inVec3.y, precision);
    inVec3.z = EditorMath.toPrecision(inVec3.z, precision);

    return inVec3;
};

Utils.getWorldPosition3D = function(node) {
    return node.getWorldPosition();
};

Utils.setWorldPosition3D = function(node, value, precision = 3) {

    value = Utils.makeVec3InPrecision(value, precision);
    node.setWorldPosition(value);
};

Utils.getWorldRotation3D = function(node) {
    return node.getWorldRotation();
};

Utils.setWorldRotation3D = function(node, value) {
    node.setWorldRotation(value);
};

Utils.getEulerAngles = function(node) {
    return cc.vmath.quat.toEuler(tempQuat, node.getRotation(tempVec3));
};

Utils.setEulerAngles = function(node, value) {
    node.setRotationFromEuler(value.x, value.y, value.z);
};

Utils.getWorldScale3D = function(node) {
    return node.getWorldScale();
};

Utils.getCenterWorldPos3D = function(nodes) {
    var minX = null;
    var minY = null;
    var minZ = null;
    var maxX = null;
    var maxY = null;
    var maxZ = null;
    for (var i = 0; i < nodes.length; ++i) {
        var v;
        var node = nodes[i];
        var bounds = Utils.getWorldOrientedBounds(node);

        for (var j = 0; j < bounds.length; ++j) {
            v = bounds[j];

            if (minX === null || v.x < minX) {
                minX = v.x;
            }
            if (maxX === null || v.x > maxX) {
                maxX = v.x;
            }

            if (minY === null || v.y < minY) {
                minY = v.y;
            }
            if (maxY === null || v.y > maxY) {
                maxY = v.y;
            }

            if (minZ === null || v.z < minZ) {
                minZ = v.z;
            }
            if (maxZ === null || v.z > maxZ) {
                maxZ = v.z;
            }
        }

        v = Utils.getWorldPosition3D(node);

        if (minX === null || v.x < minX) {
            minX = v.x;
        }
        if (maxX === null || v.x > maxX) {
            maxX = v.x;
        }

        if (minY === null || v.y < minY) {
            minY = v.y;
        }
        if (maxY === null || v.y > maxY) {
            maxY = v.y;
        }

        if (minZ === null || v.z < minZ) {
            minZ = v.z;
        }
        if (maxZ === null || v.z > maxZ) {
            maxZ = v.z;
        }
    }

    var centerX = (minX + maxX) * 0.5;
    var centerY = (minY + maxY) * 0.5;
    var centerZ = (minZ + maxZ) * 0.5;

    return cc.v3(centerX, centerY, centerZ);
};

Utils.getMaxRangeOfNode = function(node) {
    let maxRange = 10;

    if (node) {
        let compRange = 0;
        node._components.forEach((component) => {
            let componentName = cc.js.getClassName(component);
            switch (componentName) {
                case 'cc.LightComponent':
                    compRange = component.range;
                    break;
            }

            if (compRange > maxRange) {
                maxRange = compRange;
            }
        });
    }

    return maxRange;
};

Utils.getMinRangeOfNodes = function(nodes) {
    let minRange = Number.MAX_VALUE;

    if (nodes) {
        let range = 0;
        nodes.forEach((node) => {
            range = Utils.getMaxRangeOfNode(node);
            if (range < minRange) {
                minRange = range;
            }
        });
    }

    return minRange;
};

module.exports = Utils;
