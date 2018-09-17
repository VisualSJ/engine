'use strict';

const ps = require('path'); // path system
const { app, Tray, Menu, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const ipc = require('@base/electron-base-ipc');
const setting = require('@editor/setting');

let window = null;

/**
 * 等待 app 初始化完毕
 */
exports.app = async function() {
    if (!app.isReady()) {
        await new Promise((resolve) => {
            app.once('ready', resolve);
        });
    }
};

/**
 * 启动 Dashboard 窗口
 */
exports.window = function() {
    // 打开页面
    const html = ps.join(__dirname, './renderer/template/index.html');
    window = new BrowserWindow({
        width: 800,
        height: 500,
        show: false,
    });
    window.loadFile(html);
    window.once('ready-to-show', () => {
        window.show();
    });

    // 组织页面关闭
    window.on('close', (event) => {
        event.preventDefault();
        window.hide();
        app.dock && app.dock.hide();
    });
};

let tray = null;
/**
 * 启动任务栏图标
 */
exports.tray = async function() {
    if (!app.isReady()) {
        await new Promise((resolve) => {
            app.once('ready', resolve);
        });
    }
    tray = new Tray(ps.join(__dirname, './tray.png'));
    const context = Menu.buildFromTemplate([
        {
            label: 'Dashboard',
            click() {
                window && window.show();
                app.dock && app.dock.show();
            },
        },
        {
            label: 'Quit',
            click() {
                app.exit(0);
            }
        }
    ]);
    tray.setContextMenu(context);
};

/**
 * 开始监听 ipc 消息
 */
exports.listener = function () {
    let children = [];
    // 监听打开项目事件
    ipc.on('open-project', (event, project) => {
        // electron 程序地址
        const exePath = app.getPath('exe');

        // 拼接参数
        const args = [ps.resolve()];
        if (setting.dev) {
            args.push('--dev');
        }
    
        args.push('--project');
        args.push(project);
    
        // 实际启动
        const child = spawn(exePath, args);
        children.push(child);

        child.on('exit', () => {
            const index = children.indexOf(child);
            children.splice(index, 1);

            if (children.length <= 0) {
                // 如果关闭最后一个项目，需要显示 dashboard
                window.show();
                app.dock && app.dock.show();
            }
        });
    
        // 隐藏 Dashboard
        window.hide();
        app.dock && app.dock.hide();
    });
};