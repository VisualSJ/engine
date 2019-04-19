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
        let clip = state.clip;
        let paths = utils.queryPaths(clip);
        paths.splice(0, 0, '/');
        paths.forEach((path) => {
            let curveData = utils.queryCurveDataFromClip(clip, path);
            if (!curveData) {
                return;
            }
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

        state.clip.speed = speed;
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

        state.clip.wrapMode = mode;
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
            delete state.clip.curveData.props;
            delete state.clip.curveData.comps;
        } else {
            path = path.substr(1);
            if (state.clip.curveData.paths && state.clip.curveData.paths[path]) {
                delete state.clip.curveData.paths[paths].props;
                delete state.clip.curveData.paths[paths].comps;
            }
        }

        utils.recalculateDuration(state.clip);
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

        let data = utils.getCurveDataFromClip(state.clip, path);

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

        let data = utils.queryCurveDataFromClip(state.clip, path);

        if (!data) {
            return false;
        }

        let props = utils.getPropertysFrom(data, comp);

        if (props && prop) {
            delete props[prop];
        }

        utils.recalculateDuration(state.clip);
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

        // 获取指定的节点的数据
        let data = utils.queryCurveDataFromClip(state.clip, path);
        if (!data) {
            return false;
        }

        const node = animData.node;
        let target = node;
        if (comp) {
            target = node.getComponent(comp);
        }

        let value = target[prop];
        if (!utils.createKey(state.clip, path, comp, prop, frame, value)) {
            return false;
        }

        utils.recalculateDuration(state.clip);
        state.initialize(node);
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

        let keys = utils.queryPropertyKeys(state.clip, path, comp, prop);
        if (!keys) {
            return false;
        }

        let sample = state.clip.sample;

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

        utils.recalculateDuration(state.clip);
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

        let keys = utils.queryPropertyKeys(state.clip, path, comp, prop);
        if (!keys) {
            return false;
        }

        let sample = state.clip.sample;

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (Math.round(key.frame * sample) === frame) {
                keys.splice(i, 1);
                utils.recalculateDuration(state.clip);
                state.initialize(animData.node);
                return true;
            }
        }

        return false;
    }

    /**
     * 更新关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     * @param {number} frame 关键帧位置
     */
    updateKey(uuid, clipUuid, path, comp, prop, frame) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        const node = animData.node;

        // 获取指定的节点的数据
        let data = utils.queryCurveDataFromClip(state.clip, path);
        if (!data) {
            return;
        }

        let target = node;
        if (comp) {
            if (!data.comps) {
                console.warn(`找不到component track，无法更新关键帧\n  node: ${uuid}`);
                return false;
            }
            data = data.comps[comp];
            target = node.getComponent(comp);
        } else {
            data = data.props;
        }

        const keys = data[prop];

        let sample = state.clip.sample;

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (Math.round(key.frame * sample) === frame) {
                key.value = target[prop];
                state.initialize(node);
                return true;
            }
        }

        return false;
    }

    /**
     * 复制关键帧数据到另一个关键帧上，如果选择了多个复制帧，则在目标帧后顺序粘贴
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     * @param {Array} srcFrames 复制的关键帧数组
     * @param {number} dstFrame 目标关键帧
     */
    copyKeysTo(uuid, clipUuid, path, comp, prop, srcFrames, dstFrame) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        srcFrames.sort((a, b) => {
            return a - b;
        });
        for (let i = 0; i < srcFrames.length; i++) {
            let frame = srcFrames[i];
            let keyData = utils.queryKey(state.clip, path, comp, prop, frame);
            if (keyData) {
                utils.createKey(state.clip, path, comp, prop, dstFrame + frame - srcFrames[0], keyData.value);
            }
        }

        utils.recalculateDuration(state.clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 清空关键帧数据，但不删除Track
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     */
    clearKeys(uuid, clipUuid, path, comp, prop) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let data = utils.queryCurveDataFromClip(state.clip, path);

        if (!data) {
            return false;
        }

        let props = utils.getPropertysFrom(data, comp);

        if (props && prop) {
            props[prop] = [];
            utils.recalculateDuration(state.clip);
            state.initialize(animData.node);
            return true;
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

        let key = utils.addEvent(state.clip, frame, funcName, params);
        if (!key) {
            return false;
        }

        utils.recalculateDuration(state.clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 删除事件关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {object} frame 事件帧所在位置
     */
    deleteEvent(uuid, clipUuid, frame) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let key = utils.deleteEvent(state.clip, frame);
        if (!key) {
            return false;
        }

        utils.recalculateDuration(state.clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 更新事件关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {number} frame 关键帧所在的位置
     * @param {object} events 事件帧数据
     */
    updateEvent(uuid, clipUuid, frame, events) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let keys = utils.deleteEvent(state.clip, frame);
        if (!keys) {
            return false;
        }

        if (events) {
            events.forEach((event) => {
                utils.addEvent(state.clip, frame, event.func, event.params);
            });
        }

        state.initialize(animData.node);
        return true;
    }

    /**
     * 移动事件关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Array} frames 要移动的关键帧数组
     * @param {number} offset 偏移帧数
     */
    moveEvents(uuid, clipUuid, frames, offset) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let events = utils.queryEvents(state.clip);
        if (!events) {
            return false;
        }

        let sample = state.clip.sample;
        for (let i = 0; i < events.length; i++) {
            let event = events[i];
            let curFrame = Math.round(event.frame * sample);
            let index = frames.indexOf(curFrame);
            if (index >= 0) {
                let newFrame = curFrame + offset;
                if (newFrame < 0) { newFrame = 0; }
                event.frame = newFrame / sample;
            }
        }

        utils.recalculateDuration(state.clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 拷贝事件关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Array} srcFrames 要复制的关键帧数组
     * @param {number} dstFrame 目标帧位置
     */
    copyEventsTo(uuid, clipUuid, srcFrames, dstFrame) {
        if (!srcFrames || srcFrames.length <= 0) {
            return false;
        }

        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let events = utils.queryEvents(state.clip);
        if (!events) {
            return false;
        }

        srcFrames.sort((a, b) => {
            return a - b;
        });

        let sample = state.clip.sample;
        let baseFrame = srcFrames[0];
        for (let i = 0; i < events.length; i++) {
            let event = events[i];
            let curFrame = Math.round(event.frame * sample);
            let index = srcFrames.indexOf(curFrame);
            if (index >= 0) {
                let newFrame = curFrame - baseFrame + dstFrame;
                if (newFrame < 0) { newFrame = 0; }
                utils.addEvent(state.clip, newFrame, event.func, event.params);
            }
        }

        utils.recalculateDuration(state.clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 修改某个关键帧的曲线数据
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {string} path 带有 root 的路径信息,root用'/'表示
     * @param {string} component 组件的名字
     * @param {string} property 属性的名字
     * @param {number} frame key.frame 是实际的时间，需要传入帧数
     * @param {*} data 曲线描述，可能是字符串和数组
     */
    modifyCurveOfKey(uuid, clipUuid, path, comp, prop, frame, data) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        if (utils.modifyCurveOfKey(state.clip, path, comp, prop, frame, data)) {
            state.initialize(animData.node);
            return true;
        }

        return false;
    }
}

module.exports = new AnimationOperation();
