# Dialog 使用参考

## 基本方法
方法名 | 参数 | 功能 | 返回参数 
------|--------------|------------ |------------------
[`show`](###show-基础信息展示弹框) | [`config`](###弹框的配置参数-`config`), `browserWindow` | 基础信息展示弹框| 
[`openFile`](###openFile-打开文件) | [`options`](###打开文件类配置参数-`options`), `browserWindow` | 打开文件
[`openDirectory`](###openDirectory-打开文件夹) | [`options`](###打开文件类配置参数-`options`), `browserWindow` | 打开文件夹
[`saveFiles`](###saveFiles-保存文件) | [`options`](###打开文件类配置参数-`options`), `browserWindow` | 保存文件

### 弹框的配置参数 `config` 
属性名 | 类型 | 功能
------|--------------|------------ 
`type` | string（可选）支持 `"error"`, `"info"`, `"warning"`,`"error"`, `"question"`| 弹框类型
`title` | string（可选） | 标题，一些平台不显示
`message` | string（可选） | 展示内容正文
`detail` | string（可选） | 额外信息
`defaultId` | string（可选） | 设置默认选中的按钮，值为在 buttons 数组中的索引.
`cancelId` | string（可选） | 用于取消对话框的按钮的索引，默认为 0 .
`icon` | string（可选） | 指定图标地址 （选填，默认以 type 对应的图标为准，一般不使用该属性）
`buttons` | array（可选） |指定需要展示的按钮文本数组， 空数组显示为 "OK"

### 打开文件类配置参数 `options` 
属性名 | 类型 | 功能
------|--------------|------------ 
`title` |string（可选）|弹框显示标题文本
`root` | string（可选）|默认打开路径，默认为用户当前项目目录
`filters` | filters 对象（可选）|文件过滤规则，仅打开文件弹框时配置有效，例如：{name: 'Images', extensions: ['jpg', 'png', 'gif']}
`multi` | boolean （可选）|是否允许多选
`label` | string （可选）| 保存 按钮的文本替换值

## 使用示例
详情可见于 **ui-preview** 面板的 dialog 模块

### show 基础信息展示弹框
```js
dialog.show({
  type: 'info',
  message: '这里是弹框正文'
}).then((array) => {
  // array 为弹框中点击的按钮索引数组
  // do someting
})
```

### openFile 打开文件
```js
dialog.openFile({
  title: '打开文件标题',
  extensions: {name: 'Images', `extensions`: ['jpg', 'png', 'gif']},
}).then((filePaths) => {
  // array 为选中的文件路径数组
  // do someting
})
```
### openDirectory 打开文件夹
```js
dialog.openFile({
  title: '打开文件夹标题'
}).then((filePaths) => {
  // array 为选中的文件路径数组
  // do someting
})
```
### saveFiles 保存文件
```js
dialog.openFile({
  title: '打开文件夹标题',
  defaultPath: '//.project/'
}).then((filePaths) => {
  // array 为选中的文件路径数组
  // do someting
})
```