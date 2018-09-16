## 草案

### .show(config)基础信息展示弹框
不细化功能，自主选择type
- .show(config) // config中有type属性（error,info,warn 分别对应有不同的默认图标，传icon亦可以指定默认图标）
不设置对应回调函数时，将不显示任何按钮

#### config 为弹框的配置对象
- title :string 标题 选填/不同弹框有不同的默认值，例如alert对应的title默认为alert
- message :string 展示内容正文 选填
- onOk :function 确认按钮的回调函数，本质上是定义的第一个按钮点击后回调的快捷方式
- onCancel :function 取消按钮的点击回调函数 ，，本质上是定义的第二个按钮点击后回调的快捷方式
- okText :string 更改默认确认按钮的文本内容（选填, 默认值：OK），本质上是buttons的快捷方式
- cancelText :string 更改取消按钮的默认文本内容（选填, 默认值：cancel)，本质上是buttons的快捷方式
- type :string 弹框类型 （选填，默认为info，支持error,info,warning....）

- icon :string 指定图标地址 （选填，默认以type对应的图标为准, 一般不使用该属性）
- buttons :string | array 指定需要展示的按钮文本，按钮数量以数组长度为准，
- callback :function  当没有指定onOk 以及onCancel函数时，将触发该事件,函数将接收当前点击按钮index的参数；

注意：
1. 当存在onOk函数与onCancel函数，没有指定对应按钮的文本将显示默认值；
2. 当options中存在cancelText而没有指定okText，将默认显示2个按钮，确认按钮文本为配置的默认值；故如需单个的取消按钮请更改okText文本内容模拟单一的取消按钮；
3. 当同时存在callback函数与onOk等函数时，前2个按钮点击回调将执行onOk或onCancel函数（如存在，不存在则callback函数）；剩余函数将触发callback函数；
4. 当buttons与okText、cancelText同时存在时，前两个数组内容将被其覆盖对应的值；
5. onOk函数为驼峰式，注意大小写；

### 使用示例

可见于ui-preview的dialog模块


### .openFile(options) 打开文件弹框

### .openDirectory(options) 打开文件夹弹框

###  .saveFiles(options) 保存对话框

**options为打开文件的配置对象**
- title 弹框显示标题文本 （选填，默认：打开文件）
- defaultPath 默认打开路径 （选填，默认为用户当前项目目录）
- filters 文件过滤（支持两种模式，传入字符串则按照默认的制定的匹配规则，传入数组则与原生相同）
例如：传入'image'，则内部将会用写好的对应的过滤规则来替代，需要多个过滤规则在字符串中以逗号隔开即可，例如：'movies, images')

关于默认规则，具体可看本文将就内的config文件

```
// 默认的几种文件过滤规则
const filterConfig = {
  images:  {name: 'Images', extensions: ['jpg', 'png', 'gif']},
  movies:  {name: 'Movies', extensions: ['mkv', 'avi', 'mp4']},
  zips: {name: 'zips', extensions: ['zip', '7z']},
  audios: {name: 'audios',  extensions: ['mp3', 'wav', 'ogg', 'aac']},
  models: {name: 'models',  extensions: ['3ds', 'md3', 'fbx']}, // 3D模型格式
  all: {name: 'All Files',  extensions: ['*']},
};
```
**todo: 关于默认的几种文件过滤规则需细化确认**

- onOk ： function 选择或者取消后的回调函数，回调函数将接收filePaths参数（array)，为当前选中文件路径的数组，没有选择则返回undifined；