'use strict';

/**
 * 模拟监听的 package 消息
 */
exports.package = {
    'scene': {

        'query-is-ready'(event) {
            event.reply(null, false);
        },

        'query-node-tree'(event) {
            // 以下是模拟的树形数据
            let rt = [];

            // 层级一
            let iMax = 3 + Math.ceil(Math.random() * 5); // 随机的个数
            for (let i = 1; i < iMax; i++) {
                let name = `Root ${i}`; // 名称
                let one = {
                    name: name,
                    uuid: name,
                }

                // 层级二
                let jMax = 10 + Math.ceil(Math.random() * 10);
                if (jMax != 0) {
                    one.children = [];
                }
                for (let j = 1; j < jMax; j++) {
                    let child = `Child ${i} ${j}`;
                    let two = {
                        name: child,
                        uuid: child,
                    }
                    one.children.push(two);

                    // 层级三
                    let kMax = 50 + Math.ceil(Math.random() * 5);
                    if (kMax != 0) {
                        two.children = [];
                    }
                    for (let k = 1; k < kMax; k++) {
                        let level = `Level ${i} ${j} ${k}`;
                        let three = {
                            name: level,
                            uuid: level,
                        }
                        two.children.push(three);
                    }
                }
                rt.push(one);
            }
            // 返回数据
            event.reply(null, rt);
        },
    },
};

/**
 * 模拟监听的 panel 消息
 */
exports.panel = {};