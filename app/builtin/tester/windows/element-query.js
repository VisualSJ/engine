const win = require('electron').remote.getCurrentWindow();

class ElementQuery {
    constructor() {
        this.root;
    }

    /**
     * 获取面板
     * @param {*} name 面板的名字
     */
    panel(name) {
        this.root = null;
        const frame = document.querySelector('#dock').shadowRoot;
        if (frame) {
            const panel = frame.querySelector(`panel-frame[name="${name}"]`);
            if (panel) {
                this.root = panel.shadowRoot;
            }
        }

        return this;
    }

    element(selector) {
        return this.root.querySelector(selector);
    }

    elements(selector) {
        return this.root.querySelectorAll(selector);
    }

    /**
     * 获取节点所有属性
     * 返回值 json 或 null
     * @param {*} element 可以是 element 或 selector
     */
    attributes(element) {
        if (typeof element === 'string') { // it is selector
            return this.attributes(this.element(element));
        }

        let attrs = null;

        if (element && element.hasAttributes()) {
            attrs = {};

            const { attributes } = element;

            for (let i = attributes.length; i--;) {
                const { name, value } = attributes[i];
                attrs[name] = value;
            }
        }

        return attrs;
    }

    /**
     * 获取节点的绝对坐标
     * 返回值 { bottom, height, left, right, top, width, x, y, cx, cy } 或 null
     * x, y, cx, cy 是相对与屏幕的坐标位置，在有多屏幕的情况下需要此换算
     * cx 和 cy 是元素的中心点
     * @param {*} element 可以是 element 或 selector
     */
    position(element) {
        if (typeof element === 'string') {
            return this.position(this.element(element));
        }

        const winPosition = win.getContentBounds();

        let position = null;

        if (element) {
            const rect = JSON.parse(JSON.stringify(element.getBoundingClientRect()));

            rect.x += winPosition.x;
            rect.y += winPosition.y;

            position = Object.assign(rect, {
                cx: rect.x + rect.width / 2,
                cy: rect.y + rect.height / 2,
            });

            // 兼容高分辨率屏幕
            rect.x *= window.devicePixelRatio;
            rect.y *= window.devicePixelRatio;
            rect.cx *= window.devicePixelRatio;
            rect.cy *= window.devicePixelRatio;
        }

        return position;
    }

}

module.exports = new ElementQuery();
