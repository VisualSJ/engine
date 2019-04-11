'use strict';

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');
const dumpUtil = require('../../../../../dist/utils/dump/utils');
const Node = require('../node');

// 节点默认可以制作动画的属性

//加上类型，让 timeline 可以判断属性的数据类型
const defaultProperties = [
    {type: 'cc.Vec3', name: 'position'},
    {type: 'cc.Vec3', name: 'rotation'},
    {type: 'cc.Vec3', name: 'scale'},
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
     * 从一个 clip 对象内，找出 path 指向的数据
     * @param {*} clip 动画 clip 对象
     * @param {*} path 数据的搜索路径
     */
    getNodeDataFromClip(clip, path) {
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
    getPropertyDataFrom(nodeData, prop, comp) {
        if (comp) {
            if (!nodeData.comps || !nodeData.comps[comp] || !nodeData.comps[comp][prop]) {
                return null;
            }

            return nodeData.comps[comp][prop];
        } else {
            if (!nodeData.props || !nodeData.props[prop]) {
                return null;
            }
            return nodeData.props[prop];
        }
    }

    /**
     * 判断一个属性属否可以用于制作动画
     * @param {*} ctor
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
            if (comp.type === 'cc.AnimationComponent') {
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

    /**
     * 查询一个节点的动画数据
     * @param {*} uuid
     * @param {*} clip
     */
    queryNodeAnimationData(uuid, clip) {
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

        if (!clip) {
            return animData;
        }

        const state = animComp.getAnimationState(clip);
        if (!state) {
            console.warn(`节点(${uuid})不存在动画(${clip})`);
            return animData;
        }
        animData.animState = state;

        return animData;
    }
}

module.exports = new AnimationUtil();
