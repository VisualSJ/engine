'use strict';

const fs = require('fs');
const ps = require('path');

const windows = require('@base/electron-windows');
const dock = require('@editor/dock');

const panel = require('../panel');

// 加载自定义的 css 文件
dock.importStyle(__dirname + '/index.css');

let $dock = document.querySelector('dock-frame');

class Layout {

    /**
     * 应用布局
     * @param {*} layout 
     */
    apply (layout) {
        $dock.layout(layout);
    }
}

module.exports = new Layout();

// 应用 window 内缓存的布局数据
let layout = windows.userData.layout;
if (!layout) {
    let path = ps.join(__dirname, './layouts/default.json');
    layout = JSON.parse(fs.readFileSync(path, 'utf8'));
}
module.exports .apply(layout);

// 布局信息更新后 300ms 向 windows 的 userData 内保存一次
var _layoutTimer = null;
$dock.addEventListener('layout', function () {
    clearTimeout(_layoutTimer);
    _layoutTimer = setTimeout(function () {
        let boundRect = $dock.getBoundingClientRect();
        let offsetWidth = boundRect.left + boundRect.right - boundRect.width;
        let offsetHeight = boundRect.top + boundRect.bottom - boundRect.height;
        let json = windows.userData.layout = $dock.dump();
        windows.setMinSize(offsetWidth + json.layout['min-width'], offsetHeight + json.layout['min-height']);
        windows.sync();
    }, 300);

    requestAnimationFrame(() => {
        // 如果 layout 内没有任何元素，则关闭这个窗口
        let $group = $dock.$layout.firstElementChild;
        if (!$group || $group.tagName === 'DOCK-GROUPS' && $group.panels.length === 0) {
            clearTimeout(_layoutTimer);
            window.close();
            return;
        }
    });
});

//////////////////////
// 注册 dock 菜单的按钮
//////////////////////
dock.registerMenuParser('allowClose', function (value) {
    return {
        label: '关闭',
        enabled: !(value === false),
        async click (name, elem) {
            this.removePanel(name);
        },
    };
});

dock.registerMenuParser('allowPopup', function (value) {
    return {
        label: '弹出',
        enabled: !(value === false),
        async click (name, elem) {
            let allow = await this.removePanel(name);
            if (allow !== false) {
                panel.open(name);
            }
        },
    };
});