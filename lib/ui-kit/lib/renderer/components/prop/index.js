'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');
const { domUtils } = require('../../utils');
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './prop.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './prop.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';
let TYPES = ['string', 'string', 'boolean', 'int', 'number', 'enums', 'vec2', 'vec3', 'color3', 'color4', 'quat'];

/**
 * 默认渲染UI处理方法
 * 将将数据转换为基本ui组件格式，返回对应的html字符串
 * @param {String} type // 数据类型
 * @param {Any} data  // json字符串数据
 */
let createUI = (type, data) => {
    let html = '';
    let value;
    switch (type) {
        case 'string': // 普通的text节点
            html = `<ui-input value =${data}></ui-input>`;
            break;
        case 'boolean':
            html = `<ui-checkbox value =${data}></ui-checkbox>`;
            break;
        case 'int':
            html = `<ui-num-input value =${data}></ui-num-input>`;
            break;
        case 'number':
            html = `<ui-num-input value =${data} preci="2"></ui-num-input>`;
            break;
        case 'enums':
            html = `<ui-select value="${data.value}">
                      ${Object.values(data.options)
                        .map((item, index) => '<option value=' + index + '>' + item + '</option>').join('')}
                   </ui-select>`;
            break;
        case 'vec2':
            value = JSON.parse(data);
            html = `<ui-num-input preci="2" value=${value.x} unit="X"></ui-num-input>
                <ui-num-input preci="2" value=${value.y} unit="Y"></ui-num-input>`;
            break;
        case 'vec3':
            value = JSON.parse(data);
            html = `<ui-num-input preci="2" value=${value.x} unit="X"></ui-num-input>
                <ui-num-input preci="2" value=${value.y} unit="Y"></ui-num-input>
                <ui-num-input preci="2" value=${value.z} unit="Z"></ui-num-input>`;
            break;
        case 'color3':
            value = JSON.parse(data);
            html = `<ui-color  value=${JSON.stringify(Object.values(value).map((item) => item * 255))}></ui-color>`;
            break;
        case 'color4':
            value = JSON.parse(data);
            html = `<ui-color value=${JSON.stringify(Object.values(value)
              .map((item, index) => index === 3 ? item : item * 255))}></ui-color>`;
            break;
        case 'quat':
            value = JSON.parse(data);
            html = `<ui-num-input preci="2"  value=${value.x} unit="X"></ui-num-input>
                <ui-num-input preci="2" value=${value.y} unit="Y"></ui-num-input>`;
            break;
    }
    return html;
};

class Prop extends Base {

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

        // 应用到之前的所有模块上
        instanceArray.map((elem) => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /**
     * 使用第三方传入的类型type以及对应的UI处理方案
     * @param {Array} types 用于判断是否是合理的type值
     * @param {Function} func UI渲染处理方案，具体模式请参照createUI函数
     */
    static importUI(types, func) {
      // 读取 types 并缓存到模块变量内
      TYPES = Array.from(types);

      // 应用到之前的所有模块上
      instanceArray.map((elem) => {
        createUI = func;
        elem._updateUI();
      });
  }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$content = this.shadowRoot.querySelector('.content');
        this.$label = this.shadowRoot.querySelector('.text');
        this.$content.$root = this.$label.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存已经放入文档流的节点
        instanceArray.push(this);

        // 在组件插入文档流后才能进行赋值、改变属性等影响dom的操作
        this.removeAttribute('tabindex');
        if (!this.$slotCon) {
          this.$slotCon = document.createElement('div');
          this.$slotCon.setAttribute('slot', 'content');
          this.$slotCon.$root = this;
          this.append(this.$slotCon);
        }

        // 初始化属性并渲染数据为dom节点
        let type = this.getAttribute('type');
        if (TYPES.indexOf(type) === -1) {
          console.warn('please use the correct type');
        } else {
          this._updateUI();
        }

        // 绑定鼠标事件
        mouseContron(this);
        this.addEventListener('focus', this._onConFocus, true);
        this.$slotCon.addEventListener('focusout', this._onConBlur); // focusout事件，处理tab的焦点转移而改变的selected值

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 取消绑定鼠标事件
        mouseContron(this, true);
        this.removeEventListener('focus', this._onConFocus, true);
        this.$slotCon.removeEventListener('focusout', this._onConBlur);
    }

    get label() {
      return this.getAttribute('label');
    }

    set label(value) {
      this.setAttribute('label', value);
    }

    get selected() {
      return this.getAttribute('selected') !== null;
    }

    set selected(value) {
      if (!!value) {
          this.setAttribute('selected', '');
      } else {
          this.removeAttribute('selected');
      }
    }

