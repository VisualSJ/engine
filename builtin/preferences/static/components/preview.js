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
        this.preview[key] = event.target.value;
        let value = event.target.value;

        // 更改了屏幕方向后，需要交换一次当前屏幕分辨率设置的值
        if (key === 'simulator_device_orientation') {
            let temp = this.preview.simulator_width;
            this.preview.simulator_width = this.preview.simulator_height;
            this.preview.simulator_height = temp;
        }

        // 更改模拟器分辨率的 select 后，如果选中项不是自定义，需要同时修改设置的宽高
        if (key === 'simulator_resolution') {
            if (value !== 'customize') {
                let direction = this.preview.simulator_device_orientation;
                // 要根据当前设置的方向调整对应读取设备配置的宽高
                this.preview.simulator_width = direction === 'vertical'? this.devices[value].width : this.devices[value].height;
                this.preview.simulator_height = direction === 'vertical'? this.devices[value].height : this.devices[value].width; 
            }
        }

        // 手动修改模拟器分辨率后，模拟器分辨率设置需要更改为自定义
        if (key === 'simulator_width' || key === 'simulator_height') {
            this.preview.simulator_resolution = 'customize';
        }
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
