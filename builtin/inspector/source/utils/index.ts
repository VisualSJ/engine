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
        return (path || '').split('.').reduce((prev: NodeDump | PropertyDump, next: string, index: number) => {
            try {
                // 获取PropertyDump对象
                const item = prev[next];
                // 是否最后一个属性
                const isLastItem = index === path.length - 1;
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
    diffpatcher
};
