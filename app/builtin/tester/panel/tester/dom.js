'use sitrct';

class VirtualElement {
    constructor(panel, selector) {
        this.panel = panel;
        this.selector = selector;
    }

    /**
     * 获取某个 attr 的值
     */
    async attr(name) {
        return await Editor.Ipc.requestToPackage(
            'tester', 'forwarding-to-window',
            this.panel, this.selector, 'attr', name,
        );
    }

    /**
     * 点击当前元素
     */
    async click() {
        return await Editor.Ipc.requestToPackage(
            'tester', 'forwarding-to-window',
            this.panel, this.selector, 'click',
        );
    }

    /**
     * 向当前元素输入字符串
     * @param {*} string 
     */
    async input(string) {
        return await Editor.Ipc.requestToPackage(
            'tester', 'forwarding-to-window',
            this.panel, this.selector, 'input', string,
        );
    }

    /**
     * 按下 enter 按钮
     */
    async enter() {
        return await Editor.Ipc.requestToPackage(
            'tester', 'forwarding-to-window',
            this.panel, this.selector, 'enter',
        );
    }

    /**
     * 按下 esc 按钮
     */
    async esc() {
        return await Editor.Ipc.requestToPackage(
            'tester', 'forwarding-to-window',
            this.panel, this.selector, 'esc',
        );
    }
}

/**
 * 获取某个 panel 里指定元素的数据
 * @param {*} panel 
 * @param {*} selector 
 */
function selector(panel, selector) {
    return new VirtualElement(panel, selector);
}

exports.selector = selector;
