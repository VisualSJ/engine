## 使用指南

参见example

## 开发指南

1. 入参指代Element(this)的参数统一为elem;
```
/**
 * 派发change事件
 * @param {Element} elem
 */
 ```
2. 组件的class内部的方法尽量只放默认生命周期函数或者需要对外暴露的方法之类的，自定义的处理方法统一放置在外层，通过传this的方式使用；
3. 事件绑定和销毁可参照其他组件的模式


## todo
1. select结构整理以及事件绑定销毁方式
2. slider结构整理以及对应的事件绑定销毁（包括domUtil内定义的drag拖动的事件）
3. colorPicker的presets功能
4. 剩余组件的事件销毁测试代码