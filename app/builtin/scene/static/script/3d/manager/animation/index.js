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
        this._curEditClipName = 't';

        // for test
        // operationManager.on('keydown', (event) => {
        //     let nodeUuid = 'b3rzbP+FtLAqgB3oxdyxnr';
        //     let clipUuid = '6b699f29-595b-4412-b952-78b15b3ba92d';
        //     switch (event.key.toLowerCase()) {
        //         case 'z':
        //             this.record(nodeUuid);
        //             console.log('record begin');
        //             break;
        //         case 'x':
        //             let xDumpClip = this.queryClip(nodeUuid, clipUuid);
        //             console.log(xDumpClip);
        //             break;
        //         case 'a':
        //             let dumpClip = this.queryClip(nodeUuid, clipUuid);
        //             console.log(dumpClip);
        //             let uuid = Scene.AnimationMode.root;
        //             let animPropList = this.queryProperties(uuid);
        //             console.log(animPropList);
        //             let keyProp = animPropList[0];
        //             this.operation('createProp', 't', '/', null, keyProp.prop);
        //             this.operation('createKey', 't', '/', null, keyProp.prop, 10);
        //             break;
        //         case 'b':
        //             let buuid = Scene.AnimationMode.root;
        //             let banimPropList = this.queryProperties(buuid);
        //             console.log(banimPropList);
        //             let bkeyProp = banimPropList[0];
        //             this.operation('createKey', 't', '/', null, bkeyProp.prop);
        //             break;
        //         case 'v':
        //             //this.save();
        //             console.log(this.queryAnimClipsInfo(nodeUuid));
        //             break;
        //     }

        // });
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

    async save() {
        let state = this.queryRecordAnimState(this._curEditClipName);
        let clip = state.clip;
        await Manager.Ipc.send('save-asset', clip._uuid, Manager.Utils.serialize(clip));
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
        const animData = utils.queryNodeAnimationData(uuid, clip);
        return animData.animComp;
    }

    queryRecordAnimState(clip) {
        const uuid = Scene.AnimationMode.root;
        const animData = utils.queryNodeAnimationData(uuid, clip);
        return animData.animState;
    }

    /**
     * 查询节点的所有clip信息
     */
    queryAnimClipsInfo(nodeUuid) {
        const animData = utils.queryNodeAnimationData(nodeUuid);
        const component = animData.animComp;
        if (!component) {
            return null;
        }

        let clips = component.getClips();
        let clipsInfo = {};

        clips.forEach((clip) => {
            if (clip) {
                clipsInfo.name = clip.name;
                clipsInfo.uuid = clip._uuid;
            }
        });

        return clipsInfo;
    }

    /**
     * 播放一个节点上的指定动画
     * @param {String} clip 需要播放的动画的名字
     */
    play(clip) {
        const state = this.queryRecordAnimState(clip);
        if (!state) {
            return;
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
     * @param {String} nodeUuid 节点的uuid
     * @param {String} clipUuid clip的uuid
     */
    queryClip(nodeUuid, clipUuid) {
        const animData = utils.queryNodeAnimationData(nodeUuid);
        const animComp = animData.animComp;
        if (!animComp) {
            return null;
        }

        let clips = animComp.getClips();

        let state = null;
        for (let i = 0; i < clips.length; i++) {
            if (clips[i] && clips[i]._uuid === clipUuid) {
                state = animComp.getAnimationState(clips[i].name);
                break;
            }
        }

        if (!state) {
            return null;
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

        Manager.Ipc.send('broadcast', 'scene:animation-change', Scene.AnimationMode.root);
    }
}

module.exports = new AniamtionManager();
