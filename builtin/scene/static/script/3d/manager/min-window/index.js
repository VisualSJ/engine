const supportTypes = ['cc.ParticleSystemComponent', 'cc.CameraComponent'];
const _ = require('lodash');
const SelectionManager = require('./../selection');
const NodeManager = require('./../node');
const ipc = require('./../ipc');

class MinWindow {
    constructor() {
        this.components = [];
        this.compFunObject = [];
        this.uuid = '';
        this.focous = false;
    }

    get name() {
        for (const name of supportTypes) {
            if (Object.keys(this.compFunObject).includes(name)) {
                return name;
            }
        }
        return null;
    }

    init() {
        // 监听 select 的点选通知
        SelectionManager.on('select', (uuid) => {
            if (this.uuid === uuid) {
                return;
            }
            this.compFunObject = NodeManager.queryComponentFunctionOfNode(uuid);
            if (Object.keys(this.compFunObject).length === 0 || !this.name) {
                return;
            }
            this.components = NodeManager.query(uuid)._components;
            switch (this.name) {
                case 'cc.ParticleSystemComponent':
                    this.showParticleWin();
                    break;
                case 'cc.CameraComponent':
                    this.showPreviewWin();
                    break;
            }
        });
        SelectionManager.on('unselect', () => {
            if (this.focous) {
                return;
            }
            this.emitInfo('hide');
            this.reset();
        });
    }

    reset() {
        this.compFunObject = [];
        this.uuid = '';
    }

    /**
     * 显示粒子编辑器小窗口
     */
    showParticleWin() {
        const particleComp = find(this.components, 'cc.ParticleSystemComponent');
        const particleRender = find(this.components, 'cc.ParticleSystemRenderer');
        this.components = {particleComp, particleRender};

        const info = {
            speed: particleComp.simulationSpeed,
            time: particleComp._time,
            particle: particleRender._particles.length,
            name: 'particle',
        };
        this.emitInfo('show', info);
    }

    /**
     * 显示摄像机预览窗口
     */
    showPreviewWin() {
        const info = {
            name: 'preview',
        };
        this.emitInfo('show', info);
    }

    /**
     * 对粒子编辑器里的数据响应做处理
     * @param {*} path
     * @param {*} value
     */
    onParticleConfirm(path, value) {
        const comp = this.components.particleComp;
        switch (path) {
            case 'stop':
                comp.stop();
                break;
            case 'play':
                comp.play();
                break;
            case 'pause':
                break;
            default:
                comp[path] = value;
        }
    }

    /**
     * 中转 confirm 事件
     * @param {*} event
     */
    onConfirm(event) {
        if (this.name === 'cc.ParticleSystemComponent') {
            this.onParticleConfirm(event.path, event.value);
        }
    }

    /**
     * 对外传递消息通知
     * @param {*} type
     * @param {*} info
     */
    emitInfo(type, info) {
        ipc.send(`${type}-min-window`, info);
    }
}

/**
 * 快速查找数组中符合类名的对象
 * @param {*} arr
 * @param {*} className
 */
function find(arr, className) {
    return arr.find((item) => {
        return item.__classname__ === className;
    });
}
module.exports = new MinWindow();
