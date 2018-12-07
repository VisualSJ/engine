const Sharp = require('sharp');
const Spawn = require('child_process').spawn;
const Fs = require('fire-fs');
const Path = require('fire-path');
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

    Fs.ensureDirSync(Path.dirname(dst));

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
        Fs.copy(src, dst, (err) => {
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

function compressNormal(src, dst, format, cb) {
    let sharp = Sharp(src);

    let suffix = '.png';
    if (format.name === 'webp') {
        sharp = sharp.webp({quality: format.quality});
        suffix = '.webp';
    } else if (format.name === 'jpg') {
        sharp = sharp.jpeg({quality: format.quality});
        suffix = '.jpg';
    } else if (format.name === 'png') {
        let compressionLevel = (format.quality / 10) | 0;
        sharp = sharp.png({compressionLevel: compressionLevel});
    }

    dst = changeSuffix(dst, suffix);

    sharp.toFile(dst, (err) => {
        cb(err);
    });
}

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
