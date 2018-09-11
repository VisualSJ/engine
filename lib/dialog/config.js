/**
 * dialog 默认配置参数
 */
const ps = require('path'); // path system

const defaultConfig = {};

/**
 * 消息提示框的默认配置
 */

// 允许接收的默认接口
const msgBase = {
  title: null,
  message: null,
  onOk: null,
  onCancel: null,
  icon: null,
  type: null,
  buttons: null,
  okText: '确定',
  cancelText: '取消'
};

defaultConfig.info = Object.create(msgBase);
defaultConfig.warning = Object.create(msgBase);
defaultConfig.error = Object.create(msgBase);

// 不同type的title配置信息
defaultConfig.info.title = '提示信息';
defaultConfig.warning.title = '警告';
defaultConfig.error.title = '错误';

// 不同type的icon配置信息
defaultConfig.info.icon = ps.join(__dirname, './static/icon/info.png');
defaultConfig.warning.icon = ps.join(__dirname, './static/icon/warning.png');
defaultConfig.error.icon = ps.join(__dirname, './static/icon/error.png');

/**
 * 打开/保存文件的默认接口配置
 */
const openBase = {
  title: null,
  defaultPath: null,
  filters: null,
  onOk: null // 选择文件或文件夹后的处理函数
};

defaultConfig.openfiles = Object.create(openBase);
defaultConfig.openDirectory = Object.create(openBase);
defaultConfig.saveFiles = Object.create(openBase);

defaultConfig.openfiles.title = '打开文件';
defaultConfig.openDirectory.title = '打开文件夹';
defaultConfig.saveFiles.title = '保存文件';

defaultConfig.openfiles.properties = ['promptToCreate', 'createDirectory', 'openFile'];
defaultConfig.openDirectory.properties = ['promptToCreate', 'createDirectory', 'openDirectory'];

// 默认的几种文件过滤规则
const filterConfig = {
  images:  {name: 'Images', extensions: ['jpg', 'png', 'gif']},
  movies:  {name: 'Movies', extensions: ['mkv', 'avi', 'mp4']},
  zips: {name: 'zips', extensions: ['zip', '7z']},
  audios: {name: 'audios',  extensions: ['mp3', 'wav', 'ogg', 'aac']},
  models: {name: 'models',  extensions: ['3ds', 'md3', 'fbx']}, // 3D模型格式
  all: {name: 'All Files',  extensions: ['*']},
};

exports.defaultConfig = defaultConfig;
exports.filterConfig = filterConfig;
