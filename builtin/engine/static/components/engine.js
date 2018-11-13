'use strict';

const path = require('path');
const fse = require('fs-extra');
const request = require('request');

exports.template = fse.readFileSync(path.join(__dirname, '../template/engine.html'), 'utf8');

exports.props = [
    'pt', // project type
    'current',
    'custom',
    'type',
];

exports.data = function() {
    // 获取版本列表
    // todo 动态获取显示列表
    let list = [];

    // 填充版本的数据
    // ~/.CocosEditor3D/engine/2d/2.0.1
    Object.keys(list).forEach((type) => {
        const root = path.join(Editor.App.home, './engine', type);
        list[type].forEach((item) => {
            // 填充 exists - 是否存在(内置引擎版本认为一定存在))
            item.exists = fse.existsSync(path.join(root, `${item.version}.js`));

            // 填充 download - 是否处于下载状态
            item.download = false;
        });
    });

    return { list };
};

exports.methods = {

    /**
     * 点击了下载引擎
     */
    _onClickDownload(event, item) {
        const root = path.join(Editor.App.home, './engine', this.type);
        const file = path.join(root, `${item.version}.js`);
        fse.ensureDirSync(root);
        item.download = true;
        request(item.url)
            .pipe(fse.createWriteStream(file))
            .on('close', () => {
                item.download = false;
                item.exists = fse.existsSync(file);
            });
    },

    /**
     * 点击了使用某个版本的引擎
     */
    _onClickUseEngine(event, item) {
        this.current[this.type] = item.version;
    },

    /**
     * 点击选择自定义引擎
     */
    async _onSelectCustom(event) {
        const paths = await Editor.Dialog.openDirectory({
            root: event.target.value || Editor.Project.path,
        });

        if (paths[0] && fse.existsSync(paths[0])) {
            this.$root.$emit('change-custom', paths[0]);
        }
    }
};

exports.mounted = function() {
    // debugger;
};
