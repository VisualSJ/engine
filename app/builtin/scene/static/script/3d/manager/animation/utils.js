'use strict';

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');
const dumpUtil = require('../../../../../dist/utils/dump/utils');
const Node = require('../node');

// 节点默认可以制作动画的属性

//加上类型，让 timeline 可以判断属性的数据类型
const defaultProperties = [
    {type: 'cc.Vec3', prop: 'position', name: 'position'},
    {type: 'cc.Quat', prop: 'rotation', name: 'rotation'},
    {type: 'cc.Vec3', prop: 'scale', name: 'scale'},
];

class AnimationUtil {

    /**
     * 将 clip 序列化成 dump 格式数据
     * @param {*} state
     */
    encodeClip(state) {
        const clip = state.clip;
        const sample = clip.sample;
        function handleProps(props) {
            const result = {};

            for (let propName in props) {
                if (propName) {
                    let propData = props[propName];
                    let dumpKeys = handleKeys(propData);
                    if (dumpKeys) {
                        result[propName] = dumpKeys;
                    }
                }
            }
            return result;
        }

        function handleComps(comps) {
            const result = {};

            for (let key in comps) {
                if (key) {
                    result[key] = handleProps(comps[key]);
                }
            }
            return result;
        }

        function handleKeys(propKeysData) {
            if (propKeysData && propKeysData.keys >= 0) {
                let keys = clip._keys[propKeysData.keys];
                let values = propKeysData.values || [];
                let easingMethods = propKeysData.easingMethods || [];
                let dumpKeys = [];

                if (keys) {
                    keys.forEach((key, index) => {
                        dumpKeys.push({
                            frame: Math.round(key * sample),
                            dump: dumpEncode.encodeObject(values[index], {default: null}),
                            curve: easingMethods[index],
                        });
                    });

                    return dumpKeys;
                }
            }

            return null;
        }

        let paths = {};

        Object.keys(clip.curveDatas || {}).forEach((path) => {
            let dumpPath = path;
            if (path !== '/') {
                dumpPath = `/${path}`;
            }
            paths[dumpPath] = {
                props: handleProps(clip.curveDatas[path].props),
                comps: handleComps(clip.curveDatas[path].comps),
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
     * 将clip的dump 格式数据设置给clip
     * @param {*} dumpClip
     * @param {*} state 当前动画状态
     */
    decodeClip(dumpClip, state) {
        let clip = state.clip;
        clip.name = dumpClip.name;
        clip._duration = dumpClip.duration;
        clip.sample = dumpClip.sample;
        clip.speed = dumpClip.speed;
        clip.wrapMode = dumpClip.wrapMode;

        function handleProps(dumpProps, oriProps) {
            let restoreProps = {};
            for (let prop in dumpProps) {
                if (prop) {
                    let keyframeDatas = handleKeys(dumpProps[prop]);
                    if (keyframeDatas) {
                        let oriPropData = oriProps[prop];
                        let restoreProp = {};
                        clip._keys[oriPropData.keys] = keyframeDatas.keys;
                        restoreProp.keys = oriPropData.keys;
                        restoreProp.values = keyframeDatas.values;
                        restoreProp.easingMethods = keyframeDatas.easingMethods;
                        restoreProps[prop]  = restoreProp;
                    }
                }
            }

            return restoreProps;
        }

        function handleComps(dumpComps, oriComps) {
            let restoreComps = {};
            for (let comp in dumpComps) {
                if (comp) {
                    restoreComps[comp] = handleProps(dumpComps[comp], oriComps[comp]);
                }
            }

            return restoreComps;
        }

        function handleKeys(dumpKeys) {
            if (!dumpKeys) {
                return null;
            }

            let keys = [];
            let values = [];
            let easingMethods = [];
            dumpKeys.forEach((dumpKey, index) => {
                keys.push(dumpKey.frame / dumpClip.sample);
                dumpDecode.decodePatch('' + index, dumpKey.dump, values);
                easingMethods.push(dumpKey.curve);
            });

            return {keys, values, easingMethods};
        }

        Object.keys(dumpClip.paths).forEach((path) => {
            let oriPath = path;
            if (oriPath !== '/') {
                oriPath = oriPath.substr(1);
            }
            clip.curveDatas[oriPath] = {
            props: handleProps(dumpClip.paths[path].props, clip.curveDatas[oriPath].props),
            comps: handleComps(dumpClip.paths[path].comps, clip.curveDatas[oriPath].comps),
            };
        });

        // for events
        clip.events = dumpClip.events.map((event) => {
            return {
                frame: event.frame / dumpClip.sample,
                func: event.func,
                params: event.params,
            };
        });

        this.removeUnusedKeys(clip);
    }

    /**
     * 查询一个 clip 数据包含的 paths 路径数组
     * @param {object} clip clip 数据
     */
    queryPaths(clip) {
        clip = clip || {};
        let data = clip.curveDatas || {};
        let paths = Object.keys(data || {});
        paths = paths.map((path) => {
            if (path !== '/') {
                path = '/' + path;
            }
            return path;
        });
        return paths;
    }

    /**
     * 查询当前动画的事件数组
     * @param {object} clip clip 数据
     */
    queryEvents(clip) {
        if (!clip) {
            console.warn('clip is not valid');
            return null;
        }
        return clip.events;
    }

    /**
     * 查询某个关键帧的数据
     * @param {object} clip clip 数据
     * @param {string} path 带有 root 的路径信息,root用'/'表示
     * @param {string} component 组件的名字
     * @param {string} property 属性的名字
     * @param {number} frame key.frame 是实际的时间，需要传入帧数
     */
    queryKey(clip, path, component, property, frame) {
        clip = clip || {};
        // js 用的是不精确的浮点数
        // 所以有一定几率造成小数点吼比对出现问题，需要转成整数后对比
        let sample = clip.sample;

        let keyframes = this.queryPropertyKeyframeDatas(clip, path, component, property);

        let keys = null;
        if (keyframes.keys >= 0) {
            keys = clip._keys[keyframes.keys];
        }
        if (!keys) {
            return null;
        }

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (Math.round(key * sample) === frame) {
                return {keyIndex: i, keyframes};
            }
        }

        return null;
    }

    /**
     * 从一个 clip 对象内，找出 path 指向的数据，不存在的直接返回null
     * @param {*} clip 动画 clip 对象
     * @param {*} path 数据的搜索路径
     */
    queryCurveDataFromClip(clip, path) {
        if (!path) {
            console.debug('need a path');
            return null;
        }

        if (path !== '/') {
            path = path.substr(1);
        }

        return clip.curveDatas[path];
    }

    /**
     * 从一个 clip 对象内，获取path 指向的数据，不存在的会创建一个空数据
     * @param {*} clip 动画 clip 对象
     * @param {*} path 数据的搜索路径
     */
    getCurveDataFromClip(clip, path) {
        if (!path) {
            console.error('need a path');
            return null;
        }

        if (path !== '/') {
            path = path.substr(1);
        }

        if (!clip.curveDatas) {
            clip.curveDatas = {};
         }

        if (!clip.curveDatas[path]) {
             clip.curveDatas[path] = {};
        }

        return clip.curveDatas[path];
    }

    /**
     * 从一个 curveData 数据，拿出某个属性的关键帧数据
     * @param {*} curveData
     * @param {*} comp
     * @param {*} prop
     */
    getPropertyKeysDataFrom(curveData, comp, prop) {
        if (comp) {
            if (!curveData.comps || !curveData.comps[comp] || !curveData.comps[comp][prop]) {
                console.log(`动画数据中找不到组件(${comp})的属性(${prop})`);
                return null;
            }

            return curveData.comps[comp][prop];
        } else {
            if (!curveData.props || !curveData.props[prop]) {
                console.log(`动画数据中找不到属性(${prop})`);
                return null;
            }
            return curveData.props[prop];
        }
    }

    /**
     * 从一个 curveData 数据，拿出指定component的所有属性的Track
     * @param {*} curveData
     * @param {*} comp
     */
    getPropertysFrom(curveData, comp) {
        let props = null;
        if (comp) {
            if (curveData.comps && curveData.comps[comp]) {
                props = curveData.comps[comp];
            }
        } else {
            if (curveData.props) {
                props = curveData.props;
            }
        }

        return props;
    }

    /**
     * 判断一个属性属否可以用于制作动画
     * @param {*} compCtor
     * @param {*} property
     * @param {*} propObject
     */
    getAnimablePropFromProperty(compCtor, property, propObject) {
        let attrs = cc.Class.attr(compCtor, property);
        if (!attrs) {
            return null;
        }

        const typeName = dumpUtil.getTypeName(compCtor);
        const attrCtor = dumpUtil.getConstructor(propObject, attrs);

        if (
            // skip hidden properties
            attrs.visible === false ||
            // skip type cc.Node
            attrs.type === 'cc.Node' ||
            // if defined animatable and animatable is false then return
            attrs.animatable === false
        ) {
            return null;
        }

        let propData = {};
        propData.comp = typeName;
        propData.prop = property;
        if (cc.js.getClassByName(typeName)) {
            propData.name = typeName + '.' + property;
        } else {
            propData.name = compCtor.name + '.' + property;
        }

        if (!attrs.ctor && attrs.type) {
            propData.type = attrs.type;
        } else {
            propData.type = dumpUtil.getTypeName(attrCtor);
        }

        return propData;
    }

    /**
     * 从 component 内获取可以用于动画制作的属性列表
     * @param {*} component
     */
    getAnimablePropsFromComponent(component) {
        let result = [];

        const compCtor = component.constructor;
        if (compCtor) {
            let props = compCtor.__props__;
            props.map((key) => {
                if (key === 'type' || key === '__scriptAsset') {
                    return;
                }

                let animableProp = this.getAnimablePropFromProperty(compCtor, key, component[key]);
                if (animableProp !== null) {
                    result.push(animableProp);
                }
            });
        }

        return result;
    }

    /**
     * 从一个 node 内获取出可以用于动画制作的属性列表
     * @param {*} node
     * @param {*} isChild
     */
    getAnimableProperties(node, isChild) {
        if (!node) {
            return;
        }
        let properties = [];

        if (isChild) {
            properties.push({name: 'active', type: 'cc.Boolean'});
        }
        defaultProperties.forEach((item) => {
            properties.push(item);
        });

        node._components.forEach((comp) => {
            // skip cc.AnimationComponent
            if (comp instanceof cc.AnimationComponent) {
                return;
            }

            // 相同的组件，只保留第一个组件的属性在 timeline
            for (let i = 0; i < properties.length; ++i) {
                if (properties[i].name.startsWith(comp.type)) {
                    return;
                }
            }

            let compProps = this.getAnimablePropsFromComponent(comp);
            compProps.forEach((prop) => {
                properties.push(prop);
            });
        });

        return properties;
    }

    getClipName(clipUuid, animComp) {
        if (!clipUuid) {
            return null;
        }

        let clips = animComp.getClips();
        let clipName = null;
        clips.forEach((clip) => {
            if (clip && clip._uuid === clipUuid) {
                clipName = clip.name;
                return;
            }
        });

        return clipName;
    }

    /**
     * 查询一个节点的动画数据
     * @param {*} uuid
     * @param {*} clipUuid
     */
    queryNodeAnimationData(uuid, clipUuid) {
        let animData = {};
        const node = Node.query(uuid);
        if (!node) {
            console.debug(`节点(${uuid})不存在`);
            return animData;
        }
        animData.node = node;

        const animComp = node.getComponent(cc.AnimationComponent);
        if (!animComp) {
            console.debug(`节点(${uuid})上不存在动画组件`);
            return animData;
        }
        animData.animComp = animComp;

        if (!clipUuid) {
            return animData;
        }

        let clipName = this.getClipName(clipUuid, animComp);

        if (!clipName) {
            console.debug(`节点(${uuid})不存在动画(${clipUuid})`);
            return animData;
        }

        if (clipName === '') {
            console.debug(`节点(${uuid})动画(${clipUuid})名字为空`);
            return animData;
        }

        const state = animComp.getAnimationState(clipName);
        if (!state) {
            console.debug(`节点(${uuid})不存在动画(${clipUuid})`);
            return animData;
        }
        animData.animState = state;

        return animData;
    }

    /**
     * 查询 clip 内属性轨道的数据
     * 返回的是一个关键帧据或null
     * @param {object} clip clip 数据
     * @param {string} path 带有 root 的路径信息，如：'/root/l1/l2'
     * @param {string} component 组件的名字
     * @param {string} property 属性的名字
     */
    queryPropertyKeyframeDatas(clip, path, component, property) {
        if (!clip) {
            return null;
        }

        let data = this.queryCurveDataFromClip(clip, path);
        if (!data) {
            return null;
        }

        let keysData = this.getPropertyKeysDataFrom(data, component, property);

        return keysData;
    }

    /**
     * 传入一个 curve 对象，循环内部所有的 comp 和 prop
     * @param {*} curve
     * @param {*} handle
     */
    eachCurve(curve, handle) {
        if (!curve) {
            return;
        }
        curve.props && Object.keys(curve.props).forEach((prop) => {
            let keys = curve.props[prop];
            handle(null, prop, keys);
        });
        curve.comps && Object.keys(curve.comps).forEach((comp) => {
            let props = curve.comps[comp];
            props && Object.keys(props).forEach((prop) => {
                let propKeysData = props[prop];
                handle(comp, prop, propKeysData);
            });
        });
    }

    removeUnusedKeys(clip) {
        let paths = this.queryPaths(clip);

        let usedKeyDatas = {};
        let usedKeys = [];
        paths.forEach((path) => {
            let curveData = this.queryCurveDataFromClip(clip, path);
            if (!curveData) {
                return;
            }
            this.eachCurve(curveData, (comp, prop, propKeysData) => {
                if (propKeysData && propKeysData.keys >= 0) {
                    usedKeyDatas[propKeysData.keys] = propKeysData.keys;
                    usedKeys.push(propKeysData.keys);
                }
            });
        });

        let unUsedKeys = [];
        clip._keys.forEach((data, index) => {
            if (!usedKeys.includes(index)) {
                unUsedKeys.push(index);
            }
        });

        unUsedKeys.sort((a, b) => { return b - a; });
        // 重新计算删除后的keys索引
        unUsedKeys.forEach((key) => {
            Object.keys(usedKeyDatas).forEach((dataKey) => {
                if (dataKey > key) {
                    usedKeyDatas[dataKey]--;
                }
            });
        });

        // 删除无用的key数组
        unUsedKeys.forEach((key) => {
            clip._keys.splice(key, 1);
        });

        // 重新映射keys索引
        paths.forEach((path) => {
            let curveData = this.queryCurveDataFromClip(clip, path);
            if (!curveData) {
                return;
            }
            this.eachCurve(curveData, (comp, prop, propKeysData) => {
                if (propKeysData && propKeysData.keys >= 0) {
                    propKeysData.keys = usedKeyDatas[propKeysData.keys];
                }
            });
        });

    }

    /**
     * 重新计算clip的总时长
     * @param {*} clip clip数据
     */
    recalculateDuration(clip) {
        let paths = this.queryPaths(clip);
        let duration = 0;
        let sample = clip.sample;

        paths.forEach((path) => {
            let curveData = this.queryCurveDataFromClip(clip, path);
            if (!curveData) {
                return;
            }
            this.eachCurve(curveData, (comp, prop, propKeysData) => {
                if (!propKeysData) {
                    return;
                }
                if (propKeysData.keys >= 0) {
                    let keys = clip._keys[propKeysData.keys];
                    let key = 0;
                    if (keys && keys.length > 0) {
                        key = keys[keys.length - 1];
                    }
                    if (comp === 'cc.SpriteComponent' && prop === 'spriteFrame') {
                        duration = Math.max((Math.round(key * sample) + 1) / sample, duration);
                    } else {
                        duration = Math.max(key, duration);
                    }
                }

            });
        });

        let events = this.queryEvents(clip);
        if (events) {
            let lastEvent = events[events.length - 1];
            if (lastEvent) {
                duration = Math.max(lastEvent.frame, duration);
            }
        }

        // duration only a getter
        clip._duration = duration;
    }

    /**
     * 更新某个关键帧的曲线数据
     * @param {object} clip clip 数据
     * @param {string} path 带有 root 的路径信息,root用'/'表示
     * @param {string} component 组件的名字
     * @param {string} property 属性的名字
     * @param {number} frame key.frame 是实际的时间，需要传入帧数
     * @param {*} data 曲线描述，可能是字符串和数组
     */
    modifyCurveOfKey(clip, path, component, property, frame, data) {
        if (!clip) {
            return false;
        }

        let keyData = this.queryKey(clip, path, component, property, frame);
        if (keyData) {
            keyData.keyframes.easingMethods[keyData.keyIndex] = data;
            return true;
        } else {
            return false;
        }
    }

    /**
     * 插入新的事件
     * @param {object} clip clip 数据
     * @param {number} frame 关键帧所在的位置
     * @param {string} funcName 事件回调函数的名字
     * @param {array} params 参数数组
     */
    addEvent(clip, frame, funcName, params) {
        if (!clip) {
            console.log('clip 不存在');
            return null;
        }

        let sample = clip.sample;
        let key = {
            frame: frame / sample,
            func: funcName || '',
            params: params || [],
        };

        clip.events = clip.events || [];
        clip.events.push(key);

        // 插入完成后需要排序
        clip.events.sort((a, b) => {
            return a.frame - b.frame;
        });

        return key;
    }

    /**
     * 删除事件帧
     * @param {object} clip clip 数据
     * @param {object} frame 事件帧所在位置
     */
    deleteEvent(clip, frame) {
        if (!clip) {
            console.log('clip 不存在');
            return null;
        }
        let events = this.queryEvents(clip);

        let sample = clip.sample;
        let keys = [];
        for (let i = events.length - 1; i >= 0; i--) {
            let key = events[i];
            if (Math.round(key.frame * sample) === frame) {
                events.splice(i, 1);
                keys.push(key);
            }
        }

        if (keys.length > 0) {
            return keys;
        }

        return null;
    }

    createKey(clip, path, comp, prop, frame, value) {
        let keyData = this.queryKey(clip, path, comp, prop, frame);

        if (keyData) {
            keyData.keyframes.values[keyData.keyIndex] = value;
            return keyData;
        }

        let keyframeDatas = this.queryPropertyKeyframeDatas(clip, path, comp, prop);
        if (!keyframeDatas) {
            return null;
        }

        if (keyframeDatas.keys < 0) {
            return null;
        }

        let keysData = clip._keys[keyframeDatas.keys];
        if (!keysData) {
            return null;
        }

        let newKeyTime = frame / clip.sample;
        let insertIndex = 0;
        let i = 0;
        for (i = 0 ; i < keysData.length; i++) {
            if (keysData[i] > newKeyTime) {
                break;
            }
        }
        insertIndex = i;

        keysData.splice(insertIndex, 0, newKeyTime);
        keyframeDatas.values.splice(insertIndex, 0, value);
        keyframeDatas.easingMethods.splice(insertIndex, 0, null);

        return {keyIndex: insertIndex, keyframes: keyframeDatas};
    }
}

module.exports = new AnimationUtil();
