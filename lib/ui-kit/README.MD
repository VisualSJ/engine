## 使用指南

详情示例，可参见example，示例运行方式: 在ui-kit文件夹下
```
npm start .\example\
```

1. 对组件value的取值直接调用$dom.value的形式
### ui-num-input
1. num-input的change事件只发生在输入有效数据并且与上次数据不同时触发，
例如
- 输入“-3”在输入负号字符将不触发change事件直到3后才触发，一共一次change；
- 输入“0.2”只触发2次change；
- 输入数据与原数据相同时也不触发change事件；

2.numinput的preci精度设置值需在0-20之间（包括首尾）,默认为20即容纳最大限度的小数点；
3.step设置的精度需与preci一致
### color组件
1.value值

入参：传入的颜色值支持rgb\rgba\十六进制以及代表rgb或rgba的数组形式
出参：为数组形式，转化为字符串的话与rgba一致，例如：[233,255,255,0.1]

### colorPicker组件

公开方法：
#### show()
需要调用该方式显示组件才可以保证colorPresets颜色值的实时一致性

### ui-prop组件
使用方式：
需要让prop直接渲染数据的，直接传递label、type、value值即可；
```
  <ui-prop label="number" type="number" value="22.888"></ui-prop>
```
在ui-prop里面直接嵌套标签

```
 <ui-prop label="number" type="number" value="22.888">
     <ui-prop label="number" type="number" value="22.888" slot = 'child'></ui-prop>
 </ui-prop>
```
需要可折叠的ui-prop可以section结合使用
### ui-section
1.header文本有2种方式，一种是用属性header，一种是标签嵌套，设置属性slot='header'；同时存在时后者将覆盖前者；
2.子代元素将默认作为子项节点使用

## 开发指南


1.组件内部若有可获取焦点的表单元素需要设置tabIndex = -1，并且在内部focus函数转移焦点之前判断是否按下shift键(_shiftFlag)，并指定this.$child为该内部表单元素
代码示例，可参照input等

```
    constructor() {
        super();
        .................
        // 指定会影响tab焦点的内部元素
        this.$child = this.$input;
        ................
    }

    _onFocus(event) {
        super._onFocus(event);
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$child.focus();
    }
```

## todo