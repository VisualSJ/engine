'use stirct';

const {readFileSync} = require('fs');
const {join, basename} = require('path');
exports.template = readFileSync(join(__dirname, '../template/preview.html'), 'utf8');

exports.props = ['preview'];
exports.data = function() {
    return {
        scenes: [],
        devices: {}
    };
};

exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key) {
        const name = `project-setting.preview.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 常规设置的修改
     * @param {*} event
     * @param {*} key
     */
    _onpreviewChanged(event, key) {
        if (key === 'simulator_resolution') {
            let value = event.target.value;
            if (value !== 'customize') {
                this.preview.simulator_width = this.devices[value].width;
                this.preview.simulator_height = this.devices[value].height;
            }
        }

        if (key === 'simulator_width' || key === 'simulator_height') {
            this.preview.simulator_resolution = 'customize';
        }
        this.preview[key] = event.target.value;
    },

    // 获取当前项目内所有的场景信息
    async getScenes() {
        let scenes = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', {type: 'scene'});
        if (!scenes) {
            return;
        }
        this.scenes = scenes.map((item) => {
            return {
                uuid: item.uuid,
                name: basename(item.source)
            };
        });
    },

    // 检查设置内的场景是否存在
    async checkScene(info) {
        if (info === 'current_scene') {
            return true;
        }
        let asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', info);
        if (!asset) {
            return false;
        }
        return true;
    },

    // 获取支持的设备信息
    async getDevice() {
        this.devices = await Editor.Ipc.requestToPackage('preview', 'get-device');
    }
};

exports.mounted = function() {
    this.getScenes();
    // 检查选中场景是否存在，不存在则更改为初始值
    if (!this.checkScene(this.preview.start_scene)) {
        this.preview.start_scene = 'current_scene';
    }

    this.getDevice();
};
