'use strict';

const fse = require('fs-extra');
const ps = require('path'); // path system
const { spawn } = require('child_process');
const { app, Tray, Menu, BrowserWindow, dialog } = require('electron');
const ipc = require('@base/electron-base-ipc');
const setting = require('@editor/setting');
const project = require('@editor/project');
const i18n = require('@base/electron-i18n');

let window = null;
const languages = {
    zh: require('./i18n/zh'),
    en: require('./i18n/en'),
};
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
    // 注册编辑器默认使用的本地化语言
    i18n.register(languages.en, 'en');
    i18n.register(languages.zh, 'zh');
    // 打开页面
    const html = ps.join(__dirname, './renderer/template/index.html');
    window = new BrowserWindow({
        width: 1000,
        height: 650,
        minWidth: 900,
        minHeight: 600,
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
        event.reply(null, {
            '2d': [],
            '3d': [],
        });
    });

    // 打开所有项目的键值对
    const projectMap = new Map();

    // 设置打开项目方法
    project.setOpenHandler((path) => {

        if (projectMap.get(path)) {

            const config = {
                title: 'warn',
                message: 'Project has been opened!',
                detail: 'Project has been opened!',
                type: 'warning',
                buttons: ['Cancel'],
            };

            dialog.showMessageBox(null, config);
            return;
        }

        // 检查 package.json
        const pkgJsonFile = ps.join(path, 'package.json');

        if (!fse.existsSync(pkgJsonFile)) {
            // todo 提示
            alert(`This project is not a ${this.type} project`);
            return;
        }
        const pkgJson = fse.readJSONSync(pkgJsonFile);

        // 0.0.1 旧版本兼容
        if (!pkgJson.type && pkgJson.engine) {
            pkgJson.type = pkgJson.engine.includes('3d') ? '3d' : '2d';
        }

        // 判断当前打开项目与选择的 type 是否匹配
        if (this.type && this.type !== pkgJson.type) {
            // todo 提示错误
            alert(`This project is not a ${this.type} project`);
            return;
        }

        // electron 程序地址
        const exePath = app.getPath('exe');

        // 拼接参数
        const args = [ps.join(__dirname, '../')];
        if (setting.dev) {
            args.push('--dev');
            args.push('--remote-debugging-port=9223');
        }

        args.push('--project');
        args.push(path);

        // 实际启动
        const child = spawn(exePath, args, {
            stdio: [0, 1, 2, 'ipc'],
        });
        projectMap.set(path, child);
        child.on('message', (options) => {
            if (options.channel && options.channel === `open-project`) {
                if (options.options.path) {
                    return project.open(options.options.path);
                }
                window && window.show();
                ipc.broadcast('dashboard:set-options', options.options);
            }

            // 菜单项 新建项目
            if (options.channel && options.channel === `show-dashboard`) {
                window && window.show();
                ipc.broadcast('dashboard:set-options', options.options);
            }
        });

        child.on('exit', () => {
            projectMap.delete(path);
            if (projectMap.size <= 0) {
                // 如果关闭最后一个项目，需要显示 dashboard(dashboard初始化时赋值)
                window && window.show();
                app.dock && app.dock.show();
            }
        });

        // 如果关闭最后一个项目，需要显示 dashboard(dashboard初始化时赋值)
        window && window.hide();
        app.dock && app.dock.hide();
    });
};
