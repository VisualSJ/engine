'use strict';

const ps = require('path');
const windows = require('@base/electron-windows');
const packageManager = require('@editor/package');

/**
 * 启动测试窗口
 */
exports.tester = function (name) {
    windows.open(ps.join(__dirname, '../renderer/index.html'), {
        x: 100,
        y: 200,
        width: 400,
        height: 600,
    }, {
        name,
    });
};

/**
 * 启动插件窗口
 * @param {*} name
 */
exports.package = function (name) {

    packageManager.on('load', () => {
        let pkg = packageManager.query(name);

        if (pkg.panels.length === 0) {
            return;
        }

        windows.open(ps.join(__dirname, '../renderer/tester.html'), {
            x: 600,
            y: 200,
            width: 400,
            height: 600,
        }, {
            layout: {
                "version": 1,
                "layout": {
                    "direction": "row",
                    "children": [{
                        "percent": 1,
                        "direction": "column",
                        "children": [{
                            "panels": pkg.panels,
                        }]
                    }]
                }
            },
        });
    });

    
};