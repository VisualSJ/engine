/****************************************************************************
 Copyright (c) 2016 Chukong Technologies Inc.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Chukong Aipu reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

const Fs = require('fire-fs');
const Path = require('fire-path');
const DRAGONBONES_ENCODING = { encoding: 'utf-8' };
const CustomAssetMeta = Editor.metas['custom-asset'];

class DragonBonesMeta extends CustomAssetMeta {
    constructor (assetdb) {
        super(assetdb);
        this.dragonBonesJson = '';
    }

    static version () { return '1.0.0'; }
    static defaultType () {
        return 'dragonbones';
    }

    static validate (assetpath) {
        var json;
        var text = Fs.readFileSync(assetpath, 'utf8');
        try {
            json = JSON.parse(text);
        }
        catch (e) {
            return false;
        }

        return Array.isArray(json.armature);
    }

    import (fspath, cb) {
        Fs.readFile(fspath, DRAGONBONES_ENCODING, (err, data) => {
            if (err) {
                return cb(err);
            }

            this.dragonBonesJson = data;

            var asset = new dragonBones.DragonBonesAsset();
            asset.name = Path.basenameNoExt(fspath);
            asset.dragonBonesJson = this.dragonBonesJson;
            this._assetdb.saveAssetToLibrary(this.uuid, asset);
            cb();
        });
    }
}

module.exports = DragonBonesMeta;
