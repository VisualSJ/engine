'use strict';

const i18n = require('@base/electron-i18n');
const menu = require('@base/electron-menu');
const windows = require('@base/electron-windows');
const projectManager = require('./../project');

/**
 * windows 系统的菜单设置
 */
let win32 = function() {

    menu
        .add('Cocos3d')
        .add(i18n.translation('menu.file'))
        .add(i18n.translation('menu.edit'))
        .add(i18n.translation('menu.project'))
        .add(i18n.translation('menu.panel'))
        .add(i18n.translation('menu.expansion'))
        .add(i18n.translation('menu.develop'));
    let cccMenu = menu.get('Cocos3d');
    cccMenu.group('quit', 99);
    cccMenu.add(i18n.translation('menu.close'), {
        group: 'quit',
        role: 'close',
    });

    cccMenu.add(i18n.translation('menu.quit'), {
        group: 'quit',
        accelerator: 'CmdOrCtrl+Q',
        click() {
            windows.quit && windows.quit();
        },
    });

    // 文件菜单
    file();
    // 编辑菜单
    edit();
    // 开发者菜单
    develop();

    menu.apply();
};

/**
 * mac 系统的菜单设置
 */
let darwin = function() {
    menu
        .add('Cocos3d')
        .add(i18n.translation('menu.file'))
        .add(i18n.translation('menu.edit'))
        .add(i18n.translation('menu.project'))
        .add(i18n.translation('menu.panel'))
        .add(i18n.translation('menu.expansion'))
        .add(i18n.translation('menu.develop'));
    let cccMenu = menu.get('Cocos3d');
    cccMenu
    .group('about', 0)
    .group('default', 1)
    .group('display', 2)
    .group('quit', 99);

    cccMenu.add(i18n.translation('menu.about_cocos'), {
        group: 'about',
        click() {},
    });

    cccMenu.add(i18n.translation('menu.hide'), {
        group: 'display',
        role: 'hide',
    });

    cccMenu.add(i18n.translation('menu.hide_other'), {
        group: 'display',
        role: 'hideOthers',
    });

    cccMenu.add(i18n.translation('menu.show_all'), {
        group: 'display',
        role: 'unhide',
    });

    cccMenu.add(i18n.translation('menu.close'), {
        group: 'quit',
        role: 'close',
    });

    cccMenu.add(i18n.translation('menu.quit'), {
        group: 'quit',
        accelerator: 'CmdOrCtrl+Q',
        click() {
            windows.quit && windows.quit();
        },
    });
    // 文件菜单
    file();
    // 编辑菜单
    edit();
    // 开发者菜单
    develop();
    menu.apply();
};

let file = function() {
    let fileMenu = menu.get(i18n.translation('menu.file'));
    fileMenu
        .group('project', 0)
        .group('scene', 1)
        .group('default', 99);
    fileMenu
        .add(i18n.translation('menu.new_project'), {
            group: 'project',
            click() {
                process.send({
                    channel: 'show-dashboard',
                    options: {
                        tab: 1,
                        type: projectManager.type,
                    },
                });
            },
        })
        .add(i18n.translation('menu.open_project'), {
            group: 'project',
            click() {
                projectManager.open();
            },
        })
        .add(i18n.translation('menu.open_recent_project'), {
            group: 'project',
        });
    // 添加打开最近项目列表
    let openRecentProject = fileMenu.get(i18n.translation('menu.open_recent_project'));
    openRecentProject
        .group('2d', 0)
        .group('3d', 1);
    let list = projectManager.getList();
    for (let item of list) {
        openRecentProject
            .add((item.path), {
                group: item.type,
                click() {
                    projectManager.open(item.path);
                },
            });
    }
};

let edit = function() {
    let editMenu = menu.get(i18n.translation('menu.edit'));
    editMenu
        .group('undo', 0)
        .group('edit', 1)
        .group('default', 99);

    editMenu
        .add(i18n.translation('menu.undo'), {
            group: 'undo',
            role: 'undo',
        })
        .add(i18n.translation('menu.redo'), {
            group: 'undo',
            role: 'redo',
        })
        .add(i18n.translation('menu.cut'), {
            group: 'edit',
            role: 'cut',
        })
        .add(i18n.translation('menu.copy'), {
            group: 'edit',
            role: 'copy',
        })
        .add(i18n.translation('menu.paste'), {
            group: 'edit',
            role: 'paste',
        });
};

let develop = function() {
    let developMenu = menu.get(i18n.translation('menu.develop'));
    developMenu
        .group('operation', 0)
        .group('preview', 1)
        .group('default', 99);

    developMenu
        .add(i18n.translation('menu.reload'), {
            group: 'operation',
            role: 'reload',
        })
        .add(i18n.translation('menu.toggle_devtools'), {
            group: 'operation',
            role: 'toggledevtools',
        });
};

module.exports = {
    win32, darwin,
};
