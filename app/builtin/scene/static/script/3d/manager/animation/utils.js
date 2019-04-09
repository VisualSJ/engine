'use strict';

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');

/**
 * 将 clip 序列化成 dump 格式数据
 * @param {*} state 
 */
function encodeClip(state) {
    const clip = state._clip;
    const sample = clip.sample;
    function handleProps(props) {
        const result = {};
        for (let key in props) {
            result[key] = props[key].map(handleKey);
        }
        return result;
    }

    function handleComps(comps) {
        const result = {};

        for (let key in comps) {
            result[key] = handleProps(comps[key]);
        }
        return result;
    }

    function handleKey(key) {
        return {
            frame: Math.round(key.frame * sample),
            dump: dumpEncode.encodeObject(key.value, { default: null }),
        };
    }

    let paths = {};

    paths['/'] = {
        props: handleProps(clip.curveData.props),
        comps: handleComps(clip.curveData.comps),
    };

    Object.keys(clip.curveData.paths || {}).forEach((path) => {
        paths[`/${path}`] = {
            props: handleProps(clip.curveData.paths[path].props),
            comps: handleComps(clip.curveData.paths[path].comps),
        };
    });

    return {
        name: clip.name,
        duration: clip.duration,
        sample: clip.sample,
        speed: clip.speed,
        wrapMode: clip.wrapMode,

        paths,
        events: clip.events.map((event) => {
            return {
                frame: Math.round(event.frame * sample),
                func: event.func,
                params: event.params,
            };
        }),

        time: state.time || 0,
    };
}

/**
 * 从一个 clip 对象内，找出 path 指向的数据
 * @param {*} clip 动画 clip 对象
 * @param {*} path 数据的搜索路径
 */
function getNodeDataFromClip(clip, path) {
    if (path === '/') {
        return clip.curveData || null;
    } else {
        path = path.substr(1);
        if (clip.curveData.paths && clip.curveData.paths[path]) {
            return clip.curveData.paths[paths];
        }
    }
    return null;
}

/**
 * 从一个 node 数据，拿出对应的 comp 和 prop 数据
 * @param {*} nodeData 
 * @param {*} prop 
 * @param {*} comp 
 */
function getPropertyDataFrom(nodeData, prop, comp) {
    if (comp) {
        nodeData.comps = data.comps || {};
        return nodeData.comps[comp][prop];
    } else {
        return data.props[prop];
    }
}

exports.encodeClip = encodeClip;
exports.getNodeDataFromClip = getNodeDataFromClip;
exports.getPropertyDataFrom = getPropertyDataFrom;
