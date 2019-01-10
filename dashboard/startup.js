'use strict';

const ps = require('path'); // path system
const { app, Tray, Menu, BrowserWindow } = require('electron');
const ipc = require('@base/electron-base-ipc');
const setting = require('@editor/setting');
const proManager = require('./../lib/project');

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
        width: 1000,
        height: 650,
        show: false,
        frame: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hiddenInset',
        'max-width': 1500,
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

    // 临时全局变量，便于其他插件访问
    global.dashboard = window;
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

    const menus = [];

    if (setting.dev) {
        menus.push({
            label: 'DEV MODE',
            enabled: false,
        });
        menus.push({
            type: 'separator',
        });
    }

    menus.push({
        label: 'Dashboard',
        click() {
            window && window.show();
            app.dock && app.dock.show();
        },
    });

    menus.push({
        label: 'Quit',
        click() {
            app.exit(0);
        },
    });

    const context = Menu.buildFromTemplate(menus);
    tray.setContextMenu(context);
};

/**
 * 开始监听 ipc 消息
 */
exports.listener = function() {

    // 监听关闭窗口事件
    ipc.on('dashboard:close', (event) => {
        window.hide();
    });

    // 监听最大化窗口事件
    ipc.on('dashboard:maxi', (event) => {
        window.maximize();
    });

    // 监听取消最大化窗口事件
    ipc.on('dashboard:unmaxi', (event) => {
        window.unmaximize();
    });

    // 监听控制最小化窗口事件
    ipc.on('dashboard:mini', (event) => {
        window.minimize();
    });

    // 监听查询模板的消息事件
    ipc.on('dashboard:getTemplate', (event, type) => {
        let template = proManager.getTemplate(type);
        event.reply(null, template);
    });
};
