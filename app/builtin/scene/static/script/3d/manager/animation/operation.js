'use strict';

const Node = require('../node');

const utils = require('./utils');

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');

// clip 数据
class AnimationOperation {
    /**
     * 更改一个节点上某个动画的 sample 值
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Number} sample 动画的帧率
     */
    changeSample(uuid, clipUuid, sample) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        sample = Math.round(sample);
        if (isNaN(sample) || sample < 1) {
            sample = 1;
        }

        //修改所有帧数据的时间
        let clip = state._clip;
        let paths = utils.queryPaths(clip);
        paths.splice(0, 0, '/');
        paths.forEach((path) => {
            let curveData = utils.getCurveDataFromClip(clip, path);
            utils.eachCurve(curveData, (comp, prop, keys) => {
                keys.forEach((key) => {
                    let frame = Math.round(key.frame * clip.sample);
                    key.frame = frame / sample;
                });
            });
        });

        let events = utils.queryEvents(clip);
        if (events) {
            events.forEach((event) => {
                let frame = Math.round(event.frame * clip.sample);
                event.frame = frame / sample;
            });
        }

        clip.sample = sample;

        utils.recalculateDuration(clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 更改一个节点上某个动画的 speed 值
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Number} speed 动画的播放速度
     */
    changeSpeed(uuid, clipUuid, speed) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        state._clip.speed = speed;
        state.initialize(animData.node);

        return true;
    }

    /**
     * 更改一个节点上某个动画的播放模式
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Number} mode 动画的播放模式
     */
    changeWrapMode(uuid, clipUuid, mode) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        if (cc.WrapMode[mode] === undefined) {
            mode = 0;
        }

        state._clip.wrapMode = mode;
        state.initialize(animData.node);

        return true;
    }

    // 节点数据

    /**
     * 清除一个节点上某个动画的节点数据
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 被清除的节点路径
     */
    clearNode(uuid, clipUuid, path) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
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

        state.initialize(animData.node);

        return true;
    }

    // 属性数据

    /**
     * 新增一条属性轨道
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 新增的节点数据路径
     * @param {String} comp 新增的属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 新增的属性的名字
     */
    createProp(uuid, clipUuid, path, comp, prop) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let data = utils.getCurveDataFromClip(state._clip, path);

        if (!data) {
            return false;
        }

        let propKeys = utils.getPropertyKeysFrom(data, comp, prop);
        if (!propKeys) {
            if (comp) {
                let comps = data.comps = data.comps || {};
                let props = comps[comp] = comps[comp] || {};
                propKeys = props[prop] = props[prop] || [];
            } else {
                let props = data.props = data.props || {};
                propKeys = props[prop] = props[prop] || [];
            }
        }
        state.initialize(animData.node);

        return true;
    }

    /**
     * 删除一条属性轨道
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     */
    removeProp(uuid, clipUuid, path, comp, prop) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let data = utils.getCurveDataFromClip(state._clip, path);

        if (!data) {
            return false;
        }

        let props = null;
        if (comp) {
            if (data.comps && data.comps[comp]) {
                props = data.comps[comp];
            }
        } else {
            if (data.props) {
                props = data.props;
            }
        }

        if (props && prop) {
            delete props[prop];
        }

        utils.recalculateDuration(state._clip);
        state.initialize(animData.node);

        return true;
    }

    // 关键帧数据

    /**
     * 创建一个关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     * @param {number} frame 关键帧位置
     */
    createKey(uuid, clipUuid, path, comp, prop, frame = 0) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        const node = animData.node;

        // 获取指定的节点的数据
        let data = utils.getCurveDataFromClip(state._clip, path);

        let ctor = cc.Node;
        let target = node;
        if (comp) {
            if (!data.comps) {
                console.warn(`找不到component track，无法新增关键帧\n  node: ${uuid}`);
                return false;
            }
            data = data.comps[comp];
            ctor = cc.js.getClassByName(comp);
            target = node.getComponent(comp);
        } else {
            data = data.props;
        }

        if (!ctor) {
            console.warn(`找不到类型，无法新增关键帧\n  node: ${uuid}`);
            return false;
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

        utils.recalculateDuration(state._clip);
        state.initialize(animData.node);
        return true;
    }

    /**
     * 移动关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     * @param {Array} frames 要移动的关键帧数组
     * @param {number} offset 移动的距离
     */
    moveKeys(uuid, clipUuid, path, comp, prop, frames, offset) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let keys = utils.queryPropertyKeys(state._clip, path, comp, prop);
        if (!keys) {
            return false;
        }

        let sample = state._clip.sample;

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let curFrame = Math.round(key.frame * sample);
            let index = frames.indexOf(curFrame);
            if (index >= 0) {
                let newFrame = curFrame + offset;
                if (newFrame < 0) { newFrame = 0; }
                key.frame = newFrame / sample;
                frames.splice(index, 1);
            }
        }

        utils.recalculateDuration(state._clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 删除关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     * @param {number} frame 关键帧位置
     */
    removeKey(uuid, clipUuid, path, comp, prop, frame) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let keys = utils.queryPropertyKeys(state._clip, path, comp, prop);
        if (!keys) {
            return false;
        }

        let sample = state._clip.sample;

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (Math.round(key.frame * sample) === frame) {
                keys.splice(i, 1);
                state.initialize(animData.node);
                utils.recalculateDuration(state._clip);
                return true;
            }
        }

        return false;
    }

    /**
     * 插入事件关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {number} frame 关键帧所在的位置
     * @param {string} funcName 事件回调函数的名字
     * @param {array} params 参数数组
     */
    addEvent(uuid, clipUuid, frame, funcName, params) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let key = utils.addEvent(state._clip, frame, funcName, params);
        if (!key) {
            return false;
        }

        return true;
    }

    /**
     * 删除事件关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {object} event 事件帧数据
     */
    deleteEvent(uuid, clipUuid, event) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let key = utils.deleteEvent(state._clip, event);
        if (!key) {
            return false;
        }

        return true;
    }

    /**
     * 更新某个关键帧的曲线数据
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {string} path 带有 root 的路径信息,root用'/'表示
     * @param {string} component 组件的名字
     * @param {string} property 属性的名字
     * @param {number} frame key.frame 是实际的时间，需要传入帧数
     * @param {*} data 曲线描述，可能是字符串和数组
     */
    updateCurveOfKey(uuid, clipUuid, path, comp, prop, frame, data) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        return utils.updateCurveOfKey(state._clip, path, comp, prop, frame, data);
    }
}

module.exports = new AnimationOperation();