    set type(value) {
      if (TYPES.indexOf(value) === -1) {
          console.error('please use the correct type');
      } else {
        this.setAttribute('type', value);
      }
    }

    get type() {
      return this.getAttribute('type');
    }

    set options(value) {
      if (Array.isArray(value)) {
        this.setAttribute('options', JSON.stringify(value));
        return;
      }
      this.setAttribute('options', value);
    }

    get options() {
      return JSON.parse(this.getAttribute('options'));
    }
    // get set focused
    // get set disabled
    // get set readonly

     /**
      * 监听的 Attribute
      */
    static get observedAttributes() {
      return [
          'label',
          'selected',
          'type',
          'value',
          'readonly',
          'disabled',
          'name',
          'options'
      ];
  }

    /**
     * Attribute 更改后的回调
     * @param {*} attr
     * @param {*} oldData
     * @param {*} newData
     */
    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'label':
              this.$label.innerHTML = newData;
              break;
            case 'selected':
              break;
            case 'readonly':
              newData = newData !== null;
              this.updateUIAttr('readonly', newData, this);
              break;
            case 'disabled':
              newData = newData !== null;
              this.updateUIAttr('disabled', newData, this);
              break;
            case 'name':
              this.updateUIAttr('name', newData, this);
              break;
            case 'options':
              if (!Array.isArray(newData) && !Array.isArray(JSON.parse(newData))) {
                console.warn('please set s right property about options of ui-prop');
                return;
              }
              break;
        }
    }

    /**
     * 批量修改目标组件内子组件内部属性的方法
     * @param {String} attrName
     * @param {*} value
     */
    updateUIAttr(attrName, value, parentNode) {
      if (!parentNode.childNodes) {
        return;
      }

      for (let item of parentNode.childNodes) {
        if (!domUtils.isUIComponent(item)) {
          continue;
        }
        item[attrName] = value;
      }
    }

    /**
     * 更新内部UI的内部方法
     */
    _updateUI() {
        // 先取得值，再将属性移除
        this.value = this.getAttribute('value');
        this.removeAttribute('value');
        if (this.type == null || this.value == null) { // 当其值为null或undifined时
          return;
        }
        let html = '';
        if (this.type === 'enums') {
          if (!this.options) {
            return;
          }
          let {options, value} = this;
          html = createUI(this.type, {options, value});
        } else {
          html = createUI(this.type, this.value);
        }
        this.$slotCon.innerHTML = html;

        this.updateUIAttr('readonly', this.readonly, this.$slotCon);
        this.updateUIAttr('disabled', this.disabled, this.$slotCon);
        this.updateUIAttr('name', this.name, this.$slotCon);
    }

    //////////////////////
    // 私有事件

    /**
     * 用捕获的方式获取组件内部focus的事件通知
     * @param {Event} event
     */
    _onConFocus(event) {
      this.selected = true;
    }

    /**
     * 捕获blur事件，判断是否blur事件的焦点转移前的父代prop是否与转移后的父代prop为同一个
     * @param {Event} event
     */
    _onConBlur(event) {
      if (event.relatedTarget && event.relatedTarget.parentNode.$root !== this) {
        this.$root.selected = false;
      }
    }

    /**
     * 鼠标点击事件
     *
     */
    _onMouseDown(event) {
      this.selected = true;
      super._onMouseDown(event);

      // 为避免子代ui组件的点击事件被控制鼠标点击外部事件意外处理，需阻止事件冒泡
      event.stopPropagation();

      // 内部组件触发的事件，主动获取焦点
      if (this.contains(event.target)) {
        event.target.focus();
        return;
      }

      // 非内部组件触发的事件，把焦点转移到第一个ui子元素上
      let length = this.$slotCon.childNodes.length;
      for (let i = 0; i < length; ++i) {
        if (domUtils.isUIComponent(this.$slotCon.childNodes[i])) {
          this.$slotCon.childNodes[i].focus();
          return;
        }
      }
    }
  }

/**
 * 控制鼠标点击外部事件
 * @param {Element} elem
 * @param {Boolean} detach
 */
const mouseContron = (elem, detach = false) => {
  elem._onDomMouseDown = (function(elem) {
    const mouseDown = (event) => {
      if (event.target !== elem) {
        elem.selected = false;
      }
    };
    return mouseDown;
  })(elem);
  if (detach) {
    document.removeEventListener('mousedown', elem._onDomMouseDown);
  } else {
    document.addEventListener('mousedown', elem._onDomMouseDown);
  }
};

module.exports = Prop;
