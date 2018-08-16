const list: any[] = (exports.list = []);
let outputList: IMessageItem[] = (exports.outputList = []);
let updateFn: any;
let lineHeight: number;
let collapse: boolean = true;
let filterType: string = '';
let filterText: string = '';
let filterRegex: boolean = false;

/**
 * 设置更新函数
 * 后续update时调用该函数触发界面更新
 * @param {function} fn
 */
exports.setUpdateFn = (fn: any) => {
    updateFn = fn;
};

/**
 * 设置行高
 * @param {number} h
 */
exports.setLineHeight = (h: number) => {
    lineHeight = exports.lineHeight = h;
};
/**
 * 添加log消息数组
 * @param {any[]} items
 */
exports.addItems = (items: any[]) => {
    items.forEach((item) => {
        exports.addItem(item);
    });
};
/**
 * 添加单个log消息
 * @param {*} item
 */
exports.addItem = (item: any) => {
    const newItem: any = {};
    const messageArr = (<string[]>(item.message + '').split('\n')).filter(
        (text) => '' !== text
    );
    newItem.type = item.type;
    newItem.rows = messageArr.length + item.stack.length;
    newItem.title = messageArr[0];
    newItem.content = messageArr.splice(1);
    newItem.stack = item.stack;
    newItem.fold = true;
    newItem.count = 1;
    list.push(newItem);
    exports.update();
};
/**
 * 设置log消息是否折叠
 * @param {boolean} bool
 */
exports.setCollapse = (bool: boolean) => {
    collapse = bool;
    exports.update();
};

/**
 * 设置log消息显示类型
 * @param {string} type
 */
exports.setFilterType = (type: string) => {
    filterType = type;
    exports.update();
};

/**
 * 根据所给文字内容过滤输出列表
 * @param {string} text
 */
exports.setFilterText = (text: string) => {
    filterText = text;
    exports.update();
};

/**
 * 根据参数切换是否开启正则匹配过滤
 * @param {boolean} bool
 */
exports.setFilterRegex = (bool: boolean) => {
    filterRegex = bool;
    exports.update();
};
/**
 * 清除列表
 */
exports.clear = () => {
    for (; list.length > 0;) {
        list.pop();
    }
    exports.update();
};
let updateLocker = false;
/**
 * 筛选条件变更或log消息变更更新输出到panel的所有消息列表outputList
 */
exports.update = () => {
    !updateLocker &&
        (updateLocker = true) &&
        requestAnimationFrame(() => {
            let text: any = filterText;
            let height = 0;
            for (; outputList.length > 0;) {
                outputList.pop();
            }
            if (filterRegex) {
                try {
                    text = new RegExp(text);
                } catch (e) {
                    text = /.*/;
                }
            }
            list.filter((item: any) => {
                const hasTitle = !!item.title;
                const isTypeMatch = !filterType || item.type === filterType;
                const isRegexMatch = filterRegex
                    ? text.test(item.title)
                    : item.title.indexOf(text) !== -1;

                return hasTitle && isTypeMatch && isRegexMatch;
            }).forEach((item: any) => {
                const outputItem = outputList[outputList.length - 1];
                const isSameContent =
                    outputItem &&
                    outputItem.title === item.title &&
                    outputItem.type === item.type &&
                    outputItem.content.join('\n') === item.content.join('\n') &&
                    outputItem.stack.join('\n') === item.stack.join('\n');
                // 折叠状态下需要累计相同消息个数
                if (collapse && isSameContent) {
                    outputItem.count += 1;
                    return;
                }

                item.count = 1;
                item.translateY = height;
                outputList.push(item);
                item.fold
                    ? (height += lineHeight)
                    : (height += item.rows * (lineHeight - 2) + 14);
                updateFn();
                updateLocker = false;
            });
        });
};
