'use strict';

const { EventEmitter } = require('events');

const Node = require('../node');
const Scene = require('../scene');

const utils = require('./utils');
const operation = require('./operation');

let AnimEditState = {
    record: false,      // 是否在录制模式
    dirty: false,       // 是否更改
    playing : false,    // 动画是否正在播放
};

// for test
const operationManager = require('../operation');

class AniamtionManager extends EventEmitter {
    constructor() {
        super();
        this.init();

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
        //             this.operation('createProp', clipUuid, '/', keyProp.comp, keyProp.prop);
        //             //this.operation('createKey', clipUuid, '/', keyProp.comp, keyProp.prop, 10);
        //             this.operation('updateKey', clipUuid, '/', keyProp.comp, keyProp.prop, 10);
        //             //this.operation('addEvent', clipUuid, 10, 'hello', [10]);
        //             // this.operation('updateEvent', clipUuid, 10, [
        //             //     {
        //             //       frame: 0.16666666666666666,
        //             //       func: 'hello',
        //             //       params: [
        //             //         10,
        //             //       ],
        //             //     },
        //             //     {
        //             //       frame: 0.16666666666666666,
        //             //       func: 'goodbye',
        //             //       params: [
        //             //         10,
        //             //       ],
        //             //     },
        //             //   ]);
        //             break;
        //         case 'b':
        //             let buuid = Scene.AnimationMode.root;
        //             let banimPropList = this.queryProperties(buuid);
        //             console.log(banimPropList);
        //             let bkeyProp = banimPropList[0];
        //             //this.operation('removeKey', clipUuid, '/', null, bkeyProp.prop, 10);
        //             //this.operation('moveKeys', clipUuid, '/', null, bkeyProp.prop, [0, 30], 10);
        //             //this.operation('changeSample', clipUuid, 100);
        //             this.operation('deleteEvent', clipUuid, 10);
        //             break;
        //         case 'v':
        //             this.saveClip(clipUuid);
        //             //console.log(this.queryAnimClipsInfo(nodeUuid));
        //             break;
        //     }
        // });
        // test end
    }

    init() {
        this._curEditClipUuid = '';
        this._curEditTime = 0;
    }

    /**
     * 打开/关闭某个节点的动画记录模式
     * @param {String} uuid
     * @param {Boolean} active 打开或关闭
     */
    record(uuid, active) {
        if (active) {
            if (uuid) {
                Scene._pushMode(Scene.AnimationMode, uuid);
                AnimEditState.record = true;
                return true;
            }
        } else {
            if (Scene.modes.minor === Scene.AnimationMode) {
                AnimEditState.record = false;
                Scene._popMode();
                return true;
            }
        }

        return false;
    }

    async save() {
        return this.saveClip(this._curEditClipUuid);
    }

    async saveClip(clipUuid) {
        let state = this.queryRecordAnimState(clipUuid);
        if (!state) {
            return false;
        }

        let clip = state.clip;
        await Manager.Ipc.send('save-asset', clip._uuid, Manager.Utils.serialize(clip));

        return true;
    }

    getSerializedEditClip() {
        if (!this._curEditClipUuid) {
            return null;
        }
        let state = this.queryRecordAnimState(this._curEditClipUuid);
        if (!state || !state.clip) {
            return null;
        }
        let clip = state.clip;
        return Manager.Utils.serialize(clip);
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
        const animData = utils.queryNodeAnimationData(uuid);
        return animData.animComp;
    }

    queryRecordAnimState(clipUuid) {
        const uuid = Scene.AnimationMode.root;
        const animData = utils.queryNodeAnimationData(uuid, clipUuid);
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
        let clipsInfo = [];
        clips.forEach((clip) => {
            if (clip) {
                let info = {};
                info.name = clip.name;
                info.uuid = clip._uuid;
                clipsInfo.push(info);
            }
        });

        return clipsInfo;
    }

    /**
     * 设置当前编辑的Clip
     * @param {*} clipUuid Clip的uuid
     */
    setEditClip(clipUuid) {
        if (!clipUuid) {
            console.log('clip uuid is empty');
            return;
        }

        if (clipUuid === this._curEditClipUuid) {
            return;
        }

        this._curEditClipUuid = clipUuid;

        let animData = this.queryRecordAnimState(clipUuid);
        let animComp = animData.animComp;
        let state = animData.animState;
        if (!state) {
            return;
        }

        let clipName = utils.getClipName(clipUuid, animComp);
        animComp.play(clipName);
        animComp.pause(clipName);
        animComp.setTime(0);

        this._curEditTime = 0;
    }

    /**
     * 设置当前编辑的关键帧时间点
     * @param {*} time 时间
     */
    setCurEditTime(time) {
        if (Scene.modes.minor !== Scene.AnimationMode) {
            return;
        }

        this._curEditTime = time;

        let animData = this.queryRecordAnimState(clipUuid);
        let animComp = animData.animComp;
        let state = animData.animState;
        if (!state) {
            return;
        }

        let playTime = time;
        if (playTime > state.duration) {
            playTime = state.duration;
        }

        animComp.setTime(playTime);
    }

    /**
     * 播放一个节点上的指定动画
     * @param {String} clipUuid 需要播放的动画的uuid
     */
    play(clipUuid) {
        clipUuid = clipUuid || this._curEditClipUuid;
        const state = this.queryRecordAnimState(clipUuid);
        if (!state) {
            return false;
        }

        state.setTime(0);
        component.play(state.clip.name);
        return true;
    }

    /**
     * 暂停一个节点上正在播放的动画
     */
    pause() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return false;
        }

        component.pause();
        return true;
    }

    /**
     * 恢复一个节点上被暂停的动画
     */
    resume() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return false;
        }

        component.resume();
        return true;
    }

    /**
     * 停止一个节点上所有动画
     */
    stop() {
        const component = this.queryRecordAnimComp();
        if (!component) {
            return false;
        }

        component.stop();
        return true;
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
        if (!node) {
            console.log(`动画节点(${uuid})不存在`);
        }
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
            return {prop: data.prop, comp: data.comp, displayName: data.name, type: data.type};
        });

        return result;
    }

    /**
     * 查询播放的clip的当前所在时间
     * @param {*} clipUuid clip的uuid
     */
    queryPlayingClipTime(clipUuid) {
        clipUuid = clipUuid || this._curEditClipUuid;
        const state = this.queryRecordAnimState(clipUuid);
        if (!state) {
            return false;
        }

        return state.time;
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
        if (operation[func](Scene.AnimationMode.root, ...args)) {
            Manager.Ipc.send('broadcast', 'scene:animation-change', Scene.AnimationMode.root, this._curEditClipUuid);
        }
    }
}

module.exports = new AniamtionManager();
