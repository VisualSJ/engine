# Editor-3d

3D Editor

## 初始化

首先我们要安装 npm 模块，一些依赖模块包存在于公司内网 ftp 上，所以需要外网重装 npm 模块的时候可能会失败，需要做好备份。

```bash
npm install
npm run build
npm run dev
```

npm 版本 5 以上会使用 package-lock.json 锁定依赖库，tgz 安装包也会进行校验，所以如果 ftp 上的包更新的时候，可能会造成校验失败，这时候需要手动删除 package-lock.json 文件。

或者在项目内加入 .npmrc 文件，关闭 package-lock：

```
package-lock=false
```

### 构建编辑器

编辑器内使用了部分 ts 以及 less 代码，需要在使用之前，进行构建生成可以直接运行的代码。

```
npm run build
```

### 下载并构建引擎

需要从 github clone 引擎仓库下来。
并可执行 build 等操作。

```bash
npm run dev
```

### 使用 electron 构建原生的 node 模块

编辑器内使用的 nodejs 模块，可能会包含 c++ 等原生模块，而 electron 环境和本机环境有所不同，所以需要重新使用 electron 环境编译这些模块。

需要注意的是，如果在 npm install 出现了报错信息，需要优先解决，才能够正常使用。

一般来说优先检查本机 c++ 编译环境，其次清空 npm cache，然后再次尝试。

```
npm run build:npm
```

### 更新仓库以及引擎仓库

更新仓库、使用的内置引擎以及 ftp 上的 tgz

```bash
npm run update
```

更新 tgz 包

```bash
npm run update -- --module
npm run update -- --module @editor/dock @editor/panel
```

更新引擎

```bash
npm run update -- --repo
```

命令后带上指定的模块名字则只会更新指定模块，如果不指定，则会更新所有的 ftp 上的 tgz 包。

### 启动编辑

简单的启动预览，可以使用：

```bash
npm start
```

如果需要指定打开的项目：

```bash
npm start --project ./.project
```

如果需要指定程序的 home 目录：

```bash
npm start --home /Users/name/.Editor3D
```

所有的参数都可以复合使用，npm start 启动的时候默认带上 --dev。编辑器内部会识别为 dev 模式。

### 开发 / 测试插件

插件开发过程中，可以使用独立的插件开发环境，在这个环境内，允许模拟其他插件监听消息，并发送消息给当前正在开发的插件。

```javascript
npm test -- --project assets
```

assets 插件内需要两个文件：

1. ./test/listener.js 模拟监听其他插件/面板消息
2. ./test/sender.js 模拟发送消息给开发插件

listener.js

```javascript
// 模拟插件消息
exports.package = {
    // 第一级为模拟监听消息的插件名
    'asset-db': {
        // 第二级为插件下的消息名
        'query-is-ready' (event) {
            event.reply(null, false);
        },
    };
};
// 模拟面板消息
exports.panel = {};
```

sender.js

```javascript
exports.package = [];
exports.panel = [{
    {
        name: 'DB 就绪',
        tooltip: '数据库就绪的时候，应该去除 loading 状态，并查询现在的资源树',
        message: 'asset-db:ready',
        params: [],
    },
}];
```

**暂时只支持测试与插件同名的面板**

### 依赖的一些环境

1. 使用 npm 全局安装 typescript、tslint、electron-rebuild

```bash
npm install typescript -g
npm install tslint -g
npm install electron-rebuild -g
```

2. 安装 vscode 的 tslint 插件

3. 建议 vscode 的个人设置里面启用 tslint.autoFixOnSave、tslint.jsEnable

### 其他参考资料

编辑器使用的基础模块的接口说明，因为部分文档存在与 node_modules 内，所以需要在项目构建完成后才能够预览。

### 管理系统

[dock - 面板停靠管理](./node_modules/@editor/dock/README.MD)

[ipc - 消息管理](./node_modules/@editor/ipc/README.MD)

[package - 插件管理](./node_modules/@editor/package/README.MD)

[panel - 面板管理](./node_modules/@editor/panel/README.MD)

[project - 项目管理](./node_modules/@editor/project/README.MD)

[protocol - 协议管理](./node_modules/@editor/protocol/README.MD)

[setting - 设置管理](./node_modules/@editor/setting/README.MD)

### electron 扩展模块

[electron-base-ipc](./node_modules/@base/electron-base-ipc/README.MD)

[electron-i18n](./node_modules/@base/electron-i18n/README.MD)

[electron-logger](./node_modules/@base/electron-logger/README.MD)

[electron-menu](./node_modules/@base/electron-menu/README.MD)

[electron-profile](./node_modules/@base/electron-profile/README.MD)

[electron-windows](./node_modules/@base/electron-windows/README.MD)
