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
        const clip = state._clip;
        const sample = clip.sample;
        function handleProps(props) {
            const result = {};
            for (let key in props) {
                if (key) {
                    result[key] = props[key].map(handleKey);
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
     * 查询一个 clip 数据包含的 paths 路径数组
     * @param {object} clip clip 数据
     */
    queryPaths(clip) {
        clip = clip || {};
        let data = clip.curveData || {};
        let paths = Object.keys(data.paths || {});
        paths.forEach((path) => {
            path = '/' + path;
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

        let keys = this.queryPropertyKeys(clip, path, component, property);

        if (!keys) {
            return null;
        }

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (Math.round(key.frame * sample) === frame) {
                return key;
            }
        }

        return null;
    }

    /**
     * 从一个 clip 对象内，找出 path 指向的数据
     * @param {*} clip 动画 clip 对象
     * @param {*} path 数据的搜索路径
     */
    getCurveDataFromClip(clip, path) {
        if (!path) {
            console.error('need a path');
            return null;
        }

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
     * 从一个 curveData 数据，拿出某个属性的所有关键帧数据
     * @param {*} curveData
     * @param {*} comp
     * @param {*} prop
     */
    getPropertyKeysFrom(curveData, comp, prop) {
        if (comp) {
            if (!curveData.comps || !curveData.comps[comp] || !curveData.comps[comp][prop]) {
                return null;
            }

            return curveData.comps[comp][prop];
        } else {
            if (!curveData.props || !curveData.props[prop]) {
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
            if (clip._uuid === clipUuid) {
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
            console.warn(`节点(${uuid})不存在`);
            return animData;
        }
        animData.node = node;

        const animComp = node.getComponent(cc.AnimationComponent);
        if (!animComp) {
            console.warn(`节点(${uuid})上不存在动画组件`);
            return animData;
        }
        animData.animComp = animComp;

        if (!clipUuid) {
            return animData;
        }

        let clipName = this.getClipName(clipUuid, animComp);

        if (!clipName) {
            console.warn(`节点(${uuid})不存在动画(${clipUuid})`);
            return animData;
        }

        const state = animComp.getAnimationState(clipName);
        if (!state) {
            console.warn(`节点(${uuid})不存在动画(${clipUuid})`);
            return animData;
        }
        animData.animState = state;

        return animData;
    }

    /**
     * 查询 clip 内属性轨道的数据
     * 返回的是一个关键帧数组或null
     * @param {object} clip clip 数据
     * @param {string} path 带有 root 的路径信息，如：'/root/l1/l2'
     * @param {string} component 组件的名字
     * @param {string} property 属性的名字
     */
    queryPropertyKeys(clip, path, component, property) {
        if (!clip) {
            return null;
        }

        let data = this.getCurveDataFromClip(clip, path);
        if (!data) {
            return null;
        }

        let keys = this.getPropertyKeysFrom(data, component, property);

        return keys;
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
                let keys = props[prop];
                handle(comp, prop, keys);
            });
        });
    }

    /**
     * 重新计算clip的总时长
     * @param {*} clip clip数据
     */
    recalculateDuration(clip) {
        let paths = this.queryPaths(clip);
        paths.splice(0, 0, '/');
        let duration = 0;
        let sample = clip.sample;

        paths.forEach((path) => {
            let curveData = this.getCurveDataFromClip(clip, path);
            this.eachCurve(curveData, (comp, prop, keys) => {
                if (!keys || !keys.length) {
                    return;
                }
                let key = keys[keys.length - 1];
                if (comp === 'cc.Sprite' && prop === 'spriteFrame') {
                    duration = Math.max((Math.round(key.frame * sample) + 1) / sample, duration);
                } else {
                    duration = Math.max(key.frame, duration);
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

        let key = this.queryKey(clip, path, component, property, frame);
        if (key) {
            key.curve = data;
            return false;
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

        this.recalculateDuration(clip);

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

        this.recalculateDuration(clip);

        if (keys.length > 0) {
            return keys;
        }

        return null;
    }
}

module.exports = new AnimationUtil();
