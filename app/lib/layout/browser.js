'use stirct';

const { BrowserWindow } = require('electron');

const dock = require('@editor/dock');
const panel = require('@editor/panel');
const ipc = require('@base/electron-base-ipc');

const panelManager = require('../panel');

class Layout {

    constructor() {
        this.mainID = null;
    }

    /**
     * 应用布局
     * @param {*} layout
     */
    async apply(layout) {
        if (this.mainID === null) {
            return;
        }

        // 将布局内使用到的面板提取出来
        const panels = [];
        function step(json) {
            json.panels && json.panels.forEach((name) => {
                panels.push(name);
            });
            json.children && json.children.forEach(step);
        }
        step(layout.layout);

        // 尝试新布局内的所有面板的 beforeClose 方法，看允不允许关闭
        for (let i = 0; i < panels.length; i++) {
            const name = panels[i];
            const id = panel.getWindow(name);
            const allow = await tryClose(name, id);
            if (!allow) {
                console.warn(`更改布局失败：${name} 面板不允许关闭`);
                return;
            }

            // 将在主窗口内的面板移出数组
            // 这部分面板只会触发 hide 事件
            if (id === this.mainID) {
                panels.splice(i--, 1);
                continue;
            }
        }

        // 关闭主窗口外的所有面板
        for (let i = 0; i < panels.length; i++) {
            const name = panels[i];
            const allow = await panelManager.close(name);
            if (!allow) {
                console.warn(`更改布局失败：${name} 面板不允许关闭`);
                return;
            }
        }

        // 应用布局
        const win = BrowserWindow.fromId(this.mainID);
        ipc.sendToWin(win, 'editor-lib-layout:apply', layout);
    }
}

async function tryClose(name, id) {
    if (id === null || id === undefined) {
        return true;
    }
    const win = BrowserWindow.fromId(id);
    return new Promise((resolve, reject) => {
        ipc.sendToWin(win, 'editor-lib-layout:try-close', name).callback((error, allow) => {
            resolve(allow);
        });
    });
}

module.exports = new Layout();

ipc.on('editor-lib-layout:main', (event) => {
    if (!event.sender) {
        module.exports.mainID = null;
        return;
    }
    let win = BrowserWindow.fromWebContents(event.sender);
    if (!win || typeof win.id !== 'number') {
        module.exports.mainID = null;
        return;
    }
    module.exports.mainID = win.id;
});
