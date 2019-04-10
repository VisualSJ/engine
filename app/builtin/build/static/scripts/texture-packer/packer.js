const Fs = require('fire-fs');
const Async = require('async');
const Path = require('fire-path');
const Del = require('del');

const Sharp = require(Editor.url('app://editor/share/sharp'));

const MaxRectsBinPack = require('./packing/maxrects');
const applyBleed = require('./bleeding').applyBleed;
const tmpDir = Path.join(Editor.remote.Project.path, 'temp', 'trimImages');

class Atlas {
    constructor(files, width, height) {
        this.files = files;
        this.width = width;
        this.height = height;
        this.sharp = undefined;
    }

    toJSON () {
        let json = Object.assign({}, this);
        json.sharp = undefined;
        return json;
    }
}

class SpriteFrameInfo {
    constructor (spriteFrame, options) {
        let texture = spriteFrame.getTexture();
        let path = texture.url;
        let trim = spriteFrame.getRect();

        trim.rotatedWidth = spriteFrame.isRotated() ? trim.height : trim.width;
        trim.rotatedHeight = spriteFrame.isRotated() ? trim.width : trim.height;

        this.name = spriteFrame.name;
        this.spriteFrame = spriteFrame;
        this.uuid = spriteFrame._uuid;
        this.textureUuid = texture._uuid;
        this.path = path;
        this.trim = trim;
        this.rawWidth = spriteFrame.getOriginalSize().width;
        this.rawHeight = spriteFrame.getOriginalSize().height;
        this.width = trim.width + (options.padding + options.bleed) * 2;
        this.height = trim.height + (options.padding + options.bleed) * 2;
    }

    toJSON () {
        let json = Object.assign({}, this);
        json.spriteFrame = undefined;
        return json;
    }
}

function trimImages (files, options, callback) {
    Fs.ensureDirSync(tmpDir);

    let i = 0;
    Async.forEach(files, function (file, next) {
        file.originalPath = file.path;
        file.path = Path.join(tmpDir, 'spritesheet_js_' + (new Date()).getTime() + '_image_' + (i++) + '.png');

        let trim = file.trim;

        let image = Sharp(file.originalPath)
            .extract({ left: trim.x, top: trim.y, width: trim.rotatedWidth, height: trim.rotatedHeight });

        if (file.spriteFrame.isRotated()) {
            image = image.rotate(270);
        }

        image.toFile(file.path, function (err) {
            if (err) {
                console.error(`trimImages [${file.name}] from [${file.originalPath}]  failed`);
            }
            next(err);
        });
    }, callback);
}


function determineAtlasSize (files, options, callback) {
    let inputs = files.concat();
    let heuristice = MaxRectsBinPack.heuristices[options.heuristices];

    while (inputs.length > 0) {
        let pack = new MaxRectsBinPack(options.width, options.height, options.allowRotation);
        let result = pack.insertRects(inputs, heuristice);

        if (pack.usedRectangles.length === 0) {
            options.unpackedTextures = inputs;
            break;
        }

        let width = 0;
        let height = 0;

        for (let i = 0; i < result.length; i++) {
            let item = result[i];

            item.rotatedWidth = item.rotated ? item.height : item.width;
            item.rotatedHeight = item.rotated ? item.width : item.height;

            item.trim.rotatedWidth = item.rotated ? item.trim.height : item.trim.width;
            item.trim.rotatedHeight = item.rotated ? item.trim.width : item.trim.height;

            let right = item.x + item.rotatedWidth;
            let top = item.y + item.rotatedHeight;

            if (right > width) width = right;
            if (top > height) height = top;
        }

        options.atlases.push(new Atlas(result, width, height));
    }

    // square and powerOfTwo options here
    options.atlases.forEach(function (atlas) {
        applySquareAndPowerConstraints(atlas, options.forceSquared, options.powerOfTwo);

        atlas.files.forEach(item => {
            item.trim.x = item.x + options.padding + options.bleed;
            item.trim.y = item.y + options.padding + options.bleed;
        });
    });

    callback(null, options);
}

function applySquareAndPowerConstraints (options, square, powerOfTwo) {
    if (square) {
        options.width = options.height = Math.max(options.width, options.height);
    }
    if (powerOfTwo) {
        options.width = roundToPowerOfTwo(options.width);
        options.height = roundToPowerOfTwo(options.height);
    }
}

