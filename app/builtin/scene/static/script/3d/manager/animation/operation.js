'use strict';

const Node = require('../node');

const utils = require('./utils');

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');

// clip 数据

/**
 * 更改一个节点上某个动画的 sample 值
 * @param {String} uuid 动画节点的 uuid
 * @param {String} clip 被修改的动画的名字
 * @param {Number} sample 动画的帧率
 */
exports.changeSample = function(uuid, clip, sample) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    sample = Math.round(sample);
    if (isNaN(sample) || sample < 1) {
        sample = 1;
    }

    state._clip.sample = sample;
    animData.animComp._animator._reloadClip(state);
};

/**
 * 更改一个节点上某个动画的 speed 值
 * @param {String} uuid 动画节点的 uuid
 * @param {String} clip 被修改的动画的名字
 * @param {Number} speed 动画的播放速度
 */
exports.changeSpeed = function(uuid, clip, speed) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    state._clip.speed = speed;
    animData.animComp._animator._reloadClip(state);
};

/**
 * 更改一个节点上某个动画的播放模式
 * @param {String} uuid 动画节点的 uuid
 * @param {String} clip 被修改的动画的名字
 * @param {Number} mode 动画的播放模式
 */
exports.changeWrapMode = function(uuid, clip, mode) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    if (cc.WrapMode[mode] === undefined) {
        mode = 0;
    }

    state._clip.wrapMode = mode;
    animData.animComp._animator._reloadClip(state);
};

// 节点数据

/**
 * 清除一个节点上某个动画的节点数据
 * @param {String} uuid 动画节点的 uuid
 * @param {String} clip 被修改的动画的名字
 * @param {Strig} path 被清除的节点路径
 */
exports.clearNode = function(uuid, clip, path) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    // 如果清除的是根节点
    if (path === '/') {
        delete state._clip.curveData.props;
        delete state._clip.curveData.comps;
    } else {
        path = path.substr(1);
        if (state._clip.curveData.paths && state._clip.curveData.paths[path]) {
            delete state._clip.curveData.paths[paths].props;
            delete state._clip.curveData.paths[paths].comps;
        }
    }

    animData.animComp._animator._reloadClip(state);
};

// 属性数据

/**
 * 新增一条属性轨道
 * @param {String} uuid 动画节点的 uuid
 * @param {String} clip 被修改的动画的名字
 * @param {Strig} path 新增的节点数据路径
 * @param {String} comp 新增的属性属于哪个组件，如果是 node 属性，则传 null
 * @param {String} prop 新增的属性的名字
 */
exports.createProp = function(uuid, clip, path, comp, prop) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    let data = utils.getCurveDataFromClip(state._clip, path);

    if (!data) {
        return;
    }

    let propData = utils.getPropertyDataFrom(data, comp, prop);
    if (!propData) {
        if (comp) {
            let comps = data.comps = data.comps || {};
            let props = comps[comp] = comps[comp] || {};
            propData = props[prop] = props[prop] || [];
        } else {
            let props = data.props = data.props || {};
            propData = props[prop] = props[prop] || [];
        }
    }
    animData.animComp._animator._reloadClip(state);
};

/**
 * 删除一条属性轨道
 * @param {String} uuid 动画节点的 uuid
 * @param {String} clip 被修改的动画的名字
 * @param {Strig} path 节点数据路径
 * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
 * @param {String} prop 属性的名字
 */
exports.removeProp = function(uuid, clip, path, comp, prop) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    let data = utils.getCurveDataFromClip(state._clip, path);

    if (!data) {
        return;
    }

    let propData = utils.getPropertyDataFrom(data, comp, prop);

    if (propData && prop) {
        delete propData[prop];
    }

    animData.animComp._animator._reloadClip(state);
};

// 关键帧数据

/**
 * 在现有位置创建一个关键帧
 */
exports.createKey = function(uuid, clip, path, comp, prop, frame = 0) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    const node = animData.node;

    // 获取指定的节点的数据
    let data = utils.getCurveDataFromClip(state._clip, path);

    let ctor = cc.Node;
    let target = node;
    if (comp) {
        data = data.comps[comp];
        ctor = cc.js.getClassByName(comp);
        target = node.getComponent(comp);
    } else {
        data = data.props;
    }

    if (!ctor) {
        return console.warn(`找不到类型，无法新增关键帧\n  node: ${uuid}\n  clip: ${clip}`);
    }

    const keys = data[prop];

    //const dump = dumpEncode.encodeObject(target[prop], ctor);
    let value = target[prop];
    const key = {
        frame: frame / state._clip.sample,
        value: value,
        curve: null,
    };

    keys.push(key);
    keys.sort((a, b) => {
        return a.frame - b.frame;
    });

    animData.animComp._animator._reloadClip(state);
};

/**
 * 移动关键帧
 */
exports.moveKeys = function(uuid, clip, path, comp, prop, frames, offset) {
    // TODO
};

/**
 * 删除关键帧
 */
exports.removeKey = function(uuid, clip, path, comp, prop, frame) {
    const animData = utils.queryNodeAnimationData(uuid, clip);
    let state = animData.animState;
    if (!state) {
        return;
    }

    let sample = state._clip.sample;


    // TODO
};
