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

### color组件
1.value值

传入的颜色值支持rgb\rgba\十六进制以及代表rgb或rgba的数组形式

### colorPicker组件

公开方法：
#### show()
需要调用该方式显示组件才可以保证colorPresets颜色值的实时一致性

## 开发指南




## todo