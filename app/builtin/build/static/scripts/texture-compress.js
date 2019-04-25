const Spawn = require('child_process').spawn;
const {ensureDirSync, copy, writeFile, remove} = require('fs-extra');
const Path = require('path');
const Async = require('async');
const Jimp = require('jimp');
function spawnTool(tool, args, opts, cb) {
    let child = Spawn(tool, args, opts);

    child.stdout.on('data', function(data) {
        console.info(data.toString());
    });
    child.stderr.on('data', function(data) {
        console.info(data.toString());
    });
    child.on('exit', function() {
        if (cb) {
            cb(null);
        }
    });
    child.on('error', function(err) {
        if (cb) {
            cb(err);
        }
    });
}

function changeSuffix(path, suffix) {
    return Path.join(Path.dirname(path), Path.basename(path, Path.extname(path)) + suffix);
}

let etcQueue = [];
/**
 *
 * 压缩图片资源入口
 * @param {object} option
 * @param {string} option.src 资源原始路径
 * @param {string} option.dst 输出路径
 * @param {string} option.platform 构建平台
 * @param {object} option.compressOption 压缩选项设置
 * @param {*} cb
 * @returns
 */
function compress(option, cb) {
    let {src, dst, platform, compressOption} = option;
    if (platform === 'web-mobile' || platform === 'web-desktop') {
        platform = 'html5';
    } else if (platform === 'mac' || platform === 'win32') {
        platform = 'native';
    } else if (platform === 'wechat-game') {
        platform = 'wechat';
    }

    let formats = [];
    let platformOption = compressOption[platform];
    if (platformOption && Object.keys(platformOption).length > 0) {
        formats = Object.keys(platformOption);
    } else if (compressOption.default) {
        platformOption = compressOption.default;
        formats = Object.keys(platformOption);
    }

    ensureDirSync(Path.dirname(dst));

    function getSuffix() {
        let PixelFormat = cc.Texture2D.PixelFormat;
        return formats.map((type) => {
            if (type.startsWith('pvrtc_')) {
                let formatID = PixelFormat.RGBA_PVRTC_4BPPV1;
                if (type === 'pvrtc_2bits') {
                    formatID = PixelFormat.RGBA_PVRTC_2BPPV1;
                }
                else if (type === 'pvrtc_4bits_rgb') {
                    formatID = PixelFormat.RGB_PVRTC_4BPPV1;
                }
                else if (type === 'pvrtc_2bits_rgb') {
                    formatID = PixelFormat.RGB_PVRTC_2BPPV1;
                }
    
                return `.pvr@${formatID}`;
            }
            else if (type.startsWith('etc')) {
                let formatID = PixelFormat.RGB_ETC1;
                if (type === 'etc2') {
                    formatID = PixelFormat.RGBA_ETC2;
                }
                else if (type === 'etc2_rgb') {
                    formatID = PixelFormat.RGB_ETC2;
                }
                return `.pkm@${formatID}`;
            }
            return '.' + type;
        });
    }

    function callback(err) {
        cb(err, getSuffix());
    }

    if (formats.length === 0) {
        copy(src, dst, (err) => {
            if (err) {
                console.error('Failed to copy native asset file %s to %s', src, dst);
            }
            callback(err);
        });
        return;
    }

    let srcExt = Path.extname(src);
    if (srcExt === '.webp') {
        let webpTool = Path.join(__dirname, './../tools/texture-compress/libwebp/mac/bin/dwebp');
        if (process.platform === 'win32') {
            webpTool = Path.join(__dirname, './../tools/texture-compress/libwebp/windows/bin/dwebp.exe');
        }
        var temp = changeSuffix(dst, '.bmp');
        let args = [
            src,
            '-o', temp,
            '-bmp',
            '-quiet'
        ];
        spawnTool(webpTool, args, {}, function (err) {
            if (err) {
                cb(err) 
            } else {
                Async.each(formats, (type, done) => {
                    if (type.startsWith('pvrtc_')) {
                        compressPVR(temp, dst, { name: type, quality: platformOption[type]}, done);
                    }
                    else if (type.startsWith('etc')) {
                        etcQueue.push(() => compressEtc(temp, dst, { name: type, quality: platformOption[type]}, function (err) {
                            etcQueue.shift();
                            done(err);
                            if (etcQueue.length > 0) etcQueue[0]();
                        }));
                        if (etcQueue.length === 1) {
                            etcQueue[0]();
                        }
                    }
                    else {
                        compressNormal(temp, dst, { name: type, quality: platformOption[type]}, done);
                    }
                    
                }, err => {
                    remove(temp);
                    callback(err);
                });
            }
        });
        return ;
    }
    Async.each(formats, (type, done) => {
        let compressFunc = compressNormal;
        if (type.startsWith('pvrtc_')) {
            compressFunc = compressPVR;
        }
        else if (type.startsWith('etc')) {
            etcQueue.push(() => compressEtc(src, dst, { name: type, quality: platformOption[type]}, function (err) {
                etcQueue.shift();
                done(err);
                if (etcQueue.length > 0) etcQueue[0]();
            }));
            if (etcQueue.length === 1) {
                etcQueue[0]();
            }
            return;
        }
        compressFunc(src, dst, { name: type, quality: platformOption[type]}, done);
    }, err => {
        callback(err);
    });
}

