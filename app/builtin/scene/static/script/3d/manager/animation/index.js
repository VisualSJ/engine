'use strict';

const { EventEmitter } = require('events');

const Node = require('../node');
const Scene = require('../scene');

const utils = require('./utils');
const operation = require('./operation');
const {get, set} = require('lodash');

const PlayState = {
    STOP: 0,    // 停止
    PLAYING: 1, // 播放中
    PAUSE : 2,      // 暂停
};

let AnimEditState = {
    record: false,      // 是否在录制模式
    dirty: false,       // 是否更改
    playState : PlayState.STOP,    // 动画播放状态
};

function getNameDataByPropPath(node, propPath) {
    propPath = propPath.replace(/^__comps__/, '_components');
    const pathKeys = (propPath || '').split('.');
    const propName = pathKeys.pop() || '';
    let compName = null;
    if (pathKeys.length > 0) {
        if (pathKeys[0] === '_components') {
            let compPath = pathKeys.join('.');
            let comp = get(node, compPath);
            if (comp) {
                compName = cc.js.getClassName(comp.constructor);
            }
        }
    }

    return {compName, propName};
}

class AnimationManager extends EventEmitter {
    constructor() {
        super();
        this.init();
        Node.on('change', this.onNodeChanged.bind(this));

        this._stateWrappedInfo = {};
        // anim update interval
        this._animUpdateInterval = null;
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
    async record(uuid, active) {
        if (active) {
            if (uuid) {
                Scene._pushMode('animation', uuid);
                AnimEditState.record = true;
                // 给默认的clip的animationstate注册结束事件
                const animData = utils.queryNodeAnimationData(uuid, this._curEditClipUuid);
                const state = animData.animState;
                if (state) {
                    state.on('finished', this.onAnimPlayEnd, this);
                }

                if (!this._animUpdateInterval) {
                    this._animUpdateInterval = setInterval(this.update.bind(this), 300);
                }

                return true;
            }
        } else {
            if (!Scene.modes.animation.isOpen) {
                return false;
            }

            const animData = this.queryRecordAnimState();
            if (animData) {
                const state = animData.animState;
                if (state) {
                    state.off('finished', this.onAnimPlayEnd, this);
                }
            }

            if (await Scene._popMode('animation')) {
                AnimEditState.record = false;

                // 暂停循环定时器
                if (this._animUpdateInterval) {
                    clearInterval(this._animUpdateInterval);
                    this._animUpdateInterval = null;
                }

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

        // 判断是否为骨骼动画的animationclip，用id中是否有'@'来判断
        let index = clipUuid.indexOf('@');
        if (index >= 0) {
            // 骨骼动画的clip不保存事件，将事件存到meta文件中
            let eventData = utils.queryEvents(clip);
            if (eventData && eventData.length > 0) {
                const metaData = await Manager.Ipc.send('query-asset-meta', clip._uuid);
                if (metaData && metaData.userData) {
                    metaData.userData.events = eventData;
                }

                await Manager.Ipc.send('save-asset-meta', clip._uuid, Manager.Utils.serialize(metaData));
            }
        } else  {
            await Manager.Ipc.send('save-asset', clip._uuid, Manager.Utils.serialize(clip));
        }

        return true;
    }

    getSerializedEditClip() {
        if (!Scene.modes.animation.isOpen) {
            return null;
        }

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
        const uuid = Scene.modes.animation.root;
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
        const uuid = Scene.modes.animation.root;
        const animData = utils.queryNodeAnimationData(uuid);
        return animData.animComp;
    }

    queryRecordAnimState(clipUuid) {
        const animData = this.queryRecordAnimData(clipUuid);
        return animData.animState;
    }

    queryRecordAnimData(clipUuid) {
        clipUuid = clipUuid || this._curEditClipUuid;
        const animData = utils.queryNodeAnimationData(Scene.modes.animation.root, clipUuid);
        return animData;
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
     * 查询当前的播放状态
     */
    queryPlayState() {
        return AnimEditState.playState;
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

        let oldClipUuid = this._curEditClipUuid;
        this._curEditClipUuid = clipUuid;

        // 如果还没进入编辑模式，就不对state操作
        if (!Scene.modes.animation.isOpen) {
            return;
        }

        const oldAnimState = this.queryRecordAnimState(oldClipUuid);
        if (oldAnimState) {
            oldAnimState.off('finished', this.onAnimPlayEnd, this);
        }

        const animData = this.queryRecordAnimData(clipUuid);
        const state = animData.animState;
        if (!state) {
            return false;
        }

        state.initialize(animData.node);
        state.setTime(0);
        Manager.Ipc.send('broadcast', 'scene:animation-time-change', 0);

        // 注册结束事件
        state.on('finished', this.onAnimPlayEnd, this);

        this._curEditTime = 0;
    }

    /**
     * 设置当前编辑的关键帧时间点
     * @param {*} time 时间
     */
    setCurEditTime(time) {
        this._curEditTime = time;

        // 如果还没进入编辑模式，就不对state操作
        if (!Scene.modes.animation.isOpen) {
            return;
        }

        const state = this.queryRecordAnimState(this._curEditClipUuid);
        if (!state) {
            return false;
        }

        let playTime = time;
        if (playTime > state.duration) {
            playTime = state.duration;
        }

        state.setTime(playTime);
        state.sample();
        state.play();
        state.pause();
        this.changePlayState(PlayState.PAUSE);
    }

    changePlayState(newState) {
        AnimEditState.playState = newState;
        Manager.Ipc.send('broadcast', 'scene:animation-state-change', AnimEditState.playState);
    }

    /**
     * 播放一个节点上的指定动画
     * @param {String} clipUuid 需要播放的动画的uuid
     */
    play(clipUuid) {
        clipUuid = clipUuid || this._curEditClipUuid;
        const animData = this.queryRecordAnimData(clipUuid);
        const state = animData.animState;
        if (!state) {
            return false;
        }

        state.setTime(0);
        state.weight = 1;
        state.play();
        this.changePlayState(PlayState.PLAYING);
        return true;
    }

    /**
     * 暂停一个节点上正在播放的动画
     */
    pause() {
        const animData = this.queryRecordAnimData();
        const state = animData.animState;
        if (!state) {
            return false;
        }

        state.pause();
        this._curEditTime = this.queryPlayingClipTime();
        this.changePlayState(PlayState.PAUSE);
        return true;
    }

    /**
     * 恢复一个节点上被暂停的动画
     */
    resume() {
        const animData = this.queryRecordAnimData();
        const state = animData.animState;
        if (!state) {
            return false;
        }

        if (!state.isPlaying) {
            state.weight = 1;
            state.play();
        }
        state.resume();
        this.changePlayState(PlayState.PLAYING);
        return true;
    }

    /**
     * 停止一个节点上所有动画
     */
    stop() {
        const animData = this.queryRecordAnimData();
        const state = animData.animState;
        if (!state) {
            return false;
        }

        state.setTime(0);
        this._curEditTime = 0;
        state.sample();
        state.stop();
        this.changePlayState(PlayState.STOP);
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
        let result = [];
        if (animableProps) {
            result = animableProps.map((data) => {
                return {prop: data.prop, comp: data.comp, displayName: data.name, type: data.type};
            });
        }

        return result;
    }

    /**
     * 查询播放的clip的当前所在时间
     * @param {*} clipUuid clip的uuid
     */
    queryPlayingClipTime(clipUuid) {
        if (!Scene.modes.animation.isOpen) {
            return 0;
        }

        clipUuid = clipUuid || this._curEditClipUuid;
        const state = this.queryRecordAnimState(clipUuid);
        if (!state) {
            return 0;
        }

        state.getWrappedInfo(state.time, this._stateWrappedInfo);

        return this._stateWrappedInfo.time;
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
        if (operation[func](Scene.modes.animation.root, ...args)) {
            Manager.Ipc.send('broadcast', 'scene:animation-change', Scene.modes.animation.root, this._curEditClipUuid);
        }
    }

    // 监听属性变化，自动打关键帧
    /**
     * 监听节点变化
     * @param {*} node 节点
     * @param {*} prop 属性路径,例如：_components.0.top
     */
    onNodeChanged(node, propPath) {
        if (!AnimEditState.record) {
            return;
        }

        if (!node || !propPath) {
            return;
        }

        // check node
        let animRootNode = Node.query(Scene.modes.animation.root);
        if (!animRootNode) {
            return;
        }

        let state = this.queryRecordAnimState(this._curEditClipUuid);
        if (!state) {
            return;
        }

        // 检查是否是正在编辑动画结点中的结点
        let path = null;
        let isAnimNode = false;
        if (animRootNode === node) {
            path = '/';
            isAnimNode = true;
        } else {
            path = '';
            let iterNode = node.parent;
            while (iterNode) {
                path = '/' + iterNode.name + path;
                if (iterNode === animRootNode) {
                    isAnimNode = true;
                    break;
                }
                iterNode = iterNode.parent;
            }
        }

        if (!isAnimNode)  {
            return;
        }

        // 查找comp和prop的名字
        let nameData = getNameDataByPropPath(node, propPath);
        const compName = nameData.compName;
        const propName = nameData.propName;

        let clip = state.clip;
        // 检查是否有属性轨迹
        let keys = utils.queryPropertyKeys(clip, path, compName, propName);
        if (!keys) {
            return;
        }

        // 打上关键帧
        let sample = clip.sample;
        let curFrame = Math.round(this._curEditTime * sample);
        let key = utils.queryKey(clip, path, compName, propName, curFrame);
        if (!key) {
            this.operation('createKey', this._curEditClipUuid, path, compName, propName, curFrame);
        } else {
            this.operation('updateKey', this._curEditClipUuid, path, compName, propName, curFrame);
        }
    }

    onAnimPlayEnd() {
        this.changePlayState(PlayState.STOP);
    }

    update() {
        if (AnimEditState.playState === PlayState.PLAYING) {
            Manager.Ipc.send('broadcast', 'scene:animation-time-change', this.queryPlayingClipTime());
        }
    }
}

module.exports = new AnimationManager();
