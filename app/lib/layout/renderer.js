'use strict';

const fs = require('fs');
const ps = require('path');

const windows = require('@base/electron-windows');
const dock = require('@editor/dock');
const panel = require('@editor/panel');
const ipc = require('@base/electron-base-ipc');

const panelManager = require('../panel');
const i18n = require('../i18n');

let $dock = document.querySelector('dock-frame');

class Layout {

    /**
     * 应用布局
     * @param {*} layout
     */
    apply(layout) {
        $dock && $dock.layout(layout);
    }
}

module.exports = new Layout();

if (window.__MAIN__) {
    ipc.send('editor-lib-layout:main');
}

ipc.on('editor-lib-layout:apply', async (event, layout) => {
    if (!window.__MAIN__) {
        return;
    }
    module.exports.apply(layout);
});

// 主进程尝试关闭某个面板（并不是实际关闭，只是检查是否允许关闭）
ipc.on(`editor-lib-layout:try-close`, async (event, name) => {
    let $panel = panel.query(name);
    if (!$panel) {
        return event.reply(null, true);
    }
    const result = await $panel.emit('beforeClose');
    return event.reply(null, !(result === false));
});

if ($dock) {
    // 应用 window 内缓存的布局数据
    let layout = windows.userData.layout;
    if (!layout) {
        let path = ps.join(__dirname, './layouts/default.json');
        layout = JSON.parse(fs.readFileSync(path, 'utf8'));
    }
    module.exports.apply(layout);

    // 布局信息更新后 300ms 向 windows 的 userData 内保存一次
    var _layoutTimer = null;
    $dock.addEventListener('layout', function() {
        clearTimeout(_layoutTimer);
        _layoutTimer = setTimeout(function() {
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
    dock.registerMenuParser('allowPopup', function(value) {
        return {
            label:  i18n.t('menu.panel_popup'),
            enabled: !(value === false),
            async click(name, elem) {
                let allow = await this.removePanel(name);
                if (allow !== false) {
                    panelManager.open(name);
                }
            },
        };
    });

    dock.registerMenuParser('allowClose', function(value) {
        return {
            label:  i18n.t('menu.panel_close'),
            enabled: !(value === false),
            async click(name, elem) {
                this.removePanel(name);
            },
        };
    });
}
