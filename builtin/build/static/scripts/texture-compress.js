const Spawn = require('child_process').spawn;
const {ensureDirSync, copy, readFileSync, writeFile, writeFileSync} = require('fs-extra');
const Path = require('path');
const Async = require('async');
function spawnTool(tool, opts, cb) {
    let child = Spawn(tool, opts);

    child.stdout.on('data', function(data) {
        console.log(data.toString());
    });
    child.stderr.on('data', function(data) {
        console.log(data.toString());
    });
    child.on('close', function() {
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
    return Path.join(Path.dirname(path), Path.basenameNoExt(path) + suffix);
}

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
        platform = 'web';
    } else if (platform === 'mac' || platform === 'win32') {
        platform = 'native';
    }

    let formats = [];

    let platformOption = compressOption[platform];
    if (platformOption && platformOption.formats.length > 0) {
        formats = platformOption.formats;
    } else if (compressOption.default) {
        formats = compressOption.default.formats;
    }

    ensureDirSync(Path.dirname(dst));

    function getSuffix() {
        return formats.map((format) => {
            if (format.name.indexOf('pvrtc_') === 0) {
                let formatID = 8; //cc.Texture2D.RGBA_PVRTC_4BPPV1;
                if (format.name === 'pvrtc_4bits') {
                    formatID = 8;
                } else if (format.name === 'pvrtc_2bits') {
                    formatID = 6; //cc.Texture2D.RGBA_PVRTC_2BPPV1;
                } else if (format.name === 'pvrtc_4bits_rgb') {
                    formatID = 7; //cc.Texture2D.RGB_PVRTC_4BPPV1;
                } else if (format.name === 'pvrtc_2bits_rgb') {
                    formatID = 5; //cc.Texture2D.RGB_PVRTC_2BPPV1;
                }

                return `.pvr@${formatID}`;
            } else if (format.name.indexOf('etc') === 0) {
                return '.etc';
            }
            return '.' + format.name;
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

    Async.each(formats, (format, done) => {
        if (format.name.indexOf('pvrtc_') !== -1) {
            return compressPVR(src, dst, format, done);
        }

        compressNormal(src, dst, format, done);
    }, (err) => {
        callback(err);
    });
}

/**
 * 压缩图片、转换图片格式
 * @param {*} src
 * @param {*} dst
 * @param {*} format
 * @param {*} cb
 */
function compressNormal(src, dst, format, cb) {
    let distPath = `${dst.replace(Path.extname(src), '')}.${format.name}`;
    var img = new Image();
    img.src = src;
    let canvasImgType = format.name === 'jpg' ? 'jpeg' : format.name;
    img.onload = function() {
        var canvas = document.createElement('canvas'); //创建画布节点
        canvas.width = this.width; //画布宽度为img宽度
        canvas.height = this.height; //画布高度为img高度
        var ctx = canvas.getContext('2d'); //绘制2D类型图形
        ctx.drawImage(img, 0, 0, this.width, this.height); //在画布类绘制图片
        var outputBase64str = canvas.toDataURL(`image/${canvasImgType}`); //输出jpg格式dataURI并压缩图片质量(取值范围0~1)
        writeFile(distPath, outputBase64str.replace(`data:image/${format.name};base64,`, ''), 'base64', cb);
    };
}

/**
 * 压缩图片的主要函数
 * @param {*} src
 * @param {*} dst
 * @param {*} format
 * @param {*} cb
 */
function compressPVR(src, dst, format, cb) {
    let pvrTool = join(__dirname, './../tools/texture-compress/PVRTexTool/OSX_x86/PVRTexToolCLI');
    if (process.platform === 'win32') {
        pvrTool = join(__dirname, './../tools/texture-compress/PVRTexTool/Windows_x86_64/PVRTexToolCLI.exe');
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

    console.log(`pvrtc compress command :  ${pvrTool} ${pvrOpts.join(' ')}`);

    spawnTool(pvrTool, pvrOpts, cb);
}

module.exports = compress;
