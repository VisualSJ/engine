export class Focusable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' }).innerHTML = `<slot></slot>`;
    }

    public connectedCallback() {
        this.addEventListener('focus-changed', this._onFocusing);
    }

    public disconnectedCallback() {
        this.removeEventListener('focus-changed', this._onFocusing);
    }

    /**
     * 监听子孙元素焦点变更事件
     * @private
     * @param {*} event
     * @memberof Focusable
     */
    private _onFocusing(event: any) {
        const { focused = false } = event.target;
        this.selected = focused;
    }

    get selected() {
        return this.hasAttribute('selected');
    }

    set selected(val) {
        if (val) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
    }
}