/**
 * 压缩图片、转换图片格式
 * @param {*} src
 * @param {*} dst
 * @param {object} format 图片格式类型以及对应质量
 * @param {*} cb
 */
function compressNormal(src, dst, format, cb) {
    if (format.name === 'webp') {
        let webpTool = Path.join(__dirname, './../tools/texture-compress/libwebp/mac/bin/cwebp');
        if (process.platform === 'win32') {
            webpTool = Path.join(__dirname, './../tools/texture-compress/libwebp/windows/bin/cwebp.exe');
        }
        dst = changeSuffix(dst, '.webp');
        let args = [
            src,
            '-o', dst,
            '-q', format.quality,
            '-quiet'
        ];
        spawnTool(webpTool, args, {}, cb);
    }
    else {
        Jimp.read(src)
        .then(file => {
            let result = null;
            if (format.name === 'png') {
                result = file.deflateLevel((format.quality / 10) | 0);
            }
            else {
                result = file.quality(format.quality) // set JPEG quality
            }
            result.write(changeSuffix(dst, `.${format.name}`), cb); // save
        })
        .catch(err => {
            cb(err);
        });
    }
}

/**
 * 压缩图片的主要函数
 * @param {*} src
 * @param {*} dst
 * @param {*} format
 * @param {*} cb
 */
function compressPVR(src, dst, format, cb) {
    let pvrTool = Path.join(__dirname, './../tools/texture-compress/PVRTexTool/OSX_x86/PVRTexToolCLI');
    if (process.platform === 'win32') {
        pvrTool = Path.join(__dirname, './../tools/texture-compress/PVRTexTool/Windows_x86_64/PVRTexToolCLI.exe');
    }

    // 根据 option.format 转换格式
    let compressFormat = 'PVRTC1_4';
    if (format.name === 'pvrtc_4bits') {
        compressFormat = 'PVRTC1_4';
    } else if (format.name === 'pvrtc_4bits_rgb') {
        compressFormat = 'PVRTC1_4_RGB';
    } else if (format.name === 'pvrtc_2bits') {
        compressFormat = 'PVRTC1_2';
    } else if (format.name === 'pvrtc_2bits_rgb') {
        compressFormat = 'PVRTC1_2_RGB';
    }

    // 需要以 pvr 结尾命名
    dst = changeSuffix(dst, '.pvr');

    let quality = 'pvrtc' + format.quality;
    let pvrOpts = [
        '-i', src,
        '-o', dst,

        // xx 的扩张方式是采用拉伸的方式对图片进行重置的
        // '-square', '+',
        // '-pot', '+',

        // xxcanvas 的扩张方式是采用留白的方式对图片进行重置的
        // 因为 sprite frame 的 rect 也是按照像素来存储的，所以用留白的方式更友好
        '-squarecanvas', '+',
        '-potcanvas', '+',

        '-q', quality,
        '-f', `${compressFormat},UBN,lRGB`,
    ];

    console.info(`pvrtc compress command :  ${pvrTool} ${pvrOpts.join(' ')}`);

    spawnTool(pvrTool, pvrOpts, {}, cb);
}

function compressEtc (src, dst, format, cb) {
    let etcTool = Path.join(__dirname, './../tools/texture-compress/mali/OSX_x86/etcpack');
    if (process.platform === 'win32') {
        etcTool = Path.join(__dirname, './../tools/texture-compress/mali/Windows_64/etcpack.exe');
    }

    let toolDir = Path.dirname(etcTool);
    etcTool = '.' + Path.sep + Path.basename(etcTool);

    let etcFormat = 'etc1';
    let compressFormat = 'RGB';
    if (format.name === 'etc2') {
        etcFormat = 'etc2';
        compressFormat = 'RGBA';
    }
    else if (format.name === 'etc2_rgb') {
        etcFormat = 'etc2';
    }

    let args = [
        Path.normalize(src),
        Path.dirname(dst),
        
        '-c', etcFormat,
        '-s', format.quality,
    ];

    // windows 中需要进入到 toolDir 去执行命令才能成功
    let cwd = toolDir;

    let env = Object.assign({}, process.env);
    // convert 是 imagemagick 中的一个工具
    // etcpack 中应该是以 'convert' 而不是 './convert' 来调用工具的，所以需要将 toolDir 加到环境变量中
    // toolDir 需要放在前面，以防止系统找到用户自己安装的 imagemagick 版本
    env.PATH = toolDir + ':' + env.PATH;

    let opts = {
        cwd: cwd,
        env: env
    };

    if (etcFormat === 'etc2') {
        args.push('-f', compressFormat);
    }

    console.log(`etc compress command :  ${etcTool} ${args.join(' ')}`);

    spawnTool(etcTool, args, opts, cb);
}

module.exports = compress;
