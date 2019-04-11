'use strict';

const { EventEmitter } = require('events');

const Node = require('../node');
const Scene = require('../scene');

const utils = require('./utils');
const operation = require('./operation');

// for test
const operationManager = require('../operation');

class AniamtionManager extends EventEmitter {
    constructor() {
        super();

        // for test
        operationManager.on('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 'z':
                    this.record('b3rzbP+FtLAqgB3oxdyxnr');
                    console.log('record begin');
                    break;
                case 'x':
                    let dumpClip = this.queryClip('t');
                    console.log(dumpClip);
                    break;
            }

        });
        // test end
    }

    /**
     * 打开某个节点的动画记录模式
     * @param {String} uuid
     */
    record(uuid) {
        if (uuid) {
            Scene._pushMode(Scene.AnimationMode, uuid);
        } else if (Scene.modes.minor === Scene.AnimationMode) {
            Scene._popMode();
        }
    }

    /**
     * 查询当前正在编辑动画的节点
     */
    queryRecordNode() {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);

        if (!node) {
            console.warn(`动画节点(${uuid})不存在`);
        }

        return node;
    }

    /**
     * 查询当前正在编辑动画的节点的动画组件
     */
    queryRecordAnimComp() {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);

        if (!node) {
            return null;
        }

        const component = node.getComponent(cc.AnimationComponent);
        if (!component) {
            console.warn(`节点(${node.uuid})上不存在动画组件`);
        }

        return component;
    }

    /**
     * 查询当前正在编辑动画节点的所有clip
     */
    queryRecordAnimClips() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return;
        }

        let clips = component.getClips();

        return clips;
    }

    /**
     * 播放一个节点上的指定动画
     * @param {String} clip 需要播放的动画的名字
     */
    play(clip) {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return;
        }

        const state = component.getAnimationState(clip);
        if (!state) {
            return console.warn(`节点(${component.node.uuid})不存在动画(${clip})`);
        }

        state.setTime(0);
        component.play(clip);
    }

    /**
     * 暂停一个节点上正在播放的动画
     */
    pause() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return;
        }

        component.pause();
    }

    /**
     * 恢复一个节点上被暂停的动画
     */
    resume() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return;
        }

        component.resume();

    }

    /**
     * 停止一个节点上所有动画
     */
    stop() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return;
        }

        component.stop();
    }

    /**
     * 查询一个动画的 dump 数据
     * @param {String} clip 正在编辑的动画上的某个 clip 的名字
     */
    queryClip(clip) {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return;
        }

        const state = component.getAnimationState(clip);
        if (!state) {
            return console.warn(`找不到指定动画，无法查询动画信息\n  node: ${component.node.uuid}\n  clip: ${clip}`);
        }

        const dump = utils.encodeClip(state);
        return dump;
    }

    /**
     * 查询一个节点上可以编辑动画的祖先
     * 如果上行查询的节点树上，没有任何一个带有动画的节点，则返回 null
     * @param {*} uuid
     */
    queryAnimationRoot(uuid) {
        let node = Node.query(uuid);
        if (node) {
            do {
                if (node.getComponent(cc.AnimationComponent)) {
                    return node.uuid;
                }
                node = node.parent;
            } while (node);
        }
        return null;
    }

    /**
     * 查询一个节点上，可以编辑动画的属性数组
     * @param {*} uuid
     */
    queryProperties(uuid) {
        let node = Node.query(uuid);
        let root = node;
        while (root) {
            if (root.getComponent(cc.AnimationComponent)) {
                break;
            }

            if (root.parent instanceof cc.Scene) {
                root = node;
                break;
            }

            root = root.parent;
        }

        let animableProps = utils.getAnimableProperties(node, root !== node);
        let result = animableProps.map((data) => {
            return {prop: data.name, comp: null, displayName: data.name, type: data.type};
        });

        return result;
    }

    /**
     * 操作动画
     * @param {String} func
     * @param  {...any} args
     */
    operation(func, ...args) {
        if (!operation[func]) {
            console.warn('Method does not exist to manipulate the animation.');
            return false;
        }
        operation[func](Scene.AnimationMode.root, ...args);
    }
}

module.exports = new AniamtionManager();
