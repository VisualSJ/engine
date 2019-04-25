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
        paths.forEach((path) => {
            let curveData = utils.queryCurveDataFromClip(clip, path);
            if (!curveData) {
                return;
            }
            utils.eachCurve(curveData, (comp, prop, keyDatas) => {
                let keys = clip._keys[keyDatas.keys];
                for (let i = 0; i < keys.length; i++) {
                    let frame = Math.round(keys[i] * clip.sample);
                    keys[i] = frame / sample;
                }
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

        if (cc.AnimationClip.WrapMode[mode] === undefined) {
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
        if (path !== '/') {
            path = path.substr(1);
        }

        if (state.clip.curveDatas && state.clip.curveDatas[path]) {
            delete state.clip.curveDatas[path].props;
            delete state.clip.curveDatas[path].comps;
        }

        utils.removeUnusedKeys(state.clip);
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

        let propKeys = utils.getPropertyKeysDataFrom(data, comp, prop);
        if (!propKeys) {
            if (comp) {
                let comps = data.comps = data.comps || {};
                let props = comps[comp] = comps[comp] || {};
                propKeys = props[prop] = props[prop] || {};

            } else {
                let props = data.props = data.props || {};
                propKeys = props[prop] = props[prop] || {};
            }
            let length = state.clip._keys.push([]);
            propKeys.keys = length - 1;
            propKeys.values = [];
            propKeys.easingMethods = [];
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
            let propKeysData = props[prop];
            let keys = propKeysData.keys;
            if (keys >= 0) {
                state.clip._keys.splice(keys, 1);
            }
            delete props[prop];
        }

        utils.removeUnusedKeys(state.clip);
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
     * @param {Object} customData 一些特殊数据，比如拖入时间轴的spriteFrame
     */
    createKey(uuid, clipUuid, path, comp, prop, frame = 0, customData = {}) {
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
        if (comp === 'cc.Sprite' && prop === 'spriteFrame') {
            if (customData.uuid) {
                value = customData.uuid;
            }
        }

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
        if (offset === 0) {
            return false;
        }
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        let keyframes = utils.queryPropertyKeyframeDatas(state.clip, path, comp, prop);
        if (!keyframes) {
            return false;
        }

        let sample = state.clip.sample;

        let keys = state.clip._keys[keyframes.keys];
        let values = keyframes.values;
        let easingMethods = keyframes.easingMethods;

        // move frames
        frames.forEach((frame) => {
            let dstFrame = frame + offset;
            if (dstFrame < 0) { dstFrame = 0; }
            let dstTime = dstFrame / sample;

            let dstIndex = 0;
            let srcIndex = 0;
            let findDstIndex = false;
            let isOverride = false;
            // 遍历一遍得到到所需要的信息
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];

                // 查找待copy的关键帧所在位置
                let curFrame = Math.round(key * sample);
                if (curFrame === frame) {
                    srcIndex = i;
                }

                // 查找移动目标位置，第一个大于目标时间的位置
                if (curFrame > dstFrame) {
                    if (!findDstIndex) {
                        dstIndex = i;
                        findDstIndex = true;
                    }
                }

                // 要覆盖现有的关键帧
                if (curFrame === dstFrame) {
                    isOverride = true;
                    dstIndex = i;
                    findDstIndex = true;
                }
            }

            if (!findDstIndex) {
                dstIndex = keys.length;
            }

            // 覆盖关键帧，删除源关键帧
            if (isOverride) {
                //keys[dstIndex] = keys[srcIndex];
                values[dstIndex] = values[srcIndex];
                easingMethods[dstIndex] = easingMethods[srcIndex];

                keys.splice(srcIndex, 1);
                values.splice(srcIndex, 1);
                easingMethods.splice(srcIndex, 1);
                return;
            }

            // 在序列中位置没有发生改变，只需要用新的值覆盖旧的值就可以了
            if (srcIndex === dstIndex) {
                keys[srcIndex] = dstTime;
                return;
            }

            // 需要插入到新的dstIndex位置,删除旧位置数据
            if (offset > 0) {
                keys.splice(dstIndex, 0, dstTime);
                values.splice(dstIndex, 0, values[srcIndex]);
                easingMethods.splice(dstIndex, 0, easingMethods[srcIndex]);

                keys.splice(srcIndex, 1);
                values.splice(srcIndex, 1);
                easingMethods.splice(srcIndex, 1);
            } else {
                let temp = {key: keys[srcIndex], value: values[srcIndex],
                    easingMethod: easingMethods[srcIndex]};

                keys.splice(srcIndex, 1);
                values.splice(srcIndex, 1);
                easingMethods.splice(srcIndex, 1);

                keys.splice(dstIndex, 0, dstTime);
                values.splice(dstIndex, 0, temp.value);
                easingMethods.splice(dstIndex, 0, temp.easingMethod);
            }
        });

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
     * @param {number} frames 关键帧位置数组
     */
    removeKey(uuid, clipUuid, path, comp, prop, frames) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        if (!frames) {
            return false;
        }

        if (!Array.isArray(frames)) {
            frames = [frames];
        }

        frames.forEach((frame) => {
            let keyData = utils.queryKey(state.clip, path, comp, prop, frame);
            if (!keyData) {
                return;
            }

            let keyIdx = keyData.keyIndex;
            let keys = state.clip._keys[keyData.keyframes.keys];
            let values = keyData.keyframes.values;
            let easingMethods = keyData.keyframes.easingMethods;

            keys.splice(keyIdx, 1);
            values.splice(keyIdx, 1);
            easingMethods.splice(keyIdx, 1);
        });

        utils.recalculateDuration(state.clip);
        state.initialize(animData.node);

        return true;
    }

    /**
     * 更新关键帧
     * @param {String} uuid 动画节点的 uuid
     * @param {String} clipUuid 被修改的动画的uuid
     * @param {Strig} path 节点数据路径
     * @param {String} comp 属性属于哪个组件，如果是 node 属性，则传 null
     * @param {String} prop 属性的名字
     * @param {number} frame 关键帧位置
     * @param {Object} customData 一些特殊数据，比如拖入时间轴的spriteFrame
     */
    updateKey(uuid, clipUuid, path, comp, prop, frame, customData) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        const node = animData.node;
        let target = node;
        if (comp) {
            target = node.getComponent(comp);
        }

        let keyData = utils.queryKey(state.clip, path, comp, prop, frame);
        if (!keyData) {
            return false;
        }

        let value = target[prop];
        if (comp === 'cc.Sprite' && prop === 'spriteFrame') {
            if (customData.uuid) {
                value = customData.uuid;
            }
        }

        let values = keyData.keyframes.values;
        values[keyData.keyIndex] = value;

        state.initialize(node);

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
                let value = keyData.keyframes.values[keyData.keyIndex];
                utils.createKey(state.clip, path, comp, prop, dstFrame + frame - srcFrames[0], value);
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
            propData = props[prop];
            if (propData) {
                state.clip._keys[propData.keys] = [];
                propData.values = [];
                propData.easingMethods = [];
                utils.recalculateDuration(state.clip);
                state.initialize(animData.node);
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
     * @param {object} frames 事件帧所在位置数组
     */
    deleteEvent(uuid, clipUuid, frames) {
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
        let state = animData.animState;
        if (!state) {
            return false;
        }

        if (!frames) {
            return false;
        }

        if (!Array.isArray(frames)) {
            frames = [frames];
        }

        frames.forEach((frame) => {
            utils.deleteEvent(state.clip, frame);
        });

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
