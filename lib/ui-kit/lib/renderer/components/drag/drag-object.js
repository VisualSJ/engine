'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './drag-object.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './drag-object.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';
let nameTranslator = null;

class DragObject extends Base {

    /**
     * 使用第三方提供的样式显示当前的元素
     * @param {file} src 
     */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并缓存到模块变量内
        customStyle = fs.readFileSync(src, 'utf8');

        // 应用到之前所有的模块上
        instanceArray.map(elem => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /**
     * 注入一个翻译器
     * 如果没有翻译器，默认页面显示的就是 value 的值
     * 如果有，则将 value 传给翻译器，并显示 return 出来的值
     * @param {*} func 
     */
    static setNameTranslator(func) {
        if (typeof func !== 'function') {
            return;
        }
        nameTranslator = func;
    }

    /**
     * 监听的 Attribute
     */
    static get observedAttributes() {
        return [
            'disabled',
            'type',
            'value',
            'placeholder',
            'readonly',
            'password',
        ];
    }

    /**
     * Attribute 更改后的回调
     * @param {*} attr 
     * @param {*} oldData 
     * @param {*} newData 
     */
    async attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'type':
                this.$type.innerHTML = newData;
                break;
            case 'value':
                if (nameTranslator) {
                    newData = await nameTranslator(newData)
                }
                this.$value.innerHTML = newData;
                break;
            case 'placeholder':
                this.$placeholder.innerHTML = newData || 'None';
                break;
        }
    }

    ////////////////////////////
    //

    get dropable() {
        return this._dropable;
    }

    set dropable(val) {
        val = val + '';
        if (this._dropable === val) {
            return;
        }
        this._dropable = val;
        if (this._dropable) {
            this.setAttribute('type', this._dropable);
        } else {
            this.removeAttribute('type');
        }
    }

    get value() {
        return this._value;
    }

    set value(val) {
        val = val + '';
        if (this._value === val) {
            return;
        }
        this._value = val;
        if (this._value) {
            this.setAttribute('value', this._value);
        } else {
            this.removeAttribute('value');
        }
        this.dispatch('change');
        this.dispatch('confirm');
    }

    get placeholder() {
        return this._placeholder;
    }

    set placeholder(val) {
        val = val + '';
        if (this._placeholder === val) {
            return;
        }
        this._placeholder = val;
        if (this._placeholder) {
            this.setAttribute('placeholder', this._placeholder);
        } else {
            this.removeAttribute('placeholder');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;

        this.$area = this.shadowRoot.querySelector('.area ui-drag-area');
        this.$close = this.shadowRoot.querySelector('.area svg');
        this.$area.$root = this.$close.$root = this;

        this.$type = this.shadowRoot.querySelector('.type .name');
        this.$value = this.shadowRoot.querySelector('.area ui-drag-area .value');
        this.$placeholder = this.shadowRoot.querySelector('.area ui-drag-area .placeholder');      
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存元素
        instanceArray.push(this);

        // 初始化相关属性
        this._dropable = this.getAttribute('dropable') || '';
        this._value = this.getAttribute('value') || '';
        this._placeholder = this.getAttribute('placeholder') || 'None';

        this._dropable && (this.$type.innerHTML = this._dropable);
        this._dropable && (this.$area.dropable = this._dropable);
        this._value && (this.$value.innerHTML = this._value);
        this._placeholder && (this.$placeholder.innerHTML = this._placeholder);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;

        // 绑定事件
        this.$area.addEventListener('dragover', this._onAreaDragOver);
        this.$area.addEventListener('dragleave', this._onAreaDragLeave);
        this.$area.addEventListener('drop', this._onAreaDrop);
        this.$close.addEventListener('click', this._onCloseClick);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的元素对象
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 取消绑定事件
        this.$area.removeEventListener('dragover', this._onAreaDragOver);
        this.$area.removeEventListener('dragleave', this._onAreaDragLeave);
        this.$area.removeEventListener('drop', this._onAreaDrop);
        this.$close.removeEventListener('click', this._onCloseClick);
    }

    // get set focused
    // get set disabled

    //////////////////////
    // 私有事件

    /**
     * 拖拽进入 area 元素
     */
    _onAreaDragOver() {
        this.$root.setAttribute('state', this.hoving ? 'allow' : 'refused');
    }

    /**
     * 拖拽离开 area 元素
     */
    _onAreaDragLeave() {
        this.$root.removeAttribute('state');
    }

    /**
     * 拖放到 area 元素
     */
    _onAreaDrop(event) {
        this.$root.removeAttribute('state');
        this.$root.value = event.dataTransfer.getData('value');
    }

    /**
     * 点击清空按钮
     */
    _onCloseClick() {
        this.$root.value = '';
    }
}

module.exports = DragObject;