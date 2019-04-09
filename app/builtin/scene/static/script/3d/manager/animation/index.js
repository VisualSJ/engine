'use strict';

const { EventEmitter } = require('events');

const Node = require('../node');
const Scene = require('../scene');

const utils = require('./utils');
const operation = require('./operation');

class AniamtionManager extends EventEmitter {

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
    queryRecord() {
        return root;
    }

    /**
     * 播放一个节点上的指定动画
     * @param {String} clip 需要播放的动画的名字
     */
    play(clip) {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);
        if (!node) {
            return console.warn(`节点(${uuid})不存在，无法播放动画(${clip})`);
        }

        const component = node.getComponent(cc.Animation);
        if (!component) {
            return console.warn(`节点(${uuid})上不存在动画组件，无法播放动画(${clip})`);
        }

        const state = component.getAnimationState(clip);
        if (!state) {
            return console.warn(`节点(${uuid})不存在动画(${clip})`);
        }

        state.setTime(0);
        component.play(clip);
    }

    /**
     * 暂停一个节点上正在播放的动画
     */
    pause() {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);
        if (!node) {
            return console.warn(`节点(${uuid})不存在，无法暂停动画`);
        }

        const component = node.getComponent(cc.Animation);
        if (!component) {
            return console.warn(`节点(${uuid})上不存在动画组件，无法暂停动画`);
        }

        component.pause();
    }

    /**
     * 恢复一个节点上被暂停的动画
     */
    resume() {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);
        if (!node) {
            return console.warn(`节点(${uuid})不存在，无法暂停动画`);
        }

        const component = node.getComponent(cc.Animation);
        if (!component) {
            return console.warn(`节点(${uuid})上不存在动画组件，无法暂停动画`);
        }

        component.resume();

    }

    /**
     * 停止一个节点上所有动画
     */
    stop() {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);
        if (!node) {
            return console.warn(`节点(${uuid})不存在，无法暂停动画`);
        }

        const component = node.getComponent(cc.Animation);
        if (!component) {
            return console.warn(`节点(${uuid})上不存在动画组件，无法暂停动画`);
        }

        component.stop();
    }

    /**
     * 查询一个动画的 dump 数据
     * @param {String} clip 正在编辑的动画上的某个 clip 的名字
     */
    queryClip(clip) {
        const uuid = Scene.AnimationMode.root;
        const node = Node.query(uuid);
        if (!node) {
            return console.warn(`节点不存在，无法查询动画信息\n  node: ${uuid}\n  clip: ${clip}`);
        }
    
        const anim = node.getComponent(cc.LegacyAnimationComponent);
        if (!anim) {
            return console.warn(`节点上不存在动画组件，无法查询动画信息\n  node: ${uuid}\n  clip: ${clip}`);
        }

        const state = anim.getAnimationState(clip);
        if (!state) {
            return console.warn(`找不到指定动画，无法查询动画信息\n  node: ${uuid}\n  clip: ${clip}`);
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
                if (node.getComponent(cc.LegacyAnimationComponent)) {
                    return node.uuid;
                }
                node = node.parent;
            } while (node)
        }
        return null;
    }

    /**
     * 查询一个节点上，可以编辑动画的属性数组
     * @param {*} uuid 
     */
    queryProperties(uuid) {
        // TODO
        return [
            {
                prop: 'position',
                comp: null,
                displayName: 'Position',
                type: 'cc.Vec2',
            },
        ];
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
