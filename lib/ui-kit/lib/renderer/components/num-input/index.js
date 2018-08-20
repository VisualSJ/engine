'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据
// 37 left / 39 right: 无特殊响应

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './num-input.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`
const HTML = `${fs.readFileSync(path.join(__dirname, './num-input.html'), 'utf8')}`;

const instanceArray = [];
let customStyle = '';

class NumInput extends Base {

    /**
     * 使用第三方提供的样式显示当前的元素
     * @param {file} src 
     */
    static importStyle(src) {
        if (fs.existsSync(src)) {
            return;
        }

        // 读取 css 并设置到节点内
        customStyle = fs.readFileSync(src, 'utf8');

        // 循环已经使用的节点，设置新的 css
        instanceArray.map(elem => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    static get observedAttributes() {
        return [
            'value',
            'unit',
        ];
    }

    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'value':
                this.$input.value = parseFloat(newData);
                break;
            case 'unit':
                this.$unit.innerHTML = newData || '';
                break;
        }
    }

    ////////////////////////////

    get value() {
        return parseFloat(this.$input.value || 0);
    }

    set value(val) {
        this.$input.value = val;
    }

    get readOnly() {
        return !!this.$input.readOnly;
    }

    set readOnly(val) {
        this.$input.readOnly = val;
        this.setAttribute(this.$input.getAttribute('readonly'));
    }

    get step() {
        return parseFloat(this.$input.step !== '' ? this.$input.step : 1);
    }

    set step(val) {
        this.$input.step = val;
        this.setAttribute(this.$input.getAttribute('step'));
    }

    get unit() {
        return this.getAttribute('unit');
    }

    set unit(val) {
        this.setAttribute('unit', val);
    }

    get max() {
        let max = this.$input.max;
        if (max === '') {
            max = Infinity;
        }
        return max;
    }

    set max(val) {
        this.$input.max = val;
        this.setAttribute(this.$input.getAttribute('max'));
    }

    get min() {
        let min = this.$input.max;
        if (min === '') {
            min = -Infinity;
        }
        return min;
    }

    set min(val) {
        this.$input.min = val;
        this.setAttribute(this.$input.getAttribute('min'));
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');

        this.$input.$root = this.$up.$root = this.$down.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存节点
        instanceArray.push(this);

        // 绑定事件
        this.addEventListener('keydown', this._onKeyDown);
        this.$input.addEventListener('input', this._onInputChage);
        this.$up.addEventListener('mousedown', this._onUpMouseDown);
        this.$down.addEventListener('mousedown', this._onDownMouseDown);

        // 初始化 attribute
        let attrs = ['readonly', 'step', 'max', 'min'];
        attrs.forEach((name) => {
            let value = this.getAttribute(name);
            if (value === null) {
                return;
            }
            this.$input.setAttribute(name, value);
        });

        // 默认值
        if (this.$input.value === '') {
            this.$input.value = 0;
        }
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 删除之前缓存的数据
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 取消事件绑定
        this.removeEventListener('keydown', this._onKeyDown);
        this.$input.removeEventListener('input', this._onInputChage);
        this.$input.removeEventListener('mousedown', this._onUpMouseDown);
        this.$down.removeEventListener('mousedown', this._onDownMouseDown);
    }

    //////////////////////
    // 私有事件

    /**
     * 键盘点击事件
     * @param {*} event 
     */
    _onKeyDown(event) {
        switch(event.keyCode){
            case 38: // up
                break;
            case 40: // down
                break;
            case 13: // enter
                this.dispatch('confirm');
                break;
            case 27: // esc
                this.dispatch('cancel');
                break;
        }
    }

    /**
     * input 修改事件
     * 需要将数据回流到 root 元素上
     */
    _onInputChage() {
        this.$root.setAttribute('value', this.value);
        this.$root.dispatch('change');
    }

    /**
     * up 按键点击事件
     */
    _onUpMouseDown() {
        this.$root.$input.stepUp();
    }

    /**
     * down 按键点击事件
     */
    _onDownMouseDown() {
        this.$root.$input.stepDown();
    }
}

module.exports = NumInput;
