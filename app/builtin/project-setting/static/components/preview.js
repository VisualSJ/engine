'use stirct';

const {readFileSync} = require('fs');
const {join, basename} = require('path');
exports.template = readFileSync(join(__dirname, '../template/preview.html'), 'utf8');

exports.props = ['data'];
exports.data = function() {
    return {
        scenes: [],
        devices: {},
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
        this.data[key] = event.target.value;
        let value = event.target.value;

        // 更改了屏幕方向后，需要交换一次当前屏幕分辨率设置的值
        if (key === 'simulator_device_orientation') {
            let temp = this.data.simulator_width;
            this.data.simulator_width = this.data.simulator_height;
            this.data.simulator_height = temp;
        }

        // 更改模拟器分辨率的 select 后，如果选中项不是自定义，需要同时修改设置的宽高
        if (key === 'simulator_resolution') {
            if (value !== 'customize') {
                let direction = this.data.simulator_device_orientation;
                // 要根据当前设置的方向调整对应读取设备配置的宽高
                this.data.simulator_width = direction === 'vertical' ? this.devices[value].width : this.devices[value].height;
                this.data.simulator_height = direction === 'vertical' ? this.devices[value].height : this.devices[value].width;
            }
        }

        // 手动修改模拟器分辨率后，模拟器分辨率设置需要更改为自定义
        if (key === 'simulator_width' || key === 'simulator_height') {
            this.data.simulator_resolution = 'customize';
        }
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
                name: basename(item.source),
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
    },
};

exports.mounted = function() {
    this.getScenes();
    // 检查选中场景是否存在，不存在则更改为初始值
    if (!this.checkScene(this.data.start_scene)) {
        this.data.start_scene = 'current_scene';
    }

    this.getDevice();
};
