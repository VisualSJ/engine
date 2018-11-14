'use stirct';

const fs = require('fs');
const {join, isAbsolute} = require('path');
const {shell} = require('electron');
exports.template = fs.readFileSync(join(__dirname, '../template/preview.html'), 'utf8');

exports.props = ['preview'];
exports.data = function() {
    return {
        devices: {}
    };
};

exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key) {
        const name = `preferences.preview.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 获取模拟器器的实际路径
     * @param {*} path
     */
    getSimulatorPath(path) {
        // 如果是绝对路径值即返回
        if (isAbsolute(path)) {
            return path;
        }
        return join(Editor.App.path, path);
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

    /**
     * 打开指定的文件路径
     * @param {*} path
     */
    open(path) {
        shell.showItemInFolder(path);
    },

    // 获取支持的设备信息
    async getDevice() {
        this.devices = await Editor.Ipc.requestToPackage('preview', 'get-device');
    }
};

exports.mounted = function() {
    this.getDevice();
};
