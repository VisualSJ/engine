'use stirct';

const scene = require('./scene');
const uuidUtils = require('../../utils/uuid');

/**
 * 传入 uuid，加载指定的文件
 * @param {*} uuid
 */
function loadScript(uuid) {
    if (!uuid) {
        return;
    }

    // 移除引擎内的索引
    const sid = uuidUtils.compressUuid(uuid);
    const ctor = cc.js._registeredClassIds[sid];
    if (ctor) {
        const name = cc.js.getClassName(ctor);
        let idToClass = cc.js._registeredClassIds;
        delete idToClass[sid];
        cc.js._registeredClassIds = idToClass;

        let nameToClass = cc.js._registeredClassNames;
        delete nameToClass[name];
        cc.js._registeredClassNames = nameToClass;
    }

    return new Promise((resolve) => {
        // 加载文件
        const $script = document.createElement('script');
        $script.src = 'project-scripts://' + uuid + '&_t=' + new Date().getTime();
        document.body.appendChild($script);

        $script.addEventListener('load', () => {
            document.body.removeChild($script);
            resolve();
        });
        $script.addEventListener('error', () => {
            document.body.removeChild($script);
            resolve();
        });
    });
}

/**
 * 加载多个脚本
 * @param {*} uuids
 */
async function loadScripts(uuids) {
    await Promise.all(uuids.map((uuid) => {
        return loadScript(uuid);
    }));

    await scene.close();
    // 启动场景
    const uuid = await Manager.Ipc.send('query-scene');
    if (typeof uuid === 'string') {
        await scene.open(uuid);
    }
}

module.exports = {
    loadScript,
    loadScripts,
};
