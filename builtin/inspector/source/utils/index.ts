const diffPatch = require('jsondiffpatch');
const diffpatcher = diffPatch.create({
    objectHash(obj: any, index: number) {
        if (obj.uuid) {
            return obj.uuid;
        }

        // if this is an item in __props__
        if (obj.name && obj.attrs) {
            return obj.name;
        }

        // otherwise just use the index in the array
        return `$$index:${index}`;
    },
    arrays: {
        detectMove: true
    }
});
// dumpProperty 创建的字段处理规则
const repairDumpStrategy: any = {
    position: 'remove',
    size: 'remove',
    anchor: 'merge',
    rotation: 'merge',
    scale: 'merge',
    skew: 'merge'
};

module.exports = {
    /**
     * 由于PropertyDump的数据结构为包含type、value的对象，所以对于不存在type类型的对象则返回undefined
     * @param {NodeDump} object
     * @param {string} path
     * @returns [undefined | object]
     */
    getByPath(object: NodeDump, path: string): any {
        return (path || '')
            .split('.')
            .reduce((prev: NodeDump | PropertyDump, next: string, index: number, arr: string[]) => {
                try {
                    // 获取PropertyDump对象
                    const item = prev[next];
                    // 是否最后一个属性
                    const isLastItem = index === arr.length - 1;
                    // 存在valule且不是最后要返回的属性则直接返回value以进入下一个查询
                    if (item.value && !isLastItem) {
                        return item.value;
                    } else {
                        return isLastItem && item.type ? item : undefined;
                    }
                } catch (err) {
                    return undefined;
                }
            }, object);
    },

    /**
     * 还原 dumpProperty 根据节点属性创建的字段
     * @param {string} path
     * @returns
     */
    repairPath(path: string) {
        const keys: string[] = path.split('.');
        const lastKey: string | undefined = keys.pop();
        const key = keys.pop();
        const repairKeys = Object.keys(repairDumpStrategy);
        if (key && lastKey && repairKeys.includes(key)) {
            const repairKey =
                repairDumpStrategy[key] === 'remove' ? lastKey.toLowerCase() : `${key}${lastKey.toUpperCase()}`;
            keys.push(repairKey);
            return keys.join('.');
        }
        return path;
    },

    /**
     * 根据数据返回对应的 type 类型
     * @param {*} target
     * @returns
     */
    getType(target: any) {
        if (target && target.type) {
            const prefix = 'cc.';

            return target.type.replace(prefix, '').toLowerCase();
        }
        return false;
    },

    /**
     * 根据数据返回 options 选项
     * @param {*} properties
     * @param {string} key
     * @returns
     */
    getOptions(properties: any, key: string) {
        if (properties && properties[key]) {
            return JSON.stringify(properties[key].enumList);
        }
    },

    /**
     * 分割 camel case 字符串为首字符大写的单词
     * @param {string} str
     */
    splitLowerCamelCase(str: string) {
        const reg = /(?<=[a-z])(?=[A-Z])/g;
        str.replace(/^([a-z])/, (match: string, ...rest: any[]) => {
            return match.toUpperCase();
        })
            .split(reg)
            .join(' ');
    },

    /**
     * 提供 Editor 的多语言功能
     * @param {...string[]} rest
     * @returns
     */
    T(...rest: string[]) {
        const prefix = 'inspector';
        rest.unshift(prefix);
        return Editor.I18n.t(rest.join('.'));
    },
    diffpatcher
};
