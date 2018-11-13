'use stirct';

const {readFileSync} = require('fs');
const {join, basename} = require('path');
exports.template = readFileSync(join(__dirname, '../template/preview.html'), 'utf8');

exports.props = ['preview'];
exports.data = function() {
    return {
        scenes: []
    };
};

exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key) {
        const name = `pro-setting.preview.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 常规设置的修改
     * @param {*} event
     * @param {*} key
     */
    _onpreviewChanged(event, key) {
        this.preview[key] = event.target.value;
    },

    async getScenes() {
        let scenes = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', {name: 'scene'});
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

    async checkScene(info) {
        if (info === 'current_scene') {
            return true;
        }
        let asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', info);
        if (!asset) {
            return false;
        }
        return true;
    }
};

exports.mounted = function() {
    this.getScenes();
    // 检查选中场景是否存在，不存在则更改为初始值
    if (!this.checkScene(this.preview.start_scene)) {
        this.preview.start_scene = 'current_scene';
    }
};