function generateAtlas (atlas, options, callback) {
    let files = atlas.files;

    //////////////////////// sharp

    const width = options.width;
    const height = options.height;
    const channels = 4;
    const rgbaPixel = 0x00000000;
    const opts = { raw: { width, height, channels } };

    let canvas = Buffer.alloc(width * height * channels, rgbaPixel);
    let input = Sharp(canvas, opts).toBuffer();

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let x = file.trim.x;
        let y = file.trim.y;

        input = input.then(data => {
            if (file.rotated) {
                return Sharp(file.path)
                    .rotate(90)
                    .toBuffer()
                    .then(outputBuffer => {
                        return Sharp(data, opts)
                            .overlayWith(outputBuffer, { left: x, top: y })
                            .toBuffer()
                            .then(outputData => {
                                return new Promise(function (resolve, reject) {
                                    process.nextTick(() => {
                                        resolve(outputData);
                                    });
                                });
                            });
                    });
            }
            else {
                return Sharp(data, opts).overlayWith(file.path, { left: x, top: y }).toBuffer()
                    .then(outputData => {
                        return new Promise(function (resolve, reject) {
                            process.nextTick(() => {
                                resolve(outputData);
                            });
                        });
                    });
            }
        })
            .catch(err => {
                console.error(`Handle image [${file.path} error]. \n Origin path is [${file.originalPath}:${file.name}]. \n Error : ${err.toString()}`);
            });
    }

    if (options.contourBleed || options.paddingBleed) {
        input = input.then(data => {
            return new Promise(function (resolve, reject) {
                process.nextTick(() => {
                    let outputData = data;//Buffer.alloc(width * height * channels, rgbaPixel);

                    applyBleed(options, atlas, data, outputData);
                    resolve(outputData);
                });
            });
        });
    }

    input
        .then(data => {
            return Sharp(data, opts)
                .png();
        })
        .then(sharp => {
            callback(null, sharp);
        })
        .catch(err => {
            callback(err);
        });
}

function unlinkTempFiles (cb) {
    try {
        Del(tmpDir, { force: true }, cb);
    }
    catch (err) {
        console.error(err);
        return;
    }
}

function roundToPowerOfTwo (value) {
    if (typeof value !== 'number') return undefined;
    let powers = 2;
    while (value > powers) {
        powers *= 2;
    }

    return powers;
}

module.exports = function (spriteFrames, options, callback) {
    if (!spriteFrames || spriteFrames.length === 0) return callback(new Error('no spriteFrames specified'));

    options = options || {};

    options.name = options.name || 'spritesheet';
    options.forceSquared = typeof options.forceSquared === 'boolean' ? options.forceSquared : false;
    options.powerOfTwo = typeof options.powerOfTwo === 'boolean' ? options.powerOfTwo : false;
    options.padding = typeof options.padding === 'number' ? options.padding : 0;
    options.heuristices = typeof options.heuristices === 'string' ? options.heuristices : 'BestAreaFit';
    options.contourBleed = typeof options.contourBleed === 'boolean' ? options.contourBleed : false;
    options.paddingBleed = typeof options.paddingBleed === 'boolean' ? options.paddingBleed : false;

    // additional bleed for paddingBleed
    options.bleed = options.paddingBleed ? 1 : 0;

    let files = spriteFrames.map(spriteFrame => {
        return new SpriteFrameInfo(spriteFrame, options);
    });

    options.atlases = [];
    options.unpackedTextures = [];

    // disable sharp cache to release large images.
    Sharp.cache(false);

    console.time('TexturePacker: packer');

    Async.waterfall([
        function (callback) {
            // filter transparent image
            files = files.filter(file => {
                if (file.trim.width > 0 && file.trim.height > 0)
                    return true;

                file.width = file.rawWidth;
                file.height = file.rawHeight;
                options.unpackedTextures.push(file);
                return false;
            });

            callback();
        },
        function (callback) {
            console.time('TexturePacker: trim images');
            trimImages(files, {}, callback);
        },
        function (callback) {
            console.timeEnd('TexturePacker: trim images');

            process.nextTick(function () {
                callback(undefined, files);
            });
        },
        function (files, callback) {
            console.time('TexturePacker: determine canvas size');
            determineAtlasSize(files, options, callback);
        },
        function (options, callback) {
            console.timeEnd('TexturePacker: determine canvas size');
            console.time('TexturePacker: generate images');

            let n = 0;
            let ow = options.width;
            let oh = options.height;
            let baseName = options.name;
            Async.eachSeries(options.atlases, function (atlas, done) {
                // manually call gc
                if (global.gc) {
                    global.gc();
                }

                options.name = atlas.name = baseName + '-' + (++n);
                options.width = atlas.width;
                options.height = atlas.height;
                generateAtlas(atlas, options, (err, sharp) => {
                    if (err) {
                        return done(err);
                    }
                    atlas.sharp = sharp;
                    done();
                });
            }, function (err) {
                console.timeEnd('TexturePacker: generate images');
                callback(err, options);
            });
            options.name = baseName;
            options.width = ow;
            options.height = oh;
        },

        function (result, callback) {
            unlinkTempFiles(err => {
                callback(err, result);
            });
        },
    ], (err, result) => {
        // manually call gc
        if (global.gc) {
            global.gc();
        }

        console.timeEnd('TexturePacker: packer');
        callback(err, result);
    });
};
